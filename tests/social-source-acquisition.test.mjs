import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  buildAuthoritativeQueryPlans,
  buildContextualResearchQueryTerms,
  buildEvidenceGapFeedback,
  buildExecutableResearchPlan,
  classifySourceAcquisitionIntent,
  classifySourceIntentKind,
  evaluateClaimCoverage,
} from "../app/growth/social/index.ts";

const FREEZER_PACKAGE = {
  packageProblem: "A commercial appliance is running warm.",
  packageThesis: "An independent operator with a commercial appliance running around 20°F should identify safe operational checks and determine when qualified service is required, without attempting unsafe repairs.",
};

const SAFETY_CLAIM = "What operator actions are outside authorized scope: attempting unsafe electrical or refrigerant repairs?";
const REFRIGERATION_ESCALATION = "What conditions require this decision or escalation: determine when the problem requires a qualified refrigeration technician?";
const PROCEDURE_CLAIM = "What manufacturer-prescribed or process-owner operator procedures exist for this scope?";
const TEMPERATURE_CLAIM = "What temperature range or threshold is applicable for the scope of this package?";
const DISASSEMBLY_CLAIM = "What can be observed or verified without disassembly or intervention?";

const GENERATOR_PACKAGE = {
  packageProblem: "A standby generator fails to start under load.",
  packageThesis: "An operator should verify fuel, battery, and transfer-switch checks before calling a qualified electrician for generator service.",
};

const SAAS_PACKAGE = {
  packageProblem: "Managers export payroll data from scheduling software.",
  packageThesis: "Application users must not grant administrative permission scopes unless explicitly required for their role.",
};

const FOOD_PACKAGE = {
  packageProblem: "Prep cooks leave sliced tomatoes on the counter.",
  packageThesis: "Sliced tomatoes must be held below 41°F after prep and discarded after 4 hours at room temperature.",
};

function gapFor(policyClass = "broad_technical") {
  return buildEvidenceGapFeedback({ policyClass });
}

test("contextual query terms prioritize operational anchors over interrogative boilerplate", () => {
  const oldStyle = "what operator actions outside authorized scope: attempting unsafe";
  const terms = buildContextualResearchQueryTerms({
    claimText: SAFETY_CLAIM,
    ...FREEZER_PACKAGE,
  });
  assert.notEqual(terms, oldStyle);
  assert.match(terms, /electrical|refrigerant|repair/);
  assert.match(terms, /commercial|appliance|warm|freezer|refriger/i);
  assert.doesNotMatch(terms, /^what operator actions outside authorized/);
});

test("equipment intent omits undifferentiated site:.edu recall lane", () => {
  const intent = classifySourceAcquisitionIntent({
    claimText: PROCEDURE_CLAIM,
    ...FREEZER_PACKAGE,
    policyClass: "broad_technical",
    gapUnresolved: "unsupported",
  });
  assert.equal(intent.kind, "equipment_operations");
  assert.equal(intent.includeEducationExtension, false);
  const plans = buildAuthoritativeQueryPlans({
    claimOrQuestion: PROCEDURE_CLAIM,
    policyClass: "broad_technical",
    gap: gapFor("broad_technical"),
    packageProblem: FREEZER_PACKAGE.packageProblem,
    packageThesis: FREEZER_PACKAGE.packageThesis,
  });
  assert.ok(plans.length >= 2);
  assert.ok(plans.every((plan) => plan.authorityPath !== "education_technical"));
  assert.ok(plans.every((plan) => !/(?<![-\w])site:.edu\b/.test(plan.query)));
  assert.ok(plans.some((plan) => /operator manual|service manual|technical manual/i.test(plan.query)));
  assert.ok(plans.some((plan) => /site:.gov/.test(plan.query)));
});

test("material freezer claims keep claim-specific query terms after package supplementation", () => {
  const safetyTerms = buildContextualResearchQueryTerms({ claimText: SAFETY_CLAIM, ...FREEZER_PACKAGE });
  const escalationTerms = buildContextualResearchQueryTerms({ claimText: REFRIGERATION_ESCALATION, ...FREEZER_PACKAGE });
  const procedureTerms = buildContextualResearchQueryTerms({ claimText: PROCEDURE_CLAIM, ...FREEZER_PACKAGE });
  const temperatureTerms = buildContextualResearchQueryTerms({ claimText: TEMPERATURE_CLAIM, ...FREEZER_PACKAGE });
  const disassemblyTerms = buildContextualResearchQueryTerms({ claimText: DISASSEMBLY_CLAIM, ...FREEZER_PACKAGE });
  assert.match(safetyTerms, /electrical|refrigerant|unsafe|repair/);
  assert.match(escalationTerms, /refriger|technician/);
  assert.match(procedureTerms, /manufacturer|prescribed|process-owner/);
  assert.match(temperatureTerms, /temperature|threshold/);
  assert.match(disassemblyTerms, /disassembly|intervention|observed|verified/);
  assert.notEqual(safetyTerms, escalationTerms);
  assert.notEqual(procedureTerms, disassemblyTerms);
});

test("cross-domain intent classification stays generic", () => {
  assert.equal(classifySourceIntentKind({ claimText: PROCEDURE_CLAIM, ...FREEZER_PACKAGE }), "equipment_operations");
  assert.equal(classifySourceIntentKind({
    claimText: "What startup load headroom is required for this generator?",
    ...GENERATOR_PACKAGE,
  }), "equipment_operations");
  assert.equal(classifySourceIntentKind({
    claimText: SAAS_PACKAGE.packageThesis,
    ...SAAS_PACKAGE,
  }), "software_operations");
  assert.equal(classifySourceIntentKind({
    claimText: FOOD_PACKAGE.packageThesis,
    ...FOOD_PACKAGE,
  }), "food_safety");
});

test("precision gates still reject university admin procedure overlap after recall-oriented queries", () => {
  const coverage = evaluateClaimCoverage({
    claimText: PROCEDURE_CLAIM,
    passage: "32 2.2 Proposal Processing Procedures. The department will review submitted proposals according to the standard operating timeline and route approvals through the designated process owner.",
    documentTitle: "Standard Operating Policies and Procedures Manual",
    ...FREEZER_PACKAGE,
    policyClass: "broad_technical",
  });
  assert.notEqual(coverage.state, "direct");
  assert.ok(["mismatch", "weak"].includes(coverage.subjectGrounding));
});

test("positive control: equipment operator manual query terms remain domain-grounded", () => {
  const coverage = evaluateClaimCoverage({
    claimText: PROCEDURE_CLAIM,
    passage: "Before servicing the sealed refrigeration circuit, operators must follow the manufacturer-prescribed lockout and verification procedures documented in the equipment operator manual for this unit.",
    documentTitle: "Commercial refrigeration operator manual",
    ...FREEZER_PACKAGE,
    policyClass: "broad_technical",
  });
  assert.equal(coverage.state, "direct");
  assert.equal(coverage.subjectGrounding, "strong");
});

test("executable plan carries package context into query plans", () => {
  const plan = buildExecutableResearchPlan({
    claimOrQuestion: TEMPERATURE_CLAIM,
    policyClass: "broad_technical",
    reason: "temperature threshold",
    packageProblem: FREEZER_PACKAGE.packageProblem,
    packageThesis: FREEZER_PACKAGE.packageThesis,
  });
  assert.equal(plan.packageProblem, FREEZER_PACKAGE.packageProblem);
  assert.ok(plan.queries.some((query) => /commercial|appliance|warm|temperature|refriger/i.test(query)));
  assert.ok(plan.queries.every((query) => !/\bwhat temperature range threshold applicable scope package\b/.test(query)));
});

test("production source acquisition module contains no fixture-specific organization names", async () => {
  const source = await readFile(new URL("../app/growth/social/source-acquisition-intent.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bCalifornia\b|\bCPUC\b|\bUCI\b|\bOSHA\b|\bAnthropic\b|\bFVSU\b|\bSiemens\b|\bGenerac\b/i);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});
