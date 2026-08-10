import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createInvestigationCase, supportsRealInvestigation } from "../app/home/investigation-case.ts";
import { identifiedFreezerEvidence, identifiedFreezerProblem, insufficientFreezerProblem, investigationCapturedAt, richFreezerProblem, unsafeElectricalProblem } from "../app/home/fixtures/investigation-cases.ts";

const panel = await readFile(new URL("../app/components/InvestigationCasePanel.tsx", import.meta.url), "utf8");
const intake = await readFile(new URL("../app/components/HomepageIntake.tsx", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");

test("insufficient freezer report opens a case without inventing a diagnosis", () => {
  const result = createInvestigationCase({ problem: insufficientFreezerProblem, capturedAt: investigationCapturedAt });
  assert.equal(result.status, "NEEDS_INFORMATION");
  assert.equal(result.recommendation, null);
  assert.equal(result.equipment.identity, "Freezer");
  assert.ok(result.evidenceRequirements.filter((item) => item.priority === "critical_now" || item.priority === "high_value").length >= 3);
  assert.doesNotMatch(JSON.stringify(result), /bad compressor|blown fuse|failed contactor|refrigerant leak|defrost failure/i);
});

test("richer freezer report preserves observations while root cause stays unknown", () => {
  const result = createInvestigationCase({ problem: richFreezerProblem, capturedAt: investigationCapturedAt });
  assert.equal(result.status, "INVESTIGATING");
  assert.equal(result.equipment.identity, "Walk-in freezer");
  assert.match(result.symptoms.join(" "), /49°F/);
  assert.match(result.symptoms.join(" "), /Condenser appears not to be running/);
  assert.match(result.symptoms.join(" "), /No breaker appears visibly tripped/);
  assert.ok(result.unknowns.includes("Root cause"));
  assert.ok(result.evidence.every((item) => item.timestamp === investigationCapturedAt));
  assert.ok(result.evidence.some((item) => item.notes.some((note) => /does not establish/i.test(note))));
});

test("unsafe live-electrical request fails into a professional safety gate", () => {
  const result = createInvestigationCase({ problem: unsafeElectricalProblem, capturedAt: investigationCapturedAt });
  assert.equal(result.status, "PROFESSIONAL_VERIFICATION_REQUIRED");
  assert.equal(result.safety.state, "do_not_proceed");
  assert.match(result.safety.reason, /should not be attempted/);
  assert.ok(result.safety.allowedActions.every((action) => !/probe|meter|bypass/i.test(action)));
});

test("verified photo identity reduces immediate evidence requirements", () => {
  const withoutIdentity = createInvestigationCase({ problem: identifiedFreezerProblem, capturedAt: investigationCapturedAt });
  const withIdentity = createInvestigationCase({ problem: identifiedFreezerProblem, capturedAt: investigationCapturedAt, suppliedEvidence: identifiedFreezerEvidence });
  assert.equal(withIdentity.equipment.modelNumber, "CG-WIF-230");
  assert.equal(withIdentity.equipment.photosSupplied, 2);
  assert.ok(withIdentity.verifiedFacts.length === 2);
  assert.ok(withIdentity.evidenceRequirements.length < withoutIdentity.evidenceRequirements.length);
  assert.ok(!withIdentity.evidenceRequirements.some((item) => item.id === "data_plate"));
});

test("case facts retain user-provided, inferred, verified, and unknown boundaries", () => {
  const result = createInvestigationCase({ problem: richFreezerProblem, capturedAt: investigationCapturedAt });
  assert.ok(result.evidence.some((item) => item.state === "inferred"));
  assert.ok(result.evidence.some((item) => item.state === "user_provided"));
  assert.equal(result.verifiedFacts.length, 0);
  assert.ok(result.unknowns.length > 0);
  assert.ok(result.candidateRoutes.every((route) => route.status !== "recommended"));
});

test("real foodservice intake enters the investigation UI while Stage E remains available", () => {
  assert.equal(supportsRealInvestigation(richFreezerProblem), true);
  assert.match(intake, /supportsRealInvestigation\(request\)/);
  assert.match(intake, /createInvestigationCase/);
  assert.match(intake, /Structuring the investigation/);
  assert.match(page, /InvestigationCasePanel/);
  assert.match(intake, /buildBlastChillerPublicProof/);
  assert.match(intake, /Load synthetic case/);
});

test("case-file UI exposes readiness, evidence, safety, plan, and an honest recommendation gate", () => {
  for (const label of ["What we know", "What remains unknown", "Critical and high-value", "Useful later", "Safety state", "Candidate routes", "Investigation plan", "Decision readiness", "No recommendation yet"])
    assert.match(panel, new RegExp(label));
  assert.match(panel, /User-provided/);
  assert.match(panel, /Inferred/);
  assert.match(panel, /Verified/);
  assert.match(panel, /Ephemeral · nothing saved/);
  assert.doesNotMatch(panel, /chat-bubble|typing-indicator|assistant-avatar/);
});

test("investigation result stacks safely on narrow mobile widths", () => {
  assert.match(css, /@media \(max-width: 50rem\)[\s\S]*\.cg-safety-gate,[\s\S]*\.cg-next-action-grid \{ grid-template-columns: 1fr/);
  assert.match(css, /@media \(max-width: 32rem\)[\s\S]*\.cg-source-ledger li \{ grid-template-columns: 1fr/);
  assert.doesNotMatch(css, /\.cg-investigation-case[^}]*width:\s*[4-9]\d\dpx/);
});

test("identical structured inputs produce identical cases", () => {
  const input = { problem: richFreezerProblem, capturedAt: investigationCapturedAt };
  assert.deepEqual(createInvestigationCase(input), createInvestigationCase(input));
});

test("bounded constraints and quote fields are preserved as user-provided claims", () => {
  const result = createInvestigationCase({
    problem: "My walk-in freezer is warm. Budget: $8,000. Repair estimate: $1,200. Replacement quote: $14,000. We can only be down 2 days. Operating in Miami, FL. This is urgent.",
    capturedAt: investigationCapturedAt,
  });
  assert.equal(result.budget, "$8,000");
  assert.equal(result.existingRepairEstimate, "$1,200");
  assert.equal(result.existingReplacementQuote, "$14,000");
  assert.equal(result.downtimeTolerance, "2 days");
  assert.equal(result.location, "Miami, FL");
  assert.equal(result.urgency, "urgent");
  assert.ok(result.userProvidedClaims.some((claim) => /budget of \$8,000/.test(claim)));
});
