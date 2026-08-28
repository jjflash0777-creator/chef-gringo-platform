import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { RESEARCH_LIMITS } from "../app/lib/research/limits.ts";
import {
  OPERATOR_RESEARCH_BUDGET,
  SOCIAL_PUBLISH_AVAILABLE,
  assertNoEconomicsRankingFields,
  buildResearchStrategyRecord,
  buildResearchWorkset,
  claimDraftsFromInvestigationPlan,
  claimHasAttachedEvidence,
  classifyOperatorState,
  decomposePackageToClaimProposals,
  materialInvestigationItems,
  operatorRequestForPrimaryAction,
  primaryOperatorAction,
  refineInvestigationPlan,
  remainingOperatorResearchBudget,
} from "../app/growth/social/index.ts";
import { getCorpusDocument } from "../db/corpus-repository.ts";
import { buildPackageEvidenceIntelligence } from "../db/social-evidence-intelligence.ts";
import { createUnevidencedPackageClaim, listClaimProposals } from "../db/social-claim-proposal-repository.ts";
import { listInvestigationClaimLinks } from "../db/social-investigation-claims.ts";
import {
  advanceOperator,
  listHumanReviewTasks,
  loadOperatorView,
} from "../db/social-operator-repository.ts";
import {
  createContentOpportunity,
  createContentPackage,
  listPackageClaims,
  loadSocialGrowthQueue,
  updateContentPackage,
} from "../db/social-growth-repository.ts";
import { listResearchRuns } from "../db/social-research-read.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const operatorRoute = await import("../app/api/growth/packages/[id]/operator/route.ts");
const approvalRoute = await import("../app/api/growth/approvals/route.ts");

function request(path, { email, method = "GET", body } = {}) {
  const headers = { "content-type": "application/json" };
  if (email) headers["oai-authenticated-user-email"] = email;
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

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

const EQUIPMENT = {
  thesis: "An independent operator with a commercial freezer running around 20°F should be able to identify safe operational checks and determine when the problem requires a qualified refrigeration technician, without attempting unsafe electrical or refrigerant repairs.",
  packageUsefulnessTest: "After using this guide, an operator should be able to verify the temperature problem, identify safe checks they can perform themselves, recognize conditions that require professional refrigeration service, and avoid unsafe or unsupported repair attempts.",
  problem: "A commercial freezer is running warm.",
  audience: "independent_operator",
};

const FOOD = {
  thesis: "A café should hold sliced tomatoes below 41°F after prep, and discard them after 4 hours at room temperature per food-safety practice.",
  packageUsefulnessTest: "The operator should be able to name the hold temperature, the time limit, and when product must be discarded.",
  problem: "Prep cooks leave sliced tomatoes on the counter.",
  audience: "independent_operator",
};

const SAAS = {
  thesis: "A restaurant manager should be able to export last week labor hours from the scheduling tool and reconcile them against payroll before submitting the invoice, without sharing employee SSNs in email.",
  packageUsefulnessTest: "The manager should be able to produce a reconciled hours file and keep SSNs out of email.",
  problem: "Payroll invoices go out before hours are checked.",
  audience: "independent_operator",
};

const BUYING = {
  thesis: "A buyer comparing two commercial dishwashers should be able to compare rack capacity, water connection requirements, and warranty terms, and should not treat a seller listing as an independent specification.",
  packageUsefulnessTest: "After using this guide, the buyer can name capacity, utility requirements, and what still requires the manufacturer sheet.",
  problem: "Operators need to choose a dishwasher without relying on marketplace copy.",
  audience: "independent_operator",
};

const HEADROOM = {
  thesis: "Recommended operating headroom should be evidenced under these conditions before an operator treats a manufacturer buffer as a site rule.",
  packageUsefulnessTest: "After using this guide, the operator can name what still requires an independent technical source for operating headroom.",
  problem: "Operators treat sales buffers as operating headroom.",
  audience: "independent_operator",
};

async function seedBarePackage(db, slug, fields) {
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
  return { opportunity, pkg };
}

async function insertCompletedResearchRun(db, packageId, claimId, plan = {}) {
  const now = new Date().toISOString();
  const runId = `sgo:research-run:coverage-${claimId.slice(-12)}`;
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

async function prepareAcknowledged(db, slug, fields) {
  const seeded = await seedBarePackage(db, slug, fields);
  await advanceOperator(db, seeded.pkg.id, "admin@example.com", "advance");
  const acknowledged = await advanceOperator(db, seeded.pkg.id, "admin@example.com", "acknowledge_investigation_plan");
  assert.equal(acknowledged.state, "claims_needed");
  return { ...seeded, view: acknowledged };
}

function planDrafts(fields) {
  const drafts = decomposePackageToClaimProposals({
    packageId: `sgo:package:${fields.slug ?? "example"}`,
    packageSlug: fields.slug ?? "example",
    thesis: fields.thesis,
    packageUsefulnessTest: fields.packageUsefulnessTest,
    problem: fields.problem,
    audience: fields.audience,
  });
  const plan = refineInvestigationPlan({
    packageId: `sgo:package:${fields.slug ?? "example"}`,
    packageFingerprint: "testfp01",
    packageProblem: fields.problem,
    packageAudience: fields.audience,
    packageThesis: fields.thesis,
    packageUsefulnessTest: fields.packageUsefulnessTest,
    proposals: drafts.map((draft, index) => ({
      ...draft,
      id: `sgo:claim-proposal:${(fields.slug ?? "example")}-${index + 1}`,
    })),
  });
  return { drafts, plan };
}

test("operator research budget is stricter than or equal to existing 3/10/5/8s caps", () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.equal(RESEARCH_LIMITS.maximumQueries, 3);
  assert.equal(RESEARCH_LIMITS.maximumUrlAttempts, 10);
  assert.equal(RESEARCH_LIMITS.maximumCandidates, 5);
  assert.equal(RESEARCH_LIMITS.maximumRuntimeMs, 8000);
  assert.ok(OPERATOR_RESEARCH_BUDGET.maximumQueries <= RESEARCH_LIMITS.maximumQueries);
  assert.ok(OPERATOR_RESEARCH_BUDGET.maximumUrlAttempts <= RESEARCH_LIMITS.maximumUrlAttempts);
  assert.ok(OPERATOR_RESEARCH_BUDGET.maximumAssessedCandidates <= RESEARCH_LIMITS.maximumCandidates);
  assert.ok(OPERATOR_RESEARCH_BUDGET.maximumRuntimeMs <= RESEARCH_LIMITS.maximumRuntimeMs);
  assert.equal(OPERATOR_RESEARCH_BUDGET.maximumClaims, 2);
  const remaining = remainingOperatorResearchBudget({
    claims: 2,
    queries: 3,
    urlAttempts: 10,
    assessedCandidates: 5,
    runtimeMs: 8000,
  });
  assert.equal(remaining.claims, 0);
  assert.equal(remaining.queries, 0);
});

test("pruned investigation items never become claim drafts", () => {
  const { plan } = planDrafts({ ...EQUIPMENT, slug: "commercial-freezer-running-warm" });
  const { drafts, excluded } = claimDraftsFromInvestigationPlan({
    planId: "sgo:investigation-plan:freezer-testfp01",
    packageFingerprint: "testfp01",
    items: plan.items,
  });
  assert.ok(drafts.length >= 1);
  assert.ok(drafts.length <= materialInvestigationItems(plan).length);
  assert.ok(excluded.some((item) => item.kind === "context_only" || item.prunedReason));
  assert.ok(drafts.every((draft) => !excluded.some((item) => item.itemKey === draft.itemKey)));
  assert.ok(!drafts.some((draft) => /audience/i.test(draft.claimText) && /stated audience/i.test(draft.claimText)));
});

test("four domains produce different claim and research worksets from the same machinery", () => {
  const equipment = planDrafts({ ...EQUIPMENT, slug: "eq" });
  const food = planDrafts({ ...FOOD, slug: "food" });
  const saas = planDrafts({ ...SAAS, slug: "saas" });
  const buying = planDrafts({ ...BUYING, slug: "buy" });
  const sets = [equipment, food, saas, buying].map((entry, index) => {
    const { drafts } = claimDraftsFromInvestigationPlan({
      planId: `sgo:investigation-plan:domain-${index + 1}`,
      packageFingerprint: "testfp01",
      items: entry.plan.items,
    });
    const workset = buildResearchWorkset({
      claims: drafts.map((draft, claimIndex) => ({
        id: `sgo:claim:domain-${index + 1}-${claimIndex + 1}`,
        claimText: draft.claimText,
        safetySensitive: draft.safetySensitive,
      })),
      assessments: drafts.map((draft, claimIndex) => ({
        claimId: `sgo:claim:domain-${index + 1}-${claimIndex + 1}`,
        claimText: draft.claimText,
        safetySensitive: draft.safetySensitive,
        policyClass: draft.safetySensitive ? "safety_sensitive" : "broad_technical",
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
          safetySensitive: draft.safetySensitive,
          breadthMatch: true,
        },
        gaps: ["No accepted supporting evidence records."],
        recommendedNextAction: "research",
        researchPlan: {
          claimOrQuestion: draft.claimText,
          requiredAuthorityClass: draft.recommendedSourceClass,
          independentSourcesDesired: 1,
          preferredPrimarySources: [],
          disallowedSourceClasses: [],
          stopCondition: draft.independenceRequirement,
          reason: "unsupported",
        },
      })),
      investigationItems: entry.plan.items,
      links: drafts.map((draft, claimIndex) => ({
        claimId: `sgo:claim:domain-${index + 1}-${claimIndex + 1}`,
        itemKey: draft.itemKey,
      })),
    });
    return { texts: drafts.map((draft) => draft.claimText).sort().join("|"), order: workset.due.map((item) => item.claimId).join("|") };
  });
  assert.notEqual(sets[0].texts, sets[1].texts);
  assert.notEqual(sets[0].texts, sets[2].texts);
  assert.notEqual(sets[0].texts, sets[3].texts);
  assert.notEqual(sets[1].texts, sets[2].texts);
});

test("research ordering is safety/usefulness driven and economics cannot influence it", () => {
  const workset = buildResearchWorkset({
    claims: [
      { id: "sgo:claim:convenience", claimText: "A convenience check.", safetySensitive: false },
      { id: "sgo:claim:safety", claimText: "A safety boundary.", safetySensitive: true },
    ],
    assessments: [
      {
        claimId: "sgo:claim:convenience",
        claimText: "A convenience check.",
        safetySensitive: false,
        policyClass: "broad_technical",
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
          safetySensitive: false,
          breadthMatch: true,
        },
        gaps: ["No accepted supporting evidence records."],
        recommendedNextAction: "research",
        researchPlan: null,
      },
      {
        claimId: "sgo:claim:safety",
        claimText: "A safety boundary.",
        safetySensitive: true,
        policyClass: "safety_sensitive",
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
          safetySensitive: true,
          breadthMatch: true,
        },
        gaps: ["No accepted supporting evidence records."],
        recommendedNextAction: "research",
        researchPlan: {
          claimOrQuestion: "A safety boundary.",
          requiredAuthorityClass: "especially_authoritative",
          independentSourcesDesired: 1,
          preferredPrimarySources: ["government_regulatory"],
          disallowedSourceClasses: [],
          stopCondition: "Manufacturer-only material cannot corroborate itself.",
          reason: "unsupported",
        },
      },
    ],
  });
  assert.equal(workset.due[0].claimId, "sgo:claim:safety");
  assert.match(workset.due[0].requiredAuthority, /especially_authoritative|government/);
  assert.throws(() => buildResearchWorkset({
    claims: [{ id: "sgo:claim:safety", claimText: "A safety boundary.", safetySensitive: true }],
    assessments: [],
    commission: 12,
  }), /economics|commission/i);
  assert.doesNotThrow(() => assertNoEconomicsRankingFields({ claims: [{ id: "a" }], assessments: [] }));
});

test("existing freezer acknowledged plan remains consumable and creates deterministic unevidenced claims", async () => {
  await withAdmin(async (db) => {
    const { pkg, view } = await prepareAcknowledged(db, "commercial-freezer-running-warm", EQUIPMENT);
    const plan = view.investigationPlan;
    assert.equal(plan.state, "acknowledged");
    const material = materialInvestigationItems(plan);
    const rawCount = (await listClaimProposals(db, pkg.id)).length;
    assert.ok(rawCount >= material.length);
    const created = await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    const claims = await listPackageClaims(db, pkg.id);
    const links = await listInvestigationClaimLinks(db, pkg.id);
    assert.equal(claims.length, material.length);
    assert.equal(links.length, material.length);
    assert.ok(claims.every((claim) => !claimHasAttachedEvidence(claim)));
    assert.ok(claims.every((claim) => claim.evidence.id === ""));
    assert.ok(created.executionTrace.some((step) => step.id === "create_claims_from_investigation"));
    assert.ok(created.executionTrace.some((step) => step.id === "evaluate_evidence_intelligence"));
    const intelligence = await buildPackageEvidenceIntelligence(db, pkg.id);
    assert.equal(intelligence.claimAssessments.filter((item) => item.state === "supported").length, 0);
    assert.ok(intelligence.claimAssessments.every((item) => item.state === "unsupported" || item.state === "insufficient_authority" || item.state === "needs_independent_corroboration"));
    assert.ok(intelligence.radar.unsupported.length + intelligence.radar.strongerAuthority.length + intelligence.radar.needsIndependentCorroboration.length >= 1);
    assert.equal(created.publishingEnabled, false);
    const again = await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    assert.equal((await listPackageClaims(db, pkg.id)).length, claims.length);
    assert.ok(again.executionTrace.find((step) => step.id === "create_claims_from_investigation")?.skipped);
    const safetyClaim = claims.find((claim) => claim.safetySensitive);
    assert.ok(safetyClaim);
    const safetyAssessment = intelligence.claimAssessments.find((item) => item.claimId === safetyClaim.id);
    assert.equal(safetyAssessment.safetySensitive, true);
    assert.ok(!claims.some((claim) => claim.claimText === pkg.thesis));
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "accept_corpus_evidence"), /human authority/i);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "publish"), /cannot publish|human authority/i);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "approve_package"), /human authority/i);
    const approval = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com",
      method: "POST",
      body: { subjectKind: "package", subjectId: pkg.id, decision: "approved", reason: "Looks good", slug: "still-premature" },
    }));
    assert.ok(approval.status >= 400);
    for (const run of await listResearchRuns(db, pkg.id)) {
      for (const candidate of run.candidates) {
        assert.notEqual(candidate.submittedDocumentId && (await getCorpusDocument(db, candidate.submittedDocumentId))?.ingestionStatus, "accepted");
        if (candidate.submittedDocumentId) {
          const document = await getCorpusDocument(db, candidate.submittedDocumentId);
          assert.notEqual(document.ingestionStatus, "accepted");
          assert.equal(document.productionExposure, false);
        }
      }
    }
  });
});

test("stale plan fingerprint cannot create current claims and historical claims are preserved", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await prepareAcknowledged(db, "stale-plan-claims", EQUIPMENT);
    const first = await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    const before = await listPackageClaims(db, pkg.id);
    assert.ok(before.length >= 1);
    await updateContentPackage(db, pkg.id, {
      thesis: `${EQUIPMENT.thesis} Name the model from the nameplate before calling service.`,
    });
    const afterEdit = await loadOperatorView(db, pkg.id);
    assert.equal(afterEdit.state, "refinement_needed");
    await advanceOperator(db, pkg.id, "admin@example.com", "advance");
    const blocked = await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    assert.equal(blocked.state, "investigation_review");
    assert.equal((await listPackageClaims(db, pkg.id)).length, before.length);
    assert.ok(blocked.executionTrace.some((step) => (
      step.id === "create_claims_from_investigation" && step.skipped
    )));
    const prepared = await loadOperatorView(db, pkg.id);
    assert.equal(prepared.state, "investigation_review");
    await advanceOperator(db, pkg.id, "admin@example.com", "acknowledge_investigation_plan");
    const second = await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    const after = await listPackageClaims(db, pkg.id);
    assert.ok(after.length >= before.length);
    assert.ok(before.every((claim) => after.some((item) => item.id === claim.id)));
    assert.equal(first.publishingEnabled, false);
    assert.equal(second.publishingEnabled, false);
  });
});

test("unprovenanced same-text claims are not treated as the current plan item", async () => {
  await withAdmin(async (db) => {
    const { pkg, view } = await prepareAcknowledged(db, "unprovenanced-claims", EQUIPMENT);
    const material = materialInvestigationItems(view.investigationPlan)[0];
    await createUnevidencedPackageClaim(db, {
      slug: "manual-same-text",
      packageId: pkg.id,
      claimText: material.proposedClaim,
      safetySensitive: material.safetySensitive,
    });
    const created = await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    const links = await listInvestigationClaimLinks(db, pkg.id);
    assert.ok(!links.some((link) => link.itemKey === material.itemKey));
    const createStep = created.executionTrace.find((item) => item.id === "create_claims_from_investigation");
    assert.ok(createStep);
    assert.ok(createStep.details.skippedUnprovenanced.some((item) => item.itemKey === material.itemKey));
  });
});

test("UI contract: Create claims from investigation then operator stops at review or continue", async () => {
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /create_claims_from_investigation/);
  assert.match(ui, /continue_evidence_research/);
  assert.match(ui, /Evidence review queue/);
  assert.match(ui, /Open corpus review/);
  assert.match(ui, /does not accept evidence/i);
  assert.equal(operatorRequestForPrimaryAction(primaryOperatorAction("claims_needed")), "create_claims_from_investigation");
  assert.equal(primaryOperatorAction("corpus_review_required").label, "Review evidence");
  assert.equal(primaryOperatorAction("research_incomplete").label, "Continue evidence research");
  await withAdmin(async (db) => {
    const { pkg } = await prepareAcknowledged(db, "operator-ui-v2", HEADROOM);
    const response = await operatorRoute.POST(request(`/api/growth/packages/${pkg.id}/operator`, {
      email: "admin@example.com",
      method: "POST",
      body: { action: "create_claims_from_investigation" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok((await listPackageClaims(db, pkg.id)).length >= 1);
    assert.ok(["corpus_review_required", "research_incomplete", "research_ready", "evidence_reassessment"].includes(body.state));
    assert.ok(body.summary.headline);
    assert.ok(body.primaryAction.label === "Review evidence" || body.primaryAction.label === "Continue evidence research" || body.primaryAction.label === "Reassess");
    assert.equal(body.publishingEnabled, false);
    assert.equal(body.summary.verifiedFactCount, 0);
    const queue = await loadSocialGrowthQueue(db);
    assert.equal(queue.operatorByPackage[pkg.id].state, body.state);
    assert.equal(queue.packages.find((item) => item.id === pkg.id).opportunityId, (await listPackageClaims(db, pkg.id))[0] && queue.packages.find((item) => item.id === pkg.id).opportunityId);
  });
});

test("operator global research budget cannot be exceeded and resume does not restart", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await prepareAcknowledged(db, "budget-resume", EQUIPMENT);
    const first = await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    const firstRuns = (await listResearchRuns(db)).filter((item) => item.packageId === pkg.id);
    assert.ok(firstRuns.length <= OPERATOR_RESEARCH_BUDGET.maximumClaims);
    const queries = firstRuns.reduce((sum, run) => sum + run.queriesExecuted.length, 0);
    assert.ok(queries <= OPERATOR_RESEARCH_BUDGET.maximumQueries);
    assert.ok(queries <= RESEARCH_LIMITS.maximumQueries || firstRuns.length <= 1);
    for (const run of firstRuns) {
      assert.ok(run.queriesExecuted.length <= RESEARCH_LIMITS.maximumQueries);
      assert.ok(run.plan.maximumQueries <= RESEARCH_LIMITS.maximumQueries);
      assert.ok(run.plan.maximumCandidateDocuments <= RESEARCH_LIMITS.maximumCandidates);
      assert.ok(run.plan.maximumRuntimeMs <= RESEARCH_LIMITS.maximumRuntimeMs);
    }
    const dueAfterFirst = first.researchWorkset.due.length;
    if (dueAfterFirst > 0) {
      assert.ok(first.state === "research_incomplete" || first.primaryAction.id === "continue_evidence_research" || first.state === "corpus_review_required");
      const second = await advanceOperator(db, pkg.id, "admin@example.com", "continue_evidence_research");
      const secondRuns = (await listResearchRuns(db)).filter((item) => item.packageId === pkg.id);
      assert.ok(secondRuns.length >= firstRuns.length);
      const firstIds = new Set(firstRuns.map((run) => run.id));
      assert.ok(firstRuns.every((run) => secondRuns.some((item) => item.id === run.id)));
      assert.equal(second.publishingEnabled, false);
      void firstIds;
    }
  });
});

test("selection integrity: operator claim creation and research stay package-scoped", async () => {
  await withAdmin(async (db) => {
    const left = await prepareAcknowledged(db, "operator-left-v2", EQUIPMENT);
    const right = await prepareAcknowledged(db, "operator-right-v2", FOOD);
    await advanceOperator(db, left.pkg.id, "admin@example.com", "create_claims_from_investigation");
    assert.equal((await listPackageClaims(db, right.pkg.id)).length, 0);
    assert.equal((await listResearchRuns(db)).filter((item) => item.packageId === right.pkg.id).length, 0);
    assert.equal((await loadOperatorView(db, right.pkg.id)).state, "claims_needed");
    const leftClaims = await listPackageClaims(db, left.pkg.id);
    assert.ok(leftClaims.every((claim) => claim.packageId === left.pkg.id));
    const queue = await loadSocialGrowthQueue(db);
    assert.equal(queue.packages.find((item) => item.id === left.pkg.id).opportunityId, left.opportunity.id);
    assert.equal(queue.packages.find((item) => item.id === right.pkg.id).opportunityId, right.opportunity.id);
    assert.notEqual(left.opportunity.id, right.opportunity.id);
  });
});

test("corpus submission is idempotent, is not acceptance, and can stop the operator", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await prepareAcknowledged(db, "corpus-submit-v2", HEADROOM);
    const first = await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    const runs = (await listResearchRuns(db)).filter((item) => item.packageId === pkg.id);
    const submitted = runs.flatMap((run) => run.candidates.filter((candidate) => candidate.submittedDocumentId));
    if (submitted.length) {
      assert.equal(first.state, "corpus_review_required");
      assert.equal(first.primaryAction.label, "Review evidence");
      assert.match(first.summary.headline, /evidence review required/i);
      assert.ok((await listHumanReviewTasks(db, pkg.id)).some((item) => item.taskKind === "corpus_candidates" && item.state === "open"));
      const document = await getCorpusDocument(db, submitted[0].submittedDocumentId);
      assert.equal(document.ingestionStatus, "awaiting_review");
      assert.equal(document.productionExposure, false);
      const second = await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
      const again = (await listResearchRuns(db)).filter((item) => item.packageId === pkg.id)
        .flatMap((run) => run.candidates.filter((candidate) => candidate.submittedDocumentId));
      assert.equal(again.length, submitted.length);
      assert.equal(second.state, "corpus_review_required");
      assert.ok(first.evidenceReviewQueue.length >= 1);
    } else {
      assert.ok(["research_incomplete", "research_ready", "evidence_reassessment"].includes(first.state));
      assert.ok(first.primaryAction.label === "Continue evidence research" || first.primaryAction.label === "Reassess");
    }
    assert.equal(first.publishingEnabled, false);
  });
});

test("classifyOperatorState distinguishes research coverage from evidence sufficiency", () => {
  const base = {
    packageId: "sgo:package:freezer",
    hasPackage: true,
    proposalCount: 8,
    claimCount: 8,
    currentFingerprint: "fp",
    plan: { packageFingerprint: "fp", state: "acknowledged", items: [], rawProposalIds: [] },
    openTasks: [],
    verifiedFactCount: 0,
    unresolvedContradiction: false,
    awaitingCorpusReviewCount: 0,
    researchRunCount: 8,
    researchInProgress: false,
    unresearchedGapCount: 0,
    retryEligibleGapCount: 0,
    contentAuthorized: false,
    packageApproved: false,
  };
  assert.equal(classifyOperatorState(base), "evidence_unresolved");
  assert.equal(primaryOperatorAction("evidence_unresolved").id, "complete");
  assert.notEqual(primaryOperatorAction("evidence_unresolved").id, "continue_evidence_research");
  assert.equal(classifyOperatorState({ ...base, unresearchedGapCount: 2 }), "research_incomplete");
  assert.equal(classifyOperatorState({ ...base, retryEligibleGapCount: 1 }), "research_ready");
  assert.equal(primaryOperatorAction("research_ready").id, "continue_evidence_research");
});

test("freezer live snapshot: legacy-strategy runs make package research_ready for one bounded retry pass", async () => {
  await withAdmin(async (db) => {
    process.env.BRAVE_SEARCH_API_KEY = "fixture-only";
    const { pkg } = await prepareAcknowledged(db, "commercial-freezer-running-warm", EQUIPMENT);
    await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    const claims = await listPackageClaims(db, pkg.id);
    assert.ok(claims.length >= 1);
    await clearPackageResearchRuns(db, pkg.id);
    for (const claim of claims) {
      await insertCompletedResearchRun(db, pkg.id, claim.id);
    }
    const view = await loadOperatorView(db, pkg.id);
    assert.equal(view.summary.unresearchedGapCount, 0);
    assert.equal(view.summary.verifiedFactCount, 0);
    assert.equal(view.summary.claimCount, claims.length);
    assert.equal((await listResearchRuns(db)).filter((item) => item.packageId === pkg.id).length, claims.length);
    assert.equal(view.state, "research_ready");
    assert.equal(view.primaryAction.id, "continue_evidence_research");
    assert.equal(view.summary.retryEligibleGapCount, claims.length);
    assert.ok(view.researchWorkset.retryDue.length >= 1);
  });
});

test("freezer live snapshot: current-strategy runs exhaust retry eligibility → evidence_unresolved", async () => {
  await withAdmin(async (db) => {
    process.env.BRAVE_SEARCH_API_KEY = "fixture-only";
    const { pkg } = await prepareAcknowledged(db, "commercial-freezer-current-strategy", EQUIPMENT);
    await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
    const claims = await listPackageClaims(db, pkg.id);
    await clearPackageResearchRuns(db, pkg.id);
    const view = await loadOperatorView(db, pkg.id);
    const packageFingerprint = view.investigationPlan?.packageFingerprint ?? "current-fp";
    const currentPlan = {
      evidenceGap: { unresolvedPolicyGap: "needs_independent_corroboration", version: "evidence-gap-research-v1" },
      researchStrategy: buildResearchStrategyRecord({ packageFingerprint, providerKind: "auto" }),
    };
    for (const claim of claims) {
      await insertCompletedResearchRun(db, pkg.id, claim.id, currentPlan);
    }
    const resolved = await loadOperatorView(db, pkg.id);
    assert.equal(resolved.summary.unresearchedGapCount, 0);
    assert.equal(resolved.summary.retryEligibleGapCount, 0);
    assert.equal(resolved.state, "evidence_unresolved");
    assert.equal(resolved.primaryAction.id, "complete");
    assert.equal(resolved.summary.humanAction, null);
    assert.match(resolved.summary.headline, /bounded research complete/i);
    const runsBefore = (await listResearchRuns(db)).filter((item) => item.packageId === pkg.id).length;
    const noop = await advanceOperator(db, pkg.id, "admin@example.com", "continue_evidence_research");
    const runsAfter = (await listResearchRuns(db)).filter((item) => item.packageId === pkg.id).length;
    assert.equal(runsAfter, runsBefore);
    assert.equal(noop.state, "evidence_unresolved");
    assert.equal(noop.latestRun.stoppedReason, "no_research_due");
  });
});

test("GrowthQueue primary dispatch guards no-due continue and non-POST reassess/complete paths", async () => {
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /dueCount === 0 && retryEligible === 0/);
  assert.match(ui, /primary\.id === "reassess"/);
  assert.match(ui, /primary\.id === "complete"/);
  assert.match(ui, /"reassess", "complete"\]\.includes\(operator\.primaryAction\.id\)/);
});
