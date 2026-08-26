import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LIVE_RESEARCH_ENABLED } from "../app/lib/research/capability.ts";
import { LIVE_SEARCH_PROVIDER, RESEARCH_LIMITS } from "../app/lib/research/limits.ts";
import { createLiveCandidateProvider } from "../app/lib/research/live-candidate-provider.ts";
import { extractReadableContent } from "../app/lib/research/chunker.ts";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  buildBoundedResearchQueries,
  buildExecutableResearchPlan,
  compactResearchQueryTerms,
  describeLiveEmptyReason,
  diagnosticsOmitSecrets,
  executeBoundedCandidateDiscovery,
  LIVE_DOCUMENT_FETCH_CONCURRENCY,
  liveCandidateDiscoveryAvailable,
  rankCandidateAssessments,
  readLiveDiscoveryConfig,
  wouldSatisfyPolicyIfAccepted,
} from "../app/growth/social/index.ts";
import { emptyLiveRetrievalDiagnostics } from "../app/lib/research/live-retrieval-diagnostics.ts";
import { assertLiveDiscoveryConfigured } from "../app/growth/social/candidate-discovery-capability.ts";
import { publishSocialPackage } from "../db/social-growth-repository.ts";
import { ingestCorpusSource } from "../app/lib/research/ingest.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const SEARCH = "https://search.test.example/v1";
const CRAWL_URL = "https://www.should-not-fetch.example/recursive-crawl";
const JS_URL = "https://www.should-not-fetch.example/js";
const CLAIM_TEXT = "Recommended operating headroom should be evidenced under these conditions.";

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

function enableLiveEnv(extra = {}) {
  process.env.CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY = extra.enabled ?? "true";
  if (extra.endpoint !== null) process.env.CHEF_GRINGO_LIVE_SEARCH_ENDPOINT = extra.endpoint ?? SEARCH;
  if (extra.token) process.env.CHEF_GRINGO_LIVE_SEARCH_TOKEN = extra.token;
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

function documentResponse(input) {
  const text = input.body;
  const headers = input.headers ?? {};
  return {
    status: input.status ?? 200,
    headers: {
      get(name) {
        const key = name.toLowerCase();
        if (key === "content-type") return headers["content-type"] ?? "text/html; charset=utf-8";
        if (key === "location") return headers.location ?? null;
        if (key === "content-length") return headers["content-length"] ?? null;
        return headers[key] ?? null;
      },
    },
    text: async () => text,
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  };
}

function technicalHtml(publisher, extra = "") {
  return `<html><body><h1>${publisher} technical bulletin</h1><p>${publisher} application note: recommended operating headroom should be evidenced under these conditions. ${extra}</p><a href="${CRAWL_URL}">more</a><script>window.location="${JS_URL}"</script></body></html>`;
}

function contradictionHtml(publisher) {
  return `<html><body><h1>${publisher} safety bulletin</h1><p>${publisher} application note: recommended operating headroom should never be treated as a universal rule. This document contradicts blanket headroom recommendations without a site-specific study.</p></body></html>`;
}

function createTrackedFetch(input) {
  const fetched = [];
  const fetchImpl = async (url, init) => {
    fetched.push(url);
    if (url.startsWith(SEARCH)) {
      const parsed = new URL(url);
      const query = parsed.searchParams.get("q") ?? "";
      const results = typeof input.search === "function" ? input.search(query, init) : (input.results ?? []);
      return jsonResponse({ results });
    }
    if (input.hangUrls?.some((item) => url.startsWith(item))) {
      await new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error("hanging fetch was not aborted")), 2000);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    }
    const handler = input.documents?.[url];
    if (!handler) {
      return documentResponse({ status: 404, body: "", headers: { "content-type": "text/plain" } });
    }
    return typeof handler === "function" ? handler(init) : handler;
  };
  return { fetched, fetchImpl };
}

const broadClaim = {
  id: "sgo:claim:live-headroom",
  claimText: CLAIM_TEXT,
  safetySensitive: false,
  policyClass: "broad_technical",
};

function planFor(claimText = CLAIM_TEXT) {
  return buildExecutableResearchPlan({
    claimOrQuestion: claimText,
    policyClass: "broad_technical",
    reason: "Independent corroboration is required.",
  });
}

function attachedManufacturer(publisher, url) {
  return {
    ref: { kind: "corpus_document", id: `corpus:${publisher}` },
    exists: true,
    publisher,
    title: `${publisher} existing bulletin`,
    canonicalUrl: url,
    sourceType: "manufacturer_documentation",
    provenanceMethod: "founder_uploaded_document",
    ingestionStatus: "accepted",
    validationStatus: "claim_supporting",
    underlyingDocumentId: `corpus:${publisher}`,
  };
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

async function withLiveAdmin(run, extra = {}) {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db };
  process.env.MARKETPLACE_ADMIN_EMAILS = "admin@example.com";
  enableLiveEnv(extra);
  try {
    await run(db);
  } finally {
    delete globalThis.__CHEF_GRINGO_ENV__;
    delete process.env.MARKETPLACE_ADMIN_EMAILS;
    clearLiveEnv();
    db.close();
  }
}

async function acceptManufacturer(db, input) {
  const ingested = await ingestCorpusSource(db, {
    title: input.title,
    publisher: input.publisher,
    evidenceDomain: "equipment",
    sourceType: "manufacturer_documentation",
    authorityTier: 2,
    canonicalUrl: input.url,
    mimeType: "text/plain",
    text: "Running load is the sum of continuous connected loads after diversity. Operating headroom is documented by this manufacturer.",
    actorEmail: "admin@example.com",
    provenanceMethod: "founder_uploaded_document",
    claimScope: ["growth_evidence_candidate"],
  });
  const reviewed = await corpusReviewRoute.POST(request(`/api/marketplace/corpus/${ingested.document.id}`, {
    email: "admin@example.com", method: "POST",
    body: { action: "accept", verificationNotes: "Accepted for live discovery tests.", claimScope: ["growth_evidence_candidate"] },
  }), { params: Promise.resolve({ id: ingested.document.id }) });
  assert.equal(reviewed.status, 200);
  return (await reviewed.json()).document.id;
}

async function seedHeadroomPackage(db, slug) {
  const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-opp`, problem: "Operators guess generator capacity.", audience: "independent_operator", usefulnessTest: "Separates running load from headroom." },
  }))).json()).opportunity;
  const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
    email: "admin@example.com", method: "POST",
    body: { slug, opportunityId: opportunity.id, thesis: "Size from evidenced headroom, not a sales buffer.", usefulnessTest: "Names independent sources.", commercialPosture: "none" },
  }))).json()).package;
  const existing = await acceptManufacturer(db, {
    title: "Northwind running-load excerpt",
    publisher: "Northwind Power Systems",
    url: `https://www.osha.gov/publications/${slug}-northwind-existing`,
  });
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
  return { opportunity, pkg, claim: (await created.json()).claim, existing };
}

test("missing live config fails closed and stays on the fixture capability", () => {
  clearLiveEnv();
  assert.equal(LIVE_RESEARCH_ENABLED, false);
  assert.equal(LIVE_SEARCH_PROVIDER, null);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.equal(liveCandidateDiscoveryAvailable(), false);
  assert.equal(readLiveDiscoveryConfig().ok, false);
  assert.throws(() => assertLiveDiscoveryConfigured(), /not available/);
  assert.throws(() => publishSocialPackage(), /cannot publish/);
});

test("non-HTTPS search endpoint fails closed", () => {
  enableLiveEnv({ endpoint: "http://search.test.example/v1" });
  try {
    assert.equal(liveCandidateDiscoveryAvailable(), false);
    assert.equal(readLiveDiscoveryConfig().ok, false);
    assert.throws(() => assertLiveDiscoveryConfigured(), /rejected|not available/);
  } finally {
    clearLiveEnv();
  }
});

test("live discovery APIs remain founder/admin only and ignore browser-supplied actor identity", async () => {
  await withAdmin(async (db) => {
    const { pkg, claim } = await seedHeadroomPackage(db, "live-auth");
    const unauthenticated = await discoverRoute.POST(request(`/api/growth/packages/${pkg.id}/research-runs`, {
      method: "POST", body: { slug: "nope", claimId: claim.id, mode: "live", actorEmail: "admin@example.com" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(unauthenticated.status, 401);
    const forbidden = await discoverRoute.POST(request(`/api/growth/packages/${pkg.id}/research-runs`, {
      email: "viewer@example.com", method: "POST",
      body: { slug: "nope", claimId: claim.id, mode: "live", actorEmail: "admin@example.com" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(forbidden.status, 403);
    const missing = await discoverRoute.POST(request(`/api/growth/packages/${pkg.id}/research-runs`, {
      email: "admin@example.com", method: "POST",
      body: { slug: "no-live", claimId: claim.id, mode: "live", actorEmail: "spoof@evil.example" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(missing.status, 400);
    const body = await missing.json();
    assert.match(String(body.error), /not available/);
  });
});

test("configured live run records the authenticated administrator, not a body actorEmail", async () => {
  const independent = "https://www.harbor-industrial.example/application-notes/headroom";
  const { fetched, fetchImpl } = createTrackedFetch({
    results: [{ url: independent, title: "Harbor Industrial Power application note" }],
    documents: {
      [independent]: documentResponse({ body: technicalHtml("Harbor Industrial Power") }),
    },
  });
  await withLiveAdmin(async (db) => {
    globalThis.__CHEF_GRINGO_LIVE_FETCH__ = fetchImpl;
    const { pkg, claim } = await seedHeadroomPackage(db, "live-actor");
    const plans = await planRoute.GET(request(`/api/growth/packages/${pkg.id}/research-plans`, {
      email: "admin@example.com",
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(plans.status, 200);
    const planBody = await plans.json();
    assert.equal(planBody.liveDiscoveryAvailable, true);
    assert.equal(planBody.discoveryCapability, "live_bounded");
    const discovered = await discoverRoute.POST(request(`/api/growth/packages/${pkg.id}/research-runs`, {
      email: "admin@example.com", method: "POST",
      body: { slug: "live-actor-run", claimId: claim.id, mode: "live", actorEmail: "spoof@evil.example" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(discovered.status, 201);
    const payload = await discovered.json();
    assert.equal(payload.run.liveRetrieval, true);
    assert.equal(payload.run.providerKind, "live");
    assert.equal(payload.run.actorEmail, "admin@example.com");
    const row = db.database.prepare("SELECT actor_email AS email, live_retrieval AS live FROM social_research_runs WHERE id = ?").get(payload.run.id);
    assert.equal(row.email, "admin@example.com");
    assert.equal(Number(row.live), 1);
    assert.ok(fetched.some((url) => url.startsWith(SEARCH)));
    assert.ok(fetched.some((url) => url.startsWith(independent)));
    assert.ok(!fetched.some((url) => url.includes("spoof") || url.includes("evil")));
  });
});

test("unsafe result URLs are rejected without retrieval", async () => {
  const cases = [
    { url: "http://www.harbor-industrial.example/application-notes/headroom", title: "non-HTTPS" },
    { url: "https://localhost/secret", title: "localhost" },
    { url: "https://127.0.0.1/secret", title: "loopback" },
    { url: "https://192.168.1.9/manual", title: "private IPv4" },
    { url: "https://user:pass@www.harbor-industrial.example/application-notes/headroom", title: "credentials" },
  ];
  const search = {
    async search() {
      return cases;
    },
  };
  const fetched = [];
  const fetchImpl = async (url) => {
    fetched.push(url);
    throw new Error(`unsafe URL was fetched: ${url}`);
  };
  const provider = createLiveCandidateProvider({ search, fetchImpl });
  const hits = await provider.search({
    query: CLAIM_TEXT,
    maximumHits: RESEARCH_LIMITS.maximumCandidates,
    startedAtMs: Date.now(),
    maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
  });
  assert.equal(hits.length, cases.length);
  assert.ok(hits.every((hit) => hit.retrievalStatus === "blocked"));
  assert.ok(hits.every((hit) => hit.retrievedText === ""));
  assert.equal(fetched.length, 0);
});

test("redirect abuse, oversized documents, and timeouts fail closed", async () => {
  const redirectUrl = "https://www.harbor-industrial.example/application-notes/redirect";
  const oversizedUrl = "https://www.harbor-industrial.example/application-notes/oversized";
  const timeoutUrl = "https://www.harbor-industrial.example/application-notes/timeout";
  enableLiveEnv();
  try {
    const redirectNet = createTrackedFetch({
      results: [{ url: redirectUrl, title: "Harbor Industrial redirect" }],
      documents: {
        [redirectUrl]: documentResponse({
          status: 302,
          body: "",
          headers: { location: "https://127.0.0.1/stolen", "content-type": "text/html" },
        }),
      },
    });
    const redirectHits = await createLiveCandidateProvider({ fetchImpl: redirectNet.fetchImpl }).search({
      query: CLAIM_TEXT,
      maximumHits: 1,
      startedAtMs: Date.now(),
      maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
    });
    assert.equal(redirectHits[0]?.retrievalStatus, "blocked");
    assert.equal(redirectHits[0]?.retrievedText, "");
    assert.ok(!redirectNet.fetched.some((url) => url.includes("127.0.0.1") || url.includes("stolen")));

    const oversizedNet = createTrackedFetch({
      results: [{ url: oversizedUrl, title: "Harbor Industrial oversized" }],
      documents: {
        [oversizedUrl]: documentResponse({
          body: "a".repeat(RESEARCH_LIMITS.maximumSourceBytes + 24),
          headers: { "content-type": "text/html" },
        }),
      },
    });
    const oversizedHits = await createLiveCandidateProvider({ fetchImpl: oversizedNet.fetchImpl }).search({
      query: CLAIM_TEXT,
      maximumHits: 1,
      startedAtMs: Date.now(),
      maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
    });
    assert.equal(oversizedHits[0]?.retrievalStatus, "oversized");
    assert.equal(oversizedHits[0]?.retrievedText, "");

    const timeoutNet = createTrackedFetch({
      results: [{ url: timeoutUrl, title: "Harbor Industrial timeout" }],
      hangUrls: [timeoutUrl],
      documents: {},
    });
    const timeoutHits = await createLiveCandidateProvider({ fetchImpl: timeoutNet.fetchImpl }).search({
      query: CLAIM_TEXT,
      maximumHits: 1,
      startedAtMs: Date.now(),
      maximumRuntimeMs: 80,
    });
    assert.equal(timeoutHits[0]?.retrievalStatus, "timeout");
    assert.equal(timeoutHits[0]?.retrievedText, "");
    assert.ok(!timeoutHits[0]?.excerptLocator);
  } finally {
    clearLiveEnv();
  }
});

test("max query and candidate bounds fail closed and HTML links are not crawled", async () => {
  const extraQuery = "extra unused live query that must not run";
  const queries = [];
  const documents = {};
  const results = Array.from({ length: 8 }, (_, index) => {
    const url = `https://www.publisher-${index}.example/application-notes/headroom`;
    documents[url] = documentResponse({ body: technicalHtml(`Publisher ${index}`) });
    return { url, title: `Publisher ${index} technical bulletin` };
  });
  const { fetched, fetchImpl } = createTrackedFetch({
    search(query) {
      queries.push(query);
      return results;
    },
    documents,
  });
  const provider = createLiveCandidateProvider({ fetchImpl });
  const executable = planFor();
  executable.queries.push(extraQuery);
  executable.maximumQueries = 9;
  executable.maximumCandidateDocuments = 40;
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: executable,
      claim: broadClaim,
      attached: [],
      provider,
    });
    assert.ok(result.queriesExecuted.length <= RESEARCH_LIMITS.maximumQueries);
    assert.ok(result.candidates.length <= RESEARCH_LIMITS.maximumCandidates);
    assert.ok(!result.queriesExecuted.includes(extraQuery));
    assert.ok(queries.length <= RESEARCH_LIMITS.maximumQueries);
    const documentFetches = fetched.filter((url) => !url.startsWith(SEARCH));
    assert.ok(documentFetches.length <= RESEARCH_LIMITS.maximumCandidates);
    assert.ok(!fetched.some((url) => url.startsWith(CRAWL_URL) || url.startsWith(JS_URL)));
  } finally {
    clearLiveEnv();
  }
});

test("same-publisher live hits do not satisfy independence; an independent manufacturer does", async () => {
  const riverA = "https://www.riverline-power.example/application-notes/headroom";
  const riverB = "https://www.riverline-power.example/technical/transfer-notes";
  const harbor = "https://www.harbor-industrial.example/application-notes/headroom";
  const { fetchImpl } = createTrackedFetch({
    results: [
      { url: riverA, title: "Riverline Power technical bulletin" },
      { url: riverB, title: "Riverline Power transfer notes" },
      { url: harbor, title: "Harbor Industrial Power application note" },
    ],
    documents: {
      [riverA]: documentResponse({ body: technicalHtml("Riverline Power") }),
      [riverB]: documentResponse({ body: technicalHtml("Riverline Power", "This second Riverline page is the same manufacturer.") }),
      [harbor]: documentResponse({ body: technicalHtml("Harbor Industrial Power") }),
    },
  });
  const provider = createLiveCandidateProvider({ fetchImpl });
  const existing = attachedManufacturer("Riverline Power", "https://www.riverline-power.example/technical/operating-headroom");
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [existing],
      provider,
    });
    const riverline = result.candidates.filter((item) => item.publisher === "Riverline Power");
    const independent = result.candidates.find((item) => item.canonicalUrl.startsWith("https://www.harbor-industrial.example"));
    assert.ok(riverline.length >= 1);
    assert.ok(riverline.every((item) => !item.proposedForReview));
    assert.equal(independent?.proposedForReview, true);
    assert.equal(independent?.relationship, "supports");
    const preview = wouldSatisfyPolicyIfAccepted({
      claim: broadClaim,
      attached: [existing],
      proposed: result.candidates.filter((item) => item.proposedForReview),
    });
    assert.equal(preview.state, "supported");
    assert.match(result.stopReason, /would satisfy Evidence Intelligence policy/);
  } finally {
    clearLiveEnv();
  }
});

test("contradictory credible live candidate is surfaced and blocks false sufficiency", async () => {
  const harbor = "https://www.harbor-industrial.example/application-notes/headroom";
  const contradiction = "https://www.coastal-power.example/application-notes/headroom-limits";
  const { fetchImpl } = createTrackedFetch({
    results: [
      { url: harbor, title: "Harbor Industrial Power application note" },
      { url: contradiction, title: "Coastal Power safety bulletin" },
    ],
    documents: {
      [harbor]: documentResponse({ body: technicalHtml("Harbor Industrial Power") }),
      [contradiction]: documentResponse({ body: contradictionHtml("Coastal Power") }),
    },
  });
  const provider = createLiveCandidateProvider({ fetchImpl });
  const existing = attachedManufacturer("Riverline Power", "https://www.riverline-power.example/technical/operating-headroom");
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [existing],
      provider,
    });
    const opposed = result.candidates.find((item) => item.relationship === "contradicts");
    assert.ok(opposed);
    assert.equal(opposed.proposedForReview, false);
    assert.equal(opposed.authorityAdequate, true);
    const withContradiction = wouldSatisfyPolicyIfAccepted({
      claim: broadClaim,
      attached: [existing],
      proposed: result.candidates.filter((item) => item.proposedForReview || item.relationship === "contradicts"),
    });
    assert.equal(withContradiction.state, "conflicted");
    assert.doesNotMatch(result.stopReason, /would satisfy Evidence Intelligence policy/);
  } finally {
    clearLiveEnv();
  }
});

test("live excerpts are substrings of retrieved text; unextractable documents cannot quote", async () => {
  const htmlUrl = "https://www.harbor-industrial.example/application-notes/headroom";
  const pdfUrl = "https://www.harbor-industrial.example/application-notes/headroom.pdf";
  const garbledUrl = "https://www.harbor-industrial.example/application-notes/garbled";
  const html = technicalHtml("Harbor Industrial Power");
  const { fetchImpl } = createTrackedFetch({
    results: [
      { url: htmlUrl, title: "Harbor Industrial Power application note" },
      { url: pdfUrl, title: "Harbor Industrial Power PDF" },
      { url: garbledUrl, title: "Harbor Industrial Power garbled" },
    ],
    documents: {
      [htmlUrl]: documentResponse({ body: html }),
      [pdfUrl]: documentResponse({
        body: `%PDF-1.4 ${CLAIM_TEXT} recommended operating headroom should be evidenced under these conditions.`,
        headers: { "content-type": "application/pdf" },
      }),
      [garbledUrl]: documentResponse({
        body: `${"\u0001\u0002\u0003\u0004".repeat(80)} ${CLAIM_TEXT}`,
        headers: { "content-type": "text/html" },
      }),
    },
  });
  const provider = createLiveCandidateProvider({ fetchImpl });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [],
      provider,
    });
    const htmlHit = result.candidates.find((item) => item.canonicalUrl === htmlUrl);
    const pdfHit = result.candidates.find((item) => item.canonicalUrl === pdfUrl);
    const garbledHit = result.candidates.find((item) => item.canonicalUrl === garbledUrl);
    assert.ok(htmlHit?.excerpts[0]?.text);
    const readable = extractReadableContent({ mimeType: "text/html", text: html }).text;
    assert.equal(readable.includes(htmlHit.excerpts[0].text), true);
    assert.doesNotMatch(htmlHit.excerpts[0].text, /<[a-z]/i);
    assert.equal(pdfHit?.retrievalStatus, "unextractable");
    assert.equal(pdfHit?.excerpts.length, 0);
    assert.equal(garbledHit?.retrievalStatus, "unextractable");
    assert.equal(garbledHit?.excerpts.length, 0);
  } finally {
    clearLiveEnv();
  }
});

test("commercial economics cannot alter live candidate ranking", () => {
  const weak = {
    canonicalUrl: "https://www.peakload-deals.example/buy-bigger-generators",
    title: "Affiliate",
    publisher: "PeakLoad Deals",
    sourceClass: "affiliate_page",
    provenance: "live_fetch",
    independenceCluster: "publisher:peakload deals",
    excerpts: [],
    relationship: "irrelevant",
    scopeLimitations: "Lead only.",
    authorityClass: "lead_only",
    authorityAdequate: false,
    freshness: "current",
    rankScore: 0,
    reasonSelected: null,
    reasonExcluded: "insufficient",
    proposedForReview: false,
    query: "q",
    retrievedChecksum: "x",
    publishedDate: "2025-01-08",
    retrievalStatus: "ok",
  };
  const strong = {
    ...weak,
    canonicalUrl: "https://www.harbor-industrial.example/application-notes/headroom",
    publisher: "Harbor Industrial Power",
    sourceClass: "manufacturer_documentation",
    authorityClass: "manufacturer_technical",
    authorityAdequate: true,
    relationship: "supports",
    independenceCluster: "publisher:harbor industrial power",
  };
  assert.throws(() => rankCandidateAssessments({
    candidates: [weak, strong],
    existingClusters: [],
    economics: { commission: 12, epc: 3, payout: 9 },
  }), /commercial economics/);
  const ranked = rankCandidateAssessments({ candidates: [weak, strong], existingClusters: [] });
  assert.equal(ranked[0].publisher, "Harbor Industrial Power");
});

test("research stops after hypothetical sufficiency and does not search further", async () => {
  const first = "https://www.harbor-industrial.example/application-notes/headroom";
  const second = "https://www.coastal-power.example/application-notes/headroom";
  const later = "https://www.should-not-reach.example/application-notes/headroom";
  const queries = [];
  const { fetched, fetchImpl } = createTrackedFetch({
    search(query) {
      queries.push(query);
      if (queries.length === 1) {
        return [
          { url: first, title: "Harbor Industrial Power application note" },
          { url: second, title: "Coastal Power technical bulletin" },
        ];
      }
      return [{ url: later, title: "Should not retrieve" }];
    },
    documents: {
      [first]: documentResponse({ body: technicalHtml("Harbor Industrial Power") }),
      [second]: documentResponse({ body: technicalHtml("Coastal Power") }),
      [later]: documentResponse({ body: technicalHtml("Should Not Reach") }),
    },
  });
  const provider = createLiveCandidateProvider({ fetchImpl });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [],
      provider,
    });
    assert.equal(result.queriesExecuted.length, 1);
    assert.equal(queries.length, 1);
    assert.match(result.stopReason, /would satisfy Evidence Intelligence policy/);
    assert.ok(!fetched.some((url) => url.startsWith(later)));
    const proposed = result.candidates.filter((item) => item.proposedForReview);
    assert.equal(proposed.length, 2);
  } finally {
    clearLiveEnv();
  }
});

test("live adapter never accepts corpus evidence, publishes, or hard-codes generator brands", async () => {
  const files = [
    "app/lib/research/live-candidate-provider.ts",
    "app/lib/research/live-search-client.ts",
    "app/lib/research/brave-search-client.ts",
    "app/growth/social/candidate-discovery-capability.ts",
    "app/growth/social/candidate-discovery.ts",
    "db/social-research-repository.ts",
    "app/api/growth/packages/[id]/research-runs/route.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /reviewCorpusDocument/);
    assert.doesNotMatch(source, /publishSocialPackage|schedulePost|oauth/i);
    assert.doesNotMatch(source, /Generac|Cummins|Caterpillar/);
    assert.doesNotMatch(source, /LIVE_RESEARCH_ENABLED\s*=\s*true/);
    assert.doesNotMatch(source, /LIVE_CANDIDATE_DISCOVERY_AVAILABLE\s*=\s*true/);
  }
  const liveProvider = await readFile(new URL("../app/lib/research/live-candidate-provider.ts", import.meta.url), "utf8");
  assert.doesNotMatch(liveProvider, /reviewCorpusDocument/);
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  const emptyCopy = await readFile(new URL("../app/lib/research/live-retrieval-diagnostics.ts", import.meta.url), "utf8");
  assert.match(ui, /Discovery: \{discoveryMode\}/);
  assert.match(ui, /live unavailable/);
  assert.match(ui, /Live run/);
  assert.match(ui, /Stop recorded/);
  assert.match(ui, /describeLiveEmptyReason/);
  assert.match(emptyCopy, /The live search provider returned no results for these queries/);
  assert.match(emptyCopy, /Provider results were rejected by URL safety policy/);
  assert.match(emptyCopy, /document retrieval failed/);
  assert.match(emptyCopy, /could not be extracted/);
  assert.match(emptyCopy, /8-second research deadline/);
  assert.doesNotMatch(ui, /This is a live web search/);
});

test("query planner compacts claim concepts instead of quoting the full claim", () => {
  const generatorClaim = "A portable generator must be sized for both the running load and the starting/surge watts of connected motors.";
  const queries = buildBoundedResearchQueries({
    claimOrQuestion: generatorClaim,
    policyClass: "broad_technical",
  });
  const terms = compactResearchQueryTerms(generatorClaim);
  assert.equal(RESEARCH_LIMITS.maximumQueries, 3);
  assert.equal(RESEARCH_LIMITS.maximumCandidates, 5);
  assert.equal(RESEARCH_LIMITS.maximumRuntimeMs, 8_000);
  assert.equal(LIVE_DOCUMENT_FETCH_CONCURRENCY, 2);
  assert.equal(queries.length, 3);
  assert.ok(terms.includes("generator"));
  assert.ok(terms.includes("running"));
  assert.ok(terms.includes("starting"));
  assert.ok(terms.includes("watts"));
  assert.ok(!terms.includes("must"));
  assert.ok(queries.every((query) => query.startsWith(terms)));
  assert.ok(queries.every((query) => !query.includes(`"${generatorClaim.slice(0, 24)}`)));
  assert.ok(queries.every((query) => !query.startsWith("\"")));
  assert.ok(queries.some((query) => query.includes("manufacturer technical documentation")));
  assert.ok(queries.some((query) => query.includes("manufacturer manual")));
  assert.ok(queries.some((query) => query.includes("site:.gov")));
  const cooktopClaim = "An induction cooktop residual heat warning should cite the manufacturer manual, not a blog recap.";
  const cooktopQueries = buildBoundedResearchQueries({
    claimOrQuestion: cooktopClaim,
    policyClass: "broad_technical",
  });
  assert.equal(cooktopQueries.length, 3);
  assert.ok(cooktopQueries[0].includes("induction"));
  assert.ok(cooktopQueries[0].includes("cooktop"));
  assert.ok(!cooktopQueries.join(" ").includes("generator"));
});

test("live search hits are recorded as timeouts instead of disappearing when the runtime bound is spent", async () => {
  const urls = [
    "https://www.alpha-manual.example/docs/a",
    "https://www.beta-manual.example/docs/b",
    "https://www.energy.gov/docs/c",
  ];
  const search = {
    async search() {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return {
        hits: urls.map((url) => ({ url, title: "Technical bulletin" })),
        rawResultCount: urls.length,
      };
    },
  };
  const fetched = [];
  const fetchImpl = async (url) => {
    fetched.push(url);
    await new Promise((resolve) => setTimeout(resolve, 80));
    return documentResponse({ body: technicalHtml("Maker") });
  };
  const account = emptyLiveRetrievalDiagnostics();
  const hits = await createLiveCandidateProvider({ search, fetchImpl }).search({
    query: "generator sizing running load",
    maximumHits: RESEARCH_LIMITS.maximumCandidates,
    startedAtMs: Date.now(),
    maximumRuntimeMs: 25,
    account,
  });
  assert.equal(hits.length, urls.length);
  assert.equal(account.rawResultCount, urls.length);
  assert.equal(account.normalizedHitCount, urls.length);
  assert.ok(hits.every((hit) => hit.retrievalStatus === "timeout" || hit.retrievalStatus === "ok"));
  assert.ok(account.timeoutCount + account.retrievalSuccessCount >= urls.length);
  assert.equal(diagnosticsOmitSecrets(account), true);
});

test("empty live diagnostics distinguish provider-empty from URL policy and runtime skip", async () => {
  const emptySearch = {
    async search() {
      return { hits: [], rawResultCount: 0 };
    },
  };
  const emptyResult = await executeBoundedCandidateDiscovery({
    plan: planFor(),
    claim: broadClaim,
    attached: [],
    provider: createLiveCandidateProvider({
      search: emptySearch,
      fetchImpl: async () => {
        throw new Error("provider-empty runs must not fetch documents");
      },
    }),
  });
  assert.equal(emptyResult.candidates.length, 0);
  assert.equal(emptyResult.diagnostics?.rawResultCount, 0);
  assert.equal(emptyResult.diagnostics?.emptyReason, "provider_empty");
  assert.equal(describeLiveEmptyReason(emptyResult.diagnostics?.emptyReason), "The live search provider returned no results for these queries.");

  const blockedSearch = {
    async search() {
      return {
        hits: [
          { url: "http://www.harbor-industrial.example/manual", title: "non-HTTPS" },
          { url: "https://127.0.0.1/secret", title: "loopback" },
        ],
        rawResultCount: 2,
      };
    },
  };
  const blocked = await createLiveCandidateProvider({
    search: blockedSearch,
    fetchImpl: async (url) => {
      throw new Error(`unsafe URL was fetched: ${url}`);
    },
  }).search({
    query: "headroom",
    maximumHits: 5,
    startedAtMs: Date.now(),
    maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
    account: emptyLiveRetrievalDiagnostics(),
  });
  assert.equal(blocked.length, 2);
  assert.ok(blocked.every((hit) => hit.retrievalStatus === "blocked"));

  const skipped = await executeBoundedCandidateDiscovery({
    plan: planFor(),
    claim: broadClaim,
    attached: [],
    now: new Date(Date.now() - RESEARCH_LIMITS.maximumRuntimeMs - 50),
    provider: createLiveCandidateProvider({
      search: {
        async search() {
          throw new Error("runtime-exhausted runs must not call the provider");
        },
      },
    }),
  });
  assert.equal(skipped.candidates.length, 0);
  assert.equal(skipped.queriesExecuted.length, 0);
  assert.equal(skipped.diagnostics?.emptyReason, "runtime_exhausted");
  assert.match(skipped.stopReason, /Runtime bound/);
});

test("live diagnostics persist without secrets and keep publishing disabled", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  enableLiveEnv();
  const net = createTrackedFetch({
    results: [],
    documents: {},
  });
  try {
    globalThis.__CHEF_GRINGO_LIVE_FETCH__ = net.fetchImpl;
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl: net.fetchImpl }),
    });
    assert.equal(result.diagnostics?.emptyReason, "provider_empty");
    assert.equal(diagnosticsOmitSecrets(result.diagnostics), true);
    assert.doesNotMatch(JSON.stringify(result.diagnostics), /X-Subscription-Token|CHEF_GRINGO_BRAVE_SEARCH_API_KEY/i);
  } finally {
    clearLiveEnv();
  }
});
