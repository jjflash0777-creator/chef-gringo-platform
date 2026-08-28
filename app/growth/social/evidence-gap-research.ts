/**
 * Evidence-gap-aware research planning. Reads Evidence Intelligence state;
 * does not change sufficiency, accept evidence, or publish.
 */

import { RESEARCH_LIMITS } from "../../lib/research/limits.ts";
import { compactResearchQueryTerms } from "../../lib/research/plan.ts";
import {
  publishersAgree,
  registrableDomain,
} from "../../lib/research/publisher-identity.ts";
import {
  CREDIBLE_PRIMARY_CLASSES,
  DISALLOWED_SOURCE_CLASSES,
  ESPECIALLY_AUTHORITATIVE_CLASSES,
  EVIDENCE_POLICY,
  assertNoEvidenceEconomics,
  isCrediblePrimary,
  isEspeciallyAuthoritative,
  type EvidenceAuthorityClass,
  type EvidencePolicyClass,
} from "./evidence-policy.ts";
import {
  independenceCluster,
  recordIsAcceptedSupport,
  type ClaimSufficiencyAssessment,
  type EvidenceSnapshot,
} from "./evidence-intelligence.ts";
import {
  claimCoverageAllowsPolicyAdvancement,
  inferClaimCoverageFromRelationship,
  type ClaimCoverageState,
} from "./claim-coverage.ts";
import { parseSubjectGroundingState } from "./subject-grounding.ts";

export const POLICY_ADVANCEMENTS = [
  "advances_independence",
  "advances_authority",
  "resolves_contradiction",
  "already_counted",
  "insufficient_authority",
  "relevant_no_policy_gain",
] as const;
export type PolicyAdvancement = typeof POLICY_ADVANCEMENTS[number];

export const EVIDENCE_GAP_RESEARCH_VERSION = "evidence-gap-research-v1";

export const AUTHORITY_PATHS = [
  "independent_technical_pdf",
  "professional_engineering_standards",
  "government_regulatory",
  "education_technical",
] as const;
export type AuthorityPath = typeof AUTHORITY_PATHS[number];

export type ResearchQueryPlan = {
  query: string;
  authorityPath: AuthorityPath;
};

export type EvidenceGapFeedback = {
  version: typeof EVIDENCE_GAP_RESEARCH_VERSION;
  acceptedEvidenceRefs: Array<{ kind: string; id: string }>;
  acceptedPublishers: string[];
  acceptedIndependenceClusters: string[];
  acceptedAuthorityClasses: EvidenceAuthorityClass[];
  acceptedRegistrableDomains: string[];
  remainingIndependentSourceCount: number;
  strongerAuthorityRequired: boolean;
  contradictions: string[];
  unresolvedPolicyGap: string;
  alreadySatisfiedDimensions: string[];
  stillMissingDimensions: string[];
  excludedPublisherClusters: string[];
  excludedRegistrableDomains: string[];
  preferredNextSourceClasses: EvidenceAuthorityClass[];
  stopCondition: string;
  independenceOnlyGap: boolean;
  liveCandidatesAreNotAcceptedEvidence: true;
};

const CLEARLY_DISALLOWED = /\b(affiliate|deals|coupon|buy-now|add-to-cart)\b/i;
const GOVERNMENT_OR_GENERIC = /\.(gov|mil|edu)$/i;
const SITE_SAFE = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

export function emptyEvidenceGapFeedback(): EvidenceGapFeedback {
  return {
    version: EVIDENCE_GAP_RESEARCH_VERSION,
    acceptedEvidenceRefs: [],
    acceptedPublishers: [],
    acceptedIndependenceClusters: [],
    acceptedAuthorityClasses: [],
    acceptedRegistrableDomains: [],
    remainingIndependentSourceCount: 0,
    strongerAuthorityRequired: false,
    contradictions: [],
    unresolvedPolicyGap: "unsupported",
    alreadySatisfiedDimensions: [],
    stillMissingDimensions: ["supporting_evidence"],
    excludedPublisherClusters: [],
    excludedRegistrableDomains: [],
    preferredNextSourceClasses: [...CREDIBLE_PRIMARY_CLASSES],
    stopCondition: "Stop when Evidence Intelligence would treat the claim as supported.",
    independenceOnlyGap: false,
    liveCandidatesAreNotAcceptedEvidence: true,
  };
}

export function buildEvidenceGapFeedback(input: {
  assessment?: ClaimSufficiencyAssessment | null;
  attached?: EvidenceSnapshot[];
  policyClass?: EvidencePolicyClass;
}): EvidenceGapFeedback {
  const assessment = input.assessment ?? null;
  const attached = (input.attached ?? []).filter((record) => recordIsAcceptedSupport(record));
  if (!assessment && !attached.length) return emptyEvidenceGapFeedback();
  const policyClass = assessment?.policyClass ?? input.policyClass ?? "broad_technical";
  const policy = EVIDENCE_POLICY[policyClass];
  const accepted = assessment?.acceptedSources ?? attached.map((record) => ({
    ref: record.ref,
    publisher: record.publisher ?? null,
    title: record.title ?? null,
    authorityClass: "unknown" as EvidenceAuthorityClass,
  }));
  const clusters = [...new Set([
    ...(assessment ? accepted.map((item) => independenceCluster({
      ref: item.ref,
      publisher: item.publisher,
      canonicalUrl: attached.find((record) => record.ref.id === item.ref.id)?.canonicalUrl ?? null,
      underlyingDocumentId: attached.find((record) => record.ref.id === item.ref.id)?.underlyingDocumentId ?? null,
    })) : []),
    ...attached.map((record) => independenceCluster(record)),
  ].filter(Boolean))];
  const authorityClasses = [...new Set(assessment?.authorityClasses ?? [])];
  const hasStrong = authorityClasses.some((item) => isEspeciallyAuthoritative(item));
  const remainingIndependent = Math.max(0, (assessment?.researchPlan?.independentSourcesDesired ?? policy.minIndependentAccepted) - (assessment?.independentSourceCount ?? clusters.length));
  const strongerAuthorityRequired = Boolean(
    assessment?.state === "insufficient_authority"
    || (assessment?.state === "needs_independent_corroboration" && !hasStrong)
    || policyClass === "safety_sensitive" && !hasStrong,
  );
  const contradictions = assessment?.state === "conflicted" || assessment?.dimensions.contradiction === "unresolved"
    ? (assessment.gaps.length ? assessment.gaps : ["Unresolved contradictory evidence is attached."])
    : [];
  const unresolvedPolicyGap = assessment?.state && assessment.state !== "supported"
    ? assessment.state
    : attached.length ? "none" : "unsupported";
  const alreadySatisfied: string[] = [];
  if ((assessment?.acceptedSourceCount ?? attached.length) > 0) alreadySatisfied.push("accepted_supporting_record");
  if ((assessment?.independentSourceCount ?? clusters.length) > 0) alreadySatisfied.push("independent_publisher");
  if (authorityClasses.some((item) => isCrediblePrimary(item))) alreadySatisfied.push("credible_primary_authority");
  if (hasStrong) alreadySatisfied.push("especially_authoritative");
  const stillMissing: string[] = [];
  if (contradictions.length) stillMissing.push("contradiction_resolution");
  if (remainingIndependent > 0 && unresolvedPolicyGap === "needs_independent_corroboration") stillMissing.push("independent_publisher");
  if (strongerAuthorityRequired) stillMissing.push("stronger_authority");
  if (unresolvedPolicyGap === "unsupported" || unresolvedPolicyGap === "stale") stillMissing.push("supporting_evidence");
  if (unresolvedPolicyGap === "partial") stillMissing.push("claim_breadth");
  const domains = acceptedRegistrableDomains(attached, accepted.map((item) => item.publisher));
  const independenceOnlyGap = unresolvedPolicyGap === "needs_independent_corroboration"
    && !contradictions.length
    && remainingIndependent > 0;
  const preferredNext = preferredNextSourceClasses(unresolvedPolicyGap, policyClass, strongerAuthorityRequired);
  return {
    version: EVIDENCE_GAP_RESEARCH_VERSION,
    acceptedEvidenceRefs: accepted.map((item) => item.ref),
    acceptedPublishers: [...new Set(accepted.map((item) => item.publisher).filter((item): item is string => Boolean(item)))],
    acceptedIndependenceClusters: clusters,
    acceptedAuthorityClasses: authorityClasses,
    acceptedRegistrableDomains: domains,
    remainingIndependentSourceCount: remainingIndependent,
    strongerAuthorityRequired,
    contradictions,
    unresolvedPolicyGap,
    alreadySatisfiedDimensions: alreadySatisfied,
    stillMissingDimensions: stillMissing,
    excludedPublisherClusters: independenceOnlyGap || unresolvedPolicyGap === "needs_independent_corroboration" || contradictions.length
      ? clusters
      : [],
    excludedRegistrableDomains: independenceOnlyGap || unresolvedPolicyGap === "needs_independent_corroboration" || contradictions.length
      ? domains
      : [],
    preferredNextSourceClasses: preferredNext,
    stopCondition: gapStopCondition(unresolvedPolicyGap, remainingIndependent, strongerAuthorityRequired),
    independenceOnlyGap,
    liveCandidatesAreNotAcceptedEvidence: true,
  };
}

export function buildAuthoritativeQueryPlans(input: {
  claimOrQuestion: string;
  policyClass: EvidencePolicyClass;
  gap: EvidenceGapFeedback;
  maximumQueries?: number;
}): ResearchQueryPlan[] {
  const limit = input.maximumQueries ?? RESEARCH_LIMITS.maximumQueries;
  const terms = compactResearchQueryTerms(input.claimOrQuestion);
  if (!terms) return [];
  const minusSites = exclusionSiteTerms(input.gap);
  const withSites = (query: string) => (minusSites.length ? `${query} ${minusSites.join(" ")}` : query);
  const independentPdf: ResearchQueryPlan = {
    query: withSites(`${terms} filetype:pdf independent manual`),
    authorityPath: "independent_technical_pdf",
  };
  const engineeringPdf: ResearchQueryPlan = {
    query: withSites(`${terms} filetype:pdf engineering guide`),
    authorityPath: "professional_engineering_standards",
  };
  const professionalStandard: ResearchQueryPlan = {
    query: withSites(`${terms} professional standard`),
    authorityPath: "professional_engineering_standards",
  };
  const government: ResearchQueryPlan = {
    query: `${terms} site:.gov`,
    authorityPath: "government_regulatory",
  };
  const education: ResearchQueryPlan = {
    query: `${terms} site:.edu`,
    authorityPath: "education_technical",
  };

  let sequenced: ResearchQueryPlan[];
  if (input.gap.contradictions.length || input.gap.unresolvedPolicyGap === "conflicted") {
    sequenced = [independentPdf, professionalStandard, government];
  } else if (
    input.gap.unresolvedPolicyGap === "insufficient_authority"
    || (input.gap.strongerAuthorityRequired && input.gap.unresolvedPolicyGap !== "needs_independent_corroboration")
  ) {
    sequenced = [government, professionalStandard, education];
  } else if (input.gap.unresolvedPolicyGap === "needs_independent_corroboration") {
    sequenced = [independentPdf, engineeringPdf, government];
  } else if (input.policyClass === "safety_sensitive") {
    sequenced = [government, professionalStandard, education];
  } else if (input.policyClass === "broad_technical") {
    sequenced = [independentPdf, engineeringPdf, government];
  } else {
    sequenced = [independentPdf, professionalStandard, government];
  }

  const unique: ResearchQueryPlan[] = [];
  const seenPath = new Set<AuthorityPath>();
  const seenQuery = new Set<string>();
  for (const plan of sequenced) {
    if (!plan.query || seenQuery.has(plan.query) || seenPath.has(plan.authorityPath)) continue;
    seenQuery.add(plan.query);
    seenPath.add(plan.authorityPath);
    unique.push(plan);
    if (unique.length >= limit) break;
  }
  return unique;
}

export function queryPlansAreDiverse(plans: ResearchQueryPlan[]) {
  return new Set(plans.map((plan) => plan.authorityPath)).size === plans.length;
}

export function buildGapAwareQueries(input: {
  claimOrQuestion: string;
  policyClass: EvidencePolicyClass;
  gap: EvidenceGapFeedback;
  maximumQueries?: number;
}): string[] {
  return buildAuthoritativeQueryPlans(input).map((plan) => plan.query);
}

export function exclusionSiteTerms(gap: EvidenceGapFeedback): string[] {
  return gap.excludedRegistrableDomains
    .filter((domain) => SITE_SAFE.test(domain) && !GOVERNMENT_OR_GENERIC.test(domain))
    .slice(0, 3)
    .map((domain) => `-site:${domain}`);
}

export function classifyPolicyAdvancement(input: {
  independenceCluster: string;
  authorityClass: EvidenceAuthorityClass;
  authorityAdequate: boolean;
  relationship: string;
  gap: EvidenceGapFeedback;
  claimCoverage?: ClaimCoverageState | null;
  subjectGrounding?: string | null;
  claimText?: string | null;
}): PolicyAdvancement {
  const counted = input.gap.acceptedIndependenceClusters.includes(input.independenceCluster)
    || input.gap.excludedPublisherClusters.includes(input.independenceCluster);
  if (counted) return "already_counted";
  const coverage = input.claimCoverage ?? inferClaimCoverageFromRelationship(input.relationship);
  const subject = parseSubjectGroundingState(input.subjectGrounding);
  if (input.gap.contradictions.length && (input.relationship === "contradicts" || input.relationship === "mixed") && input.authorityAdequate) {
    return claimCoverageAllowsPolicyAdvancement(coverage, input.relationship, subject, input.claimText) ? "resolves_contradiction" : "relevant_no_policy_gain";
  }
  if (!input.authorityAdequate) return "insufficient_authority";
  if (!claimCoverageAllowsPolicyAdvancement(coverage, input.relationship, subject, input.claimText)) return "relevant_no_policy_gain";
  if (input.gap.strongerAuthorityRequired && isEspeciallyAuthoritative(input.authorityClass)) return "advances_authority";
  if (input.gap.remainingIndependentSourceCount > 0 && input.authorityAdequate && input.relationship === "supports") {
    return "advances_independence";
  }
  if (isEspeciallyAuthoritative(input.authorityClass) && input.gap.unresolvedPolicyGap !== "none" && input.relationship === "supports") {
    return "advances_authority";
  }
  if (input.relationship === "supports" && input.authorityAdequate && input.gap.remainingIndependentSourceCount > 0) {
    return "advances_independence";
  }
  return "relevant_no_policy_gain";
}

export function policyAdvancementScore(advancement: PolicyAdvancement): number {
  if (advancement === "advances_authority") return 60;
  if (advancement === "advances_independence") return 55;
  if (advancement === "resolves_contradiction") return 50;
  if (advancement === "already_counted") return -70;
  if (advancement === "insufficient_authority") return -25;
  return 0;
}

export function evaluatePreRetrievalExclusion(input: {
  url: string;
  title: string;
  snippet?: string;
  gap: Pick<EvidenceGapFeedback, "excludedRegistrableDomains" | "independenceOnlyGap" | "unresolvedPolicyGap">;
  alreadyHaveUrl?: boolean;
}): { exclude: boolean; reason: string; advancement: PolicyAdvancement } | null {
  if (input.alreadyHaveUrl) {
    return { exclude: true, reason: "Exact duplicate URL skipped before retrieval.", advancement: "already_counted" };
  }
  let hostname = "";
  try {
    hostname = new URL(input.url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    hostname = "";
  }
  const domain = registrableDomain(hostname);
  const independenceOnly = input.gap.independenceOnlyGap || input.gap.unresolvedPolicyGap === "needs_independent_corroboration";
  if (independenceOnly && domain && input.gap.excludedRegistrableDomains.includes(domain)) {
    return {
      exclude: true,
      reason: "Already-counted publisher skipped before retrieval; no independence gain.",
      advancement: "already_counted",
    };
  }
  const haystack = `${input.url} ${input.title} ${input.snippet ?? ""}`;
  if (CLEARLY_DISALLOWED.test(haystack) && (DISALLOWED_SOURCE_CLASSES as readonly string[]).some((item) => item === "affiliate_page" || item === "editorial" || item === "lead_only")) {
    if (/\b(affiliate|deals|coupon)\b/i.test(haystack)) {
      return {
        exclude: true,
        reason: "Clearly disallowed source class from search metadata; skipped before retrieval.",
        advancement: "insufficient_authority",
      };
    }
  }
  return null;
}

export function preferredNextSourceClasses(
  unresolvedPolicyGap: string,
  policyClass: EvidencePolicyClass,
  strongerAuthorityRequired: boolean,
): EvidenceAuthorityClass[] {
  if (unresolvedPolicyGap === "insufficient_authority" || strongerAuthorityRequired && unresolvedPolicyGap !== "needs_independent_corroboration") {
    return [...ESPECIALLY_AUTHORITATIVE_CLASSES];
  }
  if (unresolvedPolicyGap === "conflicted" || unresolvedPolicyGap === "needs_independent_corroboration") {
    return ["manufacturer_technical", "equipment_manual", "industry_organization", "government_regulatory", "code_standard"];
  }
  if (policyClass === "safety_sensitive") return [...ESPECIALLY_AUTHORITATIVE_CLASSES];
  return [...CREDIBLE_PRIMARY_CLASSES];
}

export function candidateConsumesAssessedCapacity(input: {
  policyAdvancement?: PolicyAdvancement | null;
  preRetrievalExcluded?: boolean;
  retrievalStatus?: string | null;
  memoryState?: string | null;
}): boolean {
  if (input.memoryState === "memory_skipped") return false;
  if (input.preRetrievalExcluded) return false;
  if (input.policyAdvancement === "already_counted") return false;
  return (input.retrievalStatus ?? "ok") === "ok";
}

export function assertGapHasNoEconomics(economics?: Record<string, unknown>) {
  if (!economics) return;
  assertNoEvidenceEconomics(economics, "Evidence-gap research");
}

function acceptedRegistrableDomains(attached: EvidenceSnapshot[], publishers: Array<string | null>) {
  const domains: string[] = [];
  for (const record of attached) {
    if (!recordIsAcceptedSupport(record)) continue;
    let hostname = "";
    try {
      hostname = record.canonicalUrl ? new URL(record.canonicalUrl).hostname.replace(/^www\./, "").toLowerCase() : "";
    } catch {
      hostname = "";
    }
    const domain = registrableDomain(hostname);
    if (!domain || GOVERNMENT_OR_GENERIC.test(domain) || !SITE_SAFE.test(domain)) continue;
    const publisher = record.publisher || publishers.find(Boolean) || "";
    const label = domain.split(".")[0] ?? "";
    if (!publisher || !publishersAgree(label, publisher) && !compactIncludes(publisher, label)) continue;
    domains.push(domain);
  }
  return [...new Set(domains)];
}

function compactIncludes(publisher: string, label: string) {
  const left = publisher.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const right = label.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return Boolean(left && right && left.length >= 4 && right.length >= 4 && (left.includes(right) || right.includes(left)));
}

function gapStopCondition(unresolvedPolicyGap: string, remainingIndependent: number, strongerAuthorityRequired: boolean) {
  if (unresolvedPolicyGap === "conflicted") {
    return "Stop when an independent source would resolve the contradiction under Evidence Intelligence, or when bounded caps are reached.";
  }
  if (unresolvedPolicyGap === "needs_independent_corroboration") {
    return strongerAuthorityRequired
      ? "Stop when a second independent credible source would be accepted, or one especially authoritative source would cover the full recommendation."
      : `Stop when ${remainingIndependent} additional independent credible source(s) would satisfy Evidence Intelligence.`;
  }
  if (unresolvedPolicyGap === "insufficient_authority") {
    return "Stop when a stronger authority class would satisfy Evidence Intelligence.";
  }
  if (unresolvedPolicyGap === "supported" || unresolvedPolicyGap === "none") {
    return "No additional search is required; Evidence Intelligence already treats the claim as supported.";
  }
  return "Stop when hypothetical accepted evidence would satisfy the remaining Evidence Intelligence policy gap.";
}
