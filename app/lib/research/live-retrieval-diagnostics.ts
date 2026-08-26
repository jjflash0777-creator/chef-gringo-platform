export const LIVE_DOCUMENT_FETCH_CONCURRENCY = 2;
export const LIVE_SEARCH_MIN_BUDGET_MS = 250;

export type LiveExclusionStage =
  | "provider"
  | "normalize"
  | "url_policy"
  | "dedupe"
  | "retrieval"
  | "extraction"
  | "runtime";

export type LiveRetrievalStatus = "ok" | "blocked" | "timeout" | "oversized" | "unextractable" | "failed";

export type LiveResultExclusion = {
  url: string | null;
  title: string | null;
  query: string;
  stage: LiveExclusionStage;
  reason: string;
  retrievalStatus: LiveRetrievalStatus | null;
};

export type LiveEmptyReason =
  | "not_empty"
  | "provider_empty"
  | "url_policy"
  | "retrieval_failed"
  | "extraction_unsupported"
  | "runtime_exhausted"
  | "query_or_candidate_bound";

export type LiveRetrievalDiagnostics = {
  rawResultCount: number;
  normalizedHitCount: number;
  urlSafeCount: number;
  deduplicatedCount: number;
  retrievalAttemptedCount: number;
  retrievalSuccessCount: number;
  blockedCount: number;
  timeoutCount: number;
  oversizedCount: number;
  unextractableCount: number;
  failedCount: number;
  assessedCandidateCount: number;
  providerCallCount: number;
  queriesSkippedForRuntime: number;
  emptyReason: LiveEmptyReason | null;
  exclusions: LiveResultExclusion[];
};

export function emptyLiveRetrievalDiagnostics(): LiveRetrievalDiagnostics {
  return {
    rawResultCount: 0,
    normalizedHitCount: 0,
    urlSafeCount: 0,
    deduplicatedCount: 0,
    retrievalAttemptedCount: 0,
    retrievalSuccessCount: 0,
    blockedCount: 0,
    timeoutCount: 0,
    oversizedCount: 0,
    unextractableCount: 0,
    failedCount: 0,
    assessedCandidateCount: 0,
    providerCallCount: 0,
    queriesSkippedForRuntime: 0,
    emptyReason: null,
    exclusions: [],
  };
}

function incrementStatus(diagnostics: LiveRetrievalDiagnostics, status: LiveRetrievalStatus) {
  if (status === "ok") diagnostics.retrievalSuccessCount += 1;
  else if (status === "blocked") diagnostics.blockedCount += 1;
  else if (status === "timeout") diagnostics.timeoutCount += 1;
  else if (status === "oversized") diagnostics.oversizedCount += 1;
  else if (status === "unextractable") diagnostics.unextractableCount += 1;
  else diagnostics.failedCount += 1;
}

export function recordLiveExclusion(
  diagnostics: LiveRetrievalDiagnostics,
  input: LiveResultExclusion & { countStatus?: boolean },
) {
  diagnostics.exclusions.push({
    url: input.url,
    title: input.title,
    query: input.query,
    stage: input.stage,
    reason: input.reason,
    retrievalStatus: input.retrievalStatus,
  });
  if (input.countStatus && input.retrievalStatus) incrementStatus(diagnostics, input.retrievalStatus);
}

export function finalizeLiveRetrievalDiagnostics(
  diagnostics: LiveRetrievalDiagnostics,
  input: { candidateCount: number; stopReason: string },
): LiveRetrievalDiagnostics {
  diagnostics.assessedCandidateCount = input.candidateCount;
  if (input.candidateCount > 0) {
    diagnostics.emptyReason = "not_empty";
    return diagnostics;
  }
  if (diagnostics.queriesSkippedForRuntime > 0 && diagnostics.providerCallCount === 0) {
    diagnostics.emptyReason = "runtime_exhausted";
  } else if (diagnostics.rawResultCount === 0) {
    diagnostics.emptyReason = "provider_empty";
  } else if (diagnostics.normalizedHitCount === 0) {
    diagnostics.emptyReason = "provider_empty";
  } else if (diagnostics.urlSafeCount === 0) {
    diagnostics.emptyReason = "url_policy";
  } else if (diagnostics.retrievalSuccessCount === 0 && diagnostics.unextractableCount > 0 && diagnostics.timeoutCount === 0 && diagnostics.failedCount === 0) {
    diagnostics.emptyReason = "extraction_unsupported";
  } else if (diagnostics.retrievalSuccessCount === 0 && (diagnostics.timeoutCount > 0 || input.stopReason.startsWith("Runtime"))) {
    diagnostics.emptyReason = "runtime_exhausted";
  } else if (diagnostics.retrievalSuccessCount === 0 && (diagnostics.failedCount > 0 || diagnostics.blockedCount > 0 || diagnostics.oversizedCount > 0)) {
    diagnostics.emptyReason = "retrieval_failed";
  } else {
    diagnostics.emptyReason = "query_or_candidate_bound";
  }
  return diagnostics;
}

export function describeLiveEmptyReason(reason: LiveEmptyReason | null | undefined): string {
  switch (reason) {
    case "provider_empty":
      return "The live search provider returned no results for these queries.";
    case "url_policy":
      return "Provider results were rejected by URL safety policy. No documents were retrieved.";
    case "retrieval_failed":
      return "Provider results were found, but document retrieval failed.";
    case "extraction_unsupported":
      return "Documents were retrieved but could not be extracted (PDF or unreadable content).";
    case "runtime_exhausted":
      return "The 8-second research deadline was reached before candidates could be retrieved or assessed.";
    case "query_or_candidate_bound":
      return "The bounded provider reached the query or candidate limit before any usable candidate was assessed.";
    case "not_empty":
      return "";
    default:
      return "The bounded provider returned nothing inside query and candidate limits.";
  }
}

export function diagnosticsOmitSecrets(value: unknown): boolean {
  const text = JSON.stringify(value ?? {});
  return !/X-Subscription-Token|CHEF_GRINGO_BRAVE_SEARCH_API_KEY|authorization/i.test(text);
}
