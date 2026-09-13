import type { SocialCommercialPosture } from "./commercial.ts";
import type { SocialAudience, SocialPackageClaim } from "./types.ts";
import type { SocialEvidenceRef } from "./claims.ts";
import type { SocialEvidenceRequest } from "./evidence-requests.ts";
import {
  DISALLOWED_SOURCE_CLASSES,
  EVIDENCE_POLICY,
  type EvidenceAuthorityClass,
  type EvidencePolicyClass,
  authorityClassFromSourceMetadata,
  deriveClaimPolicyClass,
  isCrediblePrimary,
  isEspeciallyAuthoritative,
  isManufacturerAuthority,
  preferredPrimarySourcesForDomain,
  FORBIDDEN_EVIDENCE_ECONOMICS_KEYS,
} from "./evidence-policy.ts";

export const EVIDENCE_SUFFICIENCY_STATES = [
  "unsupported",
  "partial",
  "supported",
  "conflicted",
  "stale",
  "insufficient_authority",
  "needs_independent_corroboration",
] as const;
export type EvidenceSufficiencyState = typeof EVIDENCE_SUFFICIENCY_STATES[number];

export const EVIDENCE_READINESS_STATES = ["not_ready", "partial", "ready"] as const;
export type EvidenceReadinessState = typeof EVIDENCE_READINESS_STATES[number];

export const CONTENT_READINESS_STATES = ["not_ready", "drafting_allowed"] as const;
export type ContentReadinessState = typeof CONTENT_READINESS_STATES[number];

export const RECOMMENDATION_READINESS_STATES = ["not_ready", "ready"] as const;
export type RecommendationReadinessState = typeof RECOMMENDATION_READINESS_STATES[number];

export const PUBLICATION_READINESS_STATES = ["not_authorized", "authorized"] as const;
export type PublicationReadinessState = typeof PUBLICATION_READINESS_STATES[number];

export type EvidenceSnapshot = {
  ref: SocialEvidenceRef;
  exists: boolean;
  title?: string | null;
  publisher?: string | null;
  canonicalUrl?: string | null;
  sourceType?: string | null;
  provenanceMethod?: string | null;
  authorityTier?: number | null;
  evidenceDomain?: string | null;
  ingestionStatus?: string | null;
  verificationStatus?: string | null;
  validationStatus?: string | null;
  productionExposure?: boolean | null;
  publishedDate?: string | null;
  lastValidatedDate?: string | null;
  refreshDueAt?: string | null;
  underlyingDocumentId?: string | null;
};

export type EvidenceRecordAssessment = {
  ref: SocialEvidenceRef;
  accepted: boolean;
  independenceCluster: string;
  authorityClass: EvidenceAuthorityClass;
  publisher: string | null;
  title: string | null;
  stale: boolean;
  contradicted: boolean;
};

export type ClaimSufficiencyAssessment = {
  claimId: string;
  claimText: string;
  safetySensitive: boolean;
  policyClass: EvidencePolicyClass;
  state: EvidenceSufficiencyState;
  acceptedSourceCount: number;
  independentSourceCount: number;
  authorityClasses: EvidenceAuthorityClass[];
  authorityStatus: string;
  acceptedSources: Array<{ ref: SocialEvidenceRef; publisher: string | null; title: string | null; authorityClass: EvidenceAuthorityClass }>;
  dimensions: {
    acceptedSupportingRecords: number;
    independentPublishers: number;
    sourceProvenanceClasses: EvidenceAuthorityClass[];
    authorityAdequate: boolean;
    freshness: "current" | "stale" | "unknown" | "not_applicable";
    contradiction: "none" | "unresolved";
    safetySensitive: boolean;
    breadthMatch: boolean;
  };
  gaps: string[];
  recommendedNextAction: string;
  researchPlan: EvidenceResearchPlan | null;
};

export type EvidenceResearchPlan = {
  claimOrQuestion: string;
  requiredAuthorityClass: EvidenceAuthorityClass | "especially_authoritative";
  independentSourcesDesired: number;
  preferredPrimarySources: string[];
  disallowedSourceClasses: string[];
  stopCondition: string;
  reason: string;
};

export type EvidenceGapRadarItem = {
  kind: "claim" | "evidence_request";
  id: string;
  label: string;
  state: EvidenceSufficiencyState | "unresolved_request";
  bucket:
    | "supported"
    | "partial"
    | "unsupported"
    | "needs_independent_corroboration"
    | "stronger_authority"
    | "contradiction"
    | "unresolved_request";
  recommendedNextAction: string;
  researchPlan: EvidenceResearchPlan | null;
};

export type EvidenceGapRadar = {
  supported: EvidenceGapRadarItem[];
  partial: EvidenceGapRadarItem[];
  unsupported: EvidenceGapRadarItem[];
  unresolvedEvidenceRequests: EvidenceGapRadarItem[];
  needsIndependentCorroboration: EvidenceGapRadarItem[];
  strongerAuthority: EvidenceGapRadarItem[];
  contradictions: EvidenceGapRadarItem[];
  items: EvidenceGapRadarItem[];
};

export type DecisionDna = {
  packageId: string;
  problem: string;
  audience: SocialAudience | string | null;
  thesis: string;
  claims: Array<{ id: string; claimText: string; safetySensitive: boolean; evidence: SocialEvidenceRef; evidenceRefs: SocialEvidenceRef[]; sufficiency: EvidenceSufficiencyState }>;
  evidenceReferences: SocialEvidenceRef[];
  sufficiencyByClaim: Array<{ claimId: string; state: EvidenceSufficiencyState; independentSourceCount: number; acceptedSourceCount: number }>;
  assumptions: string[];
  unresolvedQuestions: string[];
  contradictions: string[];
  commercialPosture: SocialCommercialPosture | string;
  evidenceReadiness: EvidenceReadinessState;
  contentReadiness: ContentReadinessState;
  recommendationReadiness: RecommendationReadinessState;
  publicationReadiness: PublicationReadinessState;
  historicalGate: "open" | "blocked";
  intelligenceAuthority: "ready" | "blocked";
  autonomyReadiness: AutonomyReadinessState;
};

export const AUTONOMY_READINESS_STATES = ["autonomy_eligible", "human_review_required", "blocked"] as const;
export type AutonomyReadinessState = typeof AUTONOMY_READINESS_STATES[number];

export type PackageEvidenceIntelligence = {
  packageId: string;
  policyVersion: string;
  historicalApprovalGateSeparate: true;
  historicalCanApprove: boolean;
  intelligenceAuthorityReady: boolean;
  autonomyReadiness: AutonomyReadinessState;
  claimAssessments: ClaimSufficiencyAssessment[];
  radar: EvidenceGapRadar;
  decisionDna: DecisionDna;
};

function uniqueEvidenceSnapshots(records: EvidenceSnapshot[]) {
  const seen = new Set<string>();
  const unique: EvidenceSnapshot[] = [];
  for (const record of records) {
    const key = `${record.ref.kind}:${record.ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }
  return unique;
}

export function hasIntelligenceReadyApprovalAuthority(input: {
  historicalCanApprove: boolean;
  recommendationReadiness: RecommendationReadinessState;
  claimAssessments: ClaimSufficiencyAssessment[];
}) {
  if (!input.historicalCanApprove) return false;
  if (!input.claimAssessments.length) return false;
  if (input.recommendationReadiness !== "ready") return false;
  if (input.claimAssessments.some((item) => item.state !== "supported")) return false;
  if (input.claimAssessments.some((item) => item.state === "conflicted" || item.state === "insufficient_authority")) return false;
  return true;
}

export function classifyAutonomyReadiness(input: {
  claimAssessments: ClaimSufficiencyAssessment[];
  unresolvedQuestionCount: number;
  economics?: Record<string, unknown>;
}): AutonomyReadinessState {
  if (input.economics) {
    const copy = { ...input.economics };
    for (const key of FORBIDDEN_EVIDENCE_ECONOMICS_KEYS) delete copy[key];
    void copy;
  }
  if (!input.claimAssessments.length) return "blocked";
  if (input.unresolvedQuestionCount > 0) return "blocked";
  const blocking = input.claimAssessments.some((item) => (
    item.state === "unsupported"
    || item.state === "conflicted"
    || item.state === "insufficient_authority"
    || item.state === "stale"
    || item.state === "partial"
    || item.state === "needs_independent_corroboration"
  ));
  if (blocking) return "blocked";
  if (!input.claimAssessments.every((item) => item.state === "supported")) return "blocked";
  if (input.claimAssessments.some((item) => item.safetySensitive || item.policyClass === "safety_sensitive")) return "human_review_required";
  if (input.claimAssessments.some((item) => item.policyClass === "broad_technical")) return "human_review_required";
  if (input.claimAssessments.every((item) => item.policyClass === "narrow_factual" && item.state === "supported")) return "autonomy_eligible";
  return "blocked";
}

function normalizePublisher(value: string | null | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hostnameOf(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function independenceCluster(record: Pick<EvidenceSnapshot, "ref" | "publisher" | "canonicalUrl" | "underlyingDocumentId">) {
  const documentId = record.underlyingDocumentId || (record.ref.kind === "corpus_document" ? record.ref.id : "");
  const publisher = normalizePublisher(record.publisher);
  const host = hostnameOf(record.canonicalUrl);
  // Same publisher/host is one independent cluster — two records from the
  // same manufacturer do not corroborate each other. Document id is the
  // fallback when publisher and host are missing (two excerpts, one source).
  if (publisher) return `publisher:${publisher}`;
  if (host) return `host:${host}`;
  if (documentId) return `document:${documentId}`;
  return `ref:${record.ref.kind}:${record.ref.id}`;
}

export function recordIsAcceptedSupport(record: EvidenceSnapshot, asOf = new Date()) {
  void asOf;
  if (!record.exists) return false;
  if (record.ingestionStatus === "rejected" || record.ingestionStatus === "failed" || record.ingestionStatus === "submitted") return false;
  if (record.ingestionStatus === "awaiting_review" || record.ingestionStatus === "parsed" || record.ingestionStatus === "fetching") return false;
  if (record.verificationStatus === "draft" || record.verificationStatus === "withdrawn" || record.verificationStatus === "superseded") return false;
  if (record.ingestionStatus === "stale" || record.ingestionStatus === "superseded") return false;
  if (record.ingestionStatus === "accepted") return true;
  if (record.verificationStatus === "verified") return true;
  return false;
}

export function recordIsStale(record: EvidenceSnapshot, asOf = new Date()) {
  if (record.ingestionStatus === "stale" || record.ingestionStatus === "superseded" || record.verificationStatus === "superseded") return true;
  if (record.validationStatus === "stale") return true;
  if (record.refreshDueAt && !Number.isNaN(Date.parse(record.refreshDueAt)) && Date.parse(record.refreshDueAt) <= asOf.getTime()) return true;
  return false;
}

export function recordIsContradicted(record: EvidenceSnapshot) {
  return record.validationStatus === "contradicted";
}

function assessRecord(record: EvidenceSnapshot, asOf: Date): EvidenceRecordAssessment {
  const authorityClass = authorityClassFromSourceMetadata({
    sourceType: record.sourceType,
    provenanceMethod: record.provenanceMethod,
  });
  return {
    ref: record.ref,
    accepted: recordIsAcceptedSupport(record, asOf) && !recordIsStale(record, asOf) && authorityClass !== "lead_only",
    independenceCluster: independenceCluster(record),
    authorityClass,
    publisher: record.publisher ?? null,
    title: record.title ?? null,
    stale: recordIsStale(record, asOf),
    contradicted: recordIsContradicted(record),
  };
}

export function buildResearchPlan(input: {
  claimOrQuestion: string;
  policyClass: EvidencePolicyClass;
  evidenceDomain?: string | null;
  independentSourcesDesired: number;
  reason: string;
  requiredAuthorityClass?: EvidenceAuthorityClass | "especially_authoritative";
}): EvidenceResearchPlan {
  const required = input.requiredAuthorityClass
    ?? (input.policyClass === "safety_sensitive" ? "especially_authoritative" : input.policyClass === "broad_technical" ? "especially_authoritative" : "primary_documentation");
  const stop = input.policyClass === "safety_sensitive"
    ? "Stop when one especially authoritative accepted source covers the safety claim, or when an unresolved contradiction appears."
    : input.policyClass === "broad_technical"
      ? "Stop when two independent credible sources are accepted, or one especially authoritative source covers the full recommendation."
      : "Stop when one accepted authoritative primary source covers the factual claim.";
  return {
    claimOrQuestion: input.claimOrQuestion,
    requiredAuthorityClass: required,
    independentSourcesDesired: input.independentSourcesDesired,
    preferredPrimarySources: preferredPrimarySourcesForDomain(input.evidenceDomain),
    disallowedSourceClasses: [...DISALLOWED_SOURCE_CLASSES],
    stopCondition: stop,
    reason: input.reason,
  };
}

export function assessClaimSufficiency(input: {
  claim: Pick<SocialPackageClaim, "id" | "claimText" | "safetySensitive"> & { policyClass?: EvidencePolicyClass | null };
  records: EvidenceSnapshot[];
  asOf?: Date;
}): ClaimSufficiencyAssessment {
  const records = uniqueEvidenceSnapshots(input.records.map((record) => {
    const copy = { ...record } as EvidenceSnapshot & Record<string, unknown>;
    for (const key of Object.keys(copy)) {
      if ((FORBIDDEN_EVIDENCE_ECONOMICS_KEYS as readonly string[]).includes(key)) delete copy[key];
    }
    return copy;
  }));
  const asOf = input.asOf ?? new Date();
  const policyClass = deriveClaimPolicyClass({
    safetySensitive: input.claim.safetySensitive,
    claimText: input.claim.claimText,
    policyClass: input.claim.policyClass,
  });
  const policy = EVIDENCE_POLICY[policyClass];
  const assessed = records.map((record) => assessRecord(record, asOf));
  const contradicted = assessed.filter((item) => item.contradicted);
  const staleRecords = assessed.filter((item) => item.stale && item.ref);
  const accepted = assessed.filter((item) => item.accepted);
  const clusters = new Set(accepted.map((item) => item.independenceCluster));
  const authorityClasses = [...new Set(accepted.map((item) => item.authorityClass))];
  const hasStrong = accepted.some((item) => isEspeciallyAuthoritative(item.authorityClass));
  const manufacturerOnly = accepted.length > 0 && accepted.every((item) => isManufacturerAuthority(item.authorityClass));
  const authorityAdequate = policyClass === "safety_sensitive"
    ? hasStrong
    : policyClass === "broad_technical"
      ? hasStrong || (clusters.size >= policy.minIndependentAccepted && accepted.every((item) => isCrediblePrimary(item.authorityClass)))
      : accepted.some((item) => isCrediblePrimary(item.authorityClass) || isEspeciallyAuthoritative(item.authorityClass));
  const breadthMatch = policyClass === "narrow_factual"
    ? clusters.size >= 1 && authorityAdequate
    : policyClass === "broad_technical"
      ? hasStrong || clusters.size >= 2
      : hasStrong;
  const freshness = accepted.length === 0 && staleRecords.length === 0
    ? (records.length ? "unknown" : "not_applicable")
    : staleRecords.length && !accepted.length
      ? "stale"
      : staleRecords.length
        ? "unknown"
        : "current";

  const gaps: string[] = [];
  let state: EvidenceSufficiencyState = "unsupported";
  let recommendedNextAction = "Attach accepted existing evidence, or open an evidence request.";
  let researchPlan: EvidenceResearchPlan | null = null;

  if (contradicted.length) {
    state = "conflicted";
    gaps.push("Unresolved contradictory evidence is attached.");
    recommendedNextAction = "Do not treat this claim as supported until corpus review resolves the contradiction.";
    researchPlan = buildResearchPlan({
      claimOrQuestion: input.claim.claimText,
      policyClass,
      independentSourcesDesired: Math.max(policy.minIndependentAccepted, 1),
      reason: "An unresolved contradiction blocks sufficiency until existing review handles it.",
    });
  } else if (!accepted.length && staleRecords.length) {
    state = "stale";
    gaps.push("Attached evidence is stale or superseded.");
    recommendedNextAction = "Replace stale evidence through existing corpus review. Do not reuse rejected or stale records.";
  } else if (!accepted.length) {
    state = "unsupported";
    gaps.push("No accepted supporting evidence records.");
    recommendedNextAction = "Submit a candidate into the existing corpus intake. Growth cannot accept it.";
    researchPlan = buildResearchPlan({
      claimOrQuestion: input.claim.claimText,
      policyClass,
      independentSourcesDesired: policy.minIndependentAccepted,
      reason: "The claim has no accepted evidence.",
    });
  } else if (policyClass === "safety_sensitive" && manufacturerOnly) {
    state = "insufficient_authority";
    gaps.push("Manufacturer material alone cannot satisfy a safety-sensitive rule.");
    recommendedNextAction = "Obtain government, code/standard, or equivalent independent authority. Do not accept manufacturer copy as sufficient.";
    researchPlan = buildResearchPlan({
      claimOrQuestion: input.claim.claimText,
      policyClass,
      independentSourcesDesired: 1,
      requiredAuthorityClass: "especially_authoritative",
      reason: "Safety-sensitive claims require a stronger authority class than manufacturer documentation alone.",
    });
  } else if (policyClass === "safety_sensitive" && !hasStrong) {
    state = "insufficient_authority";
    gaps.push("Safety-sensitive claims require an especially authoritative source class.");
    recommendedNextAction = "Attach accepted government/regulatory or code/standard evidence after existing corpus review.";
    researchPlan = buildResearchPlan({
      claimOrQuestion: input.claim.claimText,
      policyClass,
      independentSourcesDesired: 1,
      requiredAuthorityClass: "especially_authoritative",
      reason: "Stronger authority is required before this safety-sensitive claim is sufficient.",
    });
  } else if (policyClass === "broad_technical" && manufacturerOnly && clusters.size < 2 && !hasStrong) {
    state = "needs_independent_corroboration";
    gaps.push("A broader technical recommendation is not sufficient on a single manufacturer source.");
    recommendedNextAction = "Obtain independent corroboration from a second recognized manufacturer or technical authority.";
    researchPlan = buildResearchPlan({
      claimOrQuestion: input.claim.claimText,
      policyClass,
      independentSourcesDesired: 2,
      reason: "Independent corroboration is required before the recommendation is considered sufficient.",
    });
  } else if (policyClass === "broad_technical" && clusters.size < 2 && !hasStrong) {
    state = "needs_independent_corroboration";
    gaps.push("Only one independent source cluster supports a broader technical claim.");
    recommendedNextAction = "Attach a second independent accepted source, or one especially authoritative source that covers the full claim.";
    researchPlan = buildResearchPlan({
      claimOrQuestion: input.claim.claimText,
      policyClass,
      independentSourcesDesired: 2,
      reason: "Two independent credible sources, or one especially authoritative source, are required.",
    });
  } else if (!authorityAdequate) {
    state = "insufficient_authority";
    gaps.push("Accepted records are not in an adequate authority class for this claim.");
    recommendedNextAction = "Replace editorial or lead-only material with an accepted primary or especially authoritative source.";
    researchPlan = buildResearchPlan({
      claimOrQuestion: input.claim.claimText,
      policyClass,
      independentSourcesDesired: policy.minIndependentAccepted,
      reason: "Authority class is inadequate for the claim policy.",
    });
  } else if (!breadthMatch) {
    state = "partial";
    gaps.push("Accepted evidence does not yet cover the breadth of the claim.");
    recommendedNextAction = "Widen evidence coverage through an additional independent accepted source.";
    researchPlan = buildResearchPlan({
      claimOrQuestion: input.claim.claimText,
      policyClass,
      independentSourcesDesired: policy.minIndependentAccepted,
      reason: "Evidence breadth does not yet match claim breadth.",
    });
  } else {
    state = "supported";
    recommendedNextAction = "No additional evidence required for this claim. Historical approval and publication remain separate gates.";
  }

  const authorityStatus = !accepted.length
    ? "none"
    : state === "insufficient_authority"
      ? "inadequate"
      : hasStrong
        ? "especially_authoritative"
        : manufacturerOnly
          ? "manufacturer_primary"
          : "credible_primary";

  return {
    claimId: input.claim.id,
    claimText: input.claim.claimText,
    safetySensitive: input.claim.safetySensitive,
    policyClass,
    state,
    acceptedSourceCount: accepted.length,
    independentSourceCount: clusters.size,
    authorityClasses,
    authorityStatus,
    acceptedSources: accepted.map((item) => ({
      ref: item.ref,
      publisher: item.publisher,
      title: item.title,
      authorityClass: item.authorityClass,
    })),
    dimensions: {
      acceptedSupportingRecords: accepted.length,
      independentPublishers: clusters.size,
      sourceProvenanceClasses: authorityClasses,
      authorityAdequate,
      freshness,
      contradiction: contradicted.length ? "unresolved" : "none",
      safetySensitive: input.claim.safetySensitive,
      breadthMatch,
    },
    gaps,
    recommendedNextAction,
    researchPlan,
  };
}

export function assessEvidenceRequestGap(input: {
  request: SocialEvidenceRequest;
  candidate?: EvidenceSnapshot | null;
  packageAcceptedClusters: string[];
}): EvidenceGapRadarItem {
  const candidate = input.candidate ?? null;
  const cluster = candidate ? independenceCluster(candidate) : "";
  const sameUnderlying = Boolean(cluster && input.packageAcceptedClusters.includes(cluster));
  const unresolved = input.request.status !== "resolved" && input.request.status !== "rejected";
  let state: EvidenceGapRadarItem["state"] = "unresolved_request";
  let bucket: EvidenceGapRadarItem["bucket"] = "unresolved_request";
  let recommendedNextAction = "Keep this evidence request open until existing corpus review accepts independent evidence.";
  if (!unresolved && input.request.status === "rejected") {
    state = "unsupported";
    bucket = "unsupported";
    recommendedNextAction = "Open a new evidence request. A rejected request cannot satisfy a claim.";
  } else if (input.request.status === "resolved") {
    state = "partial";
    bucket = "partial";
    recommendedNextAction = "Attach the resolved existing evidence to a Growth claim. The request itself is not evidence.";
  } else if (sameUnderlying) {
    state = "needs_independent_corroboration";
    bucket = "needs_independent_corroboration";
    recommendedNextAction = "This candidate is the same underlying source already used. Seek an independent publisher or authority.";
  } else if (candidate && !recordIsAcceptedSupport(candidate)) {
    state = "partial";
    bucket = "partial";
    recommendedNextAction = "Candidate remains unverified until existing corpus review accepts it.";
  } else {
    state = "unsupported";
    bucket = "unsupported";
    recommendedNextAction = "Submit a candidate into existing corpus intake. Growth cannot accept or fetch it.";
  }
  const policyClass: EvidencePolicyClass = input.request.preferredSourceType === "government_regulatory" || input.request.preferredSourceType === "electrical_code_standard"
    ? "safety_sensitive"
    : "broad_technical";
  const researchPlan = unresolved
    ? buildResearchPlan({
      claimOrQuestion: input.request.question,
      policyClass,
      independentSourcesDesired: sameUnderlying || policyClass === "broad_technical" ? 2 : 1,
      requiredAuthorityClass: policyClass === "safety_sensitive" ? "especially_authoritative" : "especially_authoritative",
      reason: sameUnderlying
        ? "Capacity or recommendation gaps that only repeat an already-used manufacturer source still need independent corroboration."
        : input.request.whyRequired,
    })
    : null;
  return {
    kind: "evidence_request",
    id: input.request.id,
    label: input.request.question,
    state,
    bucket,
    recommendedNextAction,
    researchPlan,
  };
}

function radarItemFromClaim(assessment: ClaimSufficiencyAssessment): EvidenceGapRadarItem {
  const bucket: EvidenceGapRadarItem["bucket"] = assessment.state === "supported"
    ? "supported"
    : assessment.state === "conflicted"
      ? "contradiction"
      : assessment.state === "insufficient_authority"
        ? "stronger_authority"
        : assessment.state === "needs_independent_corroboration"
          ? "needs_independent_corroboration"
          : assessment.state === "unsupported" || assessment.state === "stale"
            ? "unsupported"
            : "partial";
  return {
    kind: "claim",
    id: assessment.claimId,
    label: assessment.claimText,
    state: assessment.state,
    bucket,
    recommendedNextAction: assessment.recommendedNextAction,
    researchPlan: assessment.researchPlan,
  };
}

export function buildEvidenceGapRadar(input: {
  claimAssessments: ClaimSufficiencyAssessment[];
  requestItems: EvidenceGapRadarItem[];
}): EvidenceGapRadar {
  const claimItems = input.claimAssessments.map(radarItemFromClaim);
  const items = [...claimItems, ...input.requestItems];
  return {
    supported: items.filter((item) => item.bucket === "supported"),
    partial: items.filter((item) => item.bucket === "partial"),
    unsupported: items.filter((item) => item.bucket === "unsupported"),
    unresolvedEvidenceRequests: input.requestItems.filter((item) => item.kind === "evidence_request"),
    needsIndependentCorroboration: items.filter((item) => item.bucket === "needs_independent_corroboration"),
    strongerAuthority: items.filter((item) => item.bucket === "stronger_authority"),
    contradictions: items.filter((item) => item.bucket === "contradiction"),
    items,
  };
}

export function buildDecisionDna(input: {
  packageId: string;
  problem: string;
  audience: SocialAudience | string | null;
  thesis: string;
  commercialPosture: SocialCommercialPosture | string;
  claims: SocialPackageClaim[];
  claimAssessments: ClaimSufficiencyAssessment[];
  unresolvedQuestions: string[];
  publicationAuthorized: boolean;
  historicalCanApprove: boolean;
}): DecisionDna {
  const states = input.claimAssessments.map((item) => item.state);
  const blocking = states.some((state) => state === "unsupported" || state === "conflicted" || state === "insufficient_authority" || state === "stale");
  const partial = states.some((state) => state === "partial" || state === "needs_independent_corroboration") || input.unresolvedQuestions.length > 0;
  const allSupported = input.claimAssessments.length > 0 && states.every((state) => state === "supported") && input.unresolvedQuestions.length === 0;
  const contradictions = input.claimAssessments.filter((item) => item.state === "conflicted").map((item) => item.claimText);
  const evidenceReadiness: EvidenceReadinessState = allSupported ? "ready" : blocking && !partial && !states.includes("supported") ? "not_ready" : partial || states.includes("supported") ? "partial" : "not_ready";
  const contentReadiness: ContentReadinessState = input.thesis.trim() ? "drafting_allowed" : "not_ready";
  const recommendationReadiness: RecommendationReadinessState = allSupported ? "ready" : "not_ready";
  const publicationReadiness: PublicationReadinessState = input.publicationAuthorized ? "authorized" : "not_authorized";
  const autonomyReadiness = classifyAutonomyReadiness({
    claimAssessments: input.claimAssessments,
    unresolvedQuestionCount: input.unresolvedQuestions.length,
  });
  const intelligenceAuthorityReady = hasIntelligenceReadyApprovalAuthority({
    historicalCanApprove: input.historicalCanApprove,
    recommendationReadiness,
    claimAssessments: input.claimAssessments,
  });
  const evidenceReferences = uniqueEvidenceSnapshots(
    input.claims.flatMap((claim) => (claim.evidenceRefs?.length ? claim.evidenceRefs : [claim.evidence]).map((ref) => ({ ref, exists: true }))),
  ).map((item) => item.ref);
  return {
    packageId: input.packageId,
    problem: input.problem,
    audience: input.audience,
    thesis: input.thesis,
    claims: input.claims.map((claim) => ({
      id: claim.id,
      claimText: claim.claimText,
      safetySensitive: claim.safetySensitive,
      evidence: claim.evidence,
      evidenceRefs: claim.evidenceRefs?.length ? claim.evidenceRefs : [claim.evidence],
      sufficiency: input.claimAssessments.find((item) => item.claimId === claim.id)?.state ?? "unsupported",
    })),
    evidenceReferences,
    sufficiencyByClaim: input.claimAssessments.map((item) => ({
      claimId: item.claimId,
      state: item.state,
      independentSourceCount: item.independentSourceCount,
      acceptedSourceCount: item.acceptedSourceCount,
    })),
    assumptions: [
      "Historical evaluatePackageApprovalGate is unchanged and is not intelligence authority.",
      "Human package approval requires the historical gate and intelligence readiness. Neither publishes.",
      "Evidence Intelligence cannot accept corpus documents, override review, or publish.",
      "Commercial posture is metadata only and does not improve evidence authority.",
    ],
    unresolvedQuestions: input.unresolvedQuestions,
    contradictions,
    commercialPosture: input.commercialPosture,
    evidenceReadiness: input.claimAssessments.length === 0 && input.unresolvedQuestions.length === 0 ? "not_ready" : evidenceReadiness,
    contentReadiness,
    recommendationReadiness,
    publicationReadiness,
    historicalGate: input.historicalCanApprove ? "open" : "blocked",
    intelligenceAuthority: intelligenceAuthorityReady ? "ready" : "blocked",
    autonomyReadiness,
  };
}

export function isEvidenceSufficiencyState(value: string): value is EvidenceSufficiencyState {
  return (EVIDENCE_SUFFICIENCY_STATES as readonly string[]).includes(value);
}
