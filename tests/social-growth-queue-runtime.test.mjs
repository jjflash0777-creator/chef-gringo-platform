import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { buildPackageEvidenceIntelligence } from "../db/social-evidence-intelligence.ts";
import { listSocialEvidenceRequests } from "../db/social-evidence-request-read.ts";
import { listResearchRuns } from "../db/social-research-read.ts";
import {
  addPackageClaim,
  createContentOpportunity,
  createContentPackage,
  loadSocialGrowthQueue,
} from "../db/social-growth-repository.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../app/growth/social/types.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

async function workerFetch(path, env, headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers }), env, {
    waitUntil() {},
    passThroughOnException() {},
  });
}

async function readDistServerJs() {
  const distRoot = new URL("../dist/server/", import.meta.url);
  const files = ["index.js"];
  try {
    for (const name of await readdir(new URL("./assets/", distRoot))) {
      if (name.endsWith(".js")) files.push(`assets/${name}`);
    }
  } catch {
    assert.fail("Worker assets were not built; run npm run build before this suite.");
  }
  let combined = "";
  for (const file of files) combined += await readFile(new URL(file, distRoot), "utf8");
  return combined;
}

async function seedQueuePackage(db) {
  const opportunity = await createContentOpportunity(db, {
    slug: "queue-runtime-opportunity",
    problem: "Home cooks ask what mirepoix is and get vague answers.",
    audience: "home_cook",
    usefulnessTest: "The reader can name the three vegetables and the usual ratio.",
    productId: null,
    workflowId: null,
    partnerOpportunityId: null,
    status: "selected",
  });
  const pkg = await createContentPackage(db, {
    slug: "queue-runtime-package",
    opportunityId: opportunity.id,
    thesis: "Explain mirepoix as standard culinary practice, then offer a next cooking step.",
    usefulnessTest: "The answer names onion, carrot, celery and does not invent a live source check.",
    commercialPosture: "none",
  });
  const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
  await addPackageClaim(db, {
    slug: "queue-runtime-claim",
    packageId: pkg.id,
    claimText: "Mirepoix is a flavor base of onion, carrot, and celery.",
    evidence: { kind: "knowledge_source", id: String(source.id) },
    safetySensitive: false,
  });
  return { opportunity, pkg };
}

test("Growth Queue loader statically binds cycle-free queue dependencies", async () => {
  assert.equal(typeof listResearchRuns, "function");
  assert.equal(typeof listSocialEvidenceRequests, "function");
  assert.equal(typeof buildPackageEvidenceIntelligence, "function");
  assert.equal(typeof loadSocialGrowthQueue, "function");

  const loader = await readFile(new URL("../db/social-growth-repository.ts", import.meta.url), "utf8");
  assert.doesNotMatch(loader, /await import\(/);
  assert.match(loader, /import \{ listResearchRuns \} from "\.\/social-research-read\.ts"/);
  assert.match(loader, /import \{ listSocialEvidenceRequests \} from "\.\/social-evidence-request-read\.ts"/);
  assert.match(loader, /import \{ buildPackageEvidenceIntelligence \} from "\.\/social-evidence-intelligence\.ts"/);

  const growthRead = await readFile(new URL("../db/social-growth-read.ts", import.meta.url), "utf8");
  assert.doesNotMatch(growthRead, /from ["']\.\/social-growth-repository/);
  assert.doesNotMatch(growthRead, /from ["']\.\/social-evidence-intelligence/);
  assert.doesNotMatch(growthRead, /from ["']\.\/social-evidence-request-repository/);
  assert.doesNotMatch(growthRead, /createLiveCandidateProvider|createBraveSearchClient/);
  assert.doesNotMatch(growthRead, /from ["'][^"']*(?:live-candidate-provider|brave-search-client|live-search-client)/);

  const intelligence = await readFile(new URL("../db/social-evidence-intelligence.ts", import.meta.url), "utf8");
  assert.doesNotMatch(intelligence, /from ["']\.\/social-growth-repository/);
  assert.match(intelligence, /from "\.\/social-growth-read\.ts"/);

  const requestRead = await readFile(new URL("../db/social-evidence-request-read.ts", import.meta.url), "utf8");
  assert.doesNotMatch(requestRead, /from ["']\.\/social-growth-repository/);
  assert.doesNotMatch(requestRead, /from ["']\.\/social-evidence-intelligence/);
});

test("Worker bundle does not rewrite queue loaders onto the Worker entry exports", async () => {
  const combined = await readDistServerJs();
  assert.doesNotMatch(combined, /\}\s*=\s*await import\("\.\.\/index\.js"\)/);
  assert.doesNotMatch(combined, /(?:listResearchRuns|buildPackageEvidenceIntelligence|listSocialEvidenceRequests|hasIntelligenceReadyApprovalAuthority)\s*\}\s*=\s*await import\(/);
  assert.doesNotMatch(combined, /(?:listResearchRuns|buildPackageEvidenceIntelligence) is not a function/);
});

test("Worker GET /api/growth/queue executes all queue-loading dependencies without undefined imports", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  try {
    const seeded = await seedQueuePackage(db);
    const env = {
      DB: db,
      MARKETPLACE_ADMIN_EMAILS: "admin@example.com",
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    };
    const unauthenticated = await workerFetch("/api/growth/queue", env);
    assert.equal(unauthenticated.status, 401);
    const forbidden = await workerFetch("/api/growth/queue", env, { "oai-authenticated-user-email": "viewer@example.com" });
    assert.equal(forbidden.status, 403);
    const response = await workerFetch("/api/growth/queue", env, {
      "oai-authenticated-user-email": "admin@example.com",
      accept: "application/json",
    });
    const body = await response.json();
    assert.doesNotMatch(String(body.error || ""), /is not a function/);
    assert.equal(response.status, 200, body.error || `unexpected status ${response.status}`);
    assert.equal(Array.isArray(body.opportunities), true);
    assert.equal(Array.isArray(body.packages), true);
    assert.equal(Array.isArray(body.researchRuns), true);
    assert.equal(Array.isArray(body.evidenceRequests), true);
    assert.ok(body.opportunities.some((item) => item.id === seeded.opportunity.id));
    assert.ok(body.packages.some((item) => item.id === seeded.pkg.id));
    assert.equal(body.evidenceIntelligence && typeof body.evidenceIntelligence, "object");
    const intelligence = body.evidenceIntelligence[seeded.pkg.id];
    assert.equal(intelligence && typeof intelligence, "object");
    assert.equal(intelligence.packageId, seeded.pkg.id);
    assert.equal(Array.isArray(intelligence.claimAssessments), true);
    assert.equal(body.publishingEnabled, false);
  } finally {
    db.close();
  }
});
