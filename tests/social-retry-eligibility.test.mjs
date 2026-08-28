import assert from "node:assert/strict";
import test from "node:test";
import {
  buildResearchWorkset,
  classifyOperatorState,
  countRetryEligibleGaps,
  evaluateClaimRetryEligibility,
  evaluateClaimRetryEligibilityIdempotent,
  evaluateMemorySkip,
  buildResearchMemory,
  buildResearchStrategyRecord,
  computeCurrentResearchStrategyFingerprint,
  LEGACY_RESEARCH_STRATEGY_FINGERPRINT,
  primaryOperatorAction,
  resolveResearchStrategyFingerprint,
} from "../app/growth/social/index.ts";
import {
  advanceOperator,
  loadOperatorView,
} from "../db/social-operator-repository.ts";
import {
  createContentOpportunity,
  createContentPackage,
  listPackageClaims,
} from "../db/social-growth-repository.ts";
import { listResearchRuns } from "../db/social-research-read.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const EQUIPMENT = {
  thesis: "An independent operator with a commercial freezer running around 20°F should be able to identify safe operational checks and determine when the problem requires a qualified refrigeration technician, without attempting unsafe electrical or refrigerant repairs.",
  packageUsefulnessTest: "After using this guide, an operator should be able to verify the temperature problem, identify safe checks they can perform themselves, recognize conditions that require professional refrigeration service, and avoid unsafe or unsupported repair attempts.",
  problem: "A commercial freezer is running warm.",
  audience: "independent_operator",
};

const SAAS = {
  thesis: "A restaurant manager should be able to export last week labor hours from the scheduling tool and reconcile them against payroll before submitting the invoice, without sharing employee SSNs in email.",
  packageUsefulnessTest: "The manager should be able to produce a reconciled hours file and keep SSNs out of email.",
  problem: "Payroll invoices go out before hours are checked.",
  audience: "independent_operator",
};

async function withAdmin(run) {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db };
  process.env.MARKETPLACE_ADMIN_EMAILS = "admin@example.com";
  try {
    await run(db);
  } finally {
    delete globalThis.__CHEF_GRINGO_ENV__;
    delete process.env.MARKETPLACE_ADMIN_EMAILS;
    db.close();
  }
}

async function seedAcknowledged(db, slug, fields) {
  const opportunity = await createContentOpportunity(db, {
    slug: `${slug}-opportunity`,
    problem: fields.problem,
    audience: fields.audience,
    usefulnessTest: fields.packageUsefulnessTest,
    productId: null,
    workflowId: null,
    partnerOpportunityId: null,
    status: "selected",
  });
  const pkg = await createContentPackage(db, {
    slug,
    opportunityId: opportunity.id,
    thesis: fields.thesis,
    usefulnessTest: fields.packageUsefulnessTest,
    commercialPosture: "none",
  });
  await advanceOperator(db, pkg.id, "admin@example.com", "advance");
  await advanceOperator(db, pkg.id, "admin@example.com", "acknowledge_investigation_plan");
  await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
  return pkg;
}

function legacyPlan() {
  return {
    claimOrQuestion: "test claim",
    evidenceGap: { unresolvedPolicyGap: "needs_independent_corroboration", version: "evidence-gap-research-v1" },
    queryPlans: [{ query: "legacy query", authorityPath: "government_regulatory" }],
  };
}

function currentStrategyPlan(packageFingerprint = "fp-freezer") {
  return {
    ...legacyPlan(),
    researchStrategy: buildResearchStrategyRecord({ packageFingerprint, providerKind: "auto" }),
  };
}

async function insertCompletedRun(db, packageId, claimId, plan) {
  const now = new Date().toISOString();
  const runId = `sgo:research-run:${claimId.slice(-10)}-${Math.random().toString(16).slice(2, 6)}`;
  await db.prepare(`
    INSERT INTO social_research_runs (
      id, package_id, claim_id, evidence_request_id, actor_email, provider_id, provider_kind, status,
      live_retrieval, stop_reason, plan_json, queries_json, diagnostics_json, started_at, finished_at
    ) VALUES (?, ?, ?, NULL, 'admin@example.com', 'fixture', 'fixture', 'completed', 0, 'budget', ?, '[]', NULL, ?, ?)
  `).bind(runId, packageId, claimId, JSON.stringify(plan), now, now).run();
  return runId;
}

async function clearPackageResearchRuns(db, packageId) {
  await db.prepare(`
    DELETE FROM social_research_candidates
    WHERE run_id IN (SELECT id FROM social_research_runs WHERE package_id = ?)
  `).bind(packageId).run();
  await db.prepare("DELETE FROM social_research_runs WHERE package_id = ?").bind(packageId).run();
}

function unsupportedAssessment(claimId) {
  return {
    claimId,
    state: "unsupported",
    gaps: ["No accepted supporting evidence records."],
    acceptedSourceCount: 0,
    policyClass: "broad_technical",
    researchPlan: {
      claimOrQuestion: "claim",
      reason: "gap",
      independentSourcesDesired: 2,
      preferredPrimarySources: ["manufacturer_technical"],
      disallowedSourceClasses: [],
      requiredAuthorityClass: "primary_documentation",
      stopCondition: "Independent evidence required.",
    },
  };
}

test("legacy completed run + current strategy → strategy_changed retry eligible", () => {
  const current = computeCurrentResearchStrategyFingerprint();
  const result = evaluateClaimRetryEligibility({
    claimId: "claim-a",
    researchNeeded: true,
    alreadyResearched: true,
    runs: [{
      claimId: "claim-a",
      status: "completed",
      finishedAt: "2026-01-01T00:00:00.000Z",
      plan: legacyPlan(),
    }],
    currentStrategyFingerprint: current.fingerprint,
    currentStrategyFingerprintLabel: current.fingerprintLabel,
  });
  assert.equal(result.retryEligible, true);
  assert.equal(result.retryReason, "strategy_changed");
  assert.equal(result.priorStrategyFingerprint, LEGACY_RESEARCH_STRATEGY_FINGERPRINT);
  assert.equal(result.currentStrategyFingerprint, current.fingerprint);
  assert.notEqual(result.priorStrategyFingerprint, result.currentStrategyFingerprint);
});

test("completed run under current strategy → not strategy-change retry eligible", () => {
  const current = computeCurrentResearchStrategyFingerprint();
  const result = evaluateClaimRetryEligibility({
    claimId: "claim-a",
    researchNeeded: true,
    alreadyResearched: true,
    runs: [{
      claimId: "claim-a",
      status: "completed",
      finishedAt: "2026-01-02T00:00:00.000Z",
      plan: currentStrategyPlan(),
    }],
    currentStrategyFingerprint: current.fingerprint,
    currentStrategyFingerprintLabel: current.fingerprintLabel,
  });
  assert.equal(result.retryEligible, false);
  assert.equal(result.retryReason, null);
});

test("retry eligibility evaluation is idempotent", () => {
  const { idempotent } = evaluateClaimRetryEligibilityIdempotent({
    claimId: "claim-a",
    researchNeeded: true,
    alreadyResearched: true,
    runs: [{
      claimId: "claim-a",
      status: "completed",
      finishedAt: "2026-01-01T00:00:00.000Z",
      plan: legacyPlan(),
    }],
  });
  assert.equal(idempotent, true);
});

test("only the claim with legacy strategy becomes retry eligible", () => {
  const current = computeCurrentResearchStrategyFingerprint();
  const runs = [
    { claimId: "claim-a", status: "completed", finishedAt: "2026-01-01T00:00:00.000Z", plan: legacyPlan() },
    { claimId: "claim-b", status: "completed", finishedAt: "2026-01-02T00:00:00.000Z", plan: currentStrategyPlan() },
  ];
  const left = evaluateClaimRetryEligibility({
    claimId: "claim-a",
    researchNeeded: true,
    alreadyResearched: true,
    runs,
    currentStrategyFingerprint: current.fingerprint,
  });
  const right = evaluateClaimRetryEligibility({
    claimId: "claim-b",
    researchNeeded: true,
    alreadyResearched: true,
    runs,
    currentStrategyFingerprint: current.fingerprint,
  });
  assert.equal(left.retryEligible, true);
  assert.equal(right.retryEligible, false);
});

test("URL memory remains active during strategy retry planning", () => {
  const url = "https://www.example.gov/rejected-coverage";
  const memory = buildResearchMemory({
    packageId: "pkg-a",
    claimId: "claim-a",
    policyGap: "needs_independent_corroboration",
    runs: [{
      packageId: "pkg-a",
      claimId: "claim-a",
      finishedAt: "2026-01-01T00:00:00.000Z",
      plan: legacyPlan(),
      candidates: [{
        canonicalUrl: url,
        independenceCluster: "example-gov",
        relationship: "relevant",
        retrievalStatus: "ok",
        authorityAdequate: true,
        claimCoverage: "none",
        subjectGrounding: "strong",
        discoveredAt: "2026-01-01T00:00:00.000Z",
      }],
    }],
  });
  assert.ok(memory.insufficientClaimCoverageUrls.length > 0);
  const rememberedUrl = memory.insufficientClaimCoverageUrls[0];
  const skip = evaluateMemorySkip({ url: rememberedUrl, memory, now: Date.parse("2026-01-02T00:00:00.000Z") });
  assert.equal(skip.skip, true);
  assert.equal(skip.skipReason, "insufficient_claim_coverage");
  assert.equal(resolveResearchStrategyFingerprint(legacyPlan()), LEGACY_RESEARCH_STRATEGY_FINGERPRINT);
});

test("new_package_context retry when package fingerprint changed under current strategy", () => {
  const current = computeCurrentResearchStrategyFingerprint();
  const result = evaluateClaimRetryEligibility({
    claimId: "claim-a",
    researchNeeded: true,
    alreadyResearched: true,
    currentPackageFingerprint: "fp-new",
    runs: [{
      claimId: "claim-a",
      status: "completed",
      finishedAt: "2026-01-01T00:00:00.000Z",
      plan: currentStrategyPlan("fp-old"),
    }],
    currentStrategyFingerprint: current.fingerprint,
  });
  assert.equal(result.retryEligible, true);
  assert.equal(result.retryReason, "new_package_context");
});

test("workset: zero unresearched + legacy runs → retryDue and RESEARCH_READY inputs", () => {
  const current = computeCurrentResearchStrategyFingerprint();
  const workset = buildResearchWorkset({
    claims: [
      { id: "claim-a", claimText: "Freezer claim A", safetySensitive: true },
      { id: "claim-b", claimText: "Freezer claim B", safetySensitive: false },
    ],
    assessments: [unsupportedAssessment("claim-a"), unsupportedAssessment("claim-b")],
    researchRuns: [
      { claimId: "claim-a", status: "completed", finishedAt: "2026-01-01T00:00:00.000Z", plan: legacyPlan() },
      { claimId: "claim-b", status: "completed", finishedAt: "2026-01-01T00:00:00.000Z", plan: legacyPlan() },
    ],
    currentPackageFingerprint: "fp-freezer",
  });
  assert.equal(workset.due.filter((item) => !item.alreadyResearched).length, 0);
  assert.equal(workset.retryDue.length, 2);
  assert.equal(countRetryEligibleGaps(workset.items), 2);
  assert.equal(workset.items.every((item) => item.retryReason === "strategy_changed"), true);
  assert.equal(workset.currentStrategyFingerprint, current.fingerprint);
  const snapshot = {
    packageId: "pkg",
    hasPackage: true,
    proposalCount: 2,
    claimCount: 2,
    currentFingerprint: "fp-freezer",
    plan: { packageFingerprint: "fp-freezer", state: "acknowledged", items: [], rawProposalIds: [] },
    openTasks: [],
    verifiedFactCount: 0,
    unresolvedContradiction: false,
    awaitingCorpusReviewCount: 0,
    researchRunCount: 2,
    researchInProgress: false,
    unresearchedGapCount: 0,
    retryEligibleGapCount: countRetryEligibleGaps(workset.items),
    contentAuthorized: false,
    packageApproved: false,
  };
  assert.equal(classifyOperatorState(snapshot), "research_ready");
  assert.equal(primaryOperatorAction("research_ready").id, "continue_evidence_research");
});

test("workset: after current-strategy retry completes eligibility clears", () => {
  const workset = buildResearchWorkset({
    claims: [{ id: "claim-a", claimText: "Freezer claim", safetySensitive: true }],
    assessments: [unsupportedAssessment("claim-a")],
    researchRuns: [
      { claimId: "claim-a", status: "completed", finishedAt: "2026-01-01T00:00:00.000Z", plan: legacyPlan() },
      { claimId: "claim-a", status: "completed", finishedAt: "2026-01-02T00:00:00.000Z", plan: currentStrategyPlan() },
    ],
    currentPackageFingerprint: "fp-freezer",
  });
  assert.equal(countRetryEligibleGaps(workset.items), 0);
  assert.equal(workset.retryDue.length, 0);
});

test("no endless strategy retry loop after current-strategy completion", () => {
  const current = computeCurrentResearchStrategyFingerprint();
  const runs = [
    { claimId: "claim-a", status: "completed", finishedAt: "2026-01-01T00:00:00.000Z", plan: legacyPlan() },
    { claimId: "claim-a", status: "completed", finishedAt: "2026-01-02T00:00:00.000Z", plan: currentStrategyPlan() },
  ];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = evaluateClaimRetryEligibility({
      claimId: "claim-a",
      researchNeeded: true,
      alreadyResearched: true,
      runs,
      currentStrategyFingerprint: current.fingerprint,
    });
    assert.equal(result.retryEligible, false);
  }
});

test("adversarial unrelated SaaS claim keeps generic strategy fingerprint behavior", () => {
  const current = computeCurrentResearchStrategyFingerprint();
  const result = evaluateClaimRetryEligibility({
    claimId: "claim-saas",
    researchNeeded: true,
    alreadyResearched: true,
    runs: [{
      claimId: "claim-saas",
      status: "completed",
      finishedAt: "2026-01-01T00:00:00.000Z",
      plan: legacyPlan(),
    }],
    currentStrategyFingerprint: current.fingerprint,
  });
  assert.equal(result.retryEligible, true);
  assert.equal(result.retryReason, "strategy_changed");
});

test("freezer integration: legacy runs → RESEARCH_READY; current-strategy runs → EVIDENCE_UNRESOLVED", async () => {
  await withAdmin(async (db) => {
    const pkg = await seedAcknowledged(db, "commercial-freezer-retry", EQUIPMENT);
    const claims = await listPackageClaims(db, pkg.id);
    assert.ok(claims.length >= 1);
    await clearPackageResearchRuns(db, pkg.id);
    const viewBefore = await loadOperatorView(db, pkg.id);
    const packageFingerprint = viewBefore.investigationPlan?.packageFingerprint ?? "current-fp";
    for (const claim of claims) {
      await insertCompletedRun(db, pkg.id, claim.id, legacyPlan());
    }
    const legacyView = await loadOperatorView(db, pkg.id);
    assert.equal(legacyView.summary.unresearchedGapCount, 0);
    assert.ok(legacyView.summary.retryEligibleGapCount >= 1);
    assert.equal(legacyView.state, "research_ready");
    assert.equal(legacyView.primaryAction.id, "continue_evidence_research");
    assert.ok(legacyView.researchWorkset.retryDue.length >= 1);
    assert.match(legacyView.researchWorkset.retryDue[0].retryReason ?? "", /strategy_changed/);

    for (const claim of claims) {
      await insertCompletedRun(db, pkg.id, claim.id, currentStrategyPlan(packageFingerprint));
    }
    const retriedView = await loadOperatorView(db, pkg.id);
    assert.equal(retriedView.summary.retryEligibleGapCount, 0);
    assert.equal(retriedView.state, "evidence_unresolved");
    assert.equal(retriedView.primaryAction.id, "complete");
    const runsBefore = (await listResearchRuns(db)).filter((item) => item.packageId === pkg.id).length;
    const noop = await advanceOperator(db, pkg.id, "admin@example.com", "continue_evidence_research");
    const runsAfter = (await listResearchRuns(db)).filter((item) => item.packageId === pkg.id).length;
    assert.equal(runsAfter, runsBefore);
    assert.equal(noop.state, "evidence_unresolved");
  });
});

test("freezer integration: only one claim with legacy run is retry eligible when others have current strategy", async () => {
  await withAdmin(async (db) => {
    const pkg = await seedAcknowledged(db, "commercial-freezer-partial-retry", EQUIPMENT);
    const claims = await listPackageClaims(db, pkg.id);
    assert.ok(claims.length >= 2);
    await clearPackageResearchRuns(db, pkg.id);
    const view = await loadOperatorView(db, pkg.id);
    const packageFingerprint = view.investigationPlan?.packageFingerprint ?? "current-fp";
    await insertCompletedRun(db, pkg.id, claims[0].id, legacyPlan());
    for (const claim of claims.slice(1)) {
      await insertCompletedRun(db, pkg.id, claim.id, currentStrategyPlan(packageFingerprint));
    }
    const partial = await loadOperatorView(db, pkg.id);
    assert.equal(partial.summary.retryEligibleGapCount, 1);
    assert.equal(partial.researchWorkset.retryDue.length, 1);
    assert.equal(partial.researchWorkset.retryDue[0].claimId, claims[0].id);
  });
});

test("SaaS package adversarial integration does not special-case freezer domains", async () => {
  await withAdmin(async (db) => {
    const pkg = await seedAcknowledged(db, "saas-payroll-retry", SAAS);
    const claims = await listPackageClaims(db, pkg.id);
    assert.ok(claims.length >= 1);
    await clearPackageResearchRuns(db, pkg.id);
    for (const claim of claims) {
      await insertCompletedRun(db, pkg.id, claim.id, legacyPlan());
    }
    const view = await loadOperatorView(db, pkg.id);
    assert.equal(view.state, "research_ready");
    assert.equal(view.summary.unresearchedGapCount, 0);
    assert.ok(view.summary.retryEligibleGapCount >= 1);
  });
});
