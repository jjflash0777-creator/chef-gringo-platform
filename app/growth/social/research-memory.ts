/**
 * Compact cross-run research memory. Reuses persisted research-run rows.
 * Never stores retrieved web bodies. Exact URL memory is stronger than domain reputation.
 */

import { canonicalizeUrl, urlsAreCanonicalDuplicates } from "../../lib/research/url-safety.ts";
import { registrableDomain } from "../../lib/research/publisher-identity.ts";
import { assertNoEvidenceEconomics } from "./evidence-policy.ts";

export const RESEARCH_MEMORY_VERSION = "research-memory-v1";
export const RESEARCH_MEMORY_RETRY_HORIZON_MS = 7 * 24 * 60 * 60 * 1000;
export const EDITORIAL_DOMAIN_DEMOTE_THRESHOLD = 2;

export const MEMORY_STATES = ["new_candidate", "seen_before", "memory_skipped"] as const;
export type MemoryState = typeof MEMORY_STATES[number];

export type MemorySkipReason =
  | "blocked"
  | "unextractable"
  | "irrelevant"
  | "insufficient_authority"
  | "insufficient_claim_coverage"
  | "insufficient_subject_grounding"
  | "human_rejected"
  | "exact_duplicate"
  | "already_counted_publisher";

export type MemoryRetryReason =
  | "prior_timeout"
  | "transient_network_failure"
  | "retry_horizon_elapsed";

export type ResearchMemoryCandidateInput = {
  canonicalUrl: string;
  independenceCluster: string;
  relationship: string;
  retrievalStatus?: string | null;
  authorityAdequate: boolean;
  authorityClass?: string;
  sourceClass?: string;
  policyAdvancement?: string | null;
  claimCoverage?: string | null;
  subjectGrounding?: string | null;
  corpusIngestionStatus?: string | null;
  discoveredAt?: string;
};

export type ResearchMemoryRunInput = {
  packageId: string;
  claimId?: string | null;
  evidenceRequestId?: string | null;
  plan?: { evidenceGap?: { unresolvedPolicyGap?: string } } | null;
  finishedAt?: string;
  candidates: ResearchMemoryCandidateInput[];
};

export type ResearchMemory = {
  version: typeof RESEARCH_MEMORY_VERSION;
  packageId: string;
  claimId: string | null;
  evidenceRequestId: string | null;
  policyGap: string;
  priorRunCount: number;
  attemptedUrls: string[];
  canonicalDocumentUrls: string[];
  publisherClusters: string[];
  retrievalFailures: string[];
  unextractableUrls: string[];
  blockedUrls: string[];
  insufficientAuthorityUrls: string[];
  insufficientClaimCoverageUrls: string[];
  insufficientSubjectGroundingUrls: string[];
  humanRejectedUrls: string[];
  irrelevantUrls: string[];
  alreadyCountedPublishers: string[];
  alreadyCountedUrls: string[];
  policyAdvancingUrls: string[];
  editorialDomainCounts: Record<string, number>;
  lastSeenAtByUrl: Record<string, string>;
  retrievalStatusByUrl: Record<string, string>;
  skipReasonByUrl: Record<string, MemorySkipReason>;
};

export type ResearchMemorySummary = {
  priorRunCount: number;
  attemptedUrlCount: number;
  skippableUrlCount: number;
  policyGap: string;
  editorialDomainsDemoted: string[];
};

function compactUrl(value: string) {
  try {
    return canonicalizeUrl(value);
  } catch {
    return value.trim();
  }
}

function domainOf(url: string) {
  try {
    return registrableDomain(new URL(url).hostname.replace(/^www\./, "").toLowerCase());
  } catch {
    return null;
  }
}

function isEditorialCandidate(candidate: ResearchMemoryCandidateInput) {
  const authority = (candidate.authorityClass ?? "").toLowerCase();
  const source = (candidate.sourceClass ?? "").toLowerCase();
  return authority === "editorial" || source === "editorial" || source === "affiliate_page" || source === "lead_only";
}

export function emptyResearchMemory(input: {
  packageId: string;
  claimId?: string | null;
  evidenceRequestId?: string | null;
  policyGap: string;
}): ResearchMemory {
  return {
    version: RESEARCH_MEMORY_VERSION,
    packageId: input.packageId,
    claimId: input.claimId ?? null,
    evidenceRequestId: input.evidenceRequestId ?? null,
    policyGap: input.policyGap,
    priorRunCount: 0,
    attemptedUrls: [],
    canonicalDocumentUrls: [],
    publisherClusters: [],
    retrievalFailures: [],
    unextractableUrls: [],
    blockedUrls: [],
    insufficientAuthorityUrls: [],
    insufficientClaimCoverageUrls: [],
    insufficientSubjectGroundingUrls: [],
    humanRejectedUrls: [],
    irrelevantUrls: [],
    alreadyCountedPublishers: [],
    alreadyCountedUrls: [],
    policyAdvancingUrls: [],
    editorialDomainCounts: {},
    lastSeenAtByUrl: {},
    retrievalStatusByUrl: {},
    skipReasonByUrl: {},
  };
}

export function runMatchesResearchMemoryScope(
  run: ResearchMemoryRunInput,
  scope: { packageId: string; claimId?: string | null; evidenceRequestId?: string | null; policyGap: string },
) {
  if (run.packageId !== scope.packageId) return false;
  if ((run.claimId ?? null) !== (scope.claimId ?? null)) return false;
  if ((run.evidenceRequestId ?? null) !== (scope.evidenceRequestId ?? null)) return false;
  const runGap = run.plan?.evidenceGap?.unresolvedPolicyGap ?? "";
  return runGap === scope.policyGap;
}

export function buildResearchMemory(input: {
  packageId: string;
  claimId?: string | null;
  evidenceRequestId?: string | null;
  policyGap: string;
  runs: ResearchMemoryRunInput[];
  economics?: Record<string, unknown>;
}): ResearchMemory {
  if (input.economics) assertNoEvidenceEconomics(input.economics, "Research memory");
  const memory = emptyResearchMemory(input);
  const scoped = input.runs.filter((run) => runMatchesResearchMemoryScope(run, input));
  memory.priorRunCount = scoped.length;
  const attempted = new Set<string>();
  const documents = new Set<string>();
  const clusters = new Set<string>();
  const failures = new Set<string>();
  const unextractable = new Set<string>();
  const blocked = new Set<string>();
  const insufficient = new Set<string>();
  const insufficientCoverage = new Set<string>();
  const insufficientSubject = new Set<string>();
  const humanRejected = new Set<string>();
  const irrelevant = new Set<string>();
  const countedPublishers = new Set<string>();
  const countedUrls = new Set<string>();
  const advancing = new Set<string>();

  for (const run of scoped) {
    for (const candidate of run.candidates) {
      const url = compactUrl(candidate.canonicalUrl);
      if (!url) continue;
      attempted.add(url);
      clusters.add(candidate.independenceCluster);
      const seenAt = candidate.discoveredAt || run.finishedAt || memory.lastSeenAtByUrl[url];
      if (seenAt && (!memory.lastSeenAtByUrl[url] || seenAt > memory.lastSeenAtByUrl[url])) {
        memory.lastSeenAtByUrl[url] = seenAt;
      }
      const status = candidate.retrievalStatus ?? "ok";
      memory.retrievalStatusByUrl[url] = status;
      if (status === "ok") documents.add(url);
      if (status === "failed") failures.add(url);
      if (status === "unextractable") {
        unextractable.add(url);
        memory.skipReasonByUrl[url] = "unextractable";
      }
      if (status === "blocked") {
        blocked.add(url);
        memory.skipReasonByUrl[url] = "blocked";
      }
      if (candidate.relationship === "irrelevant" && status === "ok") {
        irrelevant.add(url);
        memory.skipReasonByUrl[url] = "irrelevant";
      }
      const coverage = candidate.claimCoverage ?? "";
      const subject = candidate.subjectGrounding ?? "";
      if (
        status === "ok"
        && (subject === "mismatch" || subject === "weak")
        && candidate.relationship !== "contradicts"
        && candidate.relationship !== "mixed"
      ) {
        insufficientSubject.add(url);
        memory.skipReasonByUrl[url] = "insufficient_subject_grounding";
      }
      if (
        status === "ok"
        && (coverage === "none" || coverage === "context_only")
        && candidate.relationship !== "contradicts"
        && candidate.relationship !== "mixed"
        && memory.skipReasonByUrl[url] !== "insufficient_subject_grounding"
      ) {
        insufficientCoverage.add(url);
        memory.skipReasonByUrl[url] = "insufficient_claim_coverage";
      }
      if (!candidate.authorityAdequate && status === "ok" && candidate.relationship !== "irrelevant") {
        insufficient.add(url);
        memory.skipReasonByUrl[url] = memory.skipReasonByUrl[url] === "insufficient_claim_coverage"
          ? "insufficient_claim_coverage"
          : "insufficient_authority";
      }
      const corpusStatus = candidate.corpusIngestionStatus ?? null;
      if (corpusStatus === "rejected" || corpusStatus === "stale" || corpusStatus === "superseded") {
        humanRejected.add(url);
        memory.skipReasonByUrl[url] = "human_rejected";
      }
      if (candidate.policyAdvancement === "already_counted") {
        countedUrls.add(url);
        countedPublishers.add(candidate.independenceCluster);
        memory.skipReasonByUrl[url] = memory.skipReasonByUrl[url] === "human_rejected"
          ? "human_rejected"
          : "already_counted_publisher";
      }
      if (
        candidate.policyAdvancement === "advances_independence"
        || candidate.policyAdvancement === "advances_authority"
        || candidate.policyAdvancement === "resolves_contradiction"
      ) {
        advancing.add(url);
        documents.add(url);
        memory.skipReasonByUrl[url] = memory.skipReasonByUrl[url] ?? "exact_duplicate";
      }
      if (status === "ok") memory.skipReasonByUrl[url] = memory.skipReasonByUrl[url] ?? "exact_duplicate";
      const domain = domainOf(url);
      if (domain && isEditorialCandidate(candidate)) {
        memory.editorialDomainCounts[domain] = (memory.editorialDomainCounts[domain] ?? 0) + 1;
      }
    }
  }

  memory.attemptedUrls = [...attempted];
  memory.canonicalDocumentUrls = [...documents];
  memory.publisherClusters = [...clusters];
  memory.retrievalFailures = [...failures];
  memory.unextractableUrls = [...unextractable];
  memory.blockedUrls = [...blocked];
  memory.insufficientAuthorityUrls = [...insufficient];
  memory.insufficientClaimCoverageUrls = [...insufficientCoverage];
  memory.insufficientSubjectGroundingUrls = [...insufficientSubject];
  memory.humanRejectedUrls = [...humanRejected];
  memory.irrelevantUrls = [...irrelevant];
  memory.alreadyCountedPublishers = [...countedPublishers];
  memory.alreadyCountedUrls = [...countedUrls];
  memory.policyAdvancingUrls = [...advancing];
  return memory;
}

export function evaluateMemorySkip(input: {
  url: string;
  memory: ResearchMemory;
  now?: number | Date;
  retryHorizonMs?: number;
  economics?: Record<string, unknown>;
}): {
  skip: boolean;
  memoryState: MemoryState;
  skipReason: MemorySkipReason | null;
  retryReason: MemoryRetryReason | null;
  reason: string;
} {
  if (input.economics) assertNoEvidenceEconomics(input.economics, "Research memory");
  const url = compactUrl(input.url);
  const prior = input.memory.attemptedUrls.find((item) => urlsAreCanonicalDuplicates(item, url));
  if (!prior) {
    return {
      skip: false,
      memoryState: "new_candidate",
      skipReason: null,
      retryReason: null,
      reason: "URL has not been attempted for this package, claim, and policy gap.",
    };
  }
  const now = input.now instanceof Date ? input.now.getTime() : (input.now ?? Date.now());
  const horizon = input.retryHorizonMs ?? RESEARCH_MEMORY_RETRY_HORIZON_MS;
  const lastSeen = Date.parse(input.memory.lastSeenAtByUrl[prior] ?? "");
  const horizonElapsed = Number.isFinite(lastSeen) && now - lastSeen >= horizon;
  const status = input.memory.retrievalStatusByUrl[prior] ?? "ok";

  if (status === "timeout") {
    return {
      skip: false,
      memoryState: "seen_before",
      skipReason: null,
      retryReason: "prior_timeout",
      reason: "Prior attempt timed out; retry is allowed.",
    };
  }
  if (status === "failed") {
    return {
      skip: false,
      memoryState: "seen_before",
      skipReason: null,
      retryReason: "transient_network_failure",
      reason: "Prior attempt failed as a transient network error; retry is allowed.",
    };
  }
  if (horizonElapsed) {
    return {
      skip: false,
      memoryState: "seen_before",
      skipReason: null,
      retryReason: "retry_horizon_elapsed",
      reason: "Retry horizon elapsed; the exact URL may be attempted again.",
    };
  }

  const skipReason = input.memory.skipReasonByUrl[prior]
    ?? (input.memory.blockedUrls.some((item) => urlsAreCanonicalDuplicates(item, url)) ? "blocked"
      : input.memory.unextractableUrls.some((item) => urlsAreCanonicalDuplicates(item, url)) ? "unextractable"
        : input.memory.irrelevantUrls.some((item) => urlsAreCanonicalDuplicates(item, url)) ? "irrelevant"
          : input.memory.insufficientAuthorityUrls.some((item) => urlsAreCanonicalDuplicates(item, url)) ? "insufficient_authority"
            : input.memory.insufficientClaimCoverageUrls?.some((item) => urlsAreCanonicalDuplicates(item, url)) ? "insufficient_claim_coverage"
              : input.memory.insufficientSubjectGroundingUrls?.some((item) => urlsAreCanonicalDuplicates(item, url)) ? "insufficient_subject_grounding"
                : input.memory.humanRejectedUrls?.some((item) => urlsAreCanonicalDuplicates(item, url)) ? "human_rejected"
                : input.memory.alreadyCountedUrls.some((item) => urlsAreCanonicalDuplicates(item, url)) ? "already_counted_publisher"
                  : "exact_duplicate");
  const labels: Record<MemorySkipReason, string> = {
    blocked: "Prior blocked exact URL skipped by cross-run memory.",
    unextractable: "Prior unextractable exact URL skipped by cross-run memory.",
    irrelevant: "Prior irrelevant exact URL skipped by cross-run memory.",
    insufficient_authority: "Prior insufficient-authority exact URL skipped by cross-run memory.",
    insufficient_claim_coverage: "Prior insufficient claim-coverage exact URL skipped by cross-run memory.",
    insufficient_subject_grounding: "Prior insufficient subject-grounding exact URL skipped by cross-run memory for this claim/gap.",
    human_rejected: "Prior human-rejected corpus candidate skipped by cross-run memory for this claim/gap.",
    exact_duplicate: "Exact prior document skipped by cross-run memory.",
    already_counted_publisher: "Prior already-counted publisher URL skipped by cross-run memory.",
  };
  return {
    skip: true,
    memoryState: "memory_skipped",
    skipReason,
    retryReason: null,
    reason: labels[skipReason],
  };
}

export function memoryUrlsToSkipBeforeRetrieval(memory: ResearchMemory, now?: number | Date) {
  return memory.attemptedUrls.filter((url) => evaluateMemorySkip({ url, memory, now }).skip);
}

export function editorialDomainsToDemote(memory: ResearchMemory) {
  return Object.entries(memory.editorialDomainCounts)
    .filter(([, count]) => count >= EDITORIAL_DOMAIN_DEMOTE_THRESHOLD)
    .map(([domain]) => domain);
}

export function summarizeResearchMemory(memory: ResearchMemory, now?: number | Date): ResearchMemorySummary {
  return {
    priorRunCount: memory.priorRunCount,
    attemptedUrlCount: memory.attemptedUrls.length,
    skippableUrlCount: memoryUrlsToSkipBeforeRetrieval(memory, now).length,
    policyGap: memory.policyGap,
    editorialDomainsDemoted: editorialDomainsToDemote(memory),
  };
}

