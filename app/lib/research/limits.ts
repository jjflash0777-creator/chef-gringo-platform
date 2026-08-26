/** Hard cost and execution bounds. Tests must never make paid model or search calls. */

export const RESEARCH_LIMITS = {
  maximumQueries: 3,
  maximumCandidates: 5,
  maximumEvidenceItems: 8,
  /** Corpus ingest and extracted-text assessment still use this bound. */
  maximumSourceBytes: 256_000,
  /**
   * Hard network/download cap for live HTML retrieval. HTML chrome may exceed
   * maximumSourceBytes; useful text is measured after extraction.
   */
  maximumDownloadBytes: 1_048_576,
  /** Useful extracted text retained for live HTML candidate assessment. */
  maximumExtractedTextChars: 48_000,
  /**
   * Separate PDF download ceiling. Not an HTML raise; not a 30–50 MB bound.
   * Worker memory stays conservative.
   */
  maximumPdfDownloadBytes: 4_194_304,
  /** Pages inspected by the bounded PDF text parser. */
  maximumPdfPages: 12,
  /** Useful PDF text retained for live assessment. */
  maximumPdfExtractedTextChars: 24_000,
  /** Matching passages after which PDF parsing stops. */
  maximumPdfPassages: 3,
  /** Per-document PDF parse timeout, counted inside the 8s total. */
  maximumPdfParseMs: 1_500,
  /** Search hits requested per query so URL-policy skips can be replaced. */
  maximumSearchHitsPerQuery: 8,
  /** Hard ceiling for live URL retrieval attempts across the run. */
  maximumUrlAttempts: 10,
  /** Per-query retrieval ceiling so query 1 cannot consume the whole URL budget. */
  maximumUrlAttemptsPerQuery: 5,
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
