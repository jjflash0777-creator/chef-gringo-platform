import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyOpportunityChange,
  clearedPackageDerivedUiState,
  CONTENT_INTELLIGENCE_IDLE_STATUS,
  EMPTY_PACKAGE_FORM,
  opportunityNavRole,
  packageFormForSelection,
  packageNavRole,
  recordsForSelectedPackage,
  resolveQueueSelection,
  selectionInvariantHolds,
  submittedPackageParentId,
} from "../app/admin/growth/queue-selection.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../app/growth/social/types.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const queueRoute = await import("../app/api/growth/queue/route.ts");
const opportunityRoute = await import("../app/api/growth/opportunities/route.ts");
const packageRoute = await import("../app/api/growth/packages/route.ts");

const FREEZER_OPPORTUNITY_ID = "sgo:opportunity:commercial-freezer-running-warm";
const GENERATOR_PACKAGE_ID = "sgo:package:food-truck-generator-sizing";

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

const generatorOpportunity = {
  id: "sgo:opportunity:food-truck-power",
  slug: "food-truck-power",
  status: "selected",
};
const freezerOpportunity = {
  id: FREEZER_OPPORTUNITY_ID,
  slug: "commercial-freezer-running-warm",
  status: "selected",
};
const freezerOwnedPackage = {
  id: "sgo:package:freezer-warm-note",
  opportunityId: freezerOpportunity.id,
  slug: "freezer-warm-note",
  thesis: "Explain why a commercial freezer runs warm.",
  usefulnessTest: "Names a grounded next check.",
  commercialPosture: "none",
};
const generatorPackage = {
  id: GENERATOR_PACKAGE_ID,
  opportunityId: generatorOpportunity.id,
  slug: "food-truck-generator-sizing",
  thesis: "Size the generator from measured running and startup loads.",
  usefulnessTest: "The operator gets a sizing range without invented specs.",
  commercialPosture: "informational",
};

function observedContaminatedState() {
  return {
    opportunities: [generatorOpportunity, freezerOpportunity],
    packages: [generatorPackage, freezerOwnedPackage],
    keepOpportunityId: freezerOpportunity.id,
    keepPackageId: generatorPackage.id,
    packageForm: {
      slug: generatorPackage.slug,
      thesis: generatorPackage.thesis,
      usefulnessTest: generatorPackage.usefulnessTest,
      commercialPosture: generatorPackage.commercialPosture,
    },
    claims: [{ id: "sgo:claim:generator-load", packageId: generatorPackage.id, claimText: "Running load must be evidenced." }],
    evidenceIntelligence: [{ packageId: generatorPackage.id, decisionDna: { intelligenceAuthority: "blocked" } }],
    researchRuns: [{ id: "sgo:research:generator", packageId: generatorPackage.id }],
    liveCandidates: [{ id: "cand-1", packageId: generatorPackage.id }],
    contentIntelligence: { packageId: generatorPackage.id, drafts: [{ copy: "Generator draft" }] },
    variants: [{ id: "sgo:variant:generator", packageId: generatorPackage.id }],
    assets: [{ id: "sgo:asset:generator", packageId: generatorPackage.id }],
    approvals: [{ id: "sgo:approval:generator", packageId: generatorPackage.id }],
    publications: [{ id: "sgo:publication:generator", packageId: generatorPackage.id }],
  };
}

function assembleSelectionView(state) {
  const resolved = resolveQueueSelection({
    opportunities: state.opportunities,
    packages: state.packages,
    keepOpportunityId: state.keepOpportunityId,
    keepPackageId: state.keepPackageId,
  });
  const selectedPackage = resolved.packageId
    ? state.packages.find((item) => item.id === resolved.packageId && item.opportunityId === resolved.opportunityId) ?? null
    : null;
  const packageId = selectedPackage?.id ?? null;
  const derived = packageId ? null : clearedPackageDerivedUiState();
  return {
    resolved,
    opportunityId: resolved.opportunityId,
    packageId,
    invariantHeld: selectionInvariantHolds(state.packages, { opportunityId: resolved.opportunityId, packageId }),
    packageForm: packageFormForSelection(state.packages, packageId),
    createLabel: packageId ? "Save package" : "Create package",
    opportunityNav: state.opportunities.map((item) => ({
      id: item.id,
      slug: item.slug,
      persistedStatus: item.status,
      role: opportunityNavRole(item.id, resolved.opportunityId),
    })),
    visiblePackages: state.packages.filter((item) => item.opportunityId === resolved.opportunityId).map((item) => ({
      id: item.id,
      slug: item.slug,
      persistedStatus: item.status,
      role: packageNavRole(item.id, packageId),
    })),
    claims: recordsForSelectedPackage(state.claims, packageId),
    evidenceIntelligence: recordsForSelectedPackage(state.evidenceIntelligence, packageId),
    researchRuns: recordsForSelectedPackage(state.researchRuns, packageId),
    liveCandidates: recordsForSelectedPackage(state.liveCandidates, packageId),
    contentIntelligence: packageId && state.contentIntelligence?.packageId === packageId ? state.contentIntelligence : null,
    drafts: packageId && state.contentIntelligence?.packageId === packageId ? state.contentIntelligence.drafts : [],
    variants: recordsForSelectedPackage(state.variants, packageId),
    assets: recordsForSelectedPackage(state.assets, packageId),
    approvals: recordsForSelectedPackage(state.approvals, packageId),
    publications: recordsForSelectedPackage(state.publications, packageId),
    derived,
    persistedPackages: state.packages,
  };
}

test("selecting freezer Opportunity while generator Package is selected clears the child and the package form", () => {
  const transition = applyOpportunityChange({
    nextOpportunityId: freezerOpportunity.id,
    currentPackage: generatorPackage,
  });
  assert.equal(transition.packageId, null);
  assert.equal(transition.clearPackageDerivedState, true);

  const view = assembleSelectionView(observedContaminatedState());
  assert.equal(view.opportunityId, freezerOpportunity.id);
  assert.equal(view.packageId, null);
  assert.equal(view.resolved.clearedMismatchedPackage, true);
  assert.equal(view.invariantHeld, true);
  assert.deepEqual(view.packageForm, EMPTY_PACKAGE_FORM);
  assert.equal(view.createLabel, "Create package");
  assert.equal(view.opportunityNav.find((item) => item.id === freezerOpportunity.id)?.role, "Opportunity: active");
  assert.equal(view.opportunityNav.find((item) => item.id === generatorOpportunity.id)?.role, null);
  assert.equal(view.visiblePackages.find((item) => item.id === generatorPackage.id), undefined);
  assert.equal(view.visiblePackages.find((item) => item.id === freezerOwnedPackage.id)?.role, null);
});

test("package-derived Claims, Evidence Intelligence, Decision DNA, Research Plan, Content Intelligence, Draft Studio, and child context clear on parent change", () => {
  const view = assembleSelectionView(observedContaminatedState());
  assert.deepEqual(view.claims, []);
  assert.deepEqual(view.evidenceIntelligence, []);
  assert.deepEqual(view.researchRuns, []);
  assert.deepEqual(view.liveCandidates, []);
  assert.equal(view.contentIntelligence, null);
  assert.deepEqual(view.drafts, []);
  assert.deepEqual(view.variants, []);
  assert.deepEqual(view.assets, []);
  assert.deepEqual(view.approvals, []);
  assert.deepEqual(view.publications, []);
  assert.equal(view.derived.selectedPackageId, null);
  assert.deepEqual(view.derived.packageForm, EMPTY_PACKAGE_FORM);
  assert.equal(view.derived.claimForm.claimText, "");
  assert.equal(view.derived.extraEvidenceForm.claimId, "");
  assert.equal(view.derived.selectionRunId, null);
  assert.deepEqual(view.derived.selectedCandidateIds, []);
  assert.equal(view.derived.contentIntelligence, null);
  assert.equal(view.derived.contentIntelligencePackageId, null);
  assert.equal(view.derived.contentIntelligenceStatus, CONTENT_INTELLIGENCE_IDLE_STATUS);
  assert.equal(view.derived.publicationVariantId, null);
  assert.equal(view.derived.approvalSubject, "package");
  assert.equal(view.derived.variantForm.slug, "");
  assert.equal(view.derived.assetForm.slug, "");
  assert.equal(Object.keys(view.derived.performanceById).length, 0);
});

test("selecting the Opportunity that owns the current Package does not clear it", () => {
  const transition = applyOpportunityChange({
    nextOpportunityId: generatorOpportunity.id,
    currentPackage: generatorPackage,
  });
  assert.equal(transition.packageId, generatorPackage.id);
  assert.equal(transition.clearPackageDerivedState, false);

  const resolved = resolveQueueSelection({
    opportunities: [generatorOpportunity, freezerOpportunity],
    packages: [generatorPackage, freezerOwnedPackage],
    keepOpportunityId: generatorOpportunity.id,
    keepPackageId: generatorPackage.id,
  });
  assert.equal(resolved.packageId, generatorPackage.id);
  assert.equal(resolved.clearedMismatchedPackage, false);
  assert.deepEqual(packageFormForSelection([generatorPackage], resolved.packageId), {
    slug: generatorPackage.slug,
    thesis: generatorPackage.thesis,
    usefulnessTest: generatorPackage.usefulnessTest,
    commercialPosture: generatorPackage.commercialPosture,
  });
});

test("stale mismatched queue hydration fails closed without remapping onto another Opportunity", () => {
  const resolved = resolveQueueSelection({
    opportunities: [freezerOpportunity, generatorOpportunity],
    packages: [generatorPackage],
    keepOpportunityId: freezerOpportunity.id,
    keepPackageId: generatorPackage.id,
  });
  assert.equal(resolved.opportunityId, freezerOpportunity.id);
  assert.equal(resolved.packageId, null);
  assert.equal(resolved.clearedMismatchedPackage, true);
  assert.match(resolved.diagnostic, /Cleared package selection/);
  assert.equal(selectionInvariantHolds([generatorPackage], resolved), true);
  assert.deepEqual(packageFormForSelection([generatorPackage], resolved.packageId), EMPTY_PACKAGE_FORM);
});

test("queue load does not attach another Opportunity's first package as a fallback", () => {
  const resolved = resolveQueueSelection({
    opportunities: [freezerOpportunity, generatorOpportunity],
    packages: [generatorPackage],
    keepOpportunityId: freezerOpportunity.id,
    keepPackageId: null,
  });
  assert.equal(resolved.opportunityId, freezerOpportunity.id);
  assert.equal(resolved.packageId, null);
  assert.notEqual(resolved.packageId, generatorPackage.id);
});

test("initial load auto-selects only a package that belongs to the first Opportunity", () => {
  const resolved = resolveQueueSelection({
    opportunities: [generatorOpportunity, freezerOpportunity],
    packages: [freezerOwnedPackage, generatorPackage],
    keepOpportunityId: null,
    keepPackageId: null,
  });
  assert.equal(resolved.opportunityId, generatorOpportunity.id);
  assert.equal(resolved.packageId, generatorPackage.id);
  assert.equal(resolved.clearedMismatchedPackage, false);
});

test("persisted generator package remains intact after switching to the freezer Opportunity", () => {
  const view = assembleSelectionView(observedContaminatedState());
  const stillThere = view.persistedPackages.find((item) => item.id === generatorPackage.id);
  assert.equal(stillThere?.slug, "food-truck-generator-sizing");
  assert.equal(stillThere?.opportunityId, generatorOpportunity.id);
  assert.equal(stillThere?.thesis, generatorPackage.thesis);
});

test("package creation parent id is only the submitted opportunityId", () => {
  const opportunityId = submittedPackageParentId({
    opportunityId: freezerOpportunity.id,
    packageId: generatorPackage.id,
    selectedPackageId: generatorPackage.id,
    id: generatorPackage.id,
    slug: "freezer-note",
  });
  assert.equal(opportunityId, freezerOpportunity.id);
  assert.throws(() => submittedPackageParentId({ packageId: generatorPackage.id }), /existing content opportunity/);
});

test("Growth Queue UI enforces parent/child selection integrity and distinct nav wording", async () => {
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /from "\.\/queue-selection\.ts"/);
  assert.match(ui, /resolveQueueSelection/);
  assert.match(ui, /applyOpportunityChange/);
  assert.match(ui, /clearPackageDerivedUiState/);
  assert.match(ui, /Opportunity: active/);
  assert.match(ui, /Package: selected/);
  assert.match(ui, /Creates a new package under opportunity/);
  assert.match(ui, /No package is selected/);
  assert.match(ui, /opportunityId: opportunity\.id/);
  assert.doesNotMatch(ui, /next\.packages\[0\]/);
  assert.doesNotMatch(ui, /if \(firstPackage\) selectPackage\(firstPackage\)/);
  assert.doesNotMatch(ui, /SOCIAL_PUBLISH_AVAILABLE\s*=\s*true/);
  assert.match(ui, /NO PUBLISHING ENABLED/);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);

  const helper = await readFile(new URL("../app/admin/growth/queue-selection.ts", import.meta.url), "utf8");
  assert.match(helper, /selectedPackage == null \|\| selectedPackage.opportunityId === selectedOpportunity.id/);
  assert.match(helper, /Never silently remap/);

  const route = await readFile(new URL("../app/api/growth/packages/route.ts", import.meta.url), "utf8");
  assert.match(route, /Stale packageId \/ selectedPackageId must not bind the child/);
  assert.match(route, /const opportunityId = String\(body\.opportunityId/);
  assert.doesNotMatch(route, /body\.selectedPackageId|body\.packageId/);
});

test("package creation binds to the submitted Opportunity and ignores a stale Package id", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  await withAdmin(async (db) => {
    const generatorOpp = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com",
      method: "POST",
      body: {
        slug: "food-truck-power",
        problem: "Operators undersize generators.",
        audience: "independent_operator",
        usefulnessTest: "They can name a measured load path.",
      },
    }))).json()).opportunity;
    const freezer = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com",
      method: "POST",
      body: {
        slug: "commercial-freezer-running-warm",
        problem: "A commercial freezer is running warm.",
        audience: "independent_operator",
        usefulnessTest: "They can name a grounded next check.",
      },
    }))).json()).opportunity;
    const generatorCreated = await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com",
      method: "POST",
      body: {
        slug: "food-truck-generator-sizing",
        opportunityId: generatorOpp.id,
        thesis: "Size the generator from measured loads.",
        usefulnessTest: "Does not invent a live spec sheet.",
        commercialPosture: "informational",
      },
    }));
    assert.equal(generatorCreated.status, 201);
    const generatorPkg = (await generatorCreated.json()).package;
    assert.equal(generatorPkg.id, GENERATOR_PACKAGE_ID);
    assert.equal(generatorPkg.opportunityId, generatorOpp.id);

    const created = await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com",
      method: "POST",
      body: {
        slug: "freezer-warm-note",
        opportunityId: freezer.id,
        packageId: generatorPkg.id,
        selectedPackageId: generatorPkg.id,
        id: generatorPkg.id,
        thesis: "Explain why the freezer is running warm.",
        usefulnessTest: "Names an on-file next check.",
        commercialPosture: "none",
      },
    }));
    assert.equal(created.status, 201);
    const freezerPkg = (await created.json()).package;
    assert.equal(freezerPkg.opportunityId, freezer.id);
    assert.equal(freezer.id, FREEZER_OPPORTUNITY_ID);
    assert.notEqual(freezerPkg.id, generatorPkg.id);
    assert.notEqual(freezerPkg.opportunityId, generatorPkg.opportunityId);

    const missingParent = await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com",
      method: "POST",
      body: {
        slug: "orphan-note",
        packageId: generatorPkg.id,
        selectedPackageId: generatorPkg.id,
        thesis: "Should not bind to a stale package.",
        usefulnessTest: "Fails closed.",
        commercialPosture: "none",
      },
    }));
    assert.equal(missingParent.status, 400);

    const queue = await queueRoute.GET(request("/api/growth/queue", { email: "admin@example.com" }));
    const body = await queue.json();
    const stillGenerator = body.packages.find((item) => item.id === generatorPkg.id);
    assert.equal(stillGenerator.slug, "food-truck-generator-sizing");
    assert.equal(stillGenerator.opportunityId, generatorOpp.id);
    assert.equal(stillGenerator.thesis, "Size the generator from measured loads.");
    assert.equal(body.publishingEnabled, false);
    const deleted = db.database.prepare("SELECT COUNT(*) AS n FROM social_content_packages WHERE id = ?").get(generatorPkg.id);
    assert.equal(Number(deleted.n), 1);
  });
});
