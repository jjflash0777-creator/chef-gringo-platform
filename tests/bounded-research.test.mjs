import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildBoundedQueries, createResearchRequirement, RESEARCH_LIMITS, runBoundedResearch } from "../app/home/bounded-research.ts";
import { conflictingPrimaryCandidates, promptInjectionCandidate, sellerCompatibilityOnly, syntheticElectricalCandidates, wrongModelCandidate } from "../app/home/fixtures/bounded-research.ts";
import { identifiedFreezerEvidence, identifiedFreezerProblem, investigationCapturedAt } from "../app/home/fixtures/investigation-cases.ts";
import { createInvestigationCase } from "../app/home/investigation-case.ts";
import { RESEARCH_LIMITS as SHARED_LIMITS } from "../app/lib/research/limits.ts";

const completedAt = "2026-08-10T16:15:00.000Z";
const sourceCase = () => createInvestigationCase({ problem: identifiedFreezerProblem, capturedAt: investigationCapturedAt, suppliedEvidence: identifiedFreezerEvidence });
const requirement = (type = "VERIFY_ELECTRICAL_SPEC") => createResearchRequirement(sourceCase(), type, investigationCapturedAt, ["manufacturer.example.invalid"]);

test("official exact-model manual resolves requirement and enters Stage H evidence", () => {
  const original = sourceCase();
  const result = runBoundedResearch(original, createResearchRequirement(original, "VERIFY_ELECTRICAL_SPEC", investigationCapturedAt, ["manufacturer.example.invalid"]), [syntheticElectricalCandidates[0]], completedAt);
  assert.equal(result.requirement.status, "resolved");
  assert.equal(result.bestSource.id, "source:official-manual");
  assert.equal(result.bestSource.authorityTier, 1);
  const electrical = result.updatedCase.evidence.find((item) => item.topic === "electrical_voltage");
  assert.equal(electrical.state, "verified");
  assert.equal(electrical.source, syntheticElectricalCandidates[0].url);
  assert.equal(electrical.sourceLocation, "page 14");
  assert.match(electrical.supportingSnippet, /Electrical requirement: 208-230V/);
  assert.notEqual(result.capability, "bounded_research_complete");
  assert.equal(result.audit.liveRetrievalCompleted, false);
});

test("manufacturer source outranks seller result", () => {
  const result = runBoundedResearch(sourceCase(), requirement(), [...syntheticElectricalCandidates].reverse(), completedAt);
  assert.equal(result.bestSource.sourceClass, "manufacturer_documentation");
  assert.equal(result.audit.selectedSourceIds.includes("source:seller-listing"), false);
  assert.equal(result.audit.sourcesConsidered[0].id, "source:official-manual");
  assert.ok(result.audit.sourcesConsidered[0].authorityTier < result.audit.sourcesConsidered[1].authorityTier);
});

test("seller-only compatibility remains an unverified lead", () => {
  const result = runBoundedResearch(sourceCase(), requirement("VERIFY_PART_COMPATIBILITY"), [sellerCompatibilityOnly], completedAt);
  assert.equal(result.requirement.status, "unresolved");
  assert.equal(result.bestSource, null);
  const claim = result.updatedCase.evidence.find((item) => item.topic === "compatibility_claim");
  assert.equal(claim.state, "unknown");
  assert.equal(claim.sourceValidation, "unverified_source");
  assert.match(result.unresolvedReason, /No authoritative/);
});

test("wrong-model documentation is rejected as non-applicable", () => {
  const result = runBoundedResearch(sourceCase(), requirement(), [wrongModelCandidate], completedAt);
  assert.equal(result.requirement.status, "unresolved");
  assert.equal(result.updatedCase.version, 1);
  assert.equal(result.audit.sourcesConsidered[0].modelApplicability, "mismatch");
  assert.match(result.audit.rejectedSources[0].reason, /not CG-WIF-230/);
});

test("conflicting primary sources remain surfaced and unresolved", () => {
  const result = runBoundedResearch(sourceCase(), requirement(), conflictingPrimaryCandidates, completedAt);
  assert.equal(result.requirement.status, "conflicting");
  assert.equal(result.bestSource, null);
  assert.ok(result.conflicts.some((item) => /Electrical requirement/.test(item)));
  assert.equal(result.audit.stoppedBecause, "conflicting_primary_sources");
  assert.equal(result.updatedCase.evidence.filter((item) => item.topic === "electrical_voltage").length, 2);
});

test("no authoritative result is a valid unresolved outcome and is a plan not completed research", () => {
  const original = sourceCase();
  const result = runBoundedResearch(original, createResearchRequirement(original, "VERIFY_ELECTRICAL_SPEC", investigationCapturedAt, ["manufacturer.example.invalid"]), [], completedAt);
  assert.equal(result.requirement.status, "unresolved");
  assert.equal(result.updatedCase, original);
  assert.equal(result.unresolvedReason, "No candidate sources were found.");
  assert.equal(result.audit.stoppedBecause, "sources_exhausted");
  assert.equal(result.capability, "bounded_research_plan");
  assert.ok(result.audit.queriesExecuted.length > 0);
});

test("research execution remains within hard query and candidate limits", () => {
  const candidates = Array.from({ length: 9 }, (_, index) => ({ ...wrongModelCandidate, id: `source:wrong-${index}`, url: `https://manufacturer.example.invalid/manuals/wrong-${index}` }));
  const result = runBoundedResearch(sourceCase(), requirement(), candidates, completedAt);
  assert.equal(buildBoundedQueries(requirement()).length, RESEARCH_LIMITS.maximumQueries);
  assert.equal(result.audit.sourcesConsidered.length, RESEARCH_LIMITS.maximumCandidates);
  assert.equal(result.audit.stoppedBecause, "candidate_limit_reached");
  assert.equal(SHARED_LIMITS.maximumModelCalls, 0);
  assert.equal(result.audit.modelCalls, 0);
});

test("requirement blocks research without exact identity and official domain", () => {
  const unidentified = createInvestigationCase({ problem: "My freezer is warm.", capturedAt: investigationCapturedAt });
  const blocked = createResearchRequirement(unidentified, "FIND_MANUFACTURER_MANUAL", investigationCapturedAt);
  assert.equal(blocked.status, "blocked");
  assert.deepEqual(buildBoundedQueries(blocked), []);
  const result = runBoundedResearch(unidentified, blocked, syntheticElectricalCandidates, completedAt);
  assert.equal(result.updatedCase, unidentified);
  assert.match(result.unresolvedReason, /Manufacturer, exact model/);
  assert.equal(result.capability, "research_unavailable");
});

test("prompt-injection wording inside a source is flagged as data and does not become system instruction", () => {
  const result = runBoundedResearch(sourceCase(), requirement(), [promptInjectionCandidate], completedAt);
  assert.equal(result.audit.sourcesConsidered[0].contentFlags.instructionLike, true);
  assert.equal(result.requirement.status, "resolved");
  assert.doesNotMatch(JSON.stringify(result.updatedCase.evidence), /system prompt/i);
});

test("private-network and oversized candidates are rejected", () => {
  const privateCandidate = { ...syntheticElectricalCandidates[0], id: "source:private", url: "https://192.168.1.20/manual" };
  const privateResult = runBoundedResearch(sourceCase(), requirement(), [privateCandidate], completedAt);
  assert.match(privateResult.audit.rejectedSources[0].reason, /private_network|blocked_host/);
  const oversized = { ...syntheticElectricalCandidates[0], id: "source:huge", contentText: "A".repeat(300_000) };
  const hugeResult = runBoundedResearch(sourceCase(), requirement(), [oversized], completedAt);
  assert.match(hugeResult.audit.rejectedSources[0].reason, /oversized/);
});

test("research UI is explicit, bounded, user initiated, and not generic search", async () => {
  const panel = await readFile(new URL("../app/components/BoundedResearchPanel.tsx", import.meta.url), "utf8");
  const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const casePanel = await readFile(new URL("../app/components/InvestigationCasePanel.tsx", import.meta.url), "utf8");
  for (const copy of ["Research only what the case needs", "What needs verification", "Where Chef Gringo looked", "Best source found", "Research audit trail", "Run bounded source check", "no live network request"])
    assert.match(panel, new RegExp(copy, "i"));
  assert.doesNotMatch(panel, /fetch\(|WebSocket|search the internet for anything useful/i);
  assert.doesNotMatch(home, /BoundedResearchPanel/);
  assert.doesNotMatch(casePanel, /BoundedResearchPanel/);
});
