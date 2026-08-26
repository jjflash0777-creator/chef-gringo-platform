import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { listResearchRuns } from "../db/social-research-read.ts";
import { loadSocialGrowthQueue } from "../db/social-growth-repository.ts";
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

test("Growth Queue loader uses a live-search-free listResearchRuns binding", async () => {
  assert.equal(typeof listResearchRuns, "function");
  assert.equal(typeof loadSocialGrowthQueue, "function");
  const loader = await readFile(new URL("../db/social-growth-repository.ts", import.meta.url), "utf8");
  assert.match(loader, /import \{ listResearchRuns \} from "\.\/social-research-read\.ts"/);
  assert.doesNotMatch(loader, /import\("\.\/social-research-repository\.ts"\)/);
  const readSource = await readFile(new URL("../db/social-research-read.ts", import.meta.url), "utf8");
  assert.doesNotMatch(readSource, /createLiveCandidateProvider|createBraveSearchClient/);
  assert.doesNotMatch(readSource, /from ["'][^"']*(?:live-candidate-provider|brave-search-client|live-search-client)/);
  assert.doesNotMatch(readSource, /from ["']\.\/social-growth-repository/);
});

test("Worker bundle does not rewrite listResearchRuns onto the Worker entry exports", async () => {
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
  assert.doesNotMatch(combined, /listResearchRuns\s*\}\s*=\s*await import\("\.\.\/index\.js"\)/);
  assert.doesNotMatch(combined, /listResearchRuns is not a function/);
});

test("Worker GET /api/growth/queue returns the queue instead of listResearchRuns is not a function", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  try {
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
    assert.notEqual(String(body.error || ""), "listResearchRuns is not a function");
    assert.equal(response.status, 200, body.error || `unexpected status ${response.status}`);
    assert.equal(Array.isArray(body.opportunities), true);
    assert.equal(Array.isArray(body.packages), true);
    assert.equal(Array.isArray(body.researchRuns), true);
    assert.equal(body.publishingEnabled, false);
  } finally {
    db.close();
  }
});
