import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LIVE_RESEARCH_ENABLED } from "../app/lib/research/capability.ts";
import { LIVE_SEARCH_PROVIDER, RESEARCH_LIMITS } from "../app/lib/research/limits.ts";
import { fixtureRetrievedTextForUrl } from "../app/lib/research/fixture-candidate-provider.ts";
import {
  LIVE_CANDIDATE_DISCOVERY_AVAILABLE,
  SOCIAL_PUBLISH_AVAILABLE,
  buildExecutableResearchPlan,
  classifyCandidateRelationship,
  executeBoundedCandidateDiscovery,
  extractTraceableExcerpt,
  rankCandidateAssessments,
  wouldSatisfyPolicyIfAccepted,
} from "../app/growth/social/index.ts";
import { publishSocialPackage } from "../db/social-growth-repository.ts";
import { ingestCorpusSource } from "../app/lib/research/ingest.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const opportunityRoute = await import("../app/api/growth/opportunities/route.ts");
const packageRoute = await import("../app/api/growth/packages/route.ts");
const claimRoute = await import("../app/api/growth/packages/[id]/claims/route.ts");
const planRoute = await import("../app/api/growth/packages/[id]/research-plans/route.ts");
const discoverRoute = await import("../app/api/growth/packages/[id]/research-runs/route.ts");
const submitRoute = await import("../app/api/growth/research-runs/[id]/submit/route.ts");
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
    body: { action: "accept", verificationNotes: "Accepted for discovery tests.", claimScope: ["growth_evidence_candidate"] },
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
      claimText: "Recommended operating headroom should be evidenced under these conditions.",
      safetySensitive: false,
      evidence: { kind: "corpus_document", id: existing },
    },
  }), { params: Promise.resolve({ id: pkg.id }) });
  assert.equal(created.status, 201);
  return { opportunity, pkg, claim: (await created.json()).claim, existing };
}

const broadClaim = {
  id: "sgo:claim:headroom",
  claimText: "Recommended operating headroom should be evidenced under these conditions.",
  safetySensitive: false,
  policyClass: "broad_technical",
};

test("broad technical gap generates a two-independent-source executable plan", () => {
  const plan = buildExecutableResearchPlan({
    claimOrQuestion: broadClaim.claimText,
    policyClass: "broad_technical",
    reason: "Independent corroboration is required.",
  });
  assert.equal(plan.claimClass, "broad_technical");
  assert.equal(plan.riskClass, "elevated");
  assert.equal(plan.independentSourcesDesired, 2);
  assert.equal(plan.maximumQueries, RESEARCH_LIMITS.maximumQueries);
  assert.equal(plan.maximumCandidateDocuments, RESEARCH_LIMITS.maximumCandidates);
  assert.ok(plan.queries.length <= RESEARCH_LIMITS.maximumQueries);
  assert.ok(plan.queries.length >= 1);
  assert.ok(plan.disallowedSourceClasses.includes("affiliate_page"));
  assert.match(plan.stopCondition, /two independent/i);
});

test("safety-sensitive plan requires stronger authority than manufacturer material", () => {
  const plan = buildExecutableResearchPlan({
    claimOrQuestion: "Portable generators must be placed outdoors because of carbon monoxide.",
    policyClass: "safety_sensitive",
    reason: "Safety-sensitive claims require a stronger authority class.",
  });
  assert.equal(plan.riskClass, "safety_sensitive");
  assert.equal(plan.requiredAuthorityClass, "especially_authoritative");
  assert.deepEqual([...plan.preferredSourceClasses], ["government_regulatory", "code_standard"]);
  assert.ok(plan.queries.some((query) => query.includes("site:.gov")));
});

test("bounded query and candidate limits are enforced", async () => {
  const queries = [];
  const provider = {
    id: "limit-fixture",
    kind: "fixture",
    async search(request) {
      queries.push(request.query);
      assert.ok(request.maximumHits <= RESEARCH_LIMITS.maximumCandidates);
      return Array.from({ length: request.maximumHits }, (_, index) => ({
        canonicalUrl: `https://www.osha.gov/publications/limit-${queries.length}-${index}`,
        title: `Limit hit ${queries.length}-${index}`,
        publisher: `Publisher ${queries.length}-${index}`,
        sourceType: "manufacturer_documentation",
        publishedDate: "2024-01-01",
        retrievedText: "Recommended operating headroom should be evidenced under these conditions by this manufacturer.",
        provenanceMethod: "test_fixture",
        query: request.query,
      }));
    },
  };
  const plan = buildExecutableResearchPlan({
    claimOrQuestion: broadClaim.claimText,
    policyClass: "broad_technical",
    reason: "Need independent corroboration.",
  });
  plan.queries.push("extra unused query that must not run");
  const result = await executeBoundedCandidateDiscovery({ plan, claim: broadClaim, attached: [], provider });
  assert.ok(result.queriesExecuted.length <= RESEARCH_LIMITS.maximumQueries);
  assert.ok(result.candidates.length <= RESEARCH_LIMITS.maximumCandidates);
  assert.equal(queries.length, result.queriesExecuted.length);
  assert.ok(!result.queriesExecuted.includes("extra unused query that must not run"));
});

test("same publisher does not satisfy independence; independent manufacturer does; affiliate ranks below", async () => {
  const existing = {
    ref: { kind: "corpus_document", id: "corpus:northwind-existing" },
    exists: true,
    publisher: "Northwind Power Systems",
    title: "Existing Northwind bulletin",
    canonicalUrl: "https://www.osha.gov/publications/northwind-existing",
    sourceType: "manufacturer_documentation",
    provenanceMethod: "founder_uploaded_document",
    ingestionStatus: "accepted",
    validationStatus: "claim_supporting",
    underlyingDocumentId: "corpus:northwind-existing",
  };
  const plan = buildExecutableResearchPlan({
    claimOrQuestion: broadClaim.claimText,
    policyClass: "broad_technical",
    reason: "Need a second independent manufacturer.",
  });
  const result = await executeBoundedCandidateDiscovery({ plan, claim: broadClaim, attached: [existing] });
  const northwind = result.candidates.filter((item) => item.publisher === "Northwind Power Systems");
  const harbor = result.candidates.find((item) => item.publisher === "Harbor Industrial Power" && item.relationship === "supports");
  const affiliate = result.candidates.find((item) => item.sourceClass === "affiliate_page");
  const contradiction = result.candidates.find((item) => item.relationship === "contradicts");
  assert.ok(northwind.length >= 1);
  assert.ok(northwind.every((item) => !item.proposedForReview));
  assert.equal(harbor?.proposedForReview, true);
  assert.equal(affiliate?.authorityAdequate, false);
  assert.ok((affiliate?.rankScore ?? 0) < (harbor?.rankScore ?? 0));
  assert.ok(contradiction);
  assert.equal(contradiction.proposedForReview, false);
  assert.match(result.stopReason, /would satisfy Evidence Intelligence policy/);
  const preview = wouldSatisfyPolicyIfAccepted({
    claim: broadClaim,
    attached: [existing],
    proposed: result.candidates.filter((item) => item.proposedForReview),
  });
  assert.equal(preview.state, "supported");
  assert.equal(preview.independentSourceCount, 2);
});

test("candidate excerpt is traceable to retrieved content and is not fabricated", () => {
  const url = "https://www.harbor-industrial.example/application-notes/headroom";
  const retrieved = fixtureRetrievedTextForUrl(url);
  assert.ok(retrieved);
  const excerpt = extractTraceableExcerpt(retrieved, broadClaim.claimText);
  assert.ok(excerpt);
  assert.equal(retrieved.slice(excerpt.start, excerpt.end), excerpt.text);
  assert.equal(retrieved.includes(excerpt.text), true);
  assert.equal(classifyCandidateRelationship(retrieved, broadClaim.claimText), "supports");
  assert.equal(extractTraceableExcerpt("Unrelated weather commentary.", broadClaim.claimText), null);
});

test("commercial economics cannot influence ranking", () => {
  const weak = {
    canonicalUrl: "https://www.peakload-deals.example/buy-bigger-generators",
    title: "Affiliate",
    publisher: "PeakLoad Deals",
    sourceClass: "affiliate_page",
    provenance: "test_fixture",
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
  };
  const strong = { ...weak, canonicalUrl: "https://www.harbor-industrial.example/application-notes/headroom", publisher: "Harbor Industrial Power", sourceClass: "manufacturer_documentation", authorityClass: "manufacturer_technical", authorityAdequate: true, relationship: "supports", independenceCluster: "publisher:harbor industrial power" };
  assert.throws(() => rankCandidateAssessments({
    candidates: [weak, strong],
    existingClusters: [],
    economics: { commission: 12, epc: 3, payout: 9 },
  }), /commercial economics/);
  const ranked = rankCandidateAssessments({ candidates: [weak, strong], existingClusters: [] });
  assert.equal(ranked[0].publisher, "Harbor Industrial Power");
});

test("discovered candidates are not accepted evidence and enter awaiting-review on submit", async () => {
  await withAdmin(async () => {
    const { pkg, claim } = await seedHeadroomPackage(globalThis.__CHEF_GRINGO_ENV__.DB, "discover-headroom");
    const unauthenticated = await discoverRoute.POST(request(`/api/growth/packages/${pkg.id}/research-runs`, {
      method: "POST", body: { slug: "nope", claimId: claim.id },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(unauthenticated.status, 401);
    const forbidden = await discoverRoute.POST(request(`/api/growth/packages/${pkg.id}/research-runs`, {
      email: "viewer@example.com", method: "POST", body: { slug: "nope", claimId: claim.id },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(forbidden.status, 403);
    const plans = await planRoute.GET(request(`/api/growth/packages/${pkg.id}/research-plans`, {
      email: "admin@example.com",
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(plans.status, 200);
    const planBody = await plans.json();
    assert.equal(planBody.liveDiscoveryAvailable, false);
    assert.equal(planBody.plans[0].plan.independentSourcesDesired, 2);
    const discovered = await discoverRoute.POST(request(`/api/growth/packages/${pkg.id}/research-runs`, {
      email: "admin@example.com", method: "POST",
      body: { slug: "headroom-run", claimId: claim.id },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(discovered.status, 201);
    const run = (await discovered.json()).run;
    assert.equal(run.liveRetrieval, false);
    assert.equal(run.providerKind, "fixture");
    const proposed = run.candidates.filter((item) => item.proposedForReview);
    assert.ok(proposed.some((item) => item.publisher === "Harbor Industrial Power"));
    assert.ok(run.candidates.some((item) => item.relationship === "contradicts"));
    assert.ok(run.candidates.every((item) => item.submittedDocumentId === null));
    const submitted = await submitRoute.POST(request(`/api/growth/research-runs/${run.id}/submit`, {
      email: "admin@example.com", method: "POST",
      body: { candidateIds: proposed.map((item) => item.id) },
    }), { params: Promise.resolve({ id: run.id }) });
    assert.equal(submitted.status, 201);
    const payload = await submitted.json();
    assert.ok(payload.submitted.length >= 1);
    for (const item of payload.submitted) {
      assert.notEqual(item.ingestionStatus, "accepted");
      assert.equal(item.ingestionStatus, "awaiting_review");
      const row = globalThis.__CHEF_GRINGO_ENV__.DB.database.prepare("SELECT ingestion_status AS status, production_exposure AS exposed FROM corpus_documents WHERE id = ?").get(item.documentId);
      assert.equal(row.status, "awaiting_review");
      assert.equal(Boolean(row.exposed), false);
    }
    const acceptFromDiscovery = await submitRoute.POST(request(`/api/growth/research-runs/${run.id}/submit`, {
      email: "admin@example.com", method: "POST",
      body: { candidateIds: proposed.map((item) => item.id), action: "accept" },
    }), { params: Promise.resolve({ id: run.id }) });
    assert.equal(acceptFromDiscovery.status, 201);
    const still = globalThis.__CHEF_GRINGO_ENV__.DB.database.prepare("SELECT ingestion_status AS status FROM corpus_documents WHERE id = ?").get(payload.submitted[0].documentId);
    assert.equal(still.status, "awaiting_review");
  });
});

test("AI discovery cannot invoke corpus review acceptance or social publishing", async () => {
  assert.equal(LIVE_RESEARCH_ENABLED, false);
  assert.equal(LIVE_CANDIDATE_DISCOVERY_AVAILABLE, false);
  assert.equal(LIVE_SEARCH_PROVIDER, null);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.throws(() => publishSocialPackage(), /cannot publish/);
  const files = [
    "app/growth/social/research-planner.ts",
    "app/growth/social/candidate-discovery.ts",
    "app/growth/social/candidate-discovery-capability.ts",
    "app/lib/research/candidate-discovery-provider.ts",
    "app/lib/research/fixture-candidate-provider.ts",
    "db/social-research-repository.ts",
    "app/api/growth/packages/[id]/research-plans/route.ts",
    "app/api/growth/packages/[id]/research-runs/route.ts",
    "app/api/growth/research-runs/[id]/submit/route.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /LIVE_RESEARCH_ENABLED\s*=\s*true/);
    assert.doesNotMatch(source, /LIVE_CANDIDATE_DISCOVERY_AVAILABLE\s*=\s*true/);
    assert.doesNotMatch(source, /reviewCorpusDocument/);
    assert.doesNotMatch(source, /action:\s*"accept"/);
    assert.doesNotMatch(source, /publishSocialPackage|schedulePost|oauth/i);
    assert.doesNotMatch(source, /Generac|Cummins|Caterpillar/);
  }
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /Research Plan/);
  assert.match(ui, /Discover candidates/);
  assert.match(ui, /Submit selected candidates for corpus review/);
});

test("attached-only manufacturer evidence remains insufficient until an independent candidate is proposed", () => {
  const existing = {
    ref: { kind: "corpus_document", id: "corpus:northwind-existing" },
    exists: true,
    publisher: "Northwind Power Systems",
    canonicalUrl: "https://www.osha.gov/publications/northwind-existing",
    sourceType: "manufacturer_documentation",
    ingestionStatus: "accepted",
    underlyingDocumentId: "corpus:northwind-existing",
  };
  const samePublisher = {
    canonicalUrl: "https://www.northwind-power.example/accessories/transfer-notes",
    title: "Northwind accessory",
    publisher: "Northwind Power Systems",
    sourceClass: "manufacturer_documentation",
    provenance: "test_fixture",
    independenceCluster: "publisher:northwind power systems",
    excerpts: [{ text: "same manufacturer", start: 0, end: 16 }],
    relationship: "supports",
    scopeLimitations: "",
    authorityClass: "manufacturer_technical",
    authorityAdequate: true,
    freshness: "current",
    rankScore: 10,
    reasonSelected: null,
    reasonExcluded: null,
    proposedForReview: true,
    query: "q",
    retrievedChecksum: "x",
    publishedDate: null,
  };
  const sameOnly = wouldSatisfyPolicyIfAccepted({ claim: broadClaim, attached: [existing], proposed: [samePublisher] });
  assert.equal(sameOnly.state, "needs_independent_corroboration");
  const independent = {
    ...samePublisher,
    canonicalUrl: "https://www.harbor-industrial.example/application-notes/headroom",
    publisher: "Harbor Industrial Power",
    independenceCluster: "publisher:harbor industrial power",
  };
  const ready = wouldSatisfyPolicyIfAccepted({ claim: broadClaim, attached: [existing], proposed: [independent] });
  assert.equal(ready.state, "supported");
});
