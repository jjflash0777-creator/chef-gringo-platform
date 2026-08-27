export const EXTRACTION_METHODS = ["html_article", "plaintext", "pdf_text", "pdf_unsupported", "none"] as const;
export type ExtractionMethod = typeof EXTRACTION_METHODS[number];

export type CandidateExtractionDiagnostics = {
  contentType: string | null;
  rawBytes: number;
  extractedChars: number;
  extractedBytes: number;
  extractionMethod: ExtractionMethod;
  passageMatchCount: number;
  passageMissReason: string | null;
  pdfDetected?: boolean;
  pdfBytes?: number;
  pagesInspected?: number;
  pagesWithMatches?: number;
  parserFailureReason?: string | null;
  publisherIdentityBasis?: string | null;
  registrableDomain?: string | null;
  publisherConflict?: string | null;
  issuer?: string | null;
  documentAuthor?: string | null;
  documentCreator?: string | null;
  documentProducer?: string | null;
  documentSubject?: string | null;
  documentMetadataTitle?: string | null;
  authorTrust?: string | null;
  creatorTrust?: string | null;
  producerTrust?: string | null;
  policyAdvancement?: string | null;
  preRetrievalExcluded?: boolean;
  memoryState?: string | null;
  memorySkipReason?: string | null;
  memoryRetryReason?: string | null;
  queryAuthorityPath?: string | null;
  searchSurface?: string | null;
  claimCoverage?: string | null;
  topicalRelevance?: string | null;
  claimCoverageReason?: string | null;
};

export function emptyExtractionDiagnostics(): CandidateExtractionDiagnostics {
  return {
    contentType: null,
    rawBytes: 0,
    extractedChars: 0,
    extractedBytes: 0,
    extractionMethod: "none",
    passageMatchCount: 0,
    passageMissReason: null,
    pdfDetected: false,
    pdfBytes: 0,
    pagesInspected: 0,
    pagesWithMatches: 0,
    parserFailureReason: null,
    publisherIdentityBasis: null,
    registrableDomain: null,
    publisherConflict: null,
    issuer: null,
    documentAuthor: null,
    documentCreator: null,
    documentProducer: null,
    documentSubject: null,
    documentMetadataTitle: null,
    authorTrust: null,
    creatorTrust: null,
    producerTrust: null,
    policyAdvancement: null,
    preRetrievalExcluded: false,
    memoryState: null,
    memorySkipReason: null,
    memoryRetryReason: null,
    queryAuthorityPath: null,
    searchSurface: null,
    claimCoverage: null,
    topicalRelevance: null,
    claimCoverageReason: null,
  };
}

export function compactExtractionDiagnostics(value: CandidateExtractionDiagnostics | null | undefined) {
  const extraction = value ?? emptyExtractionDiagnostics();
  return {
    contentType: extraction.contentType,
    rawBytes: extraction.rawBytes,
    extractedChars: extraction.extractedChars,
    extractedBytes: extraction.extractedBytes,
    extractionMethod: extraction.extractionMethod,
    passageMatchCount: extraction.passageMatchCount,
    passageMissReason: extraction.passageMissReason,
    pdfDetected: Boolean(extraction.pdfDetected),
    pdfBytes: extraction.pdfBytes ?? 0,
    pagesInspected: extraction.pagesInspected ?? 0,
    pagesWithMatches: extraction.pagesWithMatches ?? 0,
    parserFailureReason: extraction.parserFailureReason ?? null,
    publisherIdentityBasis: extraction.publisherIdentityBasis ?? null,
    registrableDomain: extraction.registrableDomain ?? null,
    publisherConflict: extraction.publisherConflict ?? null,
    issuer: extraction.issuer ?? null,
    documentAuthor: extraction.documentAuthor ?? null,
    documentCreator: extraction.documentCreator ?? null,
    documentProducer: extraction.documentProducer ?? null,
    documentSubject: extraction.documentSubject ?? null,
    documentMetadataTitle: extraction.documentMetadataTitle ?? null,
    authorTrust: extraction.authorTrust ?? null,
    creatorTrust: extraction.creatorTrust ?? null,
    producerTrust: extraction.producerTrust ?? null,
    policyAdvancement: extraction.policyAdvancement ?? null,
    preRetrievalExcluded: Boolean(extraction.preRetrievalExcluded),
    memoryState: extraction.memoryState ?? null,
    memorySkipReason: extraction.memorySkipReason ?? null,
    memoryRetryReason: extraction.memoryRetryReason ?? null,
    queryAuthorityPath: extraction.queryAuthorityPath ?? null,
    searchSurface: extraction.searchSurface ?? null,
    claimCoverage: extraction.claimCoverage ?? null,
    topicalRelevance: extraction.topicalRelevance ?? null,
    claimCoverageReason: extraction.claimCoverageReason ?? null,
  };
}
