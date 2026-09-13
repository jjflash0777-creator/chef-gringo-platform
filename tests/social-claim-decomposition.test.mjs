import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  assertNoEconomicsRankingFields,
  claimHasAttachedEvidence,
  decomposePackageToClaimProposals,
  normalizeClaimProposalText,
} from "../app/growth/social/index.ts";
import { buildPackageContentIntelligence } from "../db/social-content-intelligence.ts";
import { buildPackageEvidenceIntelligence } from "../db/social-evidence-intelligence.ts";
import {
  createClaimsFromSelectedProposals,
  generateClaimProposals,
  listClaimProposals,
  setClaimProposalStatus,
} from "../db/social-claim-proposal-repository.ts";
import {
  addPackageClaim,
  createContentOpportunity,
  createContentPackage,
  evaluatePackageApprovalGate,
  listPackageClaims,
} from "../db/social-growth-repository.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const generateRoute = await import("../app/api/growth/packages/[id]/claim-proposals/route.ts");
const proposalIdRoute = await import("../app/api/growth/packages/[id]/claim-proposals/[proposalId]/route.ts");
const createClaimsRoute = await import("../app/api/growth/packages/[id]/claim-proposals/create-claims/route.ts");
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

const FREEZER = {
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

test("three unrelated packages produce different domain-appropriate atomic proposals from the same architecture", () => {
  const freezer = decomposePackageToClaimProposals(FREEZER);
  const food = decomposePackageToClaimProposals(FOOD);
  const saas = decomposePackageToClaimProposals(SAAS);
  assert.ok(freezer.length >= 4);
  assert.ok(food.length >= 3);
  assert.ok(saas.length >= 4);
  const freezerText = freezer.map((item) => item.proposedClaimText).join(" ");
  const foodText = food.map((item) => item.proposedClaimText).join(" ");
  const saasText = saas.map((item) => item.proposedClaimText).join(" ");
  assert.match(freezerText, /20\s*°\s*F/i);
  assert.match(freezerText, /electrical|refrigerant/i);
  assert.doesNotMatch(foodText, /electrical|refrigerant|SSN/i);
  assert.match(foodText, /41\s*°\s*F|4 hours/i);
  assert.match(foodText, /food-safe|hold|discard/i);
  assert.doesNotMatch(saasText, /20\s*°\s*F|41\s*°\s*F|refrigerant/i);
  assert.match(saasText, /SSN|labor|payroll|reconcil/i);
  assert.ok(freezer.some((item) => item.claimKind === "safety_boundary" && item.safetySensitive));
  assert.ok(food.some((item) => item.recommendedSourceClass === "government_regulatory"));
  assert.ok(saas.some((item) => item.claimKind === "safety_boundary" && /SSN/i.test(item.proposedClaimText)));
  assert.notDeepEqual(freezer.map((item) => item.proposalKey).sort(), food.map((item) => item.proposalKey).sort());
  assert.notDeepEqual(food.map((item) => item.proposalKey).sort(), saas.map((item) => item.proposalKey).sort());
});

test("thesis assertions are not treated as evidence and compound theses split atomically", () => {
  const freezer = decomposePackageToClaimProposals(FREEZER);
  assert.ok(freezer.every((item) => item.thesisIsNotEvidence === true));
  const threshold = freezer.find((item) => /20\s*°\s*F/i.test(item.proposedClaimText));
  assert.ok(threshold);
  assert.equal(threshold.claimKind, "unresolved_question");
  assert.match(threshold.proposedClaimText, /^Whether /);
  const compound = decomposePackageToClaimProposals({
    packageId: "sgo:package:compound",
    packageSlug: "compound",
    thesis: "A, B, C and D cause X and therefore users should do Y.",
    packageUsefulnessTest: "The reader can name the cause and the next action separately.",
    problem: "Operators collapse several causes into one instruction.",
    audience: "both",
  });
  assert.ok(compound.some((item) => /cause X/i.test(item.proposedClaimText)));
  assert.ok(compound.some((item) => /should do Y/i.test(item.proposedClaimText)));
  assert.equal(compound.some((item) => /A, B, C and D cause X and therefore users should do Y/i.test(item.proposedClaimText)), false);
});

test("safety-sensitive propositions request stronger authority and economics cannot rank proposals", () => {
  const freezer = decomposePackageToClaimProposals(FREEZER);
  const electrical = freezer.find((item) => /electrical|refrigerant/i.test(item.proposedClaimText));
  assert.ok(electrical);
  assert.equal(electrical.safetySensitive, true);
  assert.equal(electrical.recommendedSourceClass, "especially_authoritative");
  assert.match(electrical.authorityRequirement, /Especially authoritative/);
  assert.throws(() => decomposePackageToClaimProposals({ ...FREEZER, commission: 12 }), /economics ranking fields/);
  const ranked = decomposePackageToClaimProposals({ ...FREEZER, commercialPosture: "affiliate" });
  assert.deepEqual(ranked.map((item) => item.proposalKey), freezer.map((item) => item.proposalKey));
  assert.throws(() => assertNoEconomicsRankingFields({ commission: 1 }), /economics ranking fields/);
});

test("production claim decomposition contains no manufacturer or freezer-specific templates", async () => {
  const source = await readFile(new URL("../app/growth/social/claim-decomposition.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Siemens|Generac|food-truck-generator|commercial-freezer-running-warm/i);
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /Claim Decomposition/);
  assert.match(ui, /Generate proposals/);
  assert.match(ui, /Create selected claims/);
  assert.match(ui, /thesis is not evidence/);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("selected proposals become unevidenced claims that Evidence Intelligence can see, without approving or publishing", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  await withAdmin(async (db) => {
    const { pkg } = await seedBarePackage(db, "commercial-freezer-running-warm", FREEZER);
    const generated = await generateClaimProposals(db, pkg.id);
    assert.ok(generated.proposals.length >= 4);
    const again = await generateClaimProposals(db, pkg.id);
    assert.equal(again.proposals.length, generated.proposals.length);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 0);

    const safety = generated.proposals.find((item) => item.claimKind === "safety_boundary") ?? generated.proposals[0];
    await setClaimProposalStatus(db, safety.id, "selected");
    const discarded = generated.proposals.find((item) => item.id !== safety.id);
    await setClaimProposalStatus(db, discarded.id, "discarded");

    await assert.rejects(
      () => createClaimsFromSelectedProposals(db, pkg.id, [discarded.id]),
      /Select at least one claim proposal/,
    );
    const created = await createClaimsFromSelectedProposals(db, pkg.id);
    assert.equal(created.claims.length, 1);
    assert.equal(claimHasAttachedEvidence(created.claims[0]), false);
    assert.equal(normalizeClaimProposalText(created.claims[0].claimText), normalizeClaimProposalText(safety.proposedClaimText));

    const duplicateCreate = await createClaimsFromSelectedProposals(db, pkg.id);
    assert.equal(duplicateCreate.claims.length, 1);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 1);
    const stillDiscarded = (await listClaimProposals(db, pkg.id)).find((item) => item.id === discarded.id);
    assert.equal(stillDiscarded.status, "discarded");
    assert.equal(stillDiscarded.createdClaimId, null);

    const intelligence = await buildPackageEvidenceIntelligence(db, pkg.id);
    assert.ok(intelligence.claimAssessments.some((item) => item.claimId === created.claims[0].id));
    const assessment = intelligence.claimAssessments.find((item) => item.claimId === created.claims[0].id);
    assert.equal(assessment.state, "unsupported");
    assert.ok(assessment.researchPlan);
    assert.ok(intelligence.radar.unsupported.some((item) => item.id === created.claims[0].id));

    const content = await buildPackageContentIntelligence(db, pkg.id);
    assert.equal(content.brief.verifiedFacts.length, 0);

    const gate = await evaluatePackageApprovalGate(db, pkg.id);
    assert.equal(gate.canApprove, false);
    assert.match(gate.blockers.join(" "), /missing its referenced evidence|at least one evidenced claim/);

    const approval = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com",
      method: "POST",
      body: { subjectKind: "package", subjectId: pkg.id, decision: "approved", reason: "Should stay blocked." },
    }));
    assert.notEqual(approval.status, 201);
  });
});

test("existing claims are not recreated and discarded proposals never become claims", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await seedBarePackage(db, "tomato-hold", FOOD);
    const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
    const generated = await generateClaimProposals(db, pkg.id);
    const keep = generated.proposals[0];
    await addPackageClaim(db, {
      slug: "existing-tomato",
      packageId: pkg.id,
      claimText: keep.proposedClaimText,
      evidence: { kind: "knowledge_source", id: String(source.id) },
      safetySensitive: false,
    });
    const claimsBefore = (await listPackageClaims(db, pkg.id)).length;
    const regenerated = await generateClaimProposals(db, pkg.id);
    assert.equal((await listPackageClaims(db, pkg.id)).length, claimsBefore);
    const other = regenerated.proposals.find((item) => item.id !== keep.id && item.status === "proposed");
    await setClaimProposalStatus(db, other.id, "discarded");
    const created = await createClaimsFromSelectedProposals(db, pkg.id).catch((error) => error);
    assert.ok(created instanceof Error);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 1);
  });
});

test("claim decomposition APIs are admin-gated and create claims only after explicit create-selected", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await seedBarePackage(db, "labor-reconcile", SAAS);
    const unauthenticated = await generateRoute.POST(request(`/api/growth/packages/${pkg.id}/claim-proposals`, { method: "POST", body: {} }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(unauthenticated.status, 401);
    const generated = await generateRoute.POST(request(`/api/growth/packages/${pkg.id}/claim-proposals`, {
      email: "admin@example.com",
      method: "POST",
      body: {},
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(generated.status, 201);
    const body = await generated.json();
    assert.equal(body.publishingEnabled, false);
    const proposal = body.proposals[0];
    assert.equal((await listPackageClaims(db, pkg.id)).length, 0);
    const selected = await proposalIdRoute.PATCH(request(`/api/growth/packages/${pkg.id}/claim-proposals/${proposal.id}`, {
      email: "admin@example.com",
      method: "PATCH",
      body: { status: "selected" },
    }), { params: Promise.resolve({ id: pkg.id, proposalId: proposal.id }) });
    assert.equal(selected.status, 200);
    assert.equal((await listPackageClaims(db, pkg.id)).length, 0);
    const created = await createClaimsRoute.POST(request(`/api/growth/packages/${pkg.id}/claim-proposals/create-claims`, {
      email: "admin@example.com",
      method: "POST",
      body: {},
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(created.status, 201);
    const createdBody = await created.json();
    assert.equal(createdBody.publishingEnabled, false);
    assert.ok(createdBody.claims.length >= 1);
    assert.equal(claimHasAttachedEvidence(createdBody.claims[0]), false);
  });
});
