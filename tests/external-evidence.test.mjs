import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractExternalEvidence, ingestExternalEvidence } from "../app/home/external-evidence.ts";
import { conflictingDataPlate, incompleteDistributorQuote, manufacturerManual, matchingDataPlate, sellerListing, technicianReport } from "../app/home/fixtures/external-evidence.ts";
import { identifiedFreezerEvidence, identifiedFreezerProblem, investigationCapturedAt } from "../app/home/fixtures/investigation-cases.ts";
import { createInvestigationCase } from "../app/home/investigation-case.ts";

const sourceCase = () => createInvestigationCase({ problem: identifiedFreezerProblem, capturedAt: investigationCapturedAt, suppliedEvidence: identifiedFreezerEvidence });

test("matching data plate verifies identity with provenance and preserves history", () => {
  const original = sourceCase();
  const result = ingestExternalEvidence(original, matchingDataPlate);
  const history = result.updatedCase.evidence.filter((item) => item.topic === "model_number");
  assert.equal(result.updatedCase.equipment.modelNumber, "CG-WIF-230");
  assert.equal(history.length, 3);
  assert.equal(history.at(-1).sourceValidation, "authoritative_source");
  assert.equal(history.at(-1).sourceLocation, "synthetic data plate front");
  assert.match(history.at(-1).supportingSnippet, /Model: CG-WIF-230/);
  assert.equal(original.version, 1);
  assert.equal(result.updatedCase.previousVersionId, original.versionId);
});

test("conflicting data plate retains both claims and makes authoritative value active", () => {
  const result = ingestExternalEvidence(sourceCase(), conflictingDataPlate);
  const history = result.updatedCase.evidence.filter((item) => item.topic === "model_number");
  assert.equal(result.updatedCase.equipment.modelNumber, "CG-WIF-230X");
  assert.equal(history.at(-2).consistency, "superseded");
  assert.equal(history.at(-1).consistency, "conflicting");
  assert.equal(history.at(-1).supersedesEvidenceId, history.at(-2).id);
  assert.equal(result.conflicts.length, 1);
});

test("technician diagnosis stays sourced rather than becoming system diagnosis", () => {
  const result = ingestExternalEvidence(sourceCase(), technicianReport);
  const diagnosis = result.updatedCase.evidence.find((item) => item.topic === "technician_diagnosis");
  assert.equal(diagnosis.state, "externally_sourced");
  assert.equal(diagnosis.sourceValidation, "credible_source");
  assert.match(diagnosis.claim, /^Technician report states:/);
  assert.match(diagnosis.notes[0], /not an independently adopted Chef Gringo diagnosis/);
  assert.equal(result.updatedCase.progress.causeEstablished, false);
  assert.equal(result.updatedCase.recommendation, null);
});

test("incomplete quote keeps freight and total unknown", () => {
  const result = ingestExternalEvidence(sourceCase(), incompleteDistributorQuote);
  assert.equal(result.quote.basePriceCents, 800000);
  assert.equal(result.quote.freightCents, null);
  assert.equal(result.quote.totalCents, null);
  assert.equal(result.quote.complete, false);
  assert.match(result.updatedCase.existingReplacementQuote, /^Unknown/);
  assert.ok(result.unresolved.some((item) => /freight/.test(item)));
});

test("manufacturer manual establishes electrical requirement with provenance", () => {
  const result = ingestExternalEvidence(sourceCase(), manufacturerManual);
  const fact = result.updatedCase.evidence.find((item) => item.topic === "electrical_voltage" && item.sourceType === "manufacturer_documentation");
  assert.equal(fact.state, "verified");
  assert.equal(fact.sourceValidation, "authoritative_source");
  assert.equal(fact.sourceLocation, "page 14");
  assert.equal(fact.supportingSnippet, "Electrical requirement: 208-230V");
});

test("seller compatibility remains an unverified low-confidence claim", () => {
  const result = ingestExternalEvidence(sourceCase(), sellerListing);
  const fact = result.updatedCase.evidence.find((item) => item.topic === "compatibility_claim");
  assert.equal(fact.state, "unknown");
  assert.equal(fact.confidence, "low");
  assert.equal(fact.sourceValidation, "unverified_source");
  assert.equal(result.updatedCase.recommendation, null);
});

test("image and PDF inputs without exact transcription fail closed", () => {
  assert.throws(() => extractExternalEvidence({ ...matchingDataPlate, mediaType: "image", contentText: "" }), /require exact visible-text transcription/);
  assert.throws(() => extractExternalEvidence({ ...manufacturerManual, mediaType: "pdf", contentText: "" }), /require exact visible-text transcription/);
});

test("external evidence UI exposes narrow local-only ingestion and provenance", async () => {
  const panel = await readFile(new URL("../app/components/ExternalEvidencePanel.tsx", import.meta.url), "utf8");
  const casePanel = await readFile(new URL("../app/components/InvestigationCasePanel.tsx", import.meta.url), "utf8");
  for (const copy of ["Add one source to the case", "Evidence type", "Exact source text", "Add evidence to case", "no OCR or network service"])
    assert.match(panel, new RegExp(copy, "i"));
  assert.match(panel, /Conflicting claims retained/);
  assert.match(panel, /Still unresolved/);
  assert.match(casePanel, /Why we believe this/);
  assert.doesNotMatch(panel, /fetch\(|localStorage|sessionStorage/);
});
