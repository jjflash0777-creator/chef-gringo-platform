import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyFollowUpAnswer, createInvestigationCase } from "../app/home/investigation-case.ts";
import { identifiedFreezerEvidence, investigationCapturedAt, richFreezerProblem } from "../app/home/fixtures/investigation-cases.ts";

const followUpAt = "2026-08-10T12:05:00.000Z";
const secondFollowUpAt = "2026-08-10T12:10:00.000Z";
const panel = await readFile(new URL("../app/components/InvestigationCasePanel.tsx", import.meta.url), "utf8");

test("basic progression appends temperature evidence and recomputes one next question", () => {
  const original = createInvestigationCase({ problem: "My freezer is warm.", capturedAt: investigationCapturedAt });
  assert.equal(original.nextQuestion?.id, "current_temperature");
  const updated = applyFollowUpAnswer(original, { requirementId: "current_temperature", value: "49°F", answeredAt: followUpAt });
  assert.equal(original.version, 1);
  assert.equal(updated.version, 2);
  assert.equal(updated.previousVersionId, original.versionId);
  assert.equal(updated.evidence.length, original.evidence.length + 1);
  assert.equal(updated.evidence.at(-1).sourceType, "user_follow_up");
  assert.equal(updated.evidence.at(-1).state, "user_provided");
  assert.equal(updated.evidence.at(-1).timestamp, followUpAt);
  assert.notEqual(updated.nextQuestion?.id, "current_temperature");
  assert.ok(updated.nextQuestion);
});

test("model-number follow-up clears identity requirement without external verification", () => {
  const original = createInvestigationCase({ problem: "My freezer is warm.", capturedAt: investigationCapturedAt });
  const updated = applyFollowUpAnswer(original, { requirementId: "data_plate", value: "WIF-230A", answeredAt: followUpAt });
  const modelEvidence = updated.evidence.find((item) => item.topic === "model_number");
  assert.equal(updated.equipment.modelNumber, "WIF-230A");
  assert.equal(modelEvidence.state, "user_provided");
  assert.equal(modelEvidence.sourceType, "user_follow_up");
  assert.equal(updated.verifiedFacts.length, 0);
  assert.ok(!updated.evidenceRequirements.some((item) => item.id === "data_plate"));
  assert.ok(updated.candidateRoutes.filter((route) => route.route !== "repair").every((route) => route.status === "needs_compatibility_verification"));
});

test("contradictory observation preserves history and marks conflict and supersession", () => {
  const original = createInvestigationCase({ problem: richFreezerProblem, capturedAt: investigationCapturedAt });
  const prior = original.evidence.find((item) => item.topic === "condenser_state");
  const updated = applyFollowUpAnswer(original, { requirementId: "condenser_state", value: "yes", answeredAt: followUpAt });
  const history = updated.evidence.filter((item) => item.topic === "condenser_state");
  assert.equal(history.length, 2);
  assert.equal(history[0].id, prior.id);
  assert.equal(history[0].consistency, "superseded");
  assert.equal(history[1].consistency, "conflicting");
  assert.equal(history[1].supersedesEvidenceId, prior.id);
  assert.match(history[1].claim, /running/);
  assert.ok(updated.knownFacts.includes(history[1].claim));
  assert.ok(!updated.knownFacts.includes(history[0].claim));
  assert.equal(original.evidence.find((item) => item.id === prior.id).consistency, "consistent");
});

test("professional-only evidence stops user questioning and escalates safety", () => {
  const identified = createInvestigationCase({ problem: richFreezerProblem, capturedAt: investigationCapturedAt, suppliedEvidence: identifiedFreezerEvidence });
  const escalated = applyFollowUpAnswer(identified, { requirementId: "evaporator_fans", value: "yes", answeredAt: followUpAt });
  assert.equal(escalated.status, "PROFESSIONAL_VERIFICATION_REQUIRED");
  assert.equal(escalated.safety.state, "professional_verification_required");
  assert.equal(escalated.nextQuestion, null);
  assert.ok(escalated.evidenceRequirements.some((item) => item.priority === "professional_only" && item.requiresProfessional));
  assert.match(escalated.safety.reason, /qualified/);
});

test("multiple observations localize the domain without diagnosis creep", () => {
  const initial = createInvestigationCase({ problem: richFreezerProblem, capturedAt: investigationCapturedAt });
  const progressed = applyFollowUpAnswer(initial, { requirementId: "evaporator_fans", value: "yes", answeredAt: secondFollowUpAt });
  assert.equal(progressed.progress.operatingState, "established");
  assert.equal(progressed.progress.causeEstablished, false);
  assert.equal(progressed.recommendation, null);
  assert.doesNotMatch(JSON.stringify(progressed), /bad compressor|blown fuse|failed contactor|refrigerant leak|defrost failure/i);
  assert.equal(progressed.candidateRoutes.find((route) => route.route === "repair").status, "needs_quote");
});

test("follow-up UI remains a case workflow rather than a transcript", () => {
  for (const label of ["Next best question", "Why this matters", "Your answer", "Add to case", "Meaningful case progress", "Correct an earlier operating observation", "Case history"])
    assert.match(panel, new RegExp(label));
  assert.match(panel, /applyFollowUpAnswer/);
  assert.doesNotMatch(panel, /chat-bubble|typing-indicator|assistant-avatar/);
});
