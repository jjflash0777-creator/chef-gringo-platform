import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LIVE_RESEARCH_ENABLED } from "../app/lib/research/capability.ts";
import { LIVE_SEARCH_PROVIDER, RESEARCH_LIMITS } from "../app/lib/research/limits.ts";
import { createBraveSearchClient, normalizeBraveWebSearchHits } from "../app/lib/research/brave-search-client.ts";
import { createConfiguredLiveSearchClient, createHttpsJsonSearchClient } from "../app/lib/research/live-search-client.ts";
import { createLiveCandidateProvider } from "../app/lib/research/live-candidate-provider.ts";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  BRAVE_WEB_SEARCH_ENDPOINT,
  buildExecutableResearchPlan,
  executeBoundedCandidateDiscovery,
  liveCandidateDiscoveryAvailable,
  readLiveDiscoveryConfig,
  resolveCandidateDiscoveryProvider,
} from "../app/growth/social/index.ts";
import { fixtureCandidateProvider } from "../app/lib/research/fixture-candidate-provider.ts";
import { publishSocialPackage } from "../db/social-growth-repository.ts";
import { ingestCorpusSource } from "../app/lib/research/ingest.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const TEST_BRAVE_KEY = "cg_test_brave_subscription_token_do_not_use";
const CLAIM_TEXT = "Recommended operating headroom should be evidenced under these conditions.";
const GENERIC_SEARCH = "https://search.test.example/v1";
const INDEPENDENT = "https://www.harbor-industrial.example/application-notes/headroom";

const opportunityRoute = await import("../app/api/growth/opportunities/route.ts");
const packageRoute = await import("../app/api/growth/packages/route.ts");
const claimRoute = await import("../app/api/growth/packages/[id]/claims/route.ts");
const planRoute = await import("../app/api/growth/packages/[id]/research-plans/route.ts");
const discoverRoute = await import("../app/api/growth/packages/[id]/research-runs/route.ts");
const corpusReviewRoute = await import("../app/api/marketplace/corpus/[id]/route.ts");

function request(path, { email, method = "GET", body } = {}) {
  const headers = { "content-type": "application/json" };
  if (email) headers["oai-authenticated-user-email"] = email;
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function clearLiveEnv() {
  delete process.env.CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY;
  delete process.env.CHEF_GRINGO_LIVE_SEARCH_PROVIDER;
  delete process.env.CHEF_GRINGO_LIVE_SEARCH_ENDPOINT;
  delete process.env.CHEF_GRINGO_LIVE_SEARCH_TOKEN;
  delete process.env.CHEF_GRINGO_BRAVE_SEARCH_API_KEY;
  delete globalThis.__CHEF_GRINGO_LIVE_FETCH__;
}

function enableBraveEnv() {
  process.env.CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY = "true";
  process.env.CHEF_GRINGO_LIVE_SEARCH_PROVIDER = "brave";
  process.env.CHEF_GRINGO_BRAVE_SEARCH_API_KEY = TEST_BRAVE_KEY;
}

function jsonResponse(body) {
  const text = JSON.stringify(body);
  return {
    status: 200,
    headers: { get(name) { return name.toLowerCase() === "content-type" ? "application/json" : null; } },
    text: async () => text,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  };
}

function documentResponse(body) {
  return {
    status: 200,
    headers: { get(name) { return name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : null; } },
    text: async () => body,
    arrayBuffer: async () => new TextEncoder().encode(body).buffer,
  };
}

function technicalHtml(publisher) {
  return `<html><body><h1>${publisher} technical bulletin</h1><p>${publisher} application note: recommended operating headroom should be evidenced under these conditions.</p></body></html>`;
}

function assertNoSecret(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  assert.doesNotMatch(text, new RegExp(TEST_BRAVE_KEY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(text, /X-Subscription-Token\s*:\s*\S+/i);
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
    clearLiveEnv();
    db.close();
  }
}

async function seedHeadroomPackage(db, slug) {
  const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-opp`, problem: "Operators guess generator capacity.", audience: "independent_operator", usefulnessTest: "Separates running load from headroom." },
  }))).json()).opportunity;
  const ingested = await ingestCorpusSource(db, {
    title: "Northwind running-load excerpt",
    publisher: "Northwind Power Systems",
    evidenceDomain: "equipment",
    sourceType: "manufacturer_documentation",
    authorityTier: 2,
    canonicalUrl: `https://www.osha.gov/publications/${slug}-northwind-existing`,
    mimeType: "text/plain",
    text: "Running load is the sum of continuous connected loads after diversity. Operating headroom is documented by this manufacturer.",
    actorEmail: "admin@example.com",
    provenanceMethod: "founder_uploaded_document",
    claimScope: ["growth_evidence_candidate"],
  });
  const reviewed = await corpusReviewRoute.POST(request(`/api/marketplace/corpus/${ingested.document.id}`, {
    email: "admin@example.com", method: "POST",
    body: { action: "accept", verificationNotes: "Accepted for Brave adapter tests.", claimScope: ["growth_evidence_candidate"] },
  }), { params: Promise.resolve({ id: ingested.document.id }) });
  assert.equal(reviewed.status, 200);
  const existing = (await reviewed.json()).document.id;
  const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
    email: "admin@example.com", method: "POST",
    body: { slug, opportunityId: opportunity.id, thesis: "Size from evidenced headroom, not a sales buffer.", usefulnessTest: "Names independent sources.", commercialPosture: "none" },
  }))).json()).package;
  const created = await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
    email: "admin@example.com", method: "POST",
    body: {
      slug: `${slug}-claim`,
      claimText: CLAIM_TEXT,
      safetySensitive: false,
      evidence: { kind: "corpus_document", id: existing },
    },
  }), { params: Promise.resolve({ id: pkg.id }) });
  assert.equal(created.status, 201);
  return { pkg, claim: (await created.json()).claim };
}

test("SOCIAL_PUBLISH_AVAILABLE stays false and public live-search constant stays null", () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.throws(() => publishSocialPackage(), /cannot publish/);
  assert.equal(LIVE_RESEARCH_ENABLED, false);
  assert.equal(LIVE_SEARCH_PROVIDER, null);
});

test("Brave web-search results normalize to the internal candidate-search shape", () => {
  const hits = normalizeBraveWebSearchHits({
    type: "search",
    query: { original: "headroom" },
    web: {
      results: [
        { title: "Harbor Industrial application note", url: INDEPENDENT, description: "Recommended operating headroom." },
        { title: "Ignore me", url: "", description: "no url" },
        { title: "News item" },
        null,
        { url: "https://www.coastal-power.example/application-notes/headroom", title: "Coastal Power bulletin" },
      ],
    },
    news: { results: [{ url: "https://www.should-not-use-news.example/story", title: "News" }] },
  }, 5);
  assert.equal(hits.length, 2);
  assert.deepEqual(hits[0], {
    url: INDEPENDENT,
    title: "Harbor Industrial application note",
    snippet: "Recommended operating headroom.",
  });
  assert.equal(hits[1].url, "https://www.coastal-power.example/application-notes/headroom");
  assert.equal(hits[1].snippet, undefined);
});

test("malformed Brave responses fail safely without throwing", () => {
  assert.deepEqual(normalizeBraveWebSearchHits(null, 5), []);
  assert.deepEqual(normalizeBraveWebSearchHits("nope", 5), []);
  assert.deepEqual(normalizeBraveWebSearchHits({ type: "search" }, 5), []);
  assert.deepEqual(normalizeBraveWebSearchHits({ web: { results: "nope" } }, 5), []);
  assert.deepEqual(normalizeBraveWebSearchHits({ web: { results: [{ title: "no url" }] } }, 5), []);
});

test("Brave count is capped to Chef Gringo candidate bounds, not Brave's maximum of 20", () => {
  const results = Array.from({ length: 20 }, (_, index) => ({
    url: `https://www.publisher-${index}.example/application-notes/headroom`,
    title: `Publisher ${index}`,
    description: "note",
  }));
  const hits = normalizeBraveWebSearchHits({ web: { results } }, 20);
  assert.equal(hits.length, RESEARCH_LIMITS.maximumSearchHitsPerQuery);
});

test("missing Brave key fails closed", () => {
  clearLiveEnv();
  process.env.CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY = "true";
  process.env.CHEF_GRINGO_LIVE_SEARCH_PROVIDER = "brave";
  try {
    assert.equal(liveCandidateDiscoveryAvailable(), false);
    const config = readLiveDiscoveryConfig();
    assert.equal(config.ok, false);
    assert.equal(config.hasToken, false);
    assert.ok(config.issues.some((issue) => /CHEF_GRINGO_BRAVE_SEARCH_API_KEY/.test(issue)));
    assertNoSecret(config);
    assert.equal(resolveCandidateDiscoveryProvider().kind, "fixture");
    assert.equal(resolveCandidateDiscoveryProvider().id, fixtureCandidateProvider.id);
  } finally {
    clearLiveEnv();
  }
});

test("Brave authentication uses X-Subscription-Token and never puts the key in the URL or Bearer header", async () => {
  enableBraveEnv();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: { ...(init?.headers ?? {}) } });
    if (String(url).startsWith("https://api.search.brave.com/")) {
      return jsonResponse({
        type: "search",
        web: { results: [{ url: INDEPENDENT, title: "Harbor Industrial Power application note", description: "headroom" }] },
      });
    }
    return documentResponse(technicalHtml("Harbor Industrial Power"));
  };
  try {
    const client = createBraveSearchClient(fetchImpl);
    const outcome = await client.search(CLAIM_TEXT, 5);
    const hits = Array.isArray(outcome) ? outcome : outcome.hits;
    assert.equal(hits.length, 1);
    assert.equal(hits[0].url, INDEPENDENT);
    assert.equal(Array.isArray(outcome) ? hits.length : outcome.rawResultCount, 1);
    assert.equal(calls.length, 1);
    const search = calls[0];
    assert.equal(new URL(search.url).origin + new URL(search.url).pathname, new URL(BRAVE_WEB_SEARCH_ENDPOINT).origin + new URL(BRAVE_WEB_SEARCH_ENDPOINT).pathname);
    assert.equal(search.headers["X-Subscription-Token"], TEST_BRAVE_KEY);
    assert.equal(search.headers.authorization, undefined);
    assert.equal(search.headers.Authorization, undefined);
    assertNoSecret(search.url);
    assert.ok(Number(new URL(search.url).searchParams.get("count")) <= RESEARCH_LIMITS.maximumSearchHitsPerQuery);
    assert.ok(Number(new URL(search.url).searchParams.get("count")) < 20);
    assert.equal(new URL(search.url).searchParams.get("result_filter"), "web");
    assert.doesNotMatch(search.url, /apikey|api_key|token=/i);
  } finally {
    clearLiveEnv();
  }
});

test("malformed Brave HTTP body fails safely during search", async () => {
  enableBraveEnv();
  const fetchImpl = async () => ({
    status: 200,
    headers: { get() { return "application/json"; } },
    text: async () => "not-json{",
    arrayBuffer: async () => new ArrayBuffer(0),
  });
  try {
    const outcome = await createBraveSearchClient(fetchImpl).search(CLAIM_TEXT, 5);
    const hits = Array.isArray(outcome) ? outcome : outcome.hits;
    assert.deepEqual(hits, []);
    if (!Array.isArray(outcome)) {
      assert.equal(outcome.parseFailed, true);
      assert.equal(outcome.rawResultCount, 0);
    }
  } finally {
    clearLiveEnv();
  }
});

test("max query and candidate bounds still apply when Brave returns excess results", async () => {
  enableBraveEnv();
  const queries = [];
  const fetchImpl = async (url) => {
    if (String(url).startsWith("https://api.search.brave.com/")) {
      queries.push(new URL(url).searchParams.get("q"));
      const results = Array.from({ length: 12 }, (_, index) => ({
        url: `https://www.publisher-${index}.example/application-notes/headroom`,
        title: `Publisher ${index} technical bulletin`,
        description: CLAIM_TEXT,
      }));
      return jsonResponse({ type: "search", web: { results } });
    }
    return documentResponse(technicalHtml("Independent Manufacturer"));
  };
  try {
    const plan = buildExecutableResearchPlan({
      claimOrQuestion: CLAIM_TEXT,
      policyClass: "broad_technical",
      reason: "Independent corroboration is required.",
    });
    plan.queries.push("extra unused brave query");
    const result = await executeBoundedCandidateDiscovery({
      plan,
      claim: { id: "sgo:claim:brave-limits", claimText: CLAIM_TEXT, safetySensitive: false, policyClass: "broad_technical" },
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    assert.ok(result.queriesExecuted.length <= RESEARCH_LIMITS.maximumQueries);
    assert.ok(result.candidates.length <= RESEARCH_LIMITS.maximumCandidates);
    assert.ok(!result.queriesExecuted.includes("extra unused brave query"));
    assert.ok(queries.length <= RESEARCH_LIMITS.maximumQueries);
  } finally {
    clearLiveEnv();
  }
});

test("fixture provider still works when Brave is not configured", async () => {
  clearLiveEnv();
  assert.equal(liveCandidateDiscoveryAvailable(), false);
  const provider = resolveCandidateDiscoveryProvider();
  assert.equal(provider.kind, "fixture");
  const plan = buildExecutableResearchPlan({
    claimOrQuestion: CLAIM_TEXT,
    policyClass: "broad_technical",
    reason: "Independent corroboration is required.",
  });
  const result = await executeBoundedCandidateDiscovery({
    plan,
    claim: { id: "sgo:claim:fixture-still", claimText: CLAIM_TEXT, safetySensitive: false, policyClass: "broad_technical" },
    attached: [],
    provider,
  });
  assert.equal(result.providerKind, "fixture");
  assert.equal(result.liveRetrieval, false);
  assert.ok(result.candidates.length >= 1);
});

test("generic HTTPS JSON adapter remains intact when provider is https_json", async () => {
  process.env.CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY = "true";
  process.env.CHEF_GRINGO_LIVE_SEARCH_PROVIDER = "https_json";
  process.env.CHEF_GRINGO_LIVE_SEARCH_ENDPOINT = GENERIC_SEARCH;
  process.env.CHEF_GRINGO_LIVE_SEARCH_TOKEN = "generic-bearer-token";
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: { ...(init?.headers ?? {}) } });
    return jsonResponse({ results: [{ url: INDEPENDENT, title: "Harbor", snippet: "headroom" }] });
  };
  try {
    assert.equal(readLiveDiscoveryConfig().provider, "https_json");
    assert.equal(liveCandidateDiscoveryAvailable(), true);
    const outcome = await createHttpsJsonSearchClient(fetchImpl).search(CLAIM_TEXT, 3);
    const hits = Array.isArray(outcome) ? outcome : outcome.hits;
    assert.equal(hits[0].url, INDEPENDENT);
    assert.equal(calls[0].headers.authorization, "Bearer generic-bearer-token");
    assert.equal(calls[0].headers["X-Subscription-Token"], undefined);
    assert.match(calls[0].url, /^https:\/\/search\.test\.example\/v1/);
    const dispatched = createConfiguredLiveSearchClient(fetchImpl);
    const again = await dispatched.search(CLAIM_TEXT, 3);
    const againHits = Array.isArray(again) ? again : again.hits;
    assert.equal(againHits[0].url, INDEPENDENT);
  } finally {
    clearLiveEnv();
  }
});

test("Brave key never appears in API responses, UI, or persisted audit rows", async () => {
  enableBraveEnv();
  const fetchImpl = async (url) => {
    if (String(url).startsWith("https://api.search.brave.com/")) {
      return jsonResponse({
        type: "search",
        web: { results: [{ url: INDEPENDENT, title: "Harbor Industrial Power application note", description: "headroom" }] },
      });
    }
    return documentResponse(technicalHtml("Harbor Industrial Power"));
  };
  await withAdmin(async (db) => {
    globalThis.__CHEF_GRINGO_LIVE_FETCH__ = fetchImpl;
    const { pkg, claim } = await seedHeadroomPackage(db, "brave-secret");
    const plans = await planRoute.GET(request(`/api/growth/packages/${pkg.id}/research-plans`, {
      email: "admin@example.com",
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(plans.status, 200);
    const planBody = await plans.json();
    assert.equal(planBody.liveDiscoveryAvailable, true);
    assertNoSecret(planBody);
    const discovered = await discoverRoute.POST(request(`/api/growth/packages/${pkg.id}/research-runs`, {
      email: "admin@example.com", method: "POST",
      body: { slug: "brave-secret-run", claimId: claim.id, mode: "live" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(discovered.status, 201);
    const payload = await discovered.json();
    assert.equal(payload.run.liveRetrieval, true);
    assertNoSecret(payload);
    const runRow = db.database.prepare("SELECT * FROM social_research_runs WHERE id = ?").get(payload.run.id);
    const candidateRows = db.database.prepare("SELECT * FROM social_research_candidates WHERE run_id = ?").all(payload.run.id);
    assertNoSecret(runRow);
    assertNoSecret(candidateRows);
  });
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(ui, /CHEF_GRINGO_BRAVE_SEARCH_API_KEY/);
  assert.doesNotMatch(ui, /X-Subscription-Token/);
  assert.doesNotMatch(ui, /NEXT_PUBLIC_.*BRAVE/);
});

test("Brave adapter is server-only and does not accept evidence or publish", async () => {
  const source = await readFile(new URL("../app/lib/research/brave-search-client.ts", import.meta.url), "utf8");
  assert.match(source, /X-Subscription-Token/);
  assert.doesNotMatch(source, /Authorization.*Bearer/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_/);
  assert.doesNotMatch(source, /reviewCorpusDocument/);
  assert.doesNotMatch(source, /publishSocialPackage|schedulePost|oauth/i);
  assert.doesNotMatch(source, /Generac|Cummins|Caterpillar/);
});
