import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AUTONOMY_PERMISSION_MATRIX,
  FORBIDDEN_OPERATOR_ACTIONS,
  MAX_INVESTIGATION_ITEMS,
  MAX_OPERATOR_STEPS,
  MAX_REFINEMENT_DEPTH,
  SOCIAL_PUBLISH_AVAILABLE,
  assertNoEconomicsRankingFields,
  classifyOperatorState,
  decomposePackageToClaimProposals,
  materialInvestigationItems,
  operatorRequestForPrimaryAction,
  primaryOperatorAction,
  refineInvestigationPlan,
} from "../app/growth/social/index.ts";
import { investigationItemPriority } from "../app/growth/social/investigation-refinement.ts";
import { buildPackageContentIntelligence } from "../db/social-content-intelligence.ts";
import { buildPackageEvidenceIntelligence } from "../db/social-evidence-intelligence.ts";
import { generateClaimProposals, listClaimProposals } from "../db/social-claim-proposal-repository.ts";
import {
  advanceOperator,
  listHumanReviewTasks,
  listInvestigationPlans,
  listOperatorRuns,
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
  packageId: "sgo:package:commercial-freezer-running-warm",
  packageSlug: "commercial-freezer-running-warm",
  thesis: "An independent operator with a commercial freezer running around 20°F should be able to identify safe operational checks and determine when the problem requires a qualified refrigeration technician, without attempting unsafe electrical or refrigerant repairs.",
  packageUsefulnessTest: "After using this guide, an operator should be able to verify the temperature problem, identify safe checks they can perform themselves, recognize conditions that require professional refrigeration service, and avoid unsafe or unsupported repair attempts.",
  problem: "A commercial freezer is running warm.",
  audience: "independent_operator",
};

const FOOD = {
  packageId: "sgo:package:tomato-hold",
  packageSlug: "tomato-hold",
  thesis: "A café should hold sliced tomatoes below 41°F after prep, and discard them after 4 hours at room temperature per food-safety practice.",
  packageUsefulnessTest: "The operator should be able to name the hold temperature, the time limit, and when product must be discarded.",
  problem: "Prep cooks leave sliced tomatoes on the counter.",
  audience: "independent_operator",
};

const SAAS = {
  packageId: "sgo:package:labor-reconcile",
  packageSlug: "labor-reconcile",
  thesis: "A restaurant manager should be able to export last week labor hours from the scheduling tool and reconcile them against payroll before submitting the invoice, without sharing employee SSNs in email.",
  packageUsefulnessTest: "The manager should be able to produce a reconciled hours file and keep SSNs out of email.",
  problem: "Payroll invoices go out before hours are checked.",
  audience: "independent_operator",
};

const BUYING = {
  packageId: "sgo:package:dishwasher-compare",
  packageSlug: "dishwasher-compare",
  thesis: "A buyer comparing two commercial dishwashers should be able to compare rack capacity, water connection requirements, and warranty terms, and should not treat a seller listing as an independent specification.",
  packageUsefulnessTest: "After using this guide, the buyer can name capacity, utility requirements, and what still requires the manufacturer sheet.",
  problem: "Operators need to choose a dishwasher without relying on marketplace copy.",
  audience: "independent_operator",
};

function asRefinementInput(fields, drafts, ids) {
  return {
    packageId: fields.packageId,
    packageFingerprint: "testfp01",
    packageProblem: fields.problem,
    packageAudience: fields.audience,
    packageThesis: fields.thesis,
    packageUsefulnessTest: fields.packageUsefulnessTest,
    proposals: drafts.map((draft, index) => ({
      ...draft,
      id: ids?.[index] ?? `sgo:claim-proposal:${fields.packageSlug}-${index + 1}`,
    })),
  };
}

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

function planOf(fields) {
  const drafts = decomposePackageToClaimProposals(fields);
  return { drafts, plan: refineInvestigationPlan(asRefinementInput(fields, drafts)) };
}

test("four unrelated domains produce different refined investigation plans from the same architecture", () => {
  const equipment = planOf(EQUIPMENT);
  const food = planOf(FOOD);
  const saas = planOf(SAAS);
  const buying = planOf(BUYING);
  const equipmentKeys = materialInvestigationItems(equipment.plan).map((item) => item.itemKey).sort();
  const foodKeys = materialInvestigationItems(food.plan).map((item) => item.itemKey).sort();
  const saasKeys = materialInvestigationItems(saas.plan).map((item) => item.itemKey).sort();
  const buyingKeys = materialInvestigationItems(buying.plan).map((item) => item.itemKey).sort();
  assert.notDeepEqual(equipmentKeys, foodKeys);
  assert.notDeepEqual(foodKeys, saasKeys);
  assert.notDeepEqual(saasKeys, buyingKeys);
  assert.notDeepEqual(equipmentKeys, buyingKeys);
  assert.ok(equipment.plan.items.some((item) => item.kind === "safety_boundary" && item.safetySensitive));
  assert.ok(food.plan.items.some((item) => item.kind === "unresolved_assumption" && /temperature/i.test(item.researchQuestion)));
  assert.ok(saas.plan.items.some((item) => /ssn|payroll|export|reconcil/i.test(item.researchQuestion)));
  assert.ok(buying.plan.items.some((item) => /capacit|warranty|seller|specification/i.test(`${item.researchQuestion} ${item.proposedClaim}`)));
  for (const result of [equipment, food, saas, buying]) {
    assert.ok(materialInvestigationItems(result.plan).length <= MAX_INVESTIGATION_ITEMS);
    assert.ok(result.plan.items.every((item) => item.depth <= MAX_REFINEMENT_DEPTH));
    assert.ok(result.plan.items.some((item) => item.kind === "context_only" && !item.material));
    assert.equal(result.plan.rawProposalIds.length, result.drafts.length);
  }
});

test("duplicate raw proposals consolidate without losing provenance", () => {
  const drafts = decomposePackageToClaimProposals(EQUIPMENT);
  const checks = drafts.filter((item) => /safe (operational )?checks/i.test(item.proposedClaimText));
  assert.ok(checks.length >= 2, "decomposition should emit near-duplicate check proposals");
  const plan = refineInvestigationPlan(asRefinementInput(EQUIPMENT, drafts));
  const merged = plan.items.find((item) => item.sourceProposalIds.length > 1);
  assert.ok(merged);
  assert.ok(merged.sourceProposalIds.length >= 2);
  assert.equal(plan.rawProposalIds.length, drafts.length);
});

test("superficially similar but materially different claims do not merge", () => {
  const drafts = decomposePackageToClaimProposals(SAAS);
  const plan = refineInvestigationPlan(asRefinementInput(SAAS, drafts));
  const ssn = plan.items.filter((item) => /ssn/i.test(item.researchQuestion) || item.sourceTraces.some((trace) => /ssn/i.test(trace.excerpt)));
  const payroll = plan.items.filter((item) => /payroll|invoice|export|reconcil/i.test(item.researchQuestion) && !/ssn/i.test(item.researchQuestion));
  assert.ok(ssn.length >= 1);
  assert.ok(payroll.length >= 1);
  assert.ok(!ssn.some((item) => payroll.some((other) => other.itemKey === item.itemKey)));
});

test("audience and package-context metadata does not consume the research budget", () => {
  const { drafts, plan } = planOf(EQUIPMENT);
  const audience = drafts.find((item) => item.sourceTrace.field === "audience");
  assert.ok(audience);
  const pruned = plan.items.find((item) => item.sourceProposalIds.includes(`sgo:claim-proposal:${EQUIPMENT.packageSlug}-${drafts.indexOf(audience) + 1}`) || (item.kind === "context_only" && /audience/i.test(item.researchQuestion)));
  assert.ok(pruned);
  assert.equal(pruned.material, false);
  assert.equal(pruned.priority, 0);
  assert.match(pruned.prunedReason ?? "", /context metadata|not an externally verifiable/i);
  assert.ok(!materialInvestigationItems(plan).some((item) => item.kind === "context_only"));
});

test("numerical assertions stay unresolved assumptions and are not promoted to facts", () => {
  const { plan } = planOf(EQUIPMENT);
  const numeric = plan.items.filter((item) => item.kind === "unresolved_assumption" && item.material);
  assert.ok(numeric.length >= 1);
  assert.ok(numeric.every((item) => !/20\s*°\s*F is/i.test(item.proposedClaim)));
  assert.ok(numeric.some((item) => /temperature range or threshold/i.test(item.researchQuestion)));
  assert.doesNotMatch(numeric.map((item) => item.researchQuestion).join(" "), /Whether 20/i);
  assert.equal(numeric.filter((item) => /temperature range or threshold/i.test(item.researchQuestion)).length, 1);
});

test("safety propositions cannot be weakened during refinement", () => {
  const { drafts, plan } = planOf(EQUIPMENT);
  const safetyDrafts = drafts.filter((item) => item.safetySensitive || item.claimKind === "safety_boundary");
  assert.ok(safetyDrafts.length >= 1);
  const safetyItems = plan.items.filter((item) => item.kind === "safety_boundary");
  assert.ok(safetyItems.length >= 1);
  assert.ok(safetyItems.every((item) => item.safetySensitive));
  assert.ok(safetyItems.every((item) => item.recommendedSourceClass === "especially_authoritative" || item.recommendedSourceClass === "government_regulatory"));
  const strongestDraft = safetyDrafts.reduce((rank, item) => item.recommendedSourceClass === "especially_authoritative" ? 6 : rank, 0);
  assert.ok(strongestDraft >= 6);
  assert.ok(safetyItems.some((item) => item.recommendedSourceClass === "especially_authoritative"));
});

test("broad propositions expand within depth and item bounds and cannot loop", () => {
  const { plan } = planOf(EQUIPMENT);
  const expanded = plan.items.filter((item) => item.expanded);
  const children = plan.items.filter((item) => item.depth === 1);
  assert.ok(expanded.length >= 1);
  assert.ok(children.length >= 1);
  assert.ok(plan.items.every((item) => item.depth <= MAX_REFINEMENT_DEPTH));
  assert.ok(children.every((item) => item.parentItemKey && !item.expanded));
  assert.ok(materialInvestigationItems(plan).length <= MAX_INVESTIGATION_ITEMS);
  const again = refineInvestigationPlan(asRefinementInput(EQUIPMENT, decomposePackageToClaimProposals(EQUIPMENT)));
  assert.deepEqual(again.items.map((item) => item.itemKey), plan.items.map((item) => item.itemKey));
});

test("economics cannot affect investigation priority", () => {
  const { plan } = planOf(EQUIPMENT);
  const affiliate = refineInvestigationPlan(asRefinementInput({ ...EQUIPMENT }, decomposePackageToClaimProposals({ ...EQUIPMENT, commercialPosture: "affiliate" })));
  assert.deepEqual(
    materialInvestigationItems(affiliate).map((item) => [item.itemKey, item.priority]),
    materialInvestigationItems(plan).map((item) => [item.itemKey, item.priority]),
  );
  assert.throws(() => refineInvestigationPlan({ ...asRefinementInput(EQUIPMENT, decomposePackageToClaimProposals(EQUIPMENT)), commission: 40 }), /economics ranking fields/);
  assert.throws(() => assertNoEconomicsRankingFields({ epc: 1 }), /economics ranking fields/);
  const safety = investigationItemPriority({ material: true, safetySensitive: true, kind: "safety_boundary", sourceTraces: [{ field: "thesis" }] });
  const diagnostic = investigationItemPriority({ material: true, safetySensitive: false, kind: "diagnostic", sourceTraces: [{ field: "thesis" }] });
  assert.ok(safety > diagnostic);
  assert.equal(investigationItemPriority({ material: false, safetySensitive: false, kind: "context_only", sourceTraces: [{ field: "audience" }] }), 0);
});

test("operator permission matrix keeps claim creation, corpus accept, approval, and publish human-only", () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.equal(MAX_OPERATOR_STEPS, 8);
  for (const action of ["create_claims_from_proposals", "accept_corpus_evidence", "approve_package", "publish"]) {
    const row = AUTONOMY_PERMISSION_MATRIX.find((item) => item.action === action);
    assert.ok(row);
    assert.equal(row.automaticWhenPreconditionsMet, false);
    assert.equal(row.requiresHumanAuthority, true);
    assert.equal(row.enabledInV1AutoChain, false);
  }
  assert.ok(FORBIDDEN_OPERATOR_ACTIONS.includes("publish"));
  assert.ok(FORBIDDEN_OPERATOR_ACTIONS.includes("accept_corpus_evidence"));
  assert.equal(classifyOperatorState({
    packageId: EQUIPMENT.packageId,
    hasPackage: true,
    proposalCount: 0,
    claimCount: 0,
    currentFingerprint: "x",
    plan: null,
    openTasks: [],
    verifiedFactCount: 0,
    unresolvedContradiction: false,
    awaitingCorpusReviewCount: 0,
    researchRunCount: 0,
    researchInProgress: false,
    contentAuthorized: false,
    packageApproved: false,
  }), "decomposition_needed");
});

test("production operator and refinement contain no domain-specific templates", async () => {
  const files = [
    "app/growth/social/investigation-refinement.ts",
    "app/growth/social/operator-state.ts",
    "app/growth/social/claim-coverage.ts",
    "db/social-operator-repository.ts",
    "app/admin/growth/GrowthQueue.tsx",
    "app/api/growth/packages/[id]/operator/route.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /Siemens|Generac|food-truck-generator|commercial-freezer-running-warm/i);
    assert.doesNotMatch(source, /createClaimsFromSelectedProposals|recordSocialApproval|ingestCorpusSource/);
  }
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /Autonomous Operator/);
  assert.match(ui, /Operator Summary/);
  assert.match(ui, /primaryAction\.label/);
  assert.match(ui, /Refined investigation plan/);
  assert.match(ui, /Claim Decomposition/);
  assert.match(ui, /Raw proposal cards remain/);
  assert.match(ui, /acknowledge_investigation_plan/);
  assert.match(ui, /create_claims_from_investigation/);
  assert.match(ui, /continue_evidence_research/);
  assert.match(ui, /Investigation plan acknowledged/);
  assert.match(ui, /Next required action/);
  assert.match(ui, /Relevant: \{topical\}/);
  assert.match(ui, /Coverage: \{coverage\}/);
  assert.match(ui, /Authority: \{candidate\.authorityClass/);
  assert.match(ui, /Independence: \{independence\}/);
  assert.match(ui, /Advancement: \{String\(advancement\)/);
  assert.match(ui, /Evidence review queue/);
  const labels = await readFile(new URL("../app/growth/social/operator-state.ts", import.meta.url), "utf8");
  assert.match(labels, /Prepare investigation/);
  assert.match(labels, /Review investigation plan/);
  assert.match(labels, /Create claims from investigation/);
  assert.match(labels, /Continue evidence research/);
  assert.match(labels, /Evidence review required/);
  assert.match(ui, /selectedPackage/);
  assert.doesNotMatch(ui, />Publish</);
  const repo = await readFile(new URL("../db/social-operator-repository.ts", import.meta.url), "utf8");
  assert.doesNotMatch(repo, /from ["']\.\/social-growth-repository/);
  assert.doesNotMatch(repo, /setInterval|new Worker|cron/i);
});

test("existing freezer raw proposals remain intact and refinement consumes them after operator advance", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  await withAdmin(async (db) => {
    const { pkg } = await seedBarePackage(db, "commercial-freezer-running-warm", EQUIPMENT);
    const generated = await generateClaimProposals(db, pkg.id);
    const before = generated.proposals.map((item) => ({ id: item.id, text: item.proposedClaimText, status: item.status }));
    assert.ok(before.length >= 4);
    const first = await advanceOperator(db, pkg.id, "admin@example.com", "advance");
    assert.equal(first.state, "investigation_review");
    assert.equal(first.primaryAction.label, "Review investigation plan");
    assert.equal(first.summary.headline, "Investigation prepared");
    assert.equal(first.summary.verifiedFactCount, 0);
    assert.match(first.summary.researchStatus, /has not started/i);
    assert.equal(first.summary.humanAction, "Review investigation plan");
    const after = await listClaimProposals(db, pkg.id);
    assert.deepEqual(after.map((item) => ({ id: item.id, text: item.proposedClaimText, status: item.status })), before);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 0);
    const plans = await listInvestigationPlans(db, pkg.id);
    assert.equal(plans.length, 1);
    assert.ok(plans[0].rawProposalIds.length === before.length);
    assert.ok(materialInvestigationItems(plans[0]).length <= MAX_INVESTIGATION_ITEMS);
    assert.ok(materialInvestigationItems(plans[0]).length >= 1);
    const tasks = await listHumanReviewTasks(db, pkg.id);
    assert.equal(tasks.filter((item) => item.state === "open" && item.taskKind === "investigation_plan").length, 1);
    const second = await advanceOperator(db, pkg.id, "admin@example.com", "advance");
    assert.equal(second.state, "investigation_review");
    assert.equal((await listInvestigationPlans(db, pkg.id)).length, 1);
    assert.equal((await listHumanReviewTasks(db, pkg.id)).filter((item) => item.taskKind === "investigation_plan").length, 1);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 0);
    const runs = await listOperatorRuns(db, pkg.id);
    assert.ok(runs.length >= 2);
    assert.ok(runs.every((item) => item.stoppedReason === "human_gate"));
    assert.ok(runs[0].stepCount <= MAX_OPERATOR_STEPS);
  });
});

test("one operator action on a new package stops at review investigation plan without claims, research, evidence, or content", async () => {
  await withAdmin(async (db) => {
    const { opportunity, pkg } = await seedBarePackage(db, "operator-ui-package", {
      ...EQUIPMENT,
      packageId: "sgo:package:operator-ui-package",
      packageSlug: "operator-ui-package",
    });
    const before = await loadOperatorView(db, pkg.id);
    assert.equal(before.state, "decomposition_needed");
    assert.equal(before.primaryAction.label, "Prepare investigation");
    assert.match(before.summary.headline, /investigation preparation is needed/i);
    const unauthenticated = await operatorRoute.POST(request(`/api/growth/packages/${pkg.id}/operator`, { method: "POST", body: { action: "advance" } }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(unauthenticated.status, 401);
    const forbidden = await operatorRoute.POST(request(`/api/growth/packages/${pkg.id}/operator`, { email: "not-admin@example.com", method: "POST", body: { action: "advance" } }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(forbidden.status, 403);
    const advanced = await operatorRoute.POST(request(`/api/growth/packages/${pkg.id}/operator`, {
      email: "admin@example.com",
      method: "POST",
      body: { action: "advance" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(advanced.status, 200);
    const body = await advanced.json();
    assert.equal(body.state, "investigation_review");
    assert.equal(body.primaryAction.label, "Review investigation plan");
    assert.equal(body.summary.headline, "Investigation prepared");
    assert.equal(body.summary.verifiedFactCount, 0);
    assert.match(body.summary.researchStatus, /has not started/i);
    assert.ok(body.investigationPlan.items.filter((item) => item.material).length >= 1);
    assert.ok((await listClaimProposals(db, pkg.id)).length >= 1);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 0);
    const intelligence = await buildPackageEvidenceIntelligence(db, pkg.id);
    assert.equal(intelligence.claimAssessments.filter((item) => item.state === "supported").length, 0);
    const content = await buildPackageContentIntelligence(db, pkg.id);
    assert.equal(content?.verifiedFacts?.length ?? 0, 0);
    assert.equal(body.publishingEnabled, false);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "publish"), /cannot publish|human authority/i);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "accept_corpus_evidence"), /human authority/i);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "approve_package"), /human authority/i);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "create_claims"), /human authority/i);
    const queue = await loadSocialGrowthQueue(db);
    assert.equal(queue.operatorByPackage[pkg.id].state, "investigation_review");
    assert.equal(queue.packages.find((item) => item.id === pkg.id).opportunityId, opportunity.id);
    const approval = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com",
      method: "POST",
      body: { subjectKind: "package", subjectId: pkg.id, decision: "approved", reason: "Looks good", slug: "premature" },
    }));
    assert.ok(approval.status >= 400);
  });
});

test("live candidates cannot authorize content and contradictions stop recommendation readiness", async () => {
  const blocked = classifyOperatorState({
    packageId: EQUIPMENT.packageId,
    hasPackage: true,
    proposalCount: 4,
    claimCount: 2,
    currentFingerprint: "x",
    plan: { packageFingerprint: "x", state: "acknowledged", items: [], rawProposalIds: [] },
    openTasks: [],
    verifiedFactCount: 0,
    unresolvedContradiction: true,
    awaitingCorpusReviewCount: 0,
    researchRunCount: 1,
    researchInProgress: false,
    contentAuthorized: false,
    packageApproved: false,
  });
  assert.equal(blocked, "evidence_reassessment");
  const liveOnly = classifyOperatorState({
    packageId: EQUIPMENT.packageId,
    hasPackage: true,
    proposalCount: 4,
    claimCount: 2,
    currentFingerprint: "x",
    plan: { packageFingerprint: "x", state: "acknowledged", items: [], rawProposalIds: [] },
    openTasks: [],
    verifiedFactCount: 0,
    unresolvedContradiction: false,
    awaitingCorpusReviewCount: 2,
    researchRunCount: 1,
    researchInProgress: false,
    contentAuthorized: false,
    packageApproved: false,
  });
  assert.equal(liveOnly, "corpus_review_required");
});

test("operator actions stay package-scoped and do not resurrect cross-opportunity child state", async () => {
  await withAdmin(async (db) => {
    const left = await seedBarePackage(db, "operator-left", EQUIPMENT);
    const right = await seedBarePackage(db, "operator-right", FOOD);
    await advanceOperator(db, left.pkg.id, "admin@example.com", "advance");
    assert.equal((await listInvestigationPlans(db, right.pkg.id)).length, 0);
    assert.equal((await listClaimProposals(db, right.pkg.id)).length, 0);
    const view = await loadOperatorView(db, right.pkg.id);
    assert.equal(view.state, "decomposition_needed");
    const queue = await loadSocialGrowthQueue(db);
    assert.equal(queue.operatorByPackage[left.pkg.id].packageId, left.pkg.id);
    assert.equal(queue.packages.find((item) => item.id === left.pkg.id).opportunityId, left.opportunity.id);
    assert.notEqual(left.opportunity.id, right.opportunity.id);
  });
});

test("review investigation plan acknowledges the current plan and surfaces claims_needed", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  const reviewAction = operatorRequestForPrimaryAction({
    id: "review_investigation_plan",
    label: "Review investigation plan",
    automatic: false,
    requiresHumanAuthority: true,
  });
  assert.equal(reviewAction, "acknowledge_investigation_plan");
  assert.equal(operatorRequestForPrimaryAction({
    id: "create_claims",
    label: "Create claims from investigation",
    automatic: false,
    requiresHumanAuthority: true,
  }), "create_claims_from_investigation");
  assert.equal(primaryOperatorAction("claims_needed").label, "Create claims from investigation");
  assert.equal(classifyOperatorState({
    packageId: EQUIPMENT.packageId,
    hasPackage: true,
    proposalCount: 4,
    claimCount: 0,
    currentFingerprint: "fp1",
    plan: { packageFingerprint: "fp1", state: "acknowledged", items: [], rawProposalIds: [] },
    openTasks: [],
    verifiedFactCount: 0,
    unresolvedContradiction: false,
    awaitingCorpusReviewCount: 0,
    researchRunCount: 0,
    researchInProgress: false,
    contentAuthorized: false,
    packageApproved: false,
  }), "claims_needed");

  await withAdmin(async (db) => {
    const { pkg } = await seedBarePackage(db, "operator-review-transition", EQUIPMENT);
    const prepared = await advanceOperator(db, pkg.id, "admin@example.com", "advance");
    assert.equal(prepared.state, "investigation_review");
    assert.equal(prepared.primaryAction.id, "review_investigation_plan");
    const beforePlan = (await listInvestigationPlans(db, pkg.id))[0];
    assert.equal(beforePlan.state, "awaiting_review");
    assert.equal((await listHumanReviewTasks(db, pkg.id)).filter((item) => item.state === "open").length, 1);

    const staleAdvance = await operatorRoute.POST(request(`/api/growth/packages/${pkg.id}/operator`, {
      email: "admin@example.com",
      method: "POST",
      body: { action: "advance" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(staleAdvance.status, 200);
    const staleBody = await staleAdvance.json();
    assert.equal(staleBody.state, "investigation_review");

    const reviewed = await operatorRoute.POST(request(`/api/growth/packages/${pkg.id}/operator`, {
      email: "admin@example.com",
      method: "POST",
      body: { action: "acknowledge_investigation_plan" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(reviewed.status, 200);
    const body = await reviewed.json();
    assert.equal(body.state, "claims_needed");
    assert.equal(body.primaryAction.id, "create_claims");
    assert.equal(body.primaryAction.label, "Create claims from investigation");
    assert.match(body.summary.headline, /Investigation acknowledged/i);
    assert.equal(body.summary.humanAction, "Create claims from investigation");
    assert.equal(body.investigationPlan.state, "acknowledged");
    assert.equal(body.humanReviewTasks.filter((item) => item.state === "open").length, 0);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 0);
    assert.equal((await listResearchRuns(db)).filter((item) => item.packageId === pkg.id).length, 0);
    assert.equal(body.publishingEnabled, false);

    const reloaded = await operatorRoute.GET(request(`/api/growth/packages/${pkg.id}/operator`, {
      email: "admin@example.com",
    }), { params: Promise.resolve({ id: pkg.id }) });
    const reloadBody = await reloaded.json();
    assert.equal(reloadBody.state, "claims_needed");
    assert.equal(reloadBody.investigationPlan.state, "acknowledged");
    assert.equal(reloadBody.primaryAction.label, "Create claims from investigation");
    const queue = await loadSocialGrowthQueue(db);
    assert.equal(queue.operatorByPackage[pkg.id].state, "claims_needed");
    assert.equal(queue.operatorByPackage[pkg.id].investigationPlan.state, "acknowledged");

    const again = await advanceOperator(db, pkg.id, "admin@example.com", "review_investigation_plan");
    assert.equal(again.state, "claims_needed");
    assert.equal((await listInvestigationPlans(db, pkg.id)).filter((item) => item.state === "acknowledged").length, 1);
    assert.equal((await listHumanReviewTasks(db, pkg.id)).filter((item) => item.state === "open").length, 0);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 0);

    await updateContentPackage(db, pkg.id, {
      thesis: `${EQUIPMENT.thesis} The operator should also name the model from the nameplate before calling service.`,
    });
    const afterEdit = await loadOperatorView(db, pkg.id);
    assert.equal(afterEdit.state, "refinement_needed");
    const preparedAgain = await advanceOperator(db, pkg.id, "admin@example.com", "advance");
    assert.equal(preparedAgain.state, "investigation_review");
    assert.equal(preparedAgain.primaryAction.id, "review_investigation_plan");
    const plans = await listInvestigationPlans(db, pkg.id);
    assert.equal(plans.length, 2);
    const current = plans.find((item) => item.packageFingerprint === preparedAgain.investigationPlan.packageFingerprint);
    const previous = plans.find((item) => item.id === beforePlan.id);
    assert.equal(previous.state, "acknowledged");
    assert.equal(current.state, "awaiting_review");
    assert.notEqual(current.id, previous.id);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 0);
    assert.equal((await listResearchRuns(db)).filter((item) => item.packageId === pkg.id).length, 0);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "publish"), /cannot publish|human authority/i);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "accept_corpus_evidence"), /human authority/i);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "approve_package"), /human authority/i);
    const approval = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com",
      method: "POST",
      body: { subjectKind: "package", subjectId: pkg.id, decision: "approved", reason: "Looks good", slug: "still-premature" },
    }));
    assert.ok(approval.status >= 400);
  });
});
