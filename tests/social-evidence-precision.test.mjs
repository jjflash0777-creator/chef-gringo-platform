import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  assessDiscoveredHit,
  buildExecutableResearchPlan,
  buildResearchMemory,
  candidateQualifiesForCorpusSubmission,
  claimIsDomainIndependent,
  classifyPolicyAdvancement,
  evaluateClaimCoverage,
  evaluateMemorySkip,
  evaluateSubjectGrounding,
  buildEvidenceGapFeedback,
  subjectGroundingIsSufficientForDirect,
} from "../app/growth/social/index.ts";

const SAFETY_CLAIM = "What operator actions are outside authorized scope: attempting unsafe electrical or refrigerant repairs?";
const GENERIC_SAFETY_PASSAGE = "Personnel take immediate actions to prevent or correct unsafe situations.";
const SOFTWARE_PASSAGE = "Software users should avoid unsafe permission behavior that lets an agent take unauthorized actions.";
const OSHA_UNRELATED = "Authorized personnel must follow general workplace safety orientation before using shared facilities.";
const DIRECT_SAFETY_PASSAGE = "Specified electrical or refrigerant servicing must be performed by qualified authorized personnel. Independent operators must not attempt those repairs.";

const TEMPERATURE_CLAIM = "What conditions require this decision or escalation: verify the temperature problem?";
const EHS_ESCALATION_PASSAGE = "Unresolved issues identified during EHS inspections must be escalated to the department head and principal investigator when corrective action is not completed.";
const EHS_TITLE = "EHS Inspections Escalation Process";

const FREEZER_ESCALATION_CLAIM = "When should an operator escalate to qualified refrigeration service instead of attempting repairs?";
const HR_ESCALATION = "Employee grievances that remain unresolved after 14 days must be escalated to Human Resources for review.";
const IT_ESCALATION = "Critical IT incidents that remain unresolved after initial triage must be escalated to the security operations center.";
const LAB_ESCALATION = "Laboratory compliance findings that remain open after inspection must be escalated to the biosafety officer.";
const REFRIGERATION_DIRECT = "Commercial refrigeration electrical and refrigerant circuit repairs must be performed by qualified refrigeration technicians. Operators should escalate when sealed-system service is required.";

const FOOD_TEMP_CLAIM = "Sliced tomatoes must be held below 41°F after prep and discarded after 4 hours at room temperature.";
const WEATHER_TEMP = "Outdoor weather temperatures above 95°F require additional hydration breaks for field crews.";
const COIL_TEMP = "Evaporator coil surface temperatures during defrost may reach 32°F before returning to operating range.";
const CPU_THERMAL = "CPU thermal throttling begins when junction temperature exceeds 212°F under sustained load.";
const FOOD_DIRECT = "Time/temperature control for safety foods such as sliced tomatoes must be held at 41°F or below and discarded after 4 hours if not refrigerated.";

const SAAS_CLAIM = "Application users must not grant administrative permission scopes unless explicitly required for their role.";
const PHYSICAL_ACCESS = "Physical access to restricted equipment rooms requires authorized badge credentials and supervisor approval.";
const EQUIP_AUTH = "Electrical cabinet servicing authorization must come from a qualified electrician before opening energized panels.";
const SAAS_DIRECT = "Administrative permission scopes should be granted only when explicitly required for the user's role and removed when no longer needed.";

const COMPLIANCE_CLAIM = "Annual regulatory filing must be submitted to the state authority within 30 days of fiscal year close.";
const INTERNAL_REPORT = "Internal monthly status reports must be submitted to department leadership within five business days.";
const COMPLIANCE_DIRECT = "The annual regulatory filing must be submitted to the state authority within 30 days after fiscal year close.";

const COMPARE_CLAIM = "Commercial dishwashers in this comparison must be evaluated on rack capacity per hour and water connection requirements.";
const OTHER_PRODUCT_METRIC = "Residential laundry machines in this comparison must be evaluated on spin speed and energy use per cycle.";
const COMPARE_DIRECT = "Commercial dishwashers should be compared on rack capacity per hour, incoming water connection requirements, and manufacturer warranty terms.";

const MANUFACTURER_PROCEDURE_CLAIM = "What manufacturer-prescribed or process-owner operator procedures exist for this scope?";
const UNIVERSITY_ADMIN_PROCEDURE_PASSAGE = "32 2.2 Proposal Processing Procedures. The department will review submitted proposals according to the standard operating timeline and route approvals through the designated process owner.";
const UNIVERSITY_ADMIN_MANUAL_TITLE = "Standard Operating Policies and Procedures Manual";
const EQUIPMENT_OPERATOR_MANUAL_PASSAGE = "Before servicing the sealed refrigeration circuit, operators must follow the manufacturer-prescribed lockout and verification procedures documented in the equipment operator manual for this unit.";
const EQUIPMENT_OPERATOR_MANUAL_TITLE = "Commercial refrigeration operator manual";
const FREEZER_PACKAGE = {
  packageProblem: "A commercial appliance is running warm.",
  packageThesis: "An independent operator with a commercial appliance running around 20°F should identify safe operational checks and determine when qualified service is required, without attempting unsafe repairs.",
};

function planFor(claim, policyClass = "safety_sensitive", packageContext = {}) {
  const plan = buildExecutableResearchPlan({
    claimOrQuestion: claim,
    policyClass,
    reason: "precision audit",
  });
  plan.packageProblem = packageContext.packageProblem ?? null;
  plan.packageThesis = packageContext.packageThesis ?? null;
  return plan;
}

function gapFor(claim, policyClass = "safety_sensitive") {
  return buildEvidenceGapFeedback({
    assessment: {
      claimId: "sgo:claim:test",
      claimText: claim,
      safetySensitive: policyClass === "safety_sensitive",
      policyClass,
      state: "unsupported",
      acceptedSourceCount: 0,
      independentSourceCount: 0,
      authorityClasses: [],
      authorityStatus: "missing",
      acceptedSources: [],
      dimensions: {
        acceptedSupportingRecords: 0,
        independentPublishers: 0,
        sourceProvenanceClasses: [],
        authorityAdequate: false,
        freshness: "not_applicable",
        contradiction: "none",
        safetySensitive: policyClass === "safety_sensitive",
        breadthMatch: true,
      },
      gaps: ["Needs evidence"],
      recommendedNextAction: "research",
      researchPlan: null,
    },
    attached: [],
    policyClass,
  });
}

function hit(claim, passage, title, overrides = {}) {
  return assessDiscoveredHit({
    hit: {
      canonicalUrl: overrides.url ?? "https://www.docs.example.gov/precision-fixture",
      title,
      publisher: overrides.publisher ?? "Example Authority",
      sourceType: overrides.sourceType ?? "regulatory_document",
      retrievedText: passage,
      provenanceMethod: "test_fixture",
      query: "q",
      publishedDate: "2024-01-01",
    },
    plan: overrides.plan ?? planFor(claim, overrides.policyClass ?? "safety_sensitive", overrides.package ?? {}),
  });
}

test("UCI-style EHS escalation fails direct support for temperature verification claim", () => {
  const coverage = evaluateClaimCoverage({
    claimText: TEMPERATURE_CLAIM,
    passage: EHS_ESCALATION_PASSAGE,
    documentTitle: EHS_TITLE,
    packageProblem: "A commercial freezer is running warm.",
    safetySensitive: true,
  });
  assert.equal(coverage.subjectGrounding, "mismatch");
  assert.notEqual(coverage.state, "direct");
  assert.equal(coverage.relationMatched, true);

  const candidate = hit(TEMPERATURE_CLAIM, EHS_ESCALATION_PASSAGE, EHS_TITLE, {
    url: "https://www.ehs.example.edu/inspection-escalation",
    publisher: "University Environmental Health and Safety",
    sourceType: "primary_documentation",
    policyClass: "broad_technical",
  });
  assert.notEqual(candidate.claimCoverage, "direct");
  assert.equal(candidate.subjectGrounding, "mismatch");
  assert.notEqual(candidate.relationship, "supports");
  assert.equal(candidateQualifiesForCorpusSubmission(candidate), false);
  assert.equal(classifyPolicyAdvancement({
    independenceCluster: candidate.independenceCluster,
    authorityClass: candidate.authorityClass,
    authorityAdequate: candidate.authorityAdequate,
    relationship: candidate.relationship,
    gap: gapFor(TEMPERATURE_CLAIM, "broad_technical"),
    claimCoverage: candidate.claimCoverage,
    subjectGrounding: candidate.subjectGrounding,
  }), "relevant_no_policy_gain");
});

test("required regression fixtures A-E", () => {
  const cpuc = evaluateClaimCoverage({ claimText: SAFETY_CLAIM, passage: GENERIC_SAFETY_PASSAGE, safetySensitive: true });
  assert.notEqual(cpuc.state, "direct");
  assert.ok(["weak", "mismatch", "partial"].includes(cpuc.subjectGrounding));

  const anthropic = evaluateClaimCoverage({ claimText: SAFETY_CLAIM, passage: SOFTWARE_PASSAGE, safetySensitive: true });
  assert.notEqual(anthropic.state, "direct");
  assert.ok(["mismatch", "weak"].includes(anthropic.subjectGrounding));

  const osha = evaluateClaimCoverage({ claimText: SAFETY_CLAIM, passage: OSHA_UNRELATED, safetySensitive: true });
  assert.notEqual(osha.state, "direct");

  const direct = evaluateClaimCoverage({ claimText: SAFETY_CLAIM, passage: DIRECT_SAFETY_PASSAGE, safetySensitive: true });
  assert.equal(direct.state, "direct");
  assert.ok(["strong", "partial"].includes(direct.subjectGrounding));

  const tempDirect = evaluateClaimCoverage({
    claimText: FOOD_TEMP_CLAIM,
    passage: FOOD_DIRECT,
    safetySensitive: true,
  });
  assert.equal(tempDirect.state, "direct");
});

test("equipment wrong-domain escalation matrix", () => {
  for (const passage of [EHS_ESCALATION_PASSAGE, HR_ESCALATION, IT_ESCALATION, LAB_ESCALATION]) {
    const coverage = evaluateClaimCoverage({
      claimText: FREEZER_ESCALATION_CLAIM,
      passage,
      packageProblem: "A commercial freezer is running warm.",
      safetySensitive: true,
    });
    assert.notEqual(coverage.state, "direct", passage.slice(0, 40));
    assert.ok(["mismatch", "weak", "context_only", "partial"].includes(coverage.state));
  }
  const good = evaluateClaimCoverage({
    claimText: FREEZER_ESCALATION_CLAIM,
    passage: REFRIGERATION_DIRECT,
    packageProblem: "A commercial freezer is running warm.",
    safetySensitive: true,
  });
  assert.equal(good.state, "direct");
});

test("food, SaaS, compliance, and comparison generalization", () => {
  assert.notEqual(evaluateClaimCoverage({ claimText: FOOD_TEMP_CLAIM, passage: WEATHER_TEMP, safetySensitive: true }).state, "direct");
  assert.notEqual(evaluateClaimCoverage({ claimText: FOOD_TEMP_CLAIM, passage: COIL_TEMP, safetySensitive: true }).state, "direct");
  assert.notEqual(evaluateClaimCoverage({ claimText: FOOD_TEMP_CLAIM, passage: CPU_THERMAL, safetySensitive: true }).state, "direct");
  assert.equal(evaluateClaimCoverage({ claimText: FOOD_TEMP_CLAIM, passage: FOOD_DIRECT, safetySensitive: true }).state, "direct");

  assert.notEqual(evaluateClaimCoverage({ claimText: SAAS_CLAIM, passage: PHYSICAL_ACCESS, policyClass: "broad_technical" }).state, "direct");
  assert.notEqual(evaluateClaimCoverage({ claimText: SAAS_CLAIM, passage: EQUIP_AUTH, policyClass: "broad_technical" }).state, "direct");
  assert.equal(evaluateClaimCoverage({ claimText: SAAS_CLAIM, passage: SAAS_DIRECT, policyClass: "broad_technical" }).state, "direct");

  assert.notEqual(evaluateClaimCoverage({ claimText: COMPLIANCE_CLAIM, passage: INTERNAL_REPORT, policyClass: "broad_technical" }).state, "direct");
  assert.equal(evaluateClaimCoverage({ claimText: COMPLIANCE_CLAIM, passage: COMPLIANCE_DIRECT, policyClass: "broad_technical" }).state, "direct");

  assert.notEqual(evaluateClaimCoverage({ claimText: COMPARE_CLAIM, passage: OTHER_PRODUCT_METRIC, policyClass: "broad_technical" }).state, "direct");
  assert.equal(evaluateClaimCoverage({ claimText: COMPARE_CLAIM, passage: COMPARE_DIRECT, policyClass: "broad_technical" }).state, "direct");
});

test("generated adversarial matrix: relation overlap must not create direct without subject overlap", () => {
  const claimSubjects = ["temperature", "refrigeration", "permission", "filing", "dishwasher"];
  const wrongSubjects = ["inspection", "grievance", "incident", "weather", "laundry"];
  const relationShell = "Unresolved issues must be escalated when conditions require verification and corrective action.";
  let mismatchCount = 0;
  for (const subject of claimSubjects) {
    for (const wrong of wrongSubjects) {
      const claim = `What conditions require escalation to verify the ${subject} problem?`;
      const passage = `${relationShell} The ${wrong} process continues under department review.`;
      const coverage = evaluateClaimCoverage({ claimText: claim, passage, documentTitle: `${wrong} escalation process` });
      if (coverage.state !== "direct") mismatchCount += 1;
      assert.notEqual(coverage.state, "direct");
    }
  }
  assert.ok(mismatchCount >= 20);
});

test("contradiction requires subject compatibility", () => {
  const coverage = evaluateClaimCoverage({
    claimText: FREEZER_ESCALATION_CLAIM,
    passage: "Operators may freely perform electrical and refrigerant repairs without escalation.",
    documentTitle: "Software permission escalation policy",
    safetySensitive: true,
  });
  assert.notEqual(coverage.state, "contradicts");
});

test("research memory remembers insufficient subject grounding claim/gap scoped", () => {
  const memory = buildResearchMemory({
    packageId: "sgo:package:freezer",
    claimId: "claim-1",
    policyGap: "temperature verification",
    runs: [{
      packageId: "sgo:package:freezer",
      claimId: "claim-1",
      plan: { evidenceGap: { unresolvedPolicyGap: "temperature verification" } },
      finishedAt: new Date().toISOString(),
      candidates: [{
        canonicalUrl: "https://www.ehs.example.edu/inspection-escalation",
        independenceCluster: "ehs.example.edu",
        relationship: "relevant",
        retrievalStatus: "ok",
        authorityAdequate: true,
        authorityClass: "primary_documentation",
        claimCoverage: "context_only",
        subjectGrounding: "mismatch",
        discoveredAt: new Date().toISOString(),
      }],
    }],
  });
  const skip = evaluateMemorySkip({ url: "https://www.ehs.example.edu/inspection-escalation", memory });
  assert.equal(skip.skip, true);
  assert.equal(skip.skipReason, "insufficient_subject_grounding");
});

test("university administrative procedures do not support equipment operator-procedure claim", () => {
  const coverage = evaluateClaimCoverage({
    claimText: MANUFACTURER_PROCEDURE_CLAIM,
    passage: UNIVERSITY_ADMIN_PROCEDURE_PASSAGE,
    documentTitle: UNIVERSITY_ADMIN_MANUAL_TITLE,
    ...FREEZER_PACKAGE,
    policyClass: "broad_technical",
  });
  assert.notEqual(coverage.state, "direct");
  assert.ok(["mismatch", "weak", "context_only", "partial"].includes(coverage.state));
  assert.ok(["mismatch", "weak"].includes(coverage.subjectGrounding));

  const candidate = hit(MANUFACTURER_PROCEDURE_CLAIM, UNIVERSITY_ADMIN_PROCEDURE_PASSAGE, UNIVERSITY_ADMIN_MANUAL_TITLE, {
    url: "https://www.example.edu/sop-manual",
    publisher: "Example University",
    sourceType: "primary_documentation",
    policyClass: "broad_technical",
    plan: planFor(MANUFACTURER_PROCEDURE_CLAIM, "broad_technical", FREEZER_PACKAGE),
  });
  assert.notEqual(candidate.claimCoverage, "direct");
  assert.notEqual(candidate.relationship, "supports");
  assert.notEqual(candidate.policyAdvancement, "advances_independence");
  assert.equal(candidateQualifiesForCorpusSubmission({ ...candidate, claimText: MANUFACTURER_PROCEDURE_CLAIM }), false);
});

test("genuine manufacturer operator manual still supports equipment procedure claim", () => {
  const coverage = evaluateClaimCoverage({
    claimText: MANUFACTURER_PROCEDURE_CLAIM,
    passage: EQUIPMENT_OPERATOR_MANUAL_PASSAGE,
    documentTitle: EQUIPMENT_OPERATOR_MANUAL_TITLE,
    ...FREEZER_PACKAGE,
    policyClass: "broad_technical",
  });
  assert.equal(coverage.state, "direct");
  assert.equal(coverage.subjectGrounding, "strong");

  const candidate = hit(MANUFACTURER_PROCEDURE_CLAIM, EQUIPMENT_OPERATOR_MANUAL_PASSAGE, EQUIPMENT_OPERATOR_MANUAL_TITLE, {
    url: "https://www.example-manufacturer.com/operator-manual",
    publisher: "Equipment Manufacturer",
    sourceType: "manufacturer_technical",
    policyClass: "broad_technical",
    plan: planFor(MANUFACTURER_PROCEDURE_CLAIM, "broad_technical", FREEZER_PACKAGE),
  });
  assert.equal(candidate.claimCoverage, "direct");
  assert.equal(candidate.subjectGrounding, "strong");
  assert.equal(candidate.relationship, "supports");
});

test("generic procedure vocabulary matrix rejects cross-domain administrative overlap", () => {
  const claims = [
    { claim: MANUFACTURER_PROCEDURE_CLAIM, package: FREEZER_PACKAGE },
    { claim: FREEZER_ESCALATION_CLAIM, package: FREEZER_PACKAGE },
    { claim: SAAS_CLAIM, package: null },
  ];
  const wrongPassages = [
    { passage: UNIVERSITY_ADMIN_PROCEDURE_PASSAGE, title: UNIVERSITY_ADMIN_MANUAL_TITLE },
    { passage: HR_ESCALATION, title: "Human resources escalation policy" },
    { passage: "Software release procedures require product owners to submit change requests through the deployment pipeline.", title: "Software change management procedures" },
    { passage: "Procurement staff must route purchase proposals through the standard approval workflow.", title: "Procurement proposal processing manual" },
  ];
  for (const { claim, package: pkg } of claims) {
    for (const { passage, title } of wrongPassages) {
      const coverage = evaluateClaimCoverage({
        claimText: claim,
        passage,
        documentTitle: title,
        packageProblem: pkg?.packageProblem,
        packageThesis: pkg?.packageThesis,
        policyClass: "broad_technical",
      });
      assert.notEqual(coverage.state, "direct", `${claim.slice(0, 40)} vs ${title.slice(0, 40)}`);
      assert.notEqual(coverage.subjectGrounding, "strong");
    }
  }
});

test("partial subject grounding cannot satisfy direct support for domain-specific claims", () => {
  assert.equal(claimIsDomainIndependent(MANUFACTURER_PROCEDURE_CLAIM), false);
  assert.equal(subjectGroundingIsSufficientForDirect("partial", false, MANUFACTURER_PROCEDURE_CLAIM), false);
  assert.equal(subjectGroundingIsSufficientForDirect("strong", false, MANUFACTURER_PROCEDURE_CLAIM), true);
});

test("authority and independence cannot rescue weak operational subject grounding", () => {
  const candidate = hit(MANUFACTURER_PROCEDURE_CLAIM, UNIVERSITY_ADMIN_PROCEDURE_PASSAGE, UNIVERSITY_ADMIN_MANUAL_TITLE, {
    url: "https://www.example.edu/sop-manual",
    publisher: "Example University",
    sourceType: "primary_documentation",
    policyClass: "broad_technical",
    plan: planFor(MANUFACTURER_PROCEDURE_CLAIM, "broad_technical", FREEZER_PACKAGE),
  });
  const advancement = classifyPolicyAdvancement({
    independenceCluster: candidate.independenceCluster,
    authorityClass: candidate.authorityClass,
    authorityAdequate: true,
    relationship: candidate.relationship,
    claimCoverage: candidate.claimCoverage,
    subjectGrounding: candidate.subjectGrounding,
    claimText: MANUFACTURER_PROCEDURE_CLAIM,
    gap: gapFor(MANUFACTURER_PROCEDURE_CLAIM, "broad_technical"),
  });
  assert.notEqual(advancement, "advances_independence");
  assert.notEqual(advancement, "advances_authority");
});

test("commercial isolation and publishing invariants", () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.throws(() => evaluateSubjectGrounding({
    claimText: TEMPERATURE_CLAIM,
    passage: EHS_ESCALATION_PASSAGE,
    economics: { payoutCents: 100 },
  }));
});

test("subject grounding classification overhead stays bounded", () => {
  const start = performance.now();
  for (let index = 0; index < 200; index += 1) {
    evaluateSubjectGrounding({
      claimText: TEMPERATURE_CLAIM,
      passage: EHS_ESCALATION_PASSAGE,
      documentTitle: EHS_TITLE,
      packageProblem: "A commercial freezer is running warm.",
    });
    evaluateClaimCoverage({
      claimText: TEMPERATURE_CLAIM,
      passage: EHS_ESCALATION_PASSAGE,
      documentTitle: EHS_TITLE,
      packageProblem: "A commercial freezer is running warm.",
    });
  }
  const elapsed = performance.now() - start;
  assert.ok(elapsed < 500, `classification overhead too high: ${elapsed}ms for 200 pairs`);
});

test("production precision modules contain no fixture-specific organization names", async () => {
  for (const file of [
    "app/growth/social/subject-grounding.ts",
    "app/growth/social/claim-coverage.ts",
    "app/growth/social/candidate-discovery.ts",
    "app/growth/social/evidence-gap-research.ts",
  ]) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bCalifornia\b|\bCPUC\b|\bUCI\b|\bOSHA\b|\bAnthropic\b|\bfreezer\b|\bSiemens\b|\bGenerac\b/i);
  }
});
