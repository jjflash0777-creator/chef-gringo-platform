import type { CorpusChunk, CorpusDocument } from "./corpus-types.ts";
import { PUBLIC_PROVENANCE, type ProvenanceMethod } from "./provenance.ts";

export type ExposureBlocker = string;

export function parseClaimScope(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function publicExposureBlockers(document: CorpusDocument, chunks: CorpusChunk[] = []): ExposureBlocker[] {
  const blockers: ExposureBlocker[] = [];
  const method = (document.provenanceMethod ?? document.retrievalMethod) as ProvenanceMethod | null;
  if (document.ingestionStatus !== "accepted") blockers.push("ingestion_not_accepted");
  if (!document.currentVersionId) blockers.push("missing_source_version");
  if (!method || !PUBLIC_PROVENANCE.has(method)) blockers.push("provenance_not_public");
  if (method === "test_fixture" || document.fixture) blockers.push("test_fixture_cannot_be_public");
  if (method === "metadata_only") blockers.push("metadata_only_is_not_evidence");
  if (!document.reviewerEmail || !document.reviewedAt) blockers.push("missing_reviewer_approval");
  if (!parseClaimScope(document.claimScope).length) blockers.push("missing_claim_scope");
  if (method === "repository_practice" && document.authorityTier === 1) blockers.push("practice_cannot_claim_tier1");
  if (method !== "repository_practice" && !document.canonicalUrl) blockers.push("external_authority_missing_canonical_url");
  if (document.evidenceDomain === "food_safety_public_health" && (document.authorityTier ?? 3) > 2) blockers.push("safety_claim_lacks_authority");
  if (document.evidenceDomain === "equipment" && parseClaimScope(document.claimScope).some((tag) => /thermapen|wsb50|sp20|hl200|pdt300/.test(tag)) && !document.exactModel) {
    blockers.push("exact_equipment_missing_model");
  }
  if (document.ingestionStatus === "stale" || document.ingestionStatus === "superseded") blockers.push("stale_or_superseded");
  if (chunks.length && chunks.every((chunk) => !chunk.locator)) blockers.push("missing_citation_locator");
  return blockers;
}

export function canExposePublicly(document: CorpusDocument, chunks: CorpusChunk[] = []) {
  return publicExposureBlockers(document, chunks).length === 0;
}

export function chunkMatchesClaimScope(_question: string, claimScopeJson: string | null | undefined, tagsForQuestion: string[]) {
  const scope = parseClaimScope(claimScopeJson);
  if (!scope.length || !tagsForQuestion.length) return false;
  return tagsForQuestion.some((tag) => scope.includes(tag));
}
