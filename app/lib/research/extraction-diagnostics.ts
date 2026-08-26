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
  };
}
