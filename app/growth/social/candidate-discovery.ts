import { canonicalizeUrl, urlsAreCanonicalDuplicates, validateSourceUrl } from "../../lib/research/url-safety.ts";
import { RESEARCH_LIMITS } from "../../lib/research/limits.ts";
import type { CandidateDiscoveryProvider, DiscoveredDocumentHit } from "../../lib/research/candidate-discovery-provider.ts";
import {
  compactExtractionDiagnostics,
  emptyExtractionDiagnostics,
  type CandidateExtractionDiagnostics,
} from "../../lib/research/extraction-diagnostics.ts";
import { matchClaimPassages } from "../../lib/research/passage-match.ts";
import {
  claimCoverageIsSufficientForSupport,
  evaluateClaimCoverage,
  resolveCandidateClaimCoverage,
  selectCoveringPassage,
  type ClaimCoverageState,
  type TopicalRelevanceState,
} from "./claim-coverage.ts";
import { type SubjectGroundingState } from "./subject-grounding.ts";
import { fixtureCandidateProvider } from "../../lib/research/fixture-candidate-provider.ts";
import { createLiveCandidateProvider } from "../../lib/research/live-candidate-provider.ts";
import {
  emptyLiveRetrievalDiagnostics,
  finalizeLiveRetrievalDiagnostics,
  LIVE_SEARCH_MIN_BUDGET_MS,
  recordLiveExclusion,
  type LiveRetrievalDiagnostics,
} from "../../lib/research/live-retrieval-diagnostics.ts";
import {
  assertNoEvidenceEconomics,
  authorityClassFromSourceMetadata,
  isCrediblePrimary,
  isEspeciallyAuthoritative,
  type EvidenceAuthorityClass,
  type EvidencePolicyClass,
} from "./evidence-policy.ts";
import {
  assessClaimSufficiency,
  independenceCluster,
  recordIsAcceptedSupport,
  type EvidenceSnapshot,
} from "./evidence-intelligence.ts";
import {
  assertBoundedDiscoveryAllowed,
  CANDIDATE_DISCOVERY_PROVIDER_ID,
  liveCandidateDiscoveryAvailable,
} from "./candidate-discovery-capability.ts";
import type { ExecutableResearchPlan } from "./research-planner.ts";
import {
  assertGapHasNoEconomics,
  candidateConsumesAssessedCapacity,
  classifyPolicyAdvancement,
  emptyEvidenceGapFeedback,
  evaluatePreRetrievalExclusion,
  policyAdvancementScore,
  type EvidenceGapFeedback,
  type PolicyAdvancement,
} from "./evidence-gap-research.ts";
import { classifySearchSurface } from "./authoritative-source-targeting.ts";
import {
  emptyResearchMemory,
  editorialDomainsToDemote,
  evaluateMemorySkip,
  memoryUrlsToSkipBeforeRetrieval,
  summarizeResearchMemory,
  type MemoryState,
  type ResearchMemory,
} from "./research-memory.ts";

export const CANDIDATE_RELATIONSHIPS = ["supports", "contradicts", "mixed", "relevant", "irrelevant"] as const;
export type CandidateRelationship = typeof CANDIDATE_RELATIONSHIPS[number];

export type CandidateAssessment = {
  canonicalUrl: string;
  title: string;
  publisher: string;
  sourceClass: string;
  provenance: string;
  independenceCluster: string;
  excerpts: Array<{ text: string; start: number; end: number; locator?: string | null }>;
  relationship: CandidateRelationship;
  claimCoverage?: ClaimCoverageState;
  topicalRelevance?: TopicalRelevanceState;
  subjectGrounding?: SubjectGroundingState;
  relationMatched?: boolean;
  scopeLimitations: string;
  authorityClass: EvidenceAuthorityClass;
  authorityAdequate: boolean;
  freshness: "current" | "stale" | "unknown";
  rankScore: number;
  reasonSelected: string | null;
  reasonExcluded: string | null;
  proposedForReview: boolean;
  policyAdvancement: PolicyAdvancement;
  memoryState: MemoryState;
  memorySkipReason?: string | null;
  memoryRetryReason?: string | null;
  queryAuthorityPath?: string | null;
  query: string;
  retrievedChecksum: string;
  publishedDate: string | null;
  resultUrl?: string | null;
  retrievalStatus?: "ok" | "blocked" | "timeout" | "oversized" | "unextractable" | "failed";
  extraction?: CandidateExtractionDiagnostics;
};

export type ResearchRunResult = {
  plan: ExecutableResearchPlan;
  providerId: string;
  providerKind: "fixture" | "live";
  liveRetrieval: boolean;
  queriesExecuted: string[];
  candidates: CandidateAssessment[];
  stopReason: string;
  startedAt: string;
  finishedAt: string;
  diagnostics: LiveRetrievalDiagnostics | null;
};

const CONTRADICTION_PATTERN = /\bcontradicts?\b|\bnever be treated as a universal\b|\bblanket .{0,80} without\b/i;

export function resolveCandidateDiscoveryProvider(): CandidateDiscoveryProvider {
  assertBoundedDiscoveryAllowed();
  if (liveCandidateDiscoveryAvailable()) return createLiveCandidateProvider();
  return fixtureCandidateProvider;
}

export function extractTraceableExcerpt(retrievedText: string, claimOrQuestion: string) {
  return matchClaimPassages(retrievedText, claimOrQuestion).excerpt;
}

export function classifyCandidateRelationship(retrievedText: string, claimOrQuestion: string): CandidateRelationship {
  return assessClaimPassage(retrievedText, claimOrQuestion).relationship;
}

function assessClaimPassage(retrievedText: string, claimOrQuestion: string, options?: {
  safetySensitive?: boolean;
  policyClass?: string | null;
  documentTitle?: string | null;
  packageProblem?: string | null;
  packageThesis?: string | null;
}) {
  const match = matchClaimPassages(retrievedText, claimOrQuestion);
  const covering = selectCoveringPassage({
    retrievedText,
    claimText: claimOrQuestion,
    documentTitle: options?.documentTitle,
    packageProblem: options?.packageProblem,
    packageThesis: options?.packageThesis,
    safetySensitive: options?.safetySensitive,
    policyClass: options?.policyClass,
  });
  const excerpt = covering.excerpt ?? match.excerpt;
  const coverage = covering.excerpt
    ? covering.coverage
    : evaluateClaimCoverage({
      claimText: claimOrQuestion,
      passage: match.excerpt?.text ?? "",
      documentTitle: options?.documentTitle,
      packageProblem: options?.packageProblem,
      packageThesis: options?.packageThesis,
      safetySensitive: options?.safetySensitive,
      policyClass: options?.policyClass,
    });
  const contradicts = CONTRADICTION_PATTERN.test(retrievedText);
  let relationship: CandidateRelationship = "irrelevant";
  let claimCoverage = coverage.state;
  if (contradicts && excerpt) {
    relationship = CONTRADICTION_PATTERN.test(excerpt.text) ? "contradicts" : "mixed";
    if (claimCoverage !== "none") claimCoverage = "contradicts";
  } else if (contradicts) {
    relationship = "contradicts";
    if (claimCoverage !== "none") claimCoverage = "contradicts";
  } else if (claimCoverage === "contradicts") {
    relationship = "contradicts";
  } else if (claimCoverageIsSufficientForSupport(claimCoverage, options?.safetySensitive, coverage.subjectGrounding) && excerpt) {
    relationship = "supports";
  } else if (match.relationship === "irrelevant" && claimCoverage === "none") {
    relationship = "irrelevant";
  } else {
    relationship = "relevant";
  }
  return {
    match: {
      ...match,
      excerpt: excerpt ? { ...excerpt, locator: excerpt.locator ?? match.excerpt?.locator ?? null } : match.excerpt,
    },
    coverage: { ...coverage, state: claimCoverage },
    relationship,
    topicalRelevance: coverage.topicalRelevance,
    subjectGrounding: coverage.subjectGrounding,
    relationMatched: coverage.relationMatched,
  };
}

function freshnessOf(publishedDate: string | null | undefined): "current" | "stale" | "unknown" {
  if (!publishedDate) return "unknown";
  const parsed = Date.parse(publishedDate);
  if (Number.isNaN(parsed)) return "unknown";
  const ageMs = Date.now() - parsed;
  if (ageMs > 1000 * 60 * 60 * 24 * 365 * 8) return "stale";
  return "current";
}

function authorityAdequateFor(policyClass: EvidencePolicyClass, authority: EvidenceAuthorityClass) {
  if (policyClass === "safety_sensitive") return isEspeciallyAuthoritative(authority);
  return isCrediblePrimary(authority) || isEspeciallyAuthoritative(authority);
}

function simpleChecksum(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return `fnv:${(hash >>> 0).toString(16)}:${value.length}`;
}

export function assessDiscoveredHit(input: {
  hit: DiscoveredDocumentHit;
  plan: ExecutableResearchPlan;
}): CandidateAssessment {
  assertNoEvidenceEconomics(input.hit as unknown as Record<string, unknown>, "Candidate discovery");
  const urlCheck = validateSourceUrl(input.hit.canonicalUrl);
  const canonicalUrl = urlCheck.canonicalUrl ?? canonicalizeUrl(input.hit.canonicalUrl);
  const authorityClass = authorityClassFromSourceMetadata({ sourceType: input.hit.sourceType, provenanceMethod: input.hit.provenanceMethod });
  const retrievalStatus = input.hit.retrievalStatus ?? (input.hit.retrievedText ? "ok" : undefined);
  const unusable = retrievalStatus && retrievalStatus !== "ok";
  const assessedPassage = unusable
    ? null
    : assessClaimPassage(input.hit.retrievedText, input.plan.claimOrQuestion, {
      safetySensitive: input.plan.claimClass === "safety_sensitive",
      policyClass: input.plan.claimClass,
      documentTitle: input.hit.title,
    });
  const passage = assessedPassage?.match ?? {
    excerpt: null,
    matchCount: 0,
    missReason: retrievalStatus === "unextractable" && input.hit.extraction?.passageMissReason === "pdf_unsupported" ? "pdf_unsupported" : "retrieval_unusable",
  };
  const excerpt = passage.excerpt;
  const claimCoverage = unusable ? "none" as const : assessedPassage!.coverage.state;
  const topicalRelevance = unusable ? "irrelevant" as const : assessedPassage!.topicalRelevance;
  const subjectGrounding = unusable ? "unknown" as const : assessedPassage!.subjectGrounding;
  const relationMatched = unusable ? false : assessedPassage!.relationMatched;
  const relationship = unusable ? "irrelevant" as const : assessedPassage!.relationship;
  const extraction = compactExtractionDiagnostics({
    ...(input.hit.extraction ?? emptyExtractionDiagnostics()),
    passageMatchCount: passage.matchCount,
    passageMissReason: excerpt
      ? (relationship === "relevant" || (!claimCoverageIsSufficientForSupport(claimCoverage, input.plan.claimClass === "safety_sensitive", subjectGrounding) && relationship !== "contradicts" && relationship !== "mixed")
        ? "relevant_not_supporting"
        : null)
      : (passage.missReason ?? input.hit.extraction?.passageMissReason ?? "no_overlapping_concept"),
    claimCoverage,
    topicalRelevance,
    subjectGrounding,
    relationMatched,
    claimCoverageReason: unusable ? "Retrieved content was unusable." : assessedPassage!.coverage.reason,
    subjectGroundingReason: unusable ? "Retrieved content was unusable." : assessedPassage!.coverage.subjectGroundingReason,
  });
  const cluster = independenceCluster({
    ref: { kind: "corpus_document", id: canonicalUrl },
    publisher: input.hit.independencePublisher || input.hit.publisher,
    canonicalUrl,
    underlyingDocumentId: canonicalUrl,
  });
  const authorityAdequate = !unusable && authorityAdequateFor(input.plan.claimClass, authorityClass);
  const disallowed = input.plan.disallowedSourceClasses.includes(input.hit.sourceType) || input.plan.disallowedSourceClasses.includes(authorityClass);
  const gap = input.plan.evidenceGap ?? emptyEvidenceGapFeedback();
  const policyAdvancement = classifyPolicyAdvancement({
    independenceCluster: cluster,
    authorityClass,
    authorityAdequate: !unusable && authorityAdequateFor(input.plan.claimClass, authorityClass) && !disallowed,
    relationship,
    gap,
    claimCoverage,
    subjectGrounding,
  });
  let reasonExcluded: string | null = null;
  if (!urlCheck.ok) reasonExcluded = `URL rejected: ${urlCheck.issues.join(", ")}.`;
  else if (unusable) reasonExcluded = `Retrieval ${retrievalStatus}: no quotation was generated.`;
  else if (relationship === "irrelevant") reasonExcluded = "Retrieved text does not address the claim.";
  else if (!claimCoverageIsSufficientForSupport(claimCoverage, input.plan.claimClass === "safety_sensitive", subjectGrounding) && relationship !== "contradicts" && relationship !== "mixed") {
    reasonExcluded = `Passage is topically related but does not support the specific claim. ${assessedPassage?.coverage.reason ?? ""}`.trim();
  }
  else if (relationship === "contradicts" || relationship === "mixed") reasonExcluded = "Contradiction surfaced; not proposed as supporting evidence.";
  else if (input.hit.extraction?.publisherConflict) reasonExcluded = `Publisher identity conflict: ${input.hit.extraction.publisherConflict}`;
  else if (disallowed || !authorityAdequate) reasonExcluded = "Source class is insufficient for this claim policy.";
  else if (policyAdvancement === "already_counted") reasonExcluded = "Same publisher or document already counted; does not increase independence.";
  const scopeLimitations = relationship === "contradicts" || relationship === "mixed"
    ? "Surfaces a contradiction. Human corpus review remains authoritative."
    : !claimCoverageIsSufficientForSupport(claimCoverage, input.plan.claimClass === "safety_sensitive", subjectGrounding)
      ? "Claim coverage or subject grounding is insufficient. Authoritative sources are not automatically evidence for the proposition."
    : unusable
      ? "Retrieved content was incomplete, blocked, or unextractable. No quotation was invented."
      : !authorityAdequate
        ? "Insufficient authority class for the claim policy."
        : input.hit.provenanceMethod === "live_fetch"
          ? "Live-retrieved excerpt. Not accepted evidence."
          : "Fixture-retrieved excerpt only. Not accepted evidence.";
  return {
    canonicalUrl,
    title: input.hit.title,
    publisher: input.hit.publisher,
    sourceClass: input.hit.sourceType,
    provenance: input.hit.provenanceMethod,
    independenceCluster: cluster,
    excerpts: excerpt ? [{ ...excerpt, locator: excerpt.locator ?? input.hit.excerptLocator ?? null }] : [],
    relationship,
    claimCoverage,
    topicalRelevance,
    subjectGrounding,
    relationMatched,
    scopeLimitations,
    authorityClass,
    authorityAdequate,
    freshness: freshnessOf(input.hit.publishedDate),
    rankScore: 0,
    reasonSelected: null,
    reasonExcluded,
    proposedForReview: false,
    policyAdvancement,
    memoryState: (extraction.memoryState as MemoryState | null) || "new_candidate",
    memorySkipReason: extraction.memorySkipReason ?? null,
    memoryRetryReason: extraction.memoryRetryReason ?? null,
    queryAuthorityPath: extraction.queryAuthorityPath ?? null,
    query: input.hit.query,
    retrievedChecksum: simpleChecksum(input.hit.retrievedText),
    publishedDate: input.hit.publishedDate ?? null,
    resultUrl: input.hit.resultUrl ?? canonicalUrl,
    retrievalStatus: retrievalStatus ?? "ok",
    extraction: compactExtractionDiagnostics({ ...extraction, policyAdvancement, preRetrievalExcluded: false }),
  };
}

export function rankCandidateAssessments(input: {
  candidates: CandidateAssessment[];
  existingClusters: string[];
  gap?: EvidenceGapFeedback | null;
  claim?: { claimText: string; safetySensitive?: boolean; policyClass?: EvidencePolicyClass | null } | null;
  economics?: Record<string, unknown>;
}) {
  if (input.economics) {
    assertNoEvidenceEconomics(input.economics, "Candidate ranking");
    assertGapHasNoEconomics(input.economics);
  }
  const gap = input.gap ?? emptyEvidenceGapFeedback();
  const scored = input.candidates.map((candidate) => {
    const resolved = resolveCandidateClaimCoverage({
      candidate,
      claimText: input.claim?.claimText ?? null,
      safetySensitive: input.claim?.safetySensitive,
      policyClass: input.claim?.policyClass,
    });
    const advancement = candidate.policyAdvancement ?? classifyPolicyAdvancement({
      independenceCluster: candidate.independenceCluster,
      authorityClass: candidate.authorityClass,
      authorityAdequate: candidate.authorityAdequate,
      relationship: candidate.relationship,
      claimCoverage: resolved.claimCoverage,
      subjectGrounding: resolved.subjectGrounding,
      gap: {
        ...gap,
        acceptedIndependenceClusters: [...new Set([...gap.acceptedIndependenceClusters, ...input.existingClusters])],
        excludedPublisherClusters: [...new Set([...gap.excludedPublisherClusters, ...input.existingClusters])],
        remainingIndependentSourceCount: gap.remainingIndependentSourceCount || (input.existingClusters.length ? 1 : 0),
      },
    });
    let score = policyAdvancementScore(advancement);
    if (candidate.authorityAdequate) score += 100;
    if (isEspeciallyAuthoritative(candidate.authorityClass)) score += 40;
    if (candidate.authorityClass === "manufacturer_technical" || candidate.authorityClass === "equipment_manual") score += 20;
    if (candidate.relationship === "supports") score += 30;
    if (candidate.relationship === "contradicts") score += 15;
    if (candidate.relationship === "relevant") score += 10;
    if (candidate.relationship === "mixed") score += 8;
    if (!input.existingClusters.includes(candidate.independenceCluster) && advancement !== "already_counted") score += 25;
    if (candidate.freshness === "current") score += 5;
    if (candidate.freshness === "stale") score -= 10;
    if (!candidate.authorityAdequate) score -= 50;
    if (candidate.relationship === "irrelevant") score -= 40;
    return { ...candidate, policyAdvancement: advancement, rankScore: score };
  });
  scored.sort((left, right) => right.rankScore - left.rankScore || left.canonicalUrl.localeCompare(right.canonicalUrl));
  return scored;
}

function snapshotFromCandidate(candidate: CandidateAssessment, index: number): EvidenceSnapshot {
  return {
    ref: { kind: "corpus_document", id: `candidate:${index}:${candidate.canonicalUrl}` },
    exists: true,
    title: candidate.title,
    publisher: candidate.publisher,
    canonicalUrl: candidate.canonicalUrl,
    sourceType: candidate.sourceClass,
    provenanceMethod: candidate.provenance,
    ingestionStatus: "accepted",
    validationStatus: candidate.relationship === "contradicts" || candidate.relationship === "mixed"
      ? "contradicted"
      : candidate.relationship === "supports"
        ? "claim_supporting"
        : "relevant",
    productionExposure: false,
    publishedDate: candidate.publishedDate,
    underlyingDocumentId: candidate.independenceCluster,
  };
}

export function wouldSatisfyPolicyIfAccepted(input: {
  claim: { id: string; claimText: string; safetySensitive: boolean; policyClass?: EvidencePolicyClass | null };
  attached: EvidenceSnapshot[];
  proposed: CandidateAssessment[];
}) {
  const supporting = input.proposed.filter((item) => {
    if (item.relationship !== "supports" || !item.authorityAdequate || item.retrievalStatus === "unextractable") {
      return false;
    }
    const resolved = resolveCandidateClaimCoverage({
      candidate: item,
      claimText: input.claim.claimText,
      safetySensitive: input.claim.safetySensitive,
      policyClass: input.claim.policyClass,
    });
    return claimCoverageIsSufficientForSupport(
      resolved.claimCoverage,
      input.claim.safetySensitive,
      resolved.subjectGrounding,
    );
  });
  const conflicting = input.proposed.filter((item) => (item.relationship === "contradicts" || item.relationship === "mixed") && item.authorityAdequate);
  const records = [
    ...input.attached,
    ...supporting.map((item, index) => snapshotFromCandidate(item, index)),
    ...conflicting.map((item, index) => snapshotFromCandidate(item, supporting.length + index)),
  ];
  return assessClaimSufficiency({ claim: input.claim, records });
}

function candidateIsAssessed(candidate: CandidateAssessment) {
  return candidateConsumesAssessedCapacity({
    policyAdvancement: candidate.policyAdvancement,
    preRetrievalExcluded: candidate.extraction?.preRetrievalExcluded,
    retrievalStatus: candidate.retrievalStatus,
    memoryState: candidate.memoryState ?? candidate.extraction?.memoryState,
  });
}

function alreadyHaveUrl(candidates: CandidateAssessment[], url: string) {
  return candidates.some((item) => urlsAreCanonicalDuplicates(item.canonicalUrl, url));
}

function selectProposedSet(input: {
  assessed: CandidateAssessment[];
  attached: EvidenceSnapshot[];
  attachedClusters: string[];
  claim: { id: string; claimText: string; safetySensitive: boolean; policyClass?: EvidencePolicyClass | null };
  gap?: EvidenceGapFeedback | null;
}) {
  const ranked = rankCandidateAssessments({
    candidates: input.assessed,
    existingClusters: input.attachedClusters,
    gap: input.gap,
    claim: input.claim,
  });
  const proposed: CandidateAssessment[] = [];
  const existing = new Set(input.attachedClusters);
  let stopReason = "Candidate bound or query bound reached before policy would be satisfied.";
  for (const candidate of ranked) {
    if (candidate.relationship === "contradicts" || candidate.relationship === "mixed") continue;
    if (candidate.retrievalStatus && candidate.retrievalStatus !== "ok") continue;
    if (candidate.relationship !== "supports" || !candidate.authorityAdequate) continue;
    if (existing.has(candidate.independenceCluster)) {
      candidate.reasonExcluded = candidate.reasonExcluded ?? "Same publisher or document already counted; does not increase independence.";
      continue;
    }
    proposed.push(candidate);
    existing.add(candidate.independenceCluster);
    const preview = wouldSatisfyPolicyIfAccepted({
      claim: input.claim,
      attached: input.attached,
      proposed: [...proposed, ...ranked.filter((item) => item.relationship === "contradicts" || item.relationship === "mixed")],
    });
    if (preview.state === "supported") {
      stopReason = "Proposed accepted set would satisfy Evidence Intelligence policy.";
      break;
    }
  }
  const proposedUrls = new Set(proposed.map((item) => item.canonicalUrl));
  const candidates = ranked.map((candidate) => {
    const selected = proposedUrls.has(candidate.canonicalUrl);
    return {
      ...candidate,
      proposedForReview: selected,
      reasonSelected: selected ? "Adequate independent support toward the policy stop condition." : candidate.reasonSelected,
      reasonExcluded: selected ? null : candidate.reasonExcluded ?? (stopReason.startsWith("Proposed") ? "Stop condition already met." : candidate.reasonExcluded),
    };
  });
  return { candidates, stopReason, satisfied: stopReason.startsWith("Proposed") };
}

export async function executeBoundedCandidateDiscovery(input: {
  plan: ExecutableResearchPlan;
  claim: { id: string; claimText: string; safetySensitive: boolean; policyClass?: EvidencePolicyClass | null };
  attached: EvidenceSnapshot[];
  provider?: CandidateDiscoveryProvider;
  now?: Date;
  memory?: ResearchMemory;
  excludeCanonicalUrls?: string[];
}): Promise<ResearchRunResult> {
  assertBoundedDiscoveryAllowed();
  const provider = input.provider ?? resolveCandidateDiscoveryProvider();
  const maximumQueries = Math.min(Math.max(0, input.plan.maximumQueries), RESEARCH_LIMITS.maximumQueries);
  const maximumCandidates = Math.min(Math.max(0, input.plan.maximumCandidateDocuments), RESEARCH_LIMITS.maximumCandidates);
  const maximumRuntimeMs = Math.min(Math.max(0, input.plan.maximumRuntimeMs), RESEARCH_LIMITS.maximumRuntimeMs);
  const startedAt = (input.now ?? new Date()).toISOString();
  const startedAtMs = Date.parse(startedAt);
  const queriesExecuted: string[] = [];
  const assessed: CandidateAssessment[] = [];
  const attachedClusters = [...new Set(
    input.attached.filter((record) => recordIsAcceptedSupport(record)).map((record) => independenceCluster(record)),
  )];
  const baseGap = input.plan.evidenceGap ?? emptyEvidenceGapFeedback();
  const gap: EvidenceGapFeedback = {
    ...baseGap,
    acceptedIndependenceClusters: [...new Set([...baseGap.acceptedIndependenceClusters, ...attachedClusters])],
    excludedPublisherClusters: [...new Set([
      ...baseGap.excludedPublisherClusters,
      ...(baseGap.independenceOnlyGap || baseGap.unresolvedPolicyGap === "needs_independent_corroboration" || baseGap.contradictions.length ? attachedClusters : []),
    ])],
  };
  const memory = input.memory ?? emptyResearchMemory({
    packageId: "",
    claimId: input.claim.id,
    policyGap: baseGap.unresolvedPolicyGap,
  });
  const memorySkipUrls = memoryUrlsToSkipBeforeRetrieval(memory, input.now);
  const demoteRegistrableDomains = editorialDomainsToDemote(memory);
  const plan = {
    ...input.plan,
    evidenceGap: gap,
    researchMemorySummary: summarizeResearchMemory(memory, input.now),
  };
  const queryPlans = (plan.queryPlans?.length
    ? plan.queryPlans
    : plan.queries.map((query) => ({ query, authorityPath: "independent_technical_pdf" as const }))
  ).slice(0, maximumQueries);
  let selection = selectProposedSet({ assessed, attached: input.attached, attachedClusters, claim: input.claim, gap });
  let stopReason = selection.stopReason;
  const diagnostics = provider.kind === "live" ? emptyLiveRetrievalDiagnostics() : null;
  if (diagnostics) diagnostics.queryAuthorityPaths = queryPlans.map((item) => ({ query: item.query, authorityPath: item.authorityPath }));
  let queryContinuationReason: string | null = null;

  for (const queryPlan of queryPlans) {
    const query = queryPlan.query;
    const assessedCount = assessed.filter(candidateIsAssessed).length;
    const urlAttempts = diagnostics?.urlAttemptCount ?? 0;
    if (selection.satisfied) {
      const skipped = queriesExecuted.length + 1;
      queryContinuationReason = `Query ${skipped} skipped: hypothetical accepted set would satisfy the remaining Evidence Intelligence policy gap.`;
      if (diagnostics) diagnostics.querySkipReasons.push(queryContinuationReason);
      break;
    }
    if (assessedCount >= maximumCandidates) {
      queryContinuationReason = `Query ${queriesExecuted.length + 1} skipped: assessed candidate cap reached while a policy gap remained.`;
      stopReason = "Candidate bound or query bound reached before policy would be satisfied.";
      if (diagnostics) diagnostics.querySkipReasons.push(queryContinuationReason);
      break;
    }
    if (provider.kind === "live" && urlAttempts >= RESEARCH_LIMITS.maximumUrlAttempts) {
      queryContinuationReason = `Query ${queriesExecuted.length + 1} skipped: URL attempt cap reached while a policy gap remained.`;
      stopReason = "URL attempt bound reached before policy would be satisfied.";
      if (diagnostics) diagnostics.querySkipReasons.push(queryContinuationReason);
      break;
    }
    const remaining = maximumRuntimeMs - (Date.now() - startedAtMs);
    if (remaining <= 0 || (provider.kind === "live" && remaining < LIVE_SEARCH_MIN_BUDGET_MS)) {
      stopReason = "Runtime bound reached before policy would be satisfied.";
      queryContinuationReason = "Runtime bound reached before another query could run.";
      if (diagnostics) {
        diagnostics.queriesSkippedForRuntime += 1;
        diagnostics.querySkipReasons.push(queryContinuationReason);
      }
      break;
    }
    const remainingAttempts = provider.kind === "live"
      ? Math.min(RESEARCH_LIMITS.maximumUrlAttemptsPerQuery, RESEARCH_LIMITS.maximumUrlAttempts - urlAttempts)
      : maximumCandidates - assessedCount;
    if (remainingAttempts <= 0) {
      queryContinuationReason = `Query ${queriesExecuted.length + 1} skipped: URL attempt cap reached while a policy gap remained.`;
      if (diagnostics) diagnostics.querySkipReasons.push(queryContinuationReason);
      break;
    }
    const hits = await provider.search({
      query,
      maximumHits: provider.kind === "live"
        ? Math.min(RESEARCH_LIMITS.maximumSearchHitsPerQuery, remainingAttempts + 3)
        : remainingAttempts,
      maximumFetches: remainingAttempts,
      claimOrQuestion: plan.claimOrQuestion,
      startedAtMs,
      maximumRuntimeMs,
      account: diagnostics ?? undefined,
      excludeRegistrableDomains: gap.excludedRegistrableDomains,
      excludeCanonicalUrls: [
        ...gap.acceptedEvidenceRefs.map((ref) => ref.id),
        ...input.attached.map((record) => record.canonicalUrl).filter((item): item is string => Boolean(item)),
        ...memorySkipUrls,
        ...(input.excludeCanonicalUrls ?? []),
      ],
      excludeIndependenceClusters: [...new Set([...gap.excludedPublisherClusters, ...memory.alreadyCountedPublishers])],
      independenceOnlyGap: gap.independenceOnlyGap,
      disallowedSourceClasses: plan.disallowedSourceClasses,
      memorySkipUrls,
      demoteRegistrableDomains,
    });
    if (queriesExecuted.length >= 1) {
      queryContinuationReason = `Query ${queriesExecuted.length + 1} executed because ${gap.unresolvedPolicyGap} remained after query ${queriesExecuted.length}. The next bounded query ran.`;
    }
    queriesExecuted.push(query);
    for (const hit of hits) {
      const urlCheck = validateSourceUrl(hit.canonicalUrl);
      const canonical = urlCheck.canonicalUrl ?? hit.canonicalUrl;
      const duplicate = alreadyHaveUrl(assessed, canonical);
      const memoryDecision = evaluateMemorySkip({ url: canonical, memory, now: input.now });
      if (memoryDecision.skip) {
        if (diagnostics) {
          diagnostics.memorySkippedCount += 1;
          diagnostics.priorUrlsSkipped += 1;
          diagnostics.memoryUrlAttemptsSaved += 1;
          diagnostics.urlAttemptsSaved += 1;
          recordLiveExclusion(diagnostics, {
            url: canonical,
            title: hit.title,
            query,
            stage: "memory",
            reason: memoryDecision.reason,
            retrievalStatus: null,
          });
        }
        if (duplicate) continue;
        const stub = assessDiscoveredHit({ hit: { ...hit, canonicalUrl: canonical, retrievedText: "" }, plan });
        stub.memoryState = "memory_skipped";
        stub.memorySkipReason = memoryDecision.skipReason;
        stub.memoryRetryReason = null;
        stub.queryAuthorityPath = queryPlan.authorityPath;
        stub.reasonExcluded = memoryDecision.reason;
        stub.proposedForReview = false;
        stub.retrievalStatus = (memory.retrievalStatusByUrl[canonical] as CandidateAssessment["retrievalStatus"]) || stub.retrievalStatus;
        if (stub.extraction) {
          stub.extraction.preRetrievalExcluded = true;
          stub.extraction.memoryState = "memory_skipped";
          stub.extraction.memorySkipReason = memoryDecision.skipReason;
          stub.extraction.queryAuthorityPath = queryPlan.authorityPath;
          stub.extraction.searchSurface = classifySearchSurface(canonical, hit.title).surface;
        }
        if (!alreadyHaveUrl(assessed, stub.canonicalUrl)) assessed.push(stub);
        continue;
      }
      if ((input.excludeCanonicalUrls ?? []).some((url) => urlsAreCanonicalDuplicates(url, canonical))) {
        if (diagnostics) {
          diagnostics.urlAttemptsSaved += 1;
          recordLiveExclusion(diagnostics, {
            url: canonical,
            title: hit.title,
            query,
            stage: "pre_retrieval",
            reason: "Canonical document already retrieved in this operator run; not refetched and not auto-attached.",
            retrievalStatus: null,
          });
        }
        continue;
      }
      const exclusion = evaluatePreRetrievalExclusion({
        url: canonical,
        title: hit.title,
        gap,
        alreadyHaveUrl: duplicate,
      });
      if (exclusion?.exclude) {
        if (diagnostics) {
          diagnostics.preRetrievalExclusionCount += 1;
          if (exclusion.advancement === "already_counted") diagnostics.alreadyCountedSkippedCount += 1;
          diagnostics.urlAttemptsSaved += 1;
          recordLiveExclusion(diagnostics, {
            url: canonical,
            title: hit.title,
            query,
            stage: "pre_retrieval",
            reason: exclusion.reason,
            retrievalStatus: null,
          });
        }
        if (duplicate) continue;
        const stub = assessDiscoveredHit({ hit: { ...hit, canonicalUrl: canonical, retrievedText: hit.retrievedText || "" }, plan });
        stub.policyAdvancement = exclusion.advancement;
        stub.reasonExcluded = exclusion.reason;
        stub.proposedForReview = false;
        stub.memoryState = memoryDecision.memoryState;
        stub.queryAuthorityPath = queryPlan.authorityPath;
        if (stub.extraction) {
          stub.extraction.policyAdvancement = exclusion.advancement;
          stub.extraction.preRetrievalExcluded = true;
          stub.extraction.memoryState = memoryDecision.memoryState;
          stub.extraction.queryAuthorityPath = queryPlan.authorityPath;
        }
        if (!alreadyHaveUrl(assessed, stub.canonicalUrl)) assessed.push(stub);
        continue;
      }
      if (duplicate) continue;
      const assessedHit = assessDiscoveredHit({ hit: { ...hit, canonicalUrl: canonical }, plan });
      assessedHit.memoryState = memoryDecision.memoryState;
      assessedHit.memoryRetryReason = memoryDecision.retryReason;
      assessedHit.queryAuthorityPath = queryPlan.authorityPath;
      if (assessedHit.extraction) {
        assessedHit.extraction.memoryState = memoryDecision.memoryState;
        assessedHit.extraction.memoryRetryReason = memoryDecision.retryReason;
        assessedHit.extraction.queryAuthorityPath = queryPlan.authorityPath;
        assessedHit.extraction.searchSurface = classifySearchSurface(canonical, hit.title).surface;
      }
      assessed.push(assessedHit);
    }
    selection = selectProposedSet({ assessed, attached: input.attached, attachedClusters, claim: input.claim, gap });
    stopReason = selection.stopReason;
  }
  if (selection.satisfied) stopReason = selection.stopReason;
  else if (Date.now() - startedAtMs > maximumRuntimeMs && !stopReason.startsWith("Runtime")) {
    stopReason = "Runtime bound reached before policy would be satisfied.";
  }
  if (diagnostics) {
    diagnostics.newUrlsAssessed = selection.candidates.filter((item) => candidateIsAssessed(item) && item.memoryState === "new_candidate").length;
    diagnostics.seenBeforeCount = selection.candidates.filter((item) => item.memoryState === "seen_before").length;
    diagnostics.queryAuthorityPaths = queryPlans.map((item) => ({ query: item.query, authorityPath: item.authorityPath }));
  }

  return {
    plan,
    providerId: provider.id || CANDIDATE_DISCOVERY_PROVIDER_ID,
    providerKind: provider.kind,
    liveRetrieval: provider.kind === "live",
    queriesExecuted,
    candidates: selection.candidates,
    stopReason,
    startedAt,
    finishedAt: new Date().toISOString(),
    diagnostics: diagnostics
      ? finalizeLiveRetrievalDiagnostics(diagnostics, {
        candidateCount: selection.candidates.length,
        assessedCandidateCount: selection.candidates.filter(candidateIsAssessed).length,
        urlAttemptCount: diagnostics.urlAttemptCount || diagnostics.retrievalAttemptedCount,
        stopReason,
        queryContinuationReason,
      })
      : null,
  };
}

export function discoveryDoesNotAcceptEvidence() {
  return true;
}

export { RESEARCH_LIMITS };
