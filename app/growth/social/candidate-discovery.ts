import { canonicalizeUrl, urlsAreCanonicalDuplicates, validateSourceUrl } from "../../lib/research/url-safety.ts";
import { RESEARCH_LIMITS } from "../../lib/research/limits.ts";
import type { CandidateDiscoveryProvider, DiscoveredDocumentHit } from "../../lib/research/candidate-discovery-provider.ts";
import {
  compactExtractionDiagnostics,
  emptyExtractionDiagnostics,
  type CandidateExtractionDiagnostics,
} from "../../lib/research/extraction-diagnostics.ts";
import { matchClaimPassages } from "../../lib/research/passage-match.ts";
import { fixtureCandidateProvider } from "../../lib/research/fixture-candidate-provider.ts";
import { createLiveCandidateProvider } from "../../lib/research/live-candidate-provider.ts";
import {
  emptyLiveRetrievalDiagnostics,
  finalizeLiveRetrievalDiagnostics,
  LIVE_SEARCH_MIN_BUDGET_MS,
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
  type EvidenceSnapshot,
} from "./evidence-intelligence.ts";
import {
  assertBoundedDiscoveryAllowed,
  CANDIDATE_DISCOVERY_PROVIDER_ID,
  liveCandidateDiscoveryAvailable,
} from "./candidate-discovery-capability.ts";
import type { ExecutableResearchPlan } from "./research-planner.ts";

export const CANDIDATE_RELATIONSHIPS = ["supports", "contradicts", "mixed", "irrelevant"] as const;
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
  scopeLimitations: string;
  authorityClass: EvidenceAuthorityClass;
  authorityAdequate: boolean;
  freshness: "current" | "stale" | "unknown";
  rankScore: number;
  reasonSelected: string | null;
  reasonExcluded: string | null;
  proposedForReview: boolean;
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
  const excerpt = extractTraceableExcerpt(retrievedText, claimOrQuestion);
  const contradicts = CONTRADICTION_PATTERN.test(retrievedText);
  if (contradicts && excerpt) return "contradicts";
  if (contradicts) return "contradicts";
  if (excerpt) return "supports";
  return "irrelevant";
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
  const passage = unusable
    ? { excerpt: null, matchCount: 0, missReason: retrievalStatus === "unextractable" && input.hit.extraction?.passageMissReason === "pdf_unsupported" ? "pdf_unsupported" : "retrieval_unusable" }
    : matchClaimPassages(input.hit.retrievedText, input.plan.claimOrQuestion);
  const excerpt = passage.excerpt;
  const relationship = unusable
    ? "irrelevant"
    : classifyCandidateRelationship(input.hit.retrievedText, input.plan.claimOrQuestion);
  const extraction = compactExtractionDiagnostics({
    ...(input.hit.extraction ?? emptyExtractionDiagnostics()),
    passageMatchCount: passage.matchCount,
    passageMissReason: excerpt ? null : (passage.missReason ?? input.hit.extraction?.passageMissReason ?? "no_overlapping_concept"),
  });
  const cluster = independenceCluster({
    ref: { kind: "corpus_document", id: canonicalUrl },
    publisher: input.hit.publisher,
    canonicalUrl,
    underlyingDocumentId: canonicalUrl,
  });
  const authorityAdequate = !unusable && authorityAdequateFor(input.plan.claimClass, authorityClass);
  const disallowed = input.plan.disallowedSourceClasses.includes(input.hit.sourceType) || input.plan.disallowedSourceClasses.includes(authorityClass);
  let reasonExcluded: string | null = null;
  if (!urlCheck.ok) reasonExcluded = `URL rejected: ${urlCheck.issues.join(", ")}.`;
  else if (unusable) reasonExcluded = `Retrieval ${retrievalStatus}: no quotation was generated.`;
  else if (relationship === "irrelevant") reasonExcluded = "Retrieved text does not address the claim.";
  else if (relationship === "contradicts") reasonExcluded = "Contradiction surfaced; not proposed as supporting evidence.";
  else if (disallowed || !authorityAdequate) reasonExcluded = "Source class is insufficient for this claim policy.";
  const scopeLimitations = relationship === "contradicts"
    ? "Surfaces a contradiction. Human corpus review remains authoritative."
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
    excerpts: excerpt ? [{ ...excerpt, locator: input.hit.excerptLocator ?? null }] : [],
    relationship,
    scopeLimitations,
    authorityClass,
    authorityAdequate,
    freshness: freshnessOf(input.hit.publishedDate),
    rankScore: 0,
    reasonSelected: null,
    reasonExcluded,
    proposedForReview: false,
    query: input.hit.query,
    retrievedChecksum: simpleChecksum(input.hit.retrievedText),
    publishedDate: input.hit.publishedDate ?? null,
    resultUrl: input.hit.resultUrl ?? canonicalUrl,
    retrievalStatus: retrievalStatus ?? "ok",
    extraction,
  };
}

export function rankCandidateAssessments(input: {
  candidates: CandidateAssessment[];
  existingClusters: string[];
  economics?: Record<string, unknown>;
}) {
  if (input.economics) assertNoEvidenceEconomics(input.economics, "Candidate ranking");
  const scored = input.candidates.map((candidate) => {
    let score = 0;
    if (candidate.authorityAdequate) score += 100;
    if (isEspeciallyAuthoritative(candidate.authorityClass)) score += 40;
    if (candidate.authorityClass === "manufacturer_technical" || candidate.authorityClass === "equipment_manual") score += 20;
    if (candidate.relationship === "supports") score += 30;
    if (candidate.relationship === "contradicts") score += 15;
    if (candidate.relationship === "mixed") score += 8;
    if (!input.existingClusters.includes(candidate.independenceCluster)) score += 25;
    if (candidate.freshness === "current") score += 5;
    if (candidate.freshness === "stale") score -= 10;
    if (!candidate.authorityAdequate) score -= 50;
    if (candidate.relationship === "irrelevant") score -= 40;
    return { ...candidate, rankScore: score };
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
    validationStatus: candidate.relationship === "contradicts" ? "contradicted" : "claim_supporting",
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
  const supporting = input.proposed.filter((item) => item.relationship === "supports" && item.authorityAdequate && item.retrievalStatus !== "unextractable");
  const conflicting = input.proposed.filter((item) => item.relationship === "contradicts" && item.authorityAdequate);
  const records = [
    ...input.attached,
    ...supporting.map((item, index) => snapshotFromCandidate(item, index)),
    ...conflicting.map((item, index) => snapshotFromCandidate(item, supporting.length + index)),
  ];
  return assessClaimSufficiency({ claim: input.claim, records });
}

function alreadyHaveUrl(candidates: CandidateAssessment[], url: string) {
  return candidates.some((item) => urlsAreCanonicalDuplicates(item.canonicalUrl, url));
}

function selectProposedSet(input: {
  assessed: CandidateAssessment[];
  attached: EvidenceSnapshot[];
  attachedClusters: string[];
  claim: { id: string; claimText: string; safetySensitive: boolean; policyClass?: EvidencePolicyClass | null };
}) {
  const ranked = rankCandidateAssessments({ candidates: input.assessed, existingClusters: input.attachedClusters });
  const proposed: CandidateAssessment[] = [];
  const existing = new Set(input.attachedClusters);
  let stopReason = "Candidate bound or query bound reached before policy would be satisfied.";
  for (const candidate of ranked) {
    if (candidate.relationship === "contradicts") continue;
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
      proposed: [...proposed, ...ranked.filter((item) => item.relationship === "contradicts")],
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
  const attachedClusters = [...new Set(input.attached.map((record) => independenceCluster(record)))];
  let selection = selectProposedSet({ assessed, attached: input.attached, attachedClusters, claim: input.claim });
  let stopReason = selection.stopReason;
  const diagnostics = provider.kind === "live" ? emptyLiveRetrievalDiagnostics() : null;

  for (const query of input.plan.queries.slice(0, maximumQueries)) {
    if (selection.satisfied) break;
    if (assessed.length >= maximumCandidates) break;
    const remaining = maximumRuntimeMs - (Date.now() - startedAtMs);
    if (remaining <= 0 || (provider.kind === "live" && remaining < LIVE_SEARCH_MIN_BUDGET_MS)) {
      stopReason = "Runtime bound reached before policy would be satisfied.";
      if (diagnostics) diagnostics.queriesSkippedForRuntime += 1;
      break;
    }
    const hits = await provider.search({
      query,
      maximumHits: maximumCandidates - assessed.length,
      startedAtMs,
      maximumRuntimeMs,
      account: diagnostics ?? undefined,
    });
    queriesExecuted.push(query);
    for (const hit of hits) {
      if (assessed.length >= maximumCandidates) break;
      const urlCheck = validateSourceUrl(hit.canonicalUrl);
      const canonical = urlCheck.canonicalUrl ?? hit.canonicalUrl;
      if (alreadyHaveUrl(assessed, canonical)) continue;
      assessed.push(assessDiscoveredHit({ hit: { ...hit, canonicalUrl: canonical }, plan: input.plan }));
    }
    selection = selectProposedSet({ assessed, attached: input.attached, attachedClusters, claim: input.claim });
    stopReason = selection.stopReason;
  }
  if (selection.satisfied) stopReason = selection.stopReason;
  else if (Date.now() - startedAtMs > maximumRuntimeMs && !stopReason.startsWith("Runtime")) {
    stopReason = "Runtime bound reached before policy would be satisfied.";
  }

  return {
    plan: input.plan,
    providerId: provider.id || CANDIDATE_DISCOVERY_PROVIDER_ID,
    providerKind: provider.kind,
    liveRetrieval: provider.kind === "live",
    queriesExecuted,
    candidates: selection.candidates,
    stopReason,
    startedAt,
    finishedAt: new Date().toISOString(),
    diagnostics: diagnostics
      ? finalizeLiveRetrievalDiagnostics(diagnostics, { candidateCount: selection.candidates.length, stopReason })
      : null,
  };
}

export function discoveryDoesNotAcceptEvidence() {
  return true;
}

export { RESEARCH_LIMITS };
