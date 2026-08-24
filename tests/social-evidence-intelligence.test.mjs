import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LIVE_RESEARCH_ENABLED } from "../app/lib/research/capability.ts";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  assessClaimSufficiency,
  assessEvidenceRequestGap,
  buildDecisionDna,
  buildEvidenceGapRadar,
  claimMaySupportApproval,
  classifyAutonomyReadiness,
  hasIntelligenceReadyApprovalAuthority,
  independenceCluster,
} from "../app/growth/social/index.ts";
import { attachClaimEvidence, evaluatePackageApprovalGate, publishSocialPackage, recordSocialApproval } from "../db/social-growth-repository.ts";
import { ingestCorpusSource } from "../app/lib/research/ingest.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const opportunityRoute = await import("../app/api/growth/opportunities/route.ts");
const packageRoute = await import("../app/api/growth/packages/route.ts");
const claimRoute = await import("../app/api/growth/packages/[id]/claims/route.ts");
const requestRoute = await import("../app/api/growth/packages/[id]/evidence-requests/route.ts");
const candidateRoute = await import("../app/api/growth/evidence-requests/[id]/candidates/route.ts");
const extraEvidenceRoute = await import("../app/api/growth/packages/[id]/claims/[claimId]/evidence/route.ts");
const intelligenceRoute = await import("../app/api/growth/packages/[id]/intelligence/route.ts");
const approvalRoute = await import("../app/api/growth/approvals/route.ts");
const corpusReviewRoute = await import("../app/api/marketplace/corpus/[id]/route.ts");
const corpusListRoute = await import("../app/api/marketplace/corpus/route.ts");

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

function snapshot(overrides = {}) {
  return {
    ref: { kind: "corpus_document", id: "corpus:acme-running-load" },
    exists: true,
    title: "Running load excerpt",
    publisher: "Acme Generator Co",
    canonicalUrl: "https://www.acme.example/manuals/running-load",
    sourceType: "manufacturer_documentation",
    provenanceMethod: "founder_uploaded_document",
    ingestionStatus: "accepted",
    validationStatus: "claim_supporting",
    productionExposure: true,
    underlyingDocumentId: "corpus:acme-running-load",
    ...overrides,
  };
}

const excerpt = `# Running electrical load

Running load is the sum of continuous connected loads after diversity.`;

test("one accepted primary source can support a narrow low-risk claim", () => {
  const assessment = assessClaimSufficiency({
    claim: { id: "sgo:claim:running-load", claimText: "Running electrical load is the sum of continuous connected loads.", safetySensitive: false },
    records: [snapshot()],
  });
  assert.equal(assessment.policyClass, "narrow_factual");
  assert.equal(assessment.state, "supported");
  assert.equal(assessment.acceptedSourceCount, 1);
  assert.equal(assessment.independentSourceCount, 1);
  assert.equal(assessment.dimensions.authorityAdequate, true);
});

test("two records from the same publisher or document are not independent corroboration", () => {
  const first = snapshot({ ref: { kind: "corpus_document", id: "corpus:acme-one" }, underlyingDocumentId: "corpus:acme-one" });
  const second = snapshot({
    ref: { kind: "corpus_document", id: "corpus:acme-two" },
    underlyingDocumentId: "corpus:acme-two",
    title: "Second excerpt",
    canonicalUrl: "https://www.acme.example/manuals/surge",
  });
  assert.equal(independenceCluster(first), independenceCluster(second));
  const assessment = assessClaimSufficiency({
    claim: {
      id: "sgo:claim:headroom",
      claimText: "What operating headroom is technically appropriate, and under what conditions?",
      safetySensitive: false,
      policyClass: "broad_technical",
    },
    records: [first, second],
  });
  assert.equal(assessment.independentSourceCount, 1);
  assert.equal(assessment.state, "needs_independent_corroboration");
});

test("two genuinely independent accepted sources can satisfy a broader technical claim", () => {
  const assessment = assessClaimSufficiency({
    claim: {
      id: "sgo:claim:headroom-independent",
      claimText: "Recommended operating headroom should be evidenced, not a sales buffer.",
      safetySensitive: false,
      policyClass: "broad_technical",
    },
    records: [
      snapshot(),
      snapshot({
        ref: { kind: "corpus_document", id: "corpus:northwind-headroom" },
        publisher: "Northwind Power Co",
        canonicalUrl: "https://www.northwind.example/docs/headroom",
        title: "Independent headroom note",
        underlyingDocumentId: "corpus:northwind-headroom",
      }),
    ],
  });
  assert.equal(assessment.independentSourceCount, 2);
  assert.equal(assessment.state, "supported");
});

test("draft, unreviewed, rejected, and stale records do not count as accepted support", () => {
  const draft = assessClaimSufficiency({
    claim: { id: "sgo:claim:draft", claimText: "Running load is additive.", safetySensitive: false },
    records: [snapshot({ ingestionStatus: "awaiting_review", validationStatus: "relevant", productionExposure: false })],
  });
  assert.equal(draft.state, "unsupported");
  const rejected = assessClaimSufficiency({
    claim: { id: "sgo:claim:rejected", claimText: "Running load is additive.", safetySensitive: false },
    records: [snapshot({ ingestionStatus: "rejected", validationStatus: "rejected" })],
  });
  assert.equal(rejected.state, "unsupported");
  const stale = assessClaimSufficiency({
    claim: { id: "sgo:claim:stale", claimText: "Running load is additive.", safetySensitive: false },
    records: [snapshot({ ingestionStatus: "stale", validationStatus: "stale" })],
  });
  assert.equal(stale.state, "stale");
  const knowledgeDraft = assessClaimSufficiency({
    claim: { id: "sgo:claim:ks", claimText: "Running load is additive.", safetySensitive: false },
    records: [snapshot({
      ref: { kind: "knowledge_source", id: "1" },
      ingestionStatus: null,
      verificationStatus: "draft",
      sourceType: "manufacturer_documentation",
    })],
  });
  assert.equal(knowledgeDraft.state, "unsupported");
});

test("safety-sensitive claims require stronger authority than manufacturer-only evidence", () => {
  const manufacturer = assessClaimSufficiency({
    claim: { id: "sgo:claim:safety-mfr", claimText: "Mobile food operations must meet electrical safety constraints before selecting generator capacity.", safetySensitive: true },
    records: [snapshot()],
  });
  assert.equal(manufacturer.policyClass, "safety_sensitive");
  assert.equal(manufacturer.state, "insufficient_authority");
  const regulatory = assessClaimSufficiency({
    claim: { id: "sgo:claim:safety-gov", claimText: "Mobile food operations must meet electrical safety constraints before selecting generator capacity.", safetySensitive: true },
    records: [snapshot({
      ref: { kind: "corpus_document", id: "corpus:osha-electrical" },
      publisher: "Occupational Safety and Health Administration",
      canonicalUrl: "https://www.osha.gov/publications/electrical-safety",
      sourceType: "regulatory_document",
      title: "Electrical safety",
      underlyingDocumentId: "corpus:osha-electrical",
    })],
  });
  assert.equal(regulatory.state, "supported");
  assert.equal(regulatory.authorityStatus, "especially_authoritative");
});

test("contradiction produces conflicted and an unresolved request appears in the radar", () => {
  const conflicted = assessClaimSufficiency({
    claim: { id: "sgo:claim:conflict", claimText: "Running load is additive.", safetySensitive: false },
    records: [snapshot({ validationStatus: "contradicted" })],
  });
  assert.equal(conflicted.state, "conflicted");
  const requestGap = assessEvidenceRequestGap({
    request: {
      id: "sgo:evidence-request:headroom",
      packageId: "sgo:package:demo",
      opportunityId: null,
      question: "What operating headroom is technically appropriate, and under what conditions?",
      whyRequired: "A single manufacturer excerpt does not cover the recommendation.",
      preferredSourceType: "manufacturer_technical",
      status: "under_review",
      createdBy: "admin@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      candidateDocumentId: "corpus:acme-running-load",
      notes: null,
      resolvedEvidence: null,
    },
    candidate: snapshot(),
    packageAcceptedClusters: [independenceCluster(snapshot())],
  });
  assert.equal(requestGap.bucket, "needs_independent_corroboration");
  const radar = buildEvidenceGapRadar({
    claimAssessments: [conflicted],
    requestItems: [requestGap],
  });
  assert.equal(radar.contradictions.length, 1);
  assert.equal(radar.unresolvedEvidenceRequests.length, 1);
  assert.equal(radar.needsIndependentCorroboration.some((item) => item.id === requestGap.id), true);
});

test("Decision DNA stays not-ready while a required claim is partial and ignores commercial economics", () => {
  const partial = assessClaimSufficiency({
    claim: {
      id: "sgo:claim:headroom-partial",
      claimText: "Recommended generator capacity should include evidenced operating headroom.",
      safetySensitive: false,
      policyClass: "broad_technical",
    },
    records: [snapshot({ commissionRate: 0.42, affiliatePayout: 1200, epc: 3.5, merchantRevenue: 88, sponsorshipStatus: "paid" })],
  });
  const clean = assessClaimSufficiency({
    claim: {
      id: "sgo:claim:headroom-partial",
      claimText: "Recommended generator capacity should include evidenced operating headroom.",
      safetySensitive: false,
      policyClass: "broad_technical",
    },
    records: [snapshot()],
  });
  assert.equal(partial.state, clean.state);
  assert.equal(partial.state, "needs_independent_corroboration");
  const dna = buildDecisionDna({
    packageId: "sgo:package:demo",
    problem: "Operators guess generator size.",
    audience: "independent_operator",
    thesis: "Size generators from evidenced electrical facts.",
    commercialPosture: "affiliate",
    claims: [{
      id: partial.claimId,
      packageId: "sgo:package:demo",
      claimText: partial.claimText,
      safetySensitive: false,
      evidence: snapshot().ref,
    }],
    claimAssessments: [partial],
    unresolvedQuestions: ["What operating headroom is technically appropriate, and under what conditions?"],
    publicationAuthorized: false,
    historicalCanApprove: true,
  });
  assert.equal(dna.evidenceReadiness, "partial");
  assert.equal(dna.contentReadiness, "drafting_allowed");
  assert.equal(dna.recommendationReadiness, "not_ready");
  assert.equal(dna.publicationReadiness, "not_authorized");
  assert.equal(dna.historicalGate, "open");
  assert.equal(dna.intelligenceAuthority, "blocked");
  assert.equal(dna.commercialPosture, "affiliate");
});

test("historical approval gate is unchanged and intelligence cannot review or publish", async () => {
  await withAdmin(async (db) => {
    const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "mobile-generator-facts",
        problem: "Operators guess generator size from informal advice.",
        audience: "independent_operator",
        usefulnessTest: "Names running load and surge as separate facts.",
      },
    }))).json()).opportunity;
    const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "mobile-generator-facts-guide",
        opportunityId: opportunity.id,
        thesis: "Size a generator from evidenced electrical facts.",
        usefulnessTest: "The reader can separate running load from startup surge.",
        commercialPosture: "none",
      },
    }))).json()).package;
    const created = (await (await requestRoute.POST(request(`/api/growth/packages/${pkg.id}/evidence-requests`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "running-load",
        question: "How should running electrical load be calculated when sizing a generator?",
        whyRequired: "The package cannot claim a sizing method without a primary technical source.",
        preferredSourceType: "manufacturer_technical",
      },
    }), { params: Promise.resolve({ id: pkg.id }) })).json()).request;
    const candidate = (await (await candidateRoute.POST(request(`/api/growth/evidence-requests/${created.id}/candidates`, {
      email: "admin@example.com", method: "POST",
      body: {
        title: "Acme running-load excerpt",
        publisher: "Acme Generator Co",
        canonicalUrl: "https://www.osha.gov/publications/acme-running-load",
        excerpt,
      },
    }), { params: Promise.resolve({ id: created.id }) })).json());
    const reviewed = await corpusReviewRoute.POST(request(`/api/marketplace/corpus/${candidate.document.id}`, {
      email: "admin@example.com", method: "POST",
      body: { action: "accept", verificationNotes: "Excerpt supports running load as a documented technical factor.", claimScope: ["growth_evidence_candidate"] },
    }), { params: Promise.resolve({ id: candidate.document.id }) });
    assert.equal(reviewed.status, 200);
    const document = (await reviewed.json()).document;
    if (!document.productionExposure) {
      const exposed = await corpusReviewRoute.POST(request(`/api/marketplace/corpus/${document.id}`, {
        email: "admin@example.com", method: "POST",
        body: { action: "expose" },
      }), { params: Promise.resolve({ id: document.id }) });
      assert.equal(exposed.status, 200);
    }
    const attached = await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "running-load-claim",
        claimText: "Running electrical load is the sum of continuous connected loads.",
        safetySensitive: false,
        evidence: { kind: "corpus_document", id: document.id },
      },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(attached.status, 201);
    assert.equal((await evaluatePackageApprovalGate(db, pkg.id)).canApprove, true);
    const headroom = (await (await requestRoute.POST(request(`/api/growth/packages/${pkg.id}/evidence-requests`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "capacity-headroom",
        question: "What operating headroom is technically appropriate, and under what conditions?",
        whyRequired: "A single manufacturer source does not make the recommendation sufficient.",
        preferredSourceType: "manufacturer_technical",
      },
    }), { params: Promise.resolve({ id: pkg.id }) })).json()).request;
    await candidateRoute.POST(request(`/api/growth/evidence-requests/${headroom.id}/candidates`, {
      email: "admin@example.com", method: "POST",
      body: {
        existingDocumentId: document.id,
        notes: "Same manufacturer document. Not independent corroboration.",
      },
    }), { params: Promise.resolve({ id: headroom.id }) });
    const forbidden = await intelligenceRoute.GET(request(`/api/growth/packages/${pkg.id}/intelligence`, {
      email: "viewer@example.com",
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(forbidden.status, 403);
    const unauthenticated = await intelligenceRoute.GET(request(`/api/growth/packages/${pkg.id}/intelligence`), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(unauthenticated.status, 401);
    const intelligence = await intelligenceRoute.GET(request(`/api/growth/packages/${pkg.id}/intelligence`, {
      email: "admin@example.com",
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(intelligence.status, 200);
    const body = await intelligence.json();
    assert.equal(body.publishingEnabled, false);
    assert.equal(body.intelligence.claimAssessments[0].state, "supported");
    assert.equal(body.intelligence.radar.unresolvedEvidenceRequests.length >= 1, true);
    assert.equal(body.intelligence.radar.needsIndependentCorroboration.length >= 1, true);
    assert.equal(body.intelligence.decisionDna.recommendationReadiness, "not_ready");
    assert.equal(body.intelligence.decisionDna.evidenceReadiness, "partial");
    assert.equal(body.intelligence.decisionDna.contentReadiness, "drafting_allowed");
    assert.equal(body.intelligence.decisionDna.publicationReadiness, "not_authorized");
    assert.equal(body.intelligence.decisionDna.historicalGate, "open");
    assert.equal(body.intelligence.decisionDna.intelligenceAuthority, "blocked");
    assert.equal((await evaluatePackageApprovalGate(db, pkg.id)).canApprove, true);
    assert.equal(claimMaySupportApproval({
      safetySensitive: false,
      referenced: { exists: true, ingestionStatus: "awaiting_review", productionExposure: false },
    }), true);
    assert.equal((await corpusListRoute.GET(request("/api/marketplace/corpus"))).status, 401);
  });
});

test("intelligence does not enable live research, crawl, autonomous review, or social publishing", async () => {
  assert.equal(LIVE_RESEARCH_ENABLED, false);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.throws(() => publishSocialPackage(), /cannot publish/);
  const files = [
    "app/growth/social/evidence-policy.ts",
    "app/growth/social/evidence-intelligence.ts",
    "db/social-evidence-intelligence.ts",
    "app/api/growth/packages/[id]/intelligence/route.ts",
    "app/api/growth/packages/[id]/claims/[claimId]/evidence/route.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /LIVE_RESEARCH_ENABLED\s*=\s*true/);
    assert.doesNotMatch(source, /reviewCorpusDocument|action:\s*"accept"|publishSocialPackage/);
    assert.doesNotMatch(source, /graph\.facebook|cron|cloudflare queue|auto.?publish|oauth/i);
  }
});

async function acceptManufacturer(db, input) {
  const ingested = await ingestCorpusSource(db, {
    title: input.title,
    publisher: input.publisher,
    evidenceDomain: "equipment",
    sourceType: "manufacturer_documentation",
    authorityTier: 2,
    canonicalUrl: input.url,
    mimeType: "text/plain",
    text: excerpt,
    actorEmail: "admin@example.com",
    provenanceMethod: "founder_uploaded_document",
    claimScope: ["growth_evidence_candidate"],
  });
  const reviewed = await corpusReviewRoute.POST(request(`/api/marketplace/corpus/${ingested.document.id}`, {
    email: "admin@example.com", method: "POST",
    body: { action: "accept", verificationNotes: "Accepted for intelligence tests.", claimScope: ["growth_evidence_candidate"] },
  }), { params: Promise.resolve({ id: ingested.document.id }) });
  assert.equal(reviewed.status, 200);
  const document = (await reviewed.json()).document;
  if (!document.productionExposure) {
    const exposed = await corpusReviewRoute.POST(request(`/api/marketplace/corpus/${document.id}`, {
      email: "admin@example.com", method: "POST",
      body: { action: "expose" },
    }), { params: Promise.resolve({ id: document.id }) });
    assert.equal(exposed.status, 200);
  }
  return document.id;
}

test("existing one-ref claims still load and two refs can attach to one claim", async () => {
  await withAdmin(async (db) => {
    const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com", method: "POST",
      body: { slug: "multi-src-opp", problem: "Operators guess generator size.", audience: "independent_operator", usefulnessTest: "Separates running load from surge." },
    }))).json()).opportunity;
    const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com", method: "POST",
      body: { slug: "multi-src-pkg", opportunityId: opportunity.id, thesis: "Size from evidenced facts.", usefulnessTest: "Names running and surge.", commercialPosture: "none" },
    }))).json()).package;
    const acme = await acceptManufacturer(db, { title: "Acme running load", publisher: "Acme Generator Co", url: "https://www.osha.gov/publications/acme-running-v11" });
    const northwind = await acceptManufacturer(db, { title: "Northwind headroom", publisher: "Northwind Power Co", url: "https://www.osha.gov/publications/northwind-headroom-v11" });
    const created = await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "headroom-claim",
        claimText: "Recommended operating headroom should be evidenced, not a sales buffer.",
        safetySensitive: false,
        evidence: { kind: "corpus_document", id: acme },
      },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(created.status, 201);
    const oneRef = (await created.json()).claim;
    assert.equal(oneRef.evidence.id, acme);
    assert.equal(oneRef.evidenceRefs.length, 1);
    const attached = await extraEvidenceRoute.POST(request(`/api/growth/packages/${pkg.id}/claims/${oneRef.id}/evidence`, {
      email: "admin@example.com", method: "POST",
      body: { evidence: { kind: "corpus_document", id: northwind } },
    }), { params: Promise.resolve({ id: pkg.id, claimId: oneRef.id }) });
    assert.equal(attached.status, 201);
    const two = (await attached.json()).claim;
    assert.equal(two.evidenceRefs.length, 2);
    const duplicate = await extraEvidenceRoute.POST(request(`/api/growth/packages/${pkg.id}/claims/${oneRef.id}/evidence`, {
      email: "admin@example.com", method: "POST",
      body: { evidence: { kind: "corpus_document", id: acme } },
    }), { params: Promise.resolve({ id: pkg.id, claimId: oneRef.id }) });
    assert.equal(duplicate.status, 201);
    assert.equal((await duplicate.json()).claim.evidenceRefs.length, 2);
    const sameDoc = await attachClaimEvidence(db, {
      claimId: oneRef.id,
      evidence: { kind: "corpus_document", id: acme },
      attachedBy: "admin@example.com",
    });
    assert.equal(sameDoc.evidenceRefs.length, 2);
    const intelligence = (await (await intelligenceRoute.GET(request(`/api/growth/packages/${pkg.id}/intelligence`, {
      email: "admin@example.com",
    }), { params: Promise.resolve({ id: pkg.id }) })).json()).intelligence;
    const assessment = intelligence.claimAssessments[0];
    assert.equal(assessment.acceptedSourceCount, 2);
    assert.equal(assessment.independentSourceCount, 2);
    assert.equal(assessment.state, "supported");
    assert.match(`${assessment.acceptedSourceCount} accepted sources · ${assessment.independentSourceCount} independent publishers`, /2 accepted sources · 2 independent publishers/);
  });
});

test("same document twice does not increase independence; draft and rejected seconds do not help", async () => {
  const first = snapshot({ ref: { kind: "corpus_document", id: "corpus:acme-one" }, underlyingDocumentId: "corpus:acme-one" });
  const duplicate = snapshot({ ref: { kind: "corpus_document", id: "corpus:acme-one" }, underlyingDocumentId: "corpus:acme-one", title: "Copy" });
  const samePublisher = snapshot({
    ref: { kind: "corpus_document", id: "corpus:acme-two" },
    underlyingDocumentId: "corpus:acme-two",
    title: "Other excerpt",
    canonicalUrl: "https://www.acme.example/other",
  });
  const duped = assessClaimSufficiency({
    claim: { id: "sgo:claim:dup", claimText: "Recommended operating headroom should be evidenced.", safetySensitive: false, policyClass: "broad_technical" },
    records: [first, duplicate, samePublisher],
  });
  assert.equal(duped.acceptedSourceCount, 2);
  assert.equal(duped.independentSourceCount, 1);
  const draftSecond = assessClaimSufficiency({
    claim: { id: "sgo:claim:draft-second", claimText: "Recommended operating headroom should be evidenced.", safetySensitive: false, policyClass: "broad_technical" },
    records: [snapshot(), snapshot({
      ref: { kind: "corpus_document", id: "corpus:northwind-draft" },
      publisher: "Northwind Power Co",
      canonicalUrl: "https://www.northwind.example/draft",
      underlyingDocumentId: "corpus:northwind-draft",
      ingestionStatus: "awaiting_review",
      productionExposure: false,
    })],
  });
  assert.equal(draftSecond.state, "needs_independent_corroboration");
  assert.equal(draftSecond.independentSourceCount, 1);
  const rejectedSecond = assessClaimSufficiency({
    claim: { id: "sgo:claim:rej-second", claimText: "Recommended operating headroom should be evidenced.", safetySensitive: false, policyClass: "broad_technical" },
    records: [snapshot(), snapshot({
      ref: { kind: "corpus_document", id: "corpus:northwind-rej" },
      publisher: "Northwind Power Co",
      canonicalUrl: "https://www.northwind.example/rej",
      underlyingDocumentId: "corpus:northwind-rej",
      ingestionStatus: "rejected",
    })],
  });
  assert.equal(rejectedSecond.state, "needs_independent_corroboration");
  const staleSecond = assessClaimSufficiency({
    claim: { id: "sgo:claim:stale-second", claimText: "Recommended operating headroom should be evidenced.", safetySensitive: false, policyClass: "broad_technical" },
    records: [snapshot(), snapshot({
      ref: { kind: "corpus_document", id: "corpus:northwind-stale" },
      publisher: "Northwind Power Co",
      canonicalUrl: "https://www.northwind.example/stale",
      underlyingDocumentId: "corpus:northwind-stale",
      ingestionStatus: "stale",
    })],
  });
  assert.equal(staleSecond.state, "needs_independent_corroboration");
});

test("contradiction blocks despite source count; historical gate may be open while intelligence authority is blocked", async () => {
  const conflicted = assessClaimSufficiency({
    claim: { id: "sgo:claim:count-conflict", claimText: "Recommended operating headroom should be evidenced.", safetySensitive: false, policyClass: "broad_technical" },
    records: [
      snapshot(),
      snapshot({
        ref: { kind: "corpus_document", id: "corpus:northwind-conflict" },
        publisher: "Northwind Power Co",
        canonicalUrl: "https://www.northwind.example/conflict",
        underlyingDocumentId: "corpus:northwind-conflict",
        validationStatus: "contradicted",
      }),
    ],
  });
  assert.equal(conflicted.acceptedSourceCount, 2);
  assert.equal(conflicted.state, "conflicted");
  assert.equal(hasIntelligenceReadyApprovalAuthority({
    historicalCanApprove: true,
    recommendationReadiness: "not_ready",
    claimAssessments: [conflicted],
  }), false);
  await withAdmin(async (db) => {
    const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com", method: "POST",
      body: { slug: "blocked-auth-opp", problem: "Need a practice note.", audience: "home_cook", usefulnessTest: "Names mirepoix." },
    }))).json()).opportunity;
    const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com", method: "POST",
      body: { slug: "blocked-auth-pkg", opportunityId: opportunity.id, thesis: "Practice note.", usefulnessTest: "No live-web claim.", commercialPosture: "none" },
    }))).json()).package;
    const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
    await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com", method: "POST",
      body: { slug: "draft-claim", claimText: "Mirepoix is onion, carrot, and celery.", evidence: { kind: "knowledge_source", id: String(source.id) }, safetySensitive: false },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal((await evaluatePackageApprovalGate(db, pkg.id)).canApprove, true);
    const approved = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com", method: "POST",
      body: { slug: "blocked-auth", subjectKind: "package", subjectId: pkg.id, decision: "approved", reason: "Trying with draft evidence." },
    }));
    assert.equal(approved.status, 400);
    assert.match(await approved.text(), /Intelligence authority is blocked/);
    await assert.rejects(
      () => recordSocialApproval(db, {
        slug: "blocked-auth-repo",
        subjectKind: "package",
        subjectId: pkg.id,
        decision: "approved",
        actorEmail: "admin@example.com",
        reason: "Trying with draft evidence.",
      }),
      /Intelligence authority is blocked/,
    );
  });
});

test("narrow supported claims can be autonomy eligible; safety-sensitive remains human-review-required; economics have no effect", () => {
  const narrow = assessClaimSufficiency({
    claim: { id: "sgo:claim:narrow-auto", claimText: "Running electrical load is the sum of continuous connected loads.", safetySensitive: false },
    records: [snapshot()],
  });
  assert.equal(classifyAutonomyReadiness({
    claimAssessments: [narrow],
    unresolvedQuestionCount: 0,
    economics: { commissionRate: 99, epc: 4, affiliatePayout: 50, sponsorshipStatus: "paid" },
  }), "autonomy_eligible");
  const safety = assessClaimSufficiency({
    claim: { id: "sgo:claim:safety-auto", claimText: "Mobile food operations must meet electrical safety constraints before selecting generator capacity.", safetySensitive: true },
    records: [snapshot({
      ref: { kind: "corpus_document", id: "corpus:osha-electrical-v11" },
      publisher: "Occupational Safety and Health Administration",
      canonicalUrl: "https://www.osha.gov/publications/electrical-safety-v11",
      sourceType: "regulatory_document",
      title: "Electrical safety",
      underlyingDocumentId: "corpus:osha-electrical-v11",
    })],
  });
  assert.equal(safety.state, "supported");
  assert.equal(classifyAutonomyReadiness({
    claimAssessments: [safety],
    unresolvedQuestionCount: 0,
    economics: { merchantRevenue: 1000 },
  }), "human_review_required");
});

