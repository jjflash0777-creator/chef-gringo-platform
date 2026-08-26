/** Hard cost and execution bounds. Tests must never make paid model or search calls. */

export const RESEARCH_LIMITS = {
  maximumQueries: 3,
  maximumCandidates: 5,
  maximumEvidenceItems: 8,
  /** Corpus ingest and extracted-text assessment still use this bound. */
  maximumSourceBytes: 256_000,
  /**
   * Hard network/download cap for live retrieval. HTML chrome may exceed
   * maximumSourceBytes; useful text is measured after extraction.
   */
  maximumDownloadBytes: 1_048_576,
  /** Useful extracted text retained for live candidate assessment. */
  maximumExtractedTextChars: 48_000,
  maximumRuntimeMs: 8_000,
  maximumModelCalls: 0,
  maximumRetries: 1,
  cacheTtlMs: 0,
} as const;

export const CORPUS_LIMITS = {
  maximumResults: 4,
  minimumScore: 0.2,
  timeoutMs: 8_000,
  cacheTtlMs: 60_000,
  maximumRetries: 1,
  dailyRequestCeiling: 50,
} as const;

export const LIVE_SEARCH_PROVIDER = null;
