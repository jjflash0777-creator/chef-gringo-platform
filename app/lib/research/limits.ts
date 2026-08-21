/** Hard cost and execution bounds. Tests must never make paid model or search calls. */

export const RESEARCH_LIMITS = {
  maximumQueries: 3,
  maximumCandidates: 5,
  maximumEvidenceItems: 8,
  maximumSourceBytes: 256_000,
  maximumRuntimeMs: 8_000,
  maximumModelCalls: 0,
  maximumRetries: 1,
  cacheTtlMs: 0,
} as const;

export const LIVE_SEARCH_PROVIDER = null;
