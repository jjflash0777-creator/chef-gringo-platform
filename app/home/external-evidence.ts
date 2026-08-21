import { recomputeInvestigationCase, type EvidenceState, type InvestigationCase, type InvestigationEvidence } from "./investigation-case.ts";
import { validateSourceUrl } from "../lib/research/url-safety.ts";

export const EXTERNAL_SOURCE_TYPES = ["data_plate_image", "manufacturer_documentation", "technician_report", "service_invoice", "parts_documentation", "seller_listing", "distributor_quote", "regulatory_document"] as const;
export type ExternalSourceType = typeof EXTERNAL_SOURCE_TYPES[number];
export type SourceValidation = "unverified_source" | "credible_source" | "authoritative_source" | "conflicting_source";
export type EvidenceMediaType = "pdf" | "image" | "plain_text";

export type ValidationOverrideProvenance = {
  appliedBy: string;
  reason: string;
  appliedAt: string;
};

export type ExternalEvidenceInput = {
  fileName: string;
  mediaType: EvidenceMediaType;
  sourceType: ExternalSourceType;
  contentText: string;
  sourceLocation: string | null;
  extractedAt: string;
  sourceUrl?: string | null;
  sourceValidationOverride?: SourceValidation;
  validationOverrideProvenance?: ValidationOverrideProvenance;
};

export type ExtractedExternalFact = {
  topic: string;
  label: string;
  value: string | number;
  snippet: string;
  sourceLocation: string | null;
  state: EvidenceState;
  confidence: InvestigationEvidence["confidence"];
};

export type NormalizedQuote = {
  quotedProduct: string | null;
  basePriceCents: number | null;
  laborCents: number | null;
  freightCents: number | null;
  taxCents: number | null;
  feesCents: number | null;
  warranty: string | null;
  totalCents: number | null;
  quoteDate: string | null;
  expirationDate: string | null;
  missingComponents: string[];
  complete: boolean;
};

export type ExternalEvidenceResult = {
  updatedCase: InvestigationCase;
  document: {
    id: string;
    fileName: string;
    mediaType: EvidenceMediaType;
    sourceType: ExternalSourceType;
    sourceUrl: string | null;
    originalValidation: SourceValidation;
    validation: SourceValidation;
    validationOverride: { value: SourceValidation; provenance: ValidationOverrideProvenance } | null;
    extractedAt: string;
    contentHash: string;
  };
  establishedFacts: ExtractedExternalFact[];
  unresolved: string[];
  conflicts: string[];
  quote: NormalizedQuote | null;
  stateBefore: InvestigationCase["status"];
  stateAfter: InvestigationCase["status"];
};

const authorityBySource: Record<ExternalSourceType, SourceValidation> = {
  data_plate_image: "authoritative_source",
  manufacturer_documentation: "authoritative_source",
  regulatory_document: "authoritative_source",
  technician_report: "credible_source",
  service_invoice: "credible_source",
  parts_documentation: "credible_source",
  distributor_quote: "credible_source",
  seller_listing: "unverified_source",
};

const authorityRank: Record<SourceValidation, number> = {
  unverified_source: 0,
  credible_source: 1,
  authoritative_source: 2,
  conflicting_source: 0,
};

function hash(value: string) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return (result >>> 0).toString(16).padStart(8, "0");
}
function moneyToCents(value: string | undefined) { return value ? Math.round(Number(value.replace(/[$,]/g, "")) * 100) : null; }
function capture(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? { value: match[1].trim(), snippet: match[0].trim() } : null;
}
function fact(topic: string, label: string, found: { value: string; snippet: string } | null, state: EvidenceState, confidence: InvestigationEvidence["confidence"], location: string | null): ExtractedExternalFact | null {
  return found ? { topic, label, value: found.value, snippet: found.snippet, sourceLocation: location, state, confidence } : null;
}

export function normalizeQuote(text: string): NormalizedQuote {
  const quotedProduct = capture(text, /(?:quoted product|product|equipment)\s*:\s*([^\n]+)/i)?.value ?? null;
  const basePriceCents = moneyToCents(capture(text, /(?:base price|product price)\s*:\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.value);
  const laborCents = moneyToCents(capture(text, /labor\s*:\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.value);
  const freightCents = moneyToCents(capture(text, /freight\s*:\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.value);
  const taxCents = moneyToCents(capture(text, /tax\s*:\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.value);
  const feesCents = moneyToCents(capture(text, /fees?\s*:\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.value);
  const totalCents = moneyToCents(capture(text, /total\s*:\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.value);
  const warranty = capture(text, /warranty\s*:\s*([^\n]+)/i)?.value ?? null;
  const quoteDate = capture(text, /quote date\s*:\s*(\d{4}-\d{2}-\d{2})/i)?.value ?? null;
  const expirationDate = capture(text, /(?:expires|expiration date)\s*:\s*(\d{4}-\d{2}-\d{2})/i)?.value ?? null;
  const missingComponents = [["quoted product", quotedProduct], ["base price", basePriceCents], ["labor", laborCents], ["freight", freightCents], ["tax", taxCents], ["fees", feesCents], ["total", totalCents]].filter(([, value]) => value === null).map(([label]) => String(label));
  return { quotedProduct, basePriceCents, laborCents, freightCents, taxCents, feesCents, warranty, totalCents, quoteDate, expirationDate, missingComponents, complete: totalCents !== null && missingComponents.filter((item) => item !== "quoted product").length === 0 };
}

export function extractExternalEvidence(input: ExternalEvidenceInput) {
  if (!input.fileName.trim()) throw new Error("A source file name is required.");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input.extractedAt)) throw new Error("A valid extraction timestamp is required.");
  if (input.sourceUrl) {
    const urlCheck = validateSourceUrl(input.sourceUrl);
    if (!urlCheck.ok) throw new Error(`Source URL rejected: ${urlCheck.issues.join(", ")}.`);
  }
  const text = input.contentText.trim();
  if (!text) throw new Error(input.mediaType === "plain_text" ? "The text source is empty." : "PDF and image evidence require exact visible-text transcription in Stage H.");
  const originalValidation = authorityBySource[input.sourceType];
  const validation = input.sourceValidationOverride ?? originalValidation;
  const override = input.sourceValidationOverride
    ? {
        value: input.sourceValidationOverride,
        provenance: input.validationOverrideProvenance ?? {
          appliedBy: "unspecified",
          reason: "Override supplied without explicit provenance.",
          appliedAt: input.extractedAt,
        },
      }
    : null;
  const authoritative = validation === "authoritative_source";
  const state: EvidenceState = authoritative ? "verified" : input.sourceType === "seller_listing" ? "unknown" : "externally_sourced";
  const confidence: InvestigationEvidence["confidence"] = authoritative ? "high" : input.sourceType === "seller_listing" ? "low" : "moderate";
  const facts: Array<ExtractedExternalFact | null> = [];
  let quote: NormalizedQuote | null = null;

  if (input.sourceType === "data_plate_image") facts.push(
    fact("manufacturer", "Manufacturer", capture(text, /manufacturer\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("model_number", "Model number", capture(text, /model(?: number)?\s*:\s*([a-z0-9._/-]+)/i), state, confidence, input.sourceLocation),
    fact("serial_number", "Serial number", capture(text, /serial(?: number)?\s*:\s*([a-z0-9._/-]+)/i), state, confidence, input.sourceLocation),
    fact("electrical_voltage", "Voltage", capture(text, /voltage\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("electrical_phase", "Phase", capture(text, /phase\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("electrical_frequency", "Frequency", capture(text, /frequency\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("refrigerant_specification", "Refrigerant", capture(text, /refrigerant\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
  );
  if (input.sourceType === "manufacturer_documentation" || input.sourceType === "regulatory_document" || input.sourceType === "parts_documentation") facts.push(
    fact("model_number", "Applicable model", capture(text, /(?:model|applicable model)\s*:\s*([a-z0-9._/-]+)/i), state, confidence, input.sourceLocation),
    fact("electrical_voltage", "Electrical requirement", capture(text, /(?:voltage|electrical requirement)\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("electrical_phase", "Phase requirement", capture(text, /phase\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("capacity_specification", "Capacity", capture(text, /capacity\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("refrigerant_specification", "Refrigerant specification", capture(text, /refrigerant\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("installation_constraint", "Installation constraint", capture(text, /installation constraint\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("approved_part", "Approved part", capture(text, /approved part\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("warranty_condition", "Warranty condition", capture(text, /warranty\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
  );
  if (input.sourceType === "technician_report" || input.sourceType === "service_invoice") facts.push(
    fact("technician_identity", "Technician", capture(text, /technician\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("technician_company", "Service company", capture(text, /company\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("technician_visit_date", "Visit date", capture(text, /visit date\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("technician_operating_findings", "Technician observation", capture(text, /(?:observed|measurement)\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("technician_diagnosis", "Technician-stated diagnosis", capture(text, /diagnosis\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("work_performed", "Work performed", capture(text, /work performed\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
    fact("technician_recommendation", "Technician recommendation", capture(text, /recommended(?: next action)?\s*:\s*([^\n]+)/i), state, confidence, input.sourceLocation),
  );
  if (input.sourceType === "distributor_quote" || input.sourceType === "service_invoice") {
    quote = normalizeQuote(text);
    const price = capture(text, /(?:base price|product price)\s*:\s*(\$[\d,]+(?:\.\d{1,2})?)/i);
    const total = capture(text, /total\s*:\s*(\$[\d,]+(?:\.\d{1,2})?)/i);
    facts.push(fact("quoted_base_price", "Quoted base price", price, state, confidence, input.sourceLocation), fact("quoted_total", "Quoted total", total, state, confidence, input.sourceLocation));
  }
  if (input.sourceType === "seller_listing") facts.push(fact("compatibility_claim", "Seller compatibility claim", capture(text, /compatibility\s*:\s*([^\n]+)/i), "unknown", "low", input.sourceLocation));
  return { validation, originalValidation, override, facts: facts.filter((item): item is ExtractedExternalFact => item !== null), quote };
}

export function ingestExternalEvidence(original: InvestigationCase, input: ExternalEvidenceInput): ExternalEvidenceResult {
  const extracted = extractExternalEvidence(input);
  if (!extracted.facts.length) throw new Error("No supported facts were found. Add exact labeled source text instead of assumptions.");
  const documentId = `document:${hash(`${input.fileName}\n${input.contentText}`)}`;
  const next = structuredClone(original);
  next.previousVersionId = original.versionId; next.version += 1; next.versionId = `${original.id}:v${next.version}`;
  const conflicts: string[] = [];
  for (const extractedFact of extracted.facts) {
    const previous = [...next.evidence].reverse().find((item) => item.topic === extractedFact.topic && item.consistency !== "superseded");
    const conflict = Boolean(previous && String(previous.value).toLowerCase() !== String(extractedFact.value).toLowerCase());
    const priorAuthority = previous?.sourceValidation ? authorityRank[previous.sourceValidation] : 0;
    const incomingAuthority = authorityRank[extracted.validation];
    const incomingWins = Boolean(conflict && previous && incomingAuthority >= priorAuthority);
    if (conflict && previous) {
      if (incomingWins) {
        const stored = next.evidence.find((item) => item.id === previous.id)!;
        stored.consistency = "superseded";
        stored.notes.push(`Conflicts with equal-or-higher-authority external evidence ${documentId}; both claims remain in history.`);
      }
      conflicts.push(`${extractedFact.label}: prior ${String(previous.value)} vs source ${String(extractedFact.value)}`);
    }
    const validation: SourceValidation = conflict ? "conflicting_source" : extracted.validation;
    next.evidence.push({ id: `${next.id}:e${next.evidence.length + 1}`, topic: extractedFact.topic, claim: input.sourceType === "technician_report" && extractedFact.topic === "technician_diagnosis" ? `Technician report states: ${String(extractedFact.value)}.` : `${extractedFact.label}: ${String(extractedFact.value)}.`, value: extractedFact.value, source: input.sourceUrl || input.fileName, sourceType: input.sourceType, state: extractedFact.state, consistency: conflict ? "conflicting" : "consistent", supersedesEvidenceId: incomingWins ? previous!.id : null, timestamp: input.extractedAt, confidence: extractedFact.confidence, notes: input.sourceType === "technician_report" && extractedFact.topic === "technician_diagnosis" ? ["This is the technician’s documented diagnosis, not an independently adopted Chef Gringo diagnosis."] : [], sourceDocumentId: documentId, sourceLocation: extractedFact.sourceLocation, supportingSnippet: extractedFact.snippet, sourceValidation: validation });
    if ((!conflict || incomingWins) && extractedFact.state === "verified" && extractedFact.topic === "model_number") next.equipment.modelNumber = String(extractedFact.value);
    if ((!conflict || incomingWins) && extractedFact.state === "verified" && extractedFact.topic === "manufacturer") next.equipment.manufacturer = String(extractedFact.value);
    if ((!conflict || incomingWins) && extractedFact.state === "verified" && extractedFact.topic === "serial_number") next.equipment.serialNumber = String(extractedFact.value);
  }
  if (input.sourceType === "data_plate_image") next.equipment.photosSupplied += 1;
  if (extracted.quote?.totalCents != null && input.sourceType === "service_invoice") next.existingRepairEstimate = `$${(extracted.quote.totalCents / 100).toLocaleString("en-US")}`;
  if (extracted.quote && input.sourceType === "distributor_quote") next.existingReplacementQuote = extracted.quote.totalCents === null ? "Unknown — quote components incomplete" : `$${(extracted.quote.totalCents / 100).toLocaleString("en-US")}`;
  const updatedCase = recomputeInvestigationCase(next, input.extractedAt, `External evidence ${documentId} ingested from ${input.sourceType}.`);
  const unresolved = [...updatedCase.unknowns, ...(extracted.quote && !extracted.quote.complete ? [`Quote total remains unknown or incomplete: ${extracted.quote.missingComponents.join(", ")}`] : [])];
  return { updatedCase, document: { id: documentId, fileName: input.fileName, mediaType: input.mediaType, sourceType: input.sourceType, sourceUrl: input.sourceUrl ?? null, originalValidation: extracted.originalValidation, validation: conflicts.length ? "conflicting_source" : extracted.validation, validationOverride: extracted.override, extractedAt: input.extractedAt, contentHash: hash(input.contentText) }, establishedFacts: extracted.facts, unresolved, conflicts, quote: extracted.quote, stateBefore: original.status, stateAfter: updatedCase.status };
}
