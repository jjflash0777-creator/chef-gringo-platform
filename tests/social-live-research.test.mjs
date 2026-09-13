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
  authorityClassFromSourceMetadata,
} from "../app/growth/social/index.ts";
import { classifyLiveSourceType, classifyLiveSourceDetails } from "../app/lib/research/live-candidate-provider.ts";
import { extractHtmlArticleText } from "../app/lib/research/html-extract.ts";
import { looksLikePdf } from "../app/lib/research/pdf-detect.ts";
import { encodeSimplePdf, extractBoundedPdfText } from "../app/lib/research/pdf-extract.ts";
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
  const raw = input.body;
  const bytes = typeof raw === "string" ? new TextEncoder().encode(raw) : raw;
  const headers = input.headers ?? {};
  return {
    status: input.status ?? 200,
    headers: {
      get(name) {
        const key = name.toLowerCase();
        if (key === "content-type") return headers["content-type"] ?? "text/html; charset=utf-8";
        if (key === "location") return headers.location ?? null;
        if (key === "content-length") return headers["content-length"] ?? String(bytes.byteLength);
        return headers[key] ?? null;
      },
    },
    text: async () => typeof raw === "string" ? raw : new TextDecoder().decode(bytes),
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
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
          body: "a".repeat(RESEARCH_LIMITS.maximumDownloadBytes + 24),
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
    "app/lib/research/passage-match.ts",
    "app/lib/research/html-extract.ts",
    "app/lib/research/pdf-extract.ts",
    "app/lib/research/publisher-identity.ts",
    "app/growth/social/candidate-discovery-capability.ts",
    "app/growth/social/candidate-discovery.ts",
    "app/growth/social/claim-coverage.ts",
    "db/social-research-repository.ts",
    "app/api/growth/packages/[id]/research-runs/route.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /reviewCorpusDocument/);
    assert.doesNotMatch(source, /publishSocialPackage|schedulePost|oauth/i);
    assert.doesNotMatch(source, /Generac|Cummins|Caterpillar|Siemens/);
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
  assert.match(ui, /Queries executed/);
  assert.match(ui, /URLs attempted/);
  assert.match(ui, /Candidates assessed/);
  assert.match(ui, /PDFs parsed/);
  assert.match(ui, /PDF leads unextractable/);
  assert.match(ui, /Sources selected/);
  assert.match(ui, /Identity: \{candidate\.publisher\}/);
  assert.match(ui, /document author \$\{candidate\.extraction\.documentAuthor\}/);
  assert.match(ui, /basis \{candidate\.extraction\?\.publisherIdentityBasis/);
  assert.match(ui, /Stop recorded/);
  assert.match(ui, /Excerpt\{candidate\.excerpts\[0\]\?\.locator/);
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
  assert.ok(queries.some((query) => query.includes("filetype:pdf")));
  assert.ok(queries.some((query) => query.includes("manual")));
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

function bloatedTechnicalHtml(article) {
  const nav = `<nav>${"Home Products Support Contact ".repeat(500)}</nav>`;
  const script = `<script>${"window.__PAD='".padEnd(180_000, "x")}'</script>`;
  const style = `<style>${".pad{margin:0}".repeat(6_000)}</style>`;
  const footer = `<footer>${"copyright navigation ".repeat(1_500)}</footer>`;
  return `<html><head>${style}${script}</head><body>${nav}<main><article>${article}</article></main>${footer}</body></html>`;
}

test("HTML extraction strips chrome, decodes entities, and keeps a relevant passage", () => {
  const html = bloatedTechnicalHtml(`
    <h1>Capacity notes</h1>
    <p>Size capacity from continuous demand plus compressor inrush during startup. The connected load calculation is documented independently of marketing copy.</p>
    <p>Store hours are unrelated and must not be quoted as evidence.</p>
  `);
  assert.ok(html.length > RESEARCH_LIMITS.maximumSourceBytes);
  const text = extractHtmlArticleText(html);
  assert.doesNotMatch(text, /window\.__PAD|Home Products Support|copyright navigation/i);
  assert.doesNotMatch(text, /<[a-z]/i);
  assert.match(text, /# Capacity notes/);
  assert.match(text, /continuous demand plus compressor inrush/);
  assert.ok(text.length < 2_000);
  const decoded = extractHtmlArticleText("<p>Load &amp; demand stay below 80&nbsp;kVA at 90&deg;F.</p>");
  assert.match(decoded, /Load & demand stay below 80 kVA at 90°F/);
});

test("bloated HTML over 256KB is extracted; genuinely huge downloads stay bounded", async () => {
  const bloatedUrl = "https://www.harbor-industrial.example/application-notes/headroom";
  const hugeUrl = "https://www.coastal-power.example/application-notes/huge";
  const article = "<h1>Harbor Industrial Power application note</h1><p>Harbor Industrial Power application note: recommended operating headroom should be evidenced under these conditions.</p>";
  const bloated = bloatedTechnicalHtml(article);
  assert.ok(bloated.length > RESEARCH_LIMITS.maximumSourceBytes);
  assert.ok(bloated.length < RESEARCH_LIMITS.maximumDownloadBytes);
  enableLiveEnv();
  try {
    const bloatedNet = createTrackedFetch({
      results: [{ url: bloatedUrl, title: "Harbor Industrial Power application note" }],
      documents: {
        [bloatedUrl]: documentResponse({ body: bloated, headers: { "content-type": "text/html" } }),
      },
    });
    const bloatedResult = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl: bloatedNet.fetchImpl }),
    });
    const hit = bloatedResult.candidates.find((item) => item.canonicalUrl === bloatedUrl);
    assert.equal(hit?.retrievalStatus, "ok");
    assert.ok(hit?.extraction?.rawBytes > RESEARCH_LIMITS.maximumSourceBytes);
    assert.ok(hit?.extraction?.extractedChars < RESEARCH_LIMITS.maximumExtractedTextChars);
    assert.equal(hit?.extraction?.extractionMethod, "html_article");
    assert.match(hit?.extraction?.contentType ?? "", /text\/html/);
    assert.ok(hit?.excerpts[0]?.text);
    assert.equal(hit.retrievalStatus === "ok" && bloated.includes("recommended operating headroom"), true);
    const readable = extractHtmlArticleText(bloated);
    assert.equal(readable.includes(hit.excerpts[0].text), true);
    assert.ok(hit.extraction.passageMatchCount >= 1);
    assert.equal(hit.extraction.passageMissReason, null);
    assert.doesNotMatch(JSON.stringify(hit.extraction), /window\.__PAD/);

    const hugeNet = createTrackedFetch({
      results: [{ url: hugeUrl, title: "Coastal Power technical bulletin" }],
      documents: {
        [hugeUrl]: documentResponse({
          body: "a".repeat(RESEARCH_LIMITS.maximumDownloadBytes + 48),
          headers: { "content-type": "text/html" },
        }),
      },
    });
    const hugeHits = await createLiveCandidateProvider({ fetchImpl: hugeNet.fetchImpl }).search({
      query: CLAIM_TEXT,
      maximumHits: 1,
      startedAtMs: Date.now(),
      maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
    });
    assert.equal(hugeHits[0]?.retrievalStatus, "oversized");
    assert.equal(hugeHits[0]?.retrievedText, "");
    assert.ok((hugeHits[0]?.extraction?.rawBytes ?? 0) >= RESEARCH_LIMITS.maximumDownloadBytes);
  } finally {
    clearLiveEnv();
  }
});

test("PDF hits stay visible as unextractable and cannot become ok", async () => {
  const pdfUrl = "https://www.homepower.example/docs/generator-sizing-guide.pdf";
  const labeledPdf = "https://www.harbor-industrial.example/application-notes/headroom.pdf";
  const htmlUrl = "https://www.harbor-industrial.example/application-notes/headroom";
  assert.equal(looksLikePdf({ url: pdfUrl, contentType: "text/html", bytes: "<html>not a parser</html>" }), true);
  const { fetchImpl } = createTrackedFetch({
    results: [
      { url: pdfUrl, title: "Home Power Systems Generator Sizing Guide" },
      { url: labeledPdf, title: "Harbor Industrial Power PDF" },
      { url: htmlUrl, title: "Harbor Industrial Power application note" },
    ],
    documents: {
      [pdfUrl]: documentResponse({
        body: `%PDF-1.4 ${CLAIM_TEXT} recommended operating headroom should be evidenced under these conditions.`,
        headers: { "content-type": "application/octet-stream" },
      }),
      [labeledPdf]: documentResponse({
        body: `%PDF-1.4 ${CLAIM_TEXT}`,
        headers: { "content-type": "text/html" },
      }),
      [htmlUrl]: documentResponse({ body: technicalHtml("Harbor Industrial Power") }),
    },
  });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    const pdfHit = result.candidates.find((item) => item.canonicalUrl === pdfUrl);
    const labeled = result.candidates.find((item) => item.canonicalUrl === labeledPdf);
    const htmlHit = result.candidates.find((item) => item.canonicalUrl === htmlUrl);
    assert.equal(pdfHit?.retrievalStatus, "unextractable");
    assert.equal(pdfHit?.excerpts.length, 0);
    assert.equal(pdfHit?.extraction?.extractionMethod, "pdf_unsupported");
    assert.equal(pdfHit?.extraction?.passageMissReason, "pdf_unsupported");
    assert.equal(labeled?.retrievalStatus, "unextractable");
    assert.equal(labeled?.excerpts.length, 0);
    assert.notEqual(pdfHit?.retrievalStatus, "ok");
    assert.ok(result.candidates.some((item) => item.canonicalUrl === pdfUrl));
    assert.equal(htmlHit?.retrievalStatus, "ok");
    assert.ok(htmlHit?.excerpts[0]?.text);
  } finally {
    clearLiveEnv();
  }
});

test("commercial educational pages are not automatic primary technical documentation", async () => {
  const classified = classifyLiveSourceType({
    hostname: "www.wolverine-power.example",
    url: "https://www.wolverine-power.example/resources/understanding-load-calculations",
    title: "Understanding Load Calculations for Generators",
  });
  assert.equal(classified, "manufacturer_editorial");
  assert.equal(authorityClassFromSourceMetadata({ sourceType: classified }), "editorial");
  assert.notEqual(authorityClassFromSourceMetadata({ sourceType: classified }), "primary_documentation");
  assert.notEqual(authorityClassFromSourceMetadata({ sourceType: classified }), "manufacturer_technical");
  assert.equal(classifyLiveSourceType({
    hostname: "www.harbor-industrial.example",
    url: "https://www.harbor-industrial.example/application-notes/headroom",
    title: "Harbor Industrial Power application note",
  }), "manufacturer_documentation");

  const eduUrl = "https://www.wolverine-power.example/resources/understanding-load-calculations";
  const irrelevantUrl = "https://www.wolverine-power.example/about/hours";
  const { fetchImpl } = createTrackedFetch({
    results: [
      { url: eduUrl, title: "Understanding Load Calculations for Generators" },
      { url: irrelevantUrl, title: "Understanding Our Store Hours" },
    ],
    documents: {
      [eduUrl]: documentResponse({
        body: bloatedTechnicalHtml("<h1>Understanding load calculations</h1><p>Size capacity from continuous demand plus compressor inrush during startup.</p>"),
      }),
      [irrelevantUrl]: documentResponse({
        body: "<html><body><h1>Understanding Our Store Hours</h1><p>The showroom is open Monday through Friday. Weather commentary remains unrelated.</p></body></html>",
      }),
    },
  });
  const claim = {
    id: "sgo:claim:live-load",
    claimText: "Equipment should be sized from running load plus motor starting demand.",
    safetySensitive: false,
    policyClass: "broad_technical",
  };
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(claim.claimText),
      claim,
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    const educational = result.candidates.find((item) => item.canonicalUrl === eduUrl);
    const irrelevant = result.candidates.find((item) => item.canonicalUrl === irrelevantUrl);
    assert.equal(educational?.sourceClass, "manufacturer_editorial");
    assert.equal(educational?.authorityClass, "editorial");
    assert.equal(educational?.authorityAdequate, false);
    assert.equal(educational?.proposedForReview, false);
    assert.notEqual(educational?.authorityClass, "primary_documentation");
    assert.ok(educational?.excerpts[0]?.text);
    assert.match(educational.excerpts[0].text, /continuous demand plus compressor inrush/);
    assert.equal(irrelevant?.relationship, "irrelevant");
    assert.equal(irrelevant?.excerpts.length, 0);
    assert.ok(["no_overlapping_concept", "signals_not_co_located"].includes(irrelevant?.extraction?.passageMissReason));
    assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
    assert.equal(RESEARCH_LIMITS.maximumQueries, 3);
    assert.equal(RESEARCH_LIMITS.maximumCandidates, 5);
    assert.equal(RESEARCH_LIMITS.maximumRuntimeMs, 8_000);
  } finally {
    clearLiveEnv();
  }
});

test("bounded PDF extraction quotes exact page text and fails closed", async () => {
  const source = await readFile(new URL("../app/lib/research/pdf-extract.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /tesseract|ocr\.js|createWorker\(/i);
  assert.doesNotMatch(source, /extractImages|renderPageAsImage/);
  assert.doesNotMatch(source, /from ["']unpdf["'].*extractText|extractText\(/);
  const passage = "Size capacity from continuous demand plus compressor inrush during startup.";
  const bytes = encodeSimplePdf([passage, "This second page is filler."], {
    title: "Application guide",
    author: "Harbor Industrial Power",
  });
  const extracted = await extractBoundedPdfText({
    bytes,
    claimOrQuestion: "Equipment should be sized from running load plus motor starting demand.",
  });
  assert.equal(extracted.ok, true);
  assert.match(extracted.text, /\[page 1\]/);
  assert.equal(extracted.text.includes(passage), true);
  assert.equal(extracted.pagesInspected >= 1, true);
  assert.equal(extracted.metadataAuthor, "Harbor Industrial Power");
  assert.equal(extracted.metadataTitle, "Application guide");
  const toolPdf = encodeSimplePdf([passage], {
    title: "Standby Generator Sizing Guide",
    author: "Layout Composer 9.8.1 (2185.7)",
    creator: "Layout Composer 9.8.1 (2185.7)",
    producer: "Document Rasterizer 2.4.0",
    subject: "Sizing",
  });
  const toolExtracted = await extractBoundedPdfText({ bytes: toolPdf });
  assert.equal(toolExtracted.metadataAuthor, "Layout Composer 9.8.1 (2185.7)");
  assert.equal(toolExtracted.metadataCreator, "Layout Composer 9.8.1 (2185.7)");
  assert.equal(toolExtracted.metadataProducer, "Document Rasterizer 2.4.0");
  assert.equal(toolExtracted.metadataSubject, "Sizing");
  const creatorOnly = encodeSimplePdf([passage], { creator: "Harbor Industrial Power" });
  const creatorExtracted = await extractBoundedPdfText({ bytes: creatorOnly });
  assert.equal(creatorExtracted.metadataAuthor, null);
  assert.equal(creatorExtracted.metadataCreator, "Harbor Industrial Power");
  const malformed = await extractBoundedPdfText({ bytes: new TextEncoder().encode("%PDF-1.4 not a real document") });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.failureReason, "malformed");
  const aborted = new AbortController();
  aborted.abort();
  const timed = await extractBoundedPdfText({ bytes, signal: aborted.signal, timeoutMs: 5 });
  assert.equal(timed.ok, false);
  assert.equal(timed.failureReason, "timeout");
});

test("oversized and timeout PDF leads stay visible without quotations", async () => {
  const oversizedUrl = "https://www.harbor-industrial.example/docs/manual.pdf";
  const timeoutUrl = "https://www.coastal-power.example/docs/manual.pdf";
  const pad = new Uint8Array(RESEARCH_LIMITS.maximumPdfDownloadBytes + 32);
  pad.set(new TextEncoder().encode("%PDF-1.4 "));
  enableLiveEnv();
  try {
    const oversizedNet = createTrackedFetch({
      results: [{ url: oversizedUrl, title: "Harbor Industrial Power installation manual" }],
      documents: {
        [oversizedUrl]: documentResponse({
          body: pad,
          headers: { "content-type": "application/pdf" },
        }),
      },
    });
    const oversized = await createLiveCandidateProvider({ fetchImpl: oversizedNet.fetchImpl }).search({
      query: CLAIM_TEXT,
      maximumHits: 1,
      maximumFetches: 1,
      startedAtMs: Date.now(),
      maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
    });
    assert.equal(oversized[0]?.retrievalStatus, "oversized");
    assert.equal(oversized[0]?.retrievedText, "");
    assert.equal(oversized[0]?.extraction?.pdfDetected, true);

    const timeoutNet = createTrackedFetch({
      results: [{ url: timeoutUrl, title: "Coastal Power application note" }],
      documents: {
        [timeoutUrl]: documentResponse({
          body: encodeSimplePdf([CLAIM_TEXT]),
          headers: { "content-type": "application/pdf" },
        }),
      },
    });
    const timeoutHits = await createLiveCandidateProvider({
      fetchImpl: timeoutNet.fetchImpl,
      async extractPdf() {
        return {
          ok: false,
          text: "",
          totalPages: 1,
          pagesInspected: 0,
          pagesWithMatches: 0,
          extractedChars: 0,
          metadataTitle: null,
          metadataAuthor: null,
          failureReason: "timeout",
        };
      },
    }).search({
      query: CLAIM_TEXT,
      maximumHits: 1,
      maximumFetches: 1,
      startedAtMs: Date.now(),
      maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
    });
    assert.equal(timeoutHits[0]?.retrievalStatus, "timeout");
    assert.equal(timeoutHits[0]?.excerpts?.length ?? 0, 0);
    assert.equal(timeoutHits[0]?.extraction?.parserFailureReason, "timeout");
  } finally {
    clearLiveEnv();
  }
});

test("extractable technical PDFs keep page locators and exact excerpts", async () => {
  const pdfUrl = "https://www.harbor-industrial.example/docs/application-guide.pdf";
  const passage = "Size capacity from continuous demand plus compressor inrush during startup.";
  const pdf = encodeSimplePdf([passage], { title: "Application guide", author: "Harbor Industrial Power" });
  const { fetchImpl } = createTrackedFetch({
    results: [{ url: pdfUrl, title: "Harbor Industrial Power application guide" }],
    documents: {
      [pdfUrl]: documentResponse({ body: pdf, headers: { "content-type": "application/pdf" } }),
    },
  });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor("Equipment should be sized from running load plus motor starting demand."),
      claim: {
        id: "sgo:claim:pdf-load",
        claimText: "Equipment should be sized from running load plus motor starting demand.",
        safetySensitive: false,
        policyClass: "broad_technical",
      },
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    const hit = result.candidates.find((item) => item.canonicalUrl === pdfUrl);
    assert.equal(hit?.retrievalStatus, "ok");
    assert.equal(hit?.extraction?.extractionMethod, "pdf_text");
    assert.equal(hit?.excerpts[0]?.locator, "page:1");
    assert.equal(hit?.retrievedChecksum.startsWith("fnv:"), true);
    assert.ok(hit?.excerpts[0]?.text);
    assert.equal(passage.includes(hit.excerpts[0].text) || hit.excerpts[0].text.includes("continuous demand plus compressor inrush"), true);
    assert.equal(hit.sourceClass, "manufacturer_documentation");
    assert.equal(hit.authorityClass, "manufacturer_technical");
    assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  } finally {
    clearLiveEnv();
  }
});

test("garbage PDF Author does not downgrade an official-domain technical PDF", async () => {
  const pdfUrl = "https://www.harbor-industrial.example/docs/SA_SizingGuide.pdf";
  const passage = "Size capacity from continuous demand plus compressor inrush during startup.";
  const pdf = encodeSimplePdf([passage], { title: "Harbor Industrial Generator Sizing Guide", author: "PxQyRz" });
  const { fetchImpl } = createTrackedFetch({
    results: [{ url: pdfUrl, title: "Harbor Industrial Generator Sizing Guide" }],
    documents: {
      [pdfUrl]: documentResponse({ body: pdf, headers: { "content-type": "application/pdf" } }),
    },
  });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor("Equipment should be sized from running load plus motor starting demand."),
      claim: {
        id: "sgo:claim:pdf-author-trust",
        claimText: "Equipment should be sized from running load plus motor starting demand.",
        safetySensitive: false,
        policyClass: "broad_technical",
      },
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    const hit = result.candidates.find((item) => item.canonicalUrl === pdfUrl);
    assert.equal(hit?.retrievalStatus, "ok");
    assert.equal(hit?.publisher, "Harbor Industrial");
    assert.notEqual(hit?.publisher, "PxQyRz");
    assert.equal(hit?.extraction?.documentAuthor, "PxQyRz");
    assert.equal(hit?.extraction?.authorTrust, "person");
    assert.equal(hit?.extraction?.issuer, "Harbor Industrial");
    assert.equal(hit?.extraction?.publisherConflict, null);
    assert.equal(hit?.sourceClass, "manufacturer_documentation");
    assert.equal(hit?.authorityClass, "manufacturer_technical");
    assert.equal(hit?.relationship, "supports");
    assert.equal(hit?.excerpts[0]?.locator, "page:1");
    assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  } finally {
    clearLiveEnv();
  }
});

test("blocked and unextractable URLs do not consume the assessed-candidate cap", async () => {
  const queries = [];
  const pdfs = Array.from({ length: 5 }, (_, index) => ({
    url: `https://www.blocked-docs-${index}.example/manual.pdf`,
    title: `Unreadable PDF ${index}`,
  }));
  const usable = "https://www.harbor-industrial.example/application-notes/headroom";
  const { fetched, fetchImpl } = createTrackedFetch({
    search(query) {
      queries.push(query);
      if (queries.length === 1) return pdfs;
      return [{ url: usable, title: "Harbor Industrial Power application note" }];
    },
    documents: {
      ...Object.fromEntries(pdfs.map((item) => [item.url, documentResponse({
        body: "%PDF-1.4 not extractable",
        headers: { "content-type": "application/pdf" },
      })])),
      [usable]: documentResponse({ body: technicalHtml("Harbor Industrial Power") }),
    },
  });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    assert.ok(result.queriesExecuted.length >= 2);
    assert.match(result.diagnostics?.queryContinuationReason ?? "", /next bounded query ran/i);
    const assessed = result.candidates.filter((item) => (item.retrievalStatus || "ok") === "ok");
    assert.ok(assessed.length >= 1);
    assert.ok(assessed.length <= RESEARCH_LIMITS.maximumCandidates);
    assert.ok(result.candidates.some((item) => item.retrievalStatus === "unextractable"));
    const documentFetches = fetched.filter((url) => !url.startsWith(SEARCH));
    assert.ok(documentFetches.length <= RESEARCH_LIMITS.maximumUrlAttempts);
    assert.ok(result.diagnostics?.urlAttemptCount <= RESEARCH_LIMITS.maximumUrlAttempts);
  } finally {
    clearLiveEnv();
  }
});

test("URL-attempt and assessed-candidate caps stay enforced", async () => {
  const queries = [];
  const makeResults = (offset) => Array.from({ length: 8 }, (_, index) => ({
    url: `https://www.cap-docs-${offset}-${index}.example/notes.pdf`,
    title: `Cap PDF ${offset}-${index}`,
  }));
  const { fetched, fetchImpl } = createTrackedFetch({
    search(query) {
      queries.push(query);
      return makeResults(queries.length);
    },
    documents: Object.fromEntries(Array.from({ length: 24 }, (_, index) => {
      const url = `https://www.cap-docs-${Math.floor(index / 8) + 1}-${index % 8}.example/notes.pdf`;
      return [url, documentResponse({ body: "%PDF-1.4 unreadable", headers: { "content-type": "application/pdf" } })];
    })),
  });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    const documentFetches = fetched.filter((url) => !url.startsWith(SEARCH));
    assert.ok(documentFetches.length <= RESEARCH_LIMITS.maximumUrlAttempts);
    assert.ok((result.diagnostics?.urlAttemptCount ?? 0) <= RESEARCH_LIMITS.maximumUrlAttempts);
    assert.ok(result.candidates.filter((item) => item.retrievalStatus === "ok").length <= RESEARCH_LIMITS.maximumCandidates);
    assert.ok(result.queriesExecuted.length <= RESEARCH_LIMITS.maximumQueries);
  } finally {
    clearLiveEnv();
  }
});

test("distributor-hosted manufacturer manuals are primary documentation without promoting generic guides", () => {
  const hosted = classifyLiveSourceDetails({
    hostname: "www.dealer-supply.example",
    url: "https://www.dealer-supply.example/files/installation-manual.pdf",
    title: "Installation manual",
    metadataTitle: "Installation manual",
    metadataAuthor: "Harbor Industrial Power",
  });
  assert.equal(hosted.sourceType, "distributor_documentation");
  assert.equal(hosted.publisher, "Harbor Industrial Power");
  assert.equal(authorityClassFromSourceMetadata({ sourceType: hosted.sourceType }), "primary_documentation");
  assert.equal(classifyLiveSourceType({
    hostname: "www.coastal-equipment.example",
    url: "https://www.coastal-equipment.example/blog/sizing-guide",
    title: "Complete generator sizing guide",
  }), "manufacturer_editorial");
  assert.equal(authorityClassFromSourceMetadata({ sourceType: "manufacturer_editorial" }), "editorial");
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("five assessed but insufficient candidates still consume the assessed cap", async () => {
  const queries = [];
  const editorial = Array.from({ length: 5 }, (_, index) => ({
    url: `https://www.retail-notes-${index}.example/blog/sizing-guide`,
    title: "Complete generator sizing guide",
  }));
  const later = "https://www.should-not-reach.example/application-notes/headroom";
  const { fetched, fetchImpl } = createTrackedFetch({
    search(query) {
      queries.push(query);
      if (queries.length === 1) return editorial;
      return [{ url: later, title: "Harbor Industrial Power application note" }];
    },
    documents: {
      ...Object.fromEntries(editorial.map((item) => [item.url, documentResponse({
        body: technicalHtml("Retail Notes", "This complete guide restates recommended operating headroom."),
      })])),
      [later]: documentResponse({ body: technicalHtml("Harbor Industrial Power") }),
    },
  });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor(),
      claim: broadClaim,
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    const assessed = result.candidates.filter((item) => (item.retrievalStatus || "ok") === "ok");
    assert.equal(assessed.length, RESEARCH_LIMITS.maximumCandidates);
    assert.equal(result.queriesExecuted.length, 1);
    assert.ok(!fetched.some((url) => url.startsWith(later)));
    assert.match(result.diagnostics?.queryContinuationReason ?? result.stopReason, /Assessed candidate cap|Candidate bound/i);
    assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  } finally {
    clearLiveEnv();
  }
});

test("cache-subdomain technical PDFs resolve to the registrable manufacturer, not Cache", async () => {
  const pdfUrl = "https://cache.industry.harbor-industrial.example/files/SA_SizingGuide.pdf";
  const passage = "Size capacity from continuous demand plus compressor inrush during startup.";
  const pdf = encodeSimplePdf([passage], { title: "Generator Sizing Guide", author: "Harbor Industrial Power" });
  const { fetchImpl } = createTrackedFetch({
    results: [{ url: pdfUrl, title: "Harbor Industrial Generator Sizing Guide" }],
    documents: {
      [pdfUrl]: documentResponse({ body: pdf, headers: { "content-type": "application/pdf" } }),
    },
  });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor("Equipment should be sized from running load plus motor starting demand."),
      claim: {
        id: "sgo:claim:cache-pdf",
        claimText: "Equipment should be sized from running load plus motor starting demand.",
        safetySensitive: false,
        policyClass: "broad_technical",
      },
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    const hit = result.candidates.find((item) => item.canonicalUrl === pdfUrl);
    assert.equal(hit?.publisher, "Harbor Industrial Power");
    assert.notEqual(hit?.publisher, "Cache");
    assert.equal(hit?.sourceClass, "manufacturer_documentation");
    assert.equal(hit?.authorityClass, "manufacturer_technical");
    assert.equal(hit?.authorityAdequate, true);
    assert.equal(hit?.extraction?.publisherIdentityBasis, "pdf_metadata_author");
    assert.equal(hit?.extraction?.registrableDomain, "harbor-industrial.example");
    assert.equal(hit?.excerpts[0]?.locator, "page:1");
    assert.ok(hit?.excerpts[0]?.text);
    assert.equal(passage.includes(hit.excerpts[0].text) || hit.excerpts[0].text.includes("continuous demand plus compressor inrush"), true);
    assert.equal(hit.retrievedChecksum.startsWith("fnv:"), true);
    assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  } finally {
    clearLiveEnv();
  }
});

test("distributor-hosted technical PDF with software Author keeps the passage but does not advance independence", async () => {
  const pdfUrl = "https://www.dealer-supply.example/files/SA_SizingGuide.pdf";
  const passage = "Size capacity from continuous demand plus compressor inrush during startup.";
  const pdf = encodeSimplePdf([passage], {
    title: "Standby Generator Sizing Guide",
    author: "Layout Composer 9.8.1 (2185.7)",
    creator: "Layout Composer 9.8.1 (2185.7)",
    producer: "Document Rasterizer 2.4.0",
  });
  const { fetchImpl } = createTrackedFetch({
    results: [{ url: pdfUrl, title: "Standby Generator Sizing Guide" }],
    documents: {
      [pdfUrl]: documentResponse({ body: pdf, headers: { "content-type": "application/pdf" } }),
    },
  });
  enableLiveEnv();
  try {
    const result = await executeBoundedCandidateDiscovery({
      plan: planFor("Equipment should be sized from running load plus motor starting demand."),
      claim: {
        id: "sgo:claim:software-author",
        claimText: "Equipment should be sized from running load plus motor starting demand.",
        safetySensitive: false,
        policyClass: "broad_technical",
      },
      attached: [],
      provider: createLiveCandidateProvider({ fetchImpl }),
    });
    const hit = result.candidates.find((item) => item.canonicalUrl === pdfUrl);
    assert.equal(hit?.retrievalStatus, "ok");
    assert.equal(hit?.extraction?.extractionMethod, "pdf_text");
    assert.equal(hit?.extraction?.documentAuthor, "Layout Composer 9.8.1 (2185.7)");
    assert.equal(hit?.extraction?.documentCreator, "Layout Composer 9.8.1 (2185.7)");
    assert.equal(hit?.extraction?.documentProducer, "Document Rasterizer 2.4.0");
    assert.equal(hit?.extraction?.authorTrust, "tool");
    assert.equal(hit?.extraction?.issuer, null);
    assert.notEqual(hit?.publisher, "Layout Composer 9.8.1 (2185.7)");
    assert.notEqual(hit?.sourceClass, "manufacturer_documentation");
    assert.notEqual(hit?.sourceClass, "distributor_documentation");
    assert.equal(hit?.authorityAdequate, false);
    assert.notEqual(hit?.policyAdvancement, "advances_independence");
    assert.equal(hit?.excerpts[0]?.locator, "page:1");
    assert.ok(hit?.excerpts[0]?.text);
    assert.ok(passage.includes(hit.excerpts[0].text) || hit.excerpts[0].text.includes("continuous demand plus compressor inrush"));
    assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  } finally {
    clearLiveEnv();
  }
});
