import assert from "node:assert/strict";
import test from "node:test";
import {
  CONFIDENCE_RUBRIC,
  canTransitionWorkflow,
  evaluateWorkflowQualityGates,
} from "../app/lib/knowledge-core.ts";
import {
  PILOT_SLUG,
  createAndLinkSource,
  createWorkflow,
  getWorkflowBundle,
  reorderWorkflowSteps,
  transitionWorkflow,
  updateWorkflow,
} from "../db/knowledge-core-repository.ts";
import { authorizeMarketplaceEmail } from "../app/lib/marketplace-permissions.ts";
import { SqliteD1Adapter, applyMigrations } from "./helpers/sqlite-d1.mjs";

async function database() {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  return db;
}

function gateWorkflow(overrides = {}) {
  return {
    title: "Workflow",
    slug: "workflow",
    summary: "Summary",
    problemStatement: "Problem",
    jobStatement: "Job",
    intendedOutcome: "Outcome",
    nextAction: "Next action",
    affiliateDisclosure: "No affiliate-linked products are referenced.",
    confidenceLevel: "moderate",
    primaryPersonaId: 1,
    primaryEnvironmentId: 1,
    primaryUseCaseId: 1,
    reviewerUserId: "reviewer@example.com",
    createdByUserId: "author@example.com",
    lastVerifiedAt: "2026-07-27",
    reviewDueAt: "2027-01-27",
    ...overrides,
  };
}

function gateStep(overrides = {}) {
  return {
    id: 1,
    position: 1,
    title: "Do the work",
    instruction: "Follow the approved method.",
    purpose: "Complete the job.",
    expectedResult: "Expected result",
    measurableCheck: "Document the check.",
    commonMistake: "Skipping the check.",
    correctiveAction: "Stop and correct.",
    riskLevel: "low",
    ...overrides,
  };
}

const verifiedSource = {
  workflowStepId: null,
  verificationStatus: "verified",
  verifiedByUserId: "reviewer@example.com",
  verifiedAt: "2026-07-27",
  confidenceLevel: "moderate",
};

test("migration applies cleanly and seeds only the draft pilot", async () => {
  const db = await database();
  const tableCount = db.database.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").get().count;
  assert.equal(tableCount, 24);
  const workflow = db.database.prepare("SELECT status, confidence_level AS confidence FROM workflows WHERE slug = ?").get(PILOT_SLUG);
  assert.equal(workflow.status, "draft");
  assert.equal(workflow.confidence, "insufficient");
  assert.equal(db.database.prepare("SELECT count(*) AS count FROM workflow_steps").get().count, 12);
  assert.equal(db.database.prepare("SELECT count(*) AS count FROM sources").get().count, 0);
  db.close();
});

test("workflow creation and audit event are transactional", async () => {
  const db = await database();
  db.database.exec("DROP TABLE editorial_events");
  await assert.rejects(() => createWorkflow(db, { slug: "rollback-test", title: "Rollback test" }, "editor@example.com"));
  assert.equal(db.database.prepare("SELECT count(*) AS count FROM workflows WHERE slug = 'rollback-test'").get().count, 0);
  db.close();
});

test("workflow slugs and step positions remain unique", async () => {
  const db = await database();
  await assert.rejects(() => createWorkflow(db, { slug: PILOT_SLUG, title: "Duplicate" }, "editor@example.com"));
  const workflow = db.database.prepare("SELECT id FROM workflows WHERE slug = ?").get(PILOT_SLUG);
  await assert.rejects(async () => db.prepare("INSERT INTO workflow_steps (workflow_id, position, title) VALUES (?, 1, 'Duplicate')").bind(workflow.id).run());
  db.close();
});

test("ordered retrieval and reordering are deterministic", async () => {
  const db = await database();
  const before = await getWorkflowBundle(db, PILOT_SLUG);
  const reversedIds = before.steps.map((step) => step.id).reverse();
  await reorderWorkflowSteps(db, before.workflow.id, reversedIds, "editor@example.com");
  const after = await getWorkflowBundle(db, PILOT_SLUG);
  assert.deepEqual(after.steps.map((step) => step.id), reversedIds);
  assert.deepEqual(after.steps.map((step) => step.position), Array.from({ length: 12 }, (_, index) => index + 1));
  db.close();
});

test("sources link to the workflow and a specific step without parsing free text", async () => {
  const db = await database();
  const bundle = await getWorkflowBundle(db, PILOT_SLUG);
  await createAndLinkSource(db, bundle.workflow.id, {
    title: "Test-only source",
    publisher: "Test fixture",
    sourceType: "editorial_judgment",
    verificationStatus: "draft",
    workflowStepId: bundle.steps[0].id,
    claimText: "Test-only claim",
    evidenceSummary: "Test-only summary",
    confidenceLevel: "insufficient",
    limitations: "Not publishable evidence.",
  }, "editor@example.com");
  const after = await getWorkflowBundle(db, PILOT_SLUG);
  assert.equal(after.sources[0].workflowStepId, bundle.steps[0].id);
  assert.equal(after.sources[0].sourceTitle, "Test-only source");
  db.close();
});

test("authorization distinguishes unauthenticated, unauthorized, and authorized editors", () => {
  assert.equal(authorizeMarketplaceEmail(null, "editor@example.com:editor"), null);
  assert.equal(authorizeMarketplaceEmail("viewer@example.com", "editor@example.com:editor"), null);
  assert.deepEqual(authorizeMarketplaceEmail("EDITOR@example.com", "editor@example.com:editor"), {
    email: "editor@example.com",
    permission: "editor",
  });
});

test("confidence rubric has stable identifiers and minimum evidence expectations", () => {
  assert.deepEqual(Object.keys(CONFIDENCE_RUBRIC), ["insufficient", "low", "moderate", "high"]);
  for (const level of Object.values(CONFIDENCE_RUBRIC)) {
    assert.ok(level.label);
    assert.ok(level.description);
    assert.ok(level.minimumEvidence);
  }
});

test("quality gates reject empty, unsourced, unreviewed, unverified, and invalid workflows", () => {
  assert.ok(evaluateWorkflowQualityGates(gateWorkflow({ title: "" }), [], []).some((failure) => failure.code === "missing_title"));
  assert.ok(evaluateWorkflowQualityGates(gateWorkflow(), [gateStep()], []).some((failure) => failure.code === "missing_verified_source"));
  assert.ok(evaluateWorkflowQualityGates(gateWorkflow(), [gateStep({ riskLevel: "high" })], [verifiedSource]).some((failure) => failure.code === "missing_high_risk_source"));
  assert.ok(evaluateWorkflowQualityGates(gateWorkflow({ reviewerUserId: null }), [gateStep()], [verifiedSource]).some((failure) => failure.code === "missing_reviewer"));
  assert.ok(evaluateWorkflowQualityGates(gateWorkflow({ lastVerifiedAt: null }), [gateStep()], [verifiedSource]).some((failure) => failure.code === "missing_verification_date"));
  assert.ok(evaluateWorkflowQualityGates(gateWorkflow(), [gateStep({ position: 2 })], [verifiedSource]).some((failure) => failure.code === "invalid_step_positions"));
});

test("a fully compliant workflow satisfies publication gates", () => {
  const step = gateStep({ riskLevel: "high" });
  const sources = [{ ...verifiedSource, workflowStepId: step.id }];
  assert.deepEqual(evaluateWorkflowQualityGates(gateWorkflow(), [step], sources), []);
});

test("editorial lifecycle rejects invalid transitions and records blocked publication", async () => {
  const db = await database();
  const bundle = await getWorkflowBundle(db, PILOT_SLUG);
  assert.equal(canTransitionWorkflow("draft", "published"), false);
  const invalid = await transitionWorkflow(db, bundle.workflow.id, "published", "reviewer@example.com", "Invalid jump");
  assert.equal(invalid.ok, false);
  const submitted = await transitionWorkflow(db, bundle.workflow.id, "in_review", "editor@example.com", "Ready for source review");
  assert.equal(submitted.ok, true);
  const blocked = await transitionWorkflow(db, bundle.workflow.id, "published", "reviewer@example.com", "Attempt review");
  assert.equal(blocked.ok, false);
  assert.ok(blocked.qualityGates.length > 0);
  const actions = db.database.prepare("SELECT action FROM editorial_events WHERE entity_type = 'workflow' AND entity_id = ? ORDER BY id").all(bundle.workflow.id).map((row) => row.action);
  assert.ok(actions.includes("publication_attempted"));
  assert.ok(actions.includes("publication_blocked"));
  db.close();
});

test("a compliant workflow can move from draft to review to published", async () => {
  const db = await database();
  const created = await createWorkflow(db, {
    slug: "compliant-workflow",
    title: "Compliant workflow",
    summary: "Complete summary",
    problemStatement: "Problem",
    jobStatement: "Job",
    intendedOutcome: "Outcome",
    nextAction: "Next",
    confidenceLevel: "moderate",
    primaryPersonaId: 1,
    primaryEnvironmentId: 1,
    primaryUseCaseId: 1,
  }, "author@example.com");
  const id = created.id;
  await db.batch([
    db.prepare(`INSERT INTO workflow_steps (workflow_id, position, title, instruction, purpose, expected_result, measurable_check, common_mistake, corrective_action, risk_level)
      VALUES (?, 1, 'Step', 'Instruction', 'Purpose', 'Expected', 'Check', 'Mistake', 'Correction', 'low')`).bind(id),
  ]);
  await updateWorkflow(db, id, {
    reviewerUserId: "reviewer@example.com",
    lastVerifiedAt: "2026-07-27",
    reviewDueAt: "2027-01-27",
  }, "author@example.com", "Assign independent review");
  await createAndLinkSource(db, id, {
    title: "Verified test fixture",
    publisher: "Test fixture",
    sourceType: "editorial_judgment",
    verificationStatus: "verified",
    claimText: "Test fixture claim",
    evidenceSummary: "Test fixture evidence",
    confidenceLevel: "moderate",
    limitations: "Test only",
    verifiedByUserId: "reviewer@example.com",
    verifiedAt: "2026-07-27",
  }, "reviewer@example.com");
  assert.equal((await transitionWorkflow(db, id, "in_review", "author@example.com", "Submit")).ok, true);
  const published = await transitionWorkflow(db, id, "published", "reviewer@example.com", "Approve");
  assert.equal(published.ok, true);
  assert.equal(published.workflow.status, "published");
  assert.equal(db.database.prepare("SELECT count(*) AS count FROM editorial_events WHERE entity_id = ? AND action = 'published'").get(id).count, 1);
  db.close();
});
