import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { LIVE_RESEARCH_ENABLED } from "../app/lib/research/capability.ts";
import { SOCIAL_PUBLISH_AVAILABLE, evidenceRequestCannotSatisfyGate } from "../app/growth/social/index.ts";
import { evaluatePackageApprovalGate, publishSocialPackage } from "../db/social-growth-repository.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const opportunityRoute = await import("../app/api/growth/opportunities/route.ts");
const packageRoute = await import("../app/api/growth/packages/route.ts");
const claimRoute = await import("../app/api/growth/packages/[id]/claims/route.ts");
const requestRoute = await import("../app/api/growth/packages/[id]/evidence-requests/route.ts");
const candidateRoute = await import("../app/api/growth/evidence-requests/[id]/candidates/route.ts");
const resolveRoute = await import("../app/api/growth/evidence-requests/[id]/resolve/route.ts");
const rejectRoute = await import("../app/api/growth/evidence-requests/[id]/reject/route.ts");
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

async function seedBlockedPackage(db, slug = "food-truck-generator-sizing") {
  const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
    email: "admin@example.com", method: "POST",
    body: {
      slug: `${slug}-opp`,
      problem: "Operators guess generator size from informal advice.",
      audience: "independent_operator",
      usefulnessTest: "Names running load, surge, and headroom as separate facts.",
    },
  }))).json()).opportunity;
  const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
    email: "admin@example.com", method: "POST",
    body: {
      slug,
      opportunityId: opportunity.id,
      thesis: "Size a food-truck generator from evidenced electrical facts.",
      usefulnessTest: "The reader can separate running load from startup surge.",
      commercialPosture: "none",
    },
  }))).json()).package;
  const gate = await evaluatePackageApprovalGate(db, pkg.id);
  assert.equal(gate.canApprove, false);
  return { opportunity, pkg, gate };
}

const excerpt = `# Running electrical load

Running load is the sum of continuous connected loads after diversity, not a surge rating and not a sales round-number.`;

test("unauthorized evidence-request writes are rejected", async () => {
  await withAdmin(async () => {
    const unauthenticated = await requestRoute.POST(request("/api/growth/packages/sgo:package:x/evidence-requests", {
      method: "POST",
      body: { slug: "nope", question: "Q", whyRequired: "Why" },
    }), { params: Promise.resolve({ id: "sgo:package:x" }) });
    assert.equal(unauthenticated.status, 401);
    const forbidden = await requestRoute.POST(request("/api/growth/packages/sgo:package:x/evidence-requests", {
      email: "viewer@example.com", method: "POST",
      body: { slug: "nope", question: "Q", whyRequired: "Why" },
    }), { params: Promise.resolve({ id: "sgo:package:x" }) });
    assert.equal(forbidden.status, 403);
  });
});

test("blocked package can create an evidence request that does not open the gate", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await seedBlockedPackage(db);
    const spoofed = await requestRoute.POST(request(`/api/growth/packages/${pkg.id}/evidence-requests`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "running-load",
        question: "How should running electrical load be calculated when sizing a generator?",
        whyRequired: "The package cannot claim a sizing method without a primary technical source.",
        preferredSourceType: "manufacturer_technical",
        createdBy: "spoof@example.com",
      },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(spoofed.status, 201);
    const created = (await spoofed.json()).request;
    assert.equal(created.createdBy, "admin@example.com");
    assert.equal(created.status, "open");
    assert.equal(created.resolvedEvidence, null);
    assert.equal(evidenceRequestCannotSatisfyGate(created), true);
    const gate = await evaluatePackageApprovalGate(db, pkg.id);
    assert.equal(gate.canApprove, false);
    assert.match(gate.blockers[0], /at least one evidenced claim/);
  });
});

test("candidate stays unverified until existing corpus review accepts it", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await seedBlockedPackage(db, "surge-load");
    const created = (await (await requestRoute.POST(request(`/api/growth/packages/${pkg.id}/evidence-requests`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "surge",
        question: "How should motor startup surge affect generator sizing?",
        whyRequired: "Surge is a distinct electrical fact.",
        preferredSourceType: "government_regulatory",
      },
    }), { params: Promise.resolve({ id: pkg.id }) })).json()).request;
    const candidate = await candidateRoute.POST(request(`/api/growth/evidence-requests/${created.id}/candidates`, {
      email: "admin@example.com", method: "POST",
      body: {
        title: "Generator running-load excerpt",
        publisher: "Occupational Safety and Health Administration",
        canonicalUrl: "https://www.osha.gov/publications/osha-generator-sizing",
        excerpt,
        notes: "Human-supplied excerpt. Not live-fetched.",
      },
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(candidate.status, 201);
    const body = await candidate.json();
    assert.notEqual(body.document.ingestionStatus, "accepted");
    assert.equal(body.document.productionExposure, false);
    assert.ok(["candidate_submitted", "under_review"].includes(body.request.status));
    const earlyResolve = await resolveRoute.POST(request(`/api/growth/evidence-requests/${created.id}/resolve`, {
      email: "admin@example.com", method: "POST", body: {},
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(earlyResolve.status, 400);
    const safetyDraft = await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "draft-claim",
        claimText: "Startup surge must be added to running load.",
        safetySensitive: true,
        evidence: { kind: "corpus_document", id: body.document.id },
      },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(safetyDraft.status, 400);
    const seedSource = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
    const unrelated = await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "unrelated-iddsi",
        claimText: "Unrelated IDDSI source cannot size a generator.",
        safetySensitive: true,
        evidence: { kind: "knowledge_source", id: String(seedSource.id) },
      },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(unrelated.status, 400);
    assert.equal((await evaluatePackageApprovalGate(db, pkg.id)).canApprove, false);
  });
});

test("accepted corpus evidence can resolve the request and become attachable", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await seedBlockedPackage(db, "headroom");
    const created = (await (await requestRoute.POST(request(`/api/growth/packages/${pkg.id}/evidence-requests`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "headroom",
        question: "What operating headroom is technically appropriate, and under what conditions?",
        whyRequired: "Headroom is a technical claim, not a sales buffer.",
        preferredSourceType: "manufacturer_technical",
      },
    }), { params: Promise.resolve({ id: pkg.id }) })).json()).request;
    const candidate = (await (await candidateRoute.POST(request(`/api/growth/evidence-requests/${created.id}/candidates`, {
      email: "admin@example.com", method: "POST",
      body: {
        title: "Generator headroom excerpt",
        publisher: "Occupational Safety and Health Administration",
        canonicalUrl: "https://www.osha.gov/publications/osha-generator-headroom",
        excerpt,
      },
    }), { params: Promise.resolve({ id: created.id }) })).json());
    const reviewed = await corpusReviewRoute.POST(request(`/api/marketplace/corpus/${candidate.document.id}`, {
      email: "admin@example.com", method: "POST",
      body: { action: "accept", verificationNotes: "Excerpt supports headroom as a documented technical factor.", claimScope: ["growth_evidence_candidate"] },
    }), { params: Promise.resolve({ id: candidate.document.id }) });
    assert.equal(reviewed.status, 200);
    const document = (await reviewed.json()).document;
    assert.equal(document.ingestionStatus, "accepted");
    if (!document.productionExposure) {
      const exposed = await corpusReviewRoute.POST(request(`/api/marketplace/corpus/${document.id}`, {
        email: "admin@example.com", method: "POST",
        body: { action: "expose" },
      }), { params: Promise.resolve({ id: document.id }) });
      assert.equal(exposed.status, 200);
    }
    const resolved = await resolveRoute.POST(request(`/api/growth/evidence-requests/${created.id}/resolve`, {
      email: "admin@example.com", method: "POST", body: {},
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(resolved.status, 200);
    const requestBody = (await resolved.json()).request;
    assert.equal(requestBody.status, "resolved");
    assert.deepEqual(requestBody.resolvedEvidence, { kind: "corpus_document", id: document.id });
    const attached = await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "headroom-claim",
        claimText: "Operating headroom must come from a technical source, not a sales buffer.",
        safetySensitive: true,
        evidence: requestBody.resolvedEvidence,
      },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(attached.status, 201);
    const claim = (await attached.json()).claim;
    assert.equal(claim.evidence.kind, "corpus_document");
    assert.equal(claim.evidence.id, document.id);
    const copied = db.database.prepare("SELECT count(*) AS count FROM social_package_claims WHERE claim_text = ?").get(excerpt);
    assert.equal(copied.count, 0);
    assert.equal((await evaluatePackageApprovalGate(db, pkg.id)).canApprove, true);
  });
});

test("rejected corpus evidence cannot resolve or satisfy the claim gate", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await seedBlockedPackage(db, "mobile-electrical");
    const created = (await (await requestRoute.POST(request(`/api/growth/packages/${pkg.id}/evidence-requests`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "constraints",
        question: "What electrical or safety constraints should a mobile food operation consider before selecting generator capacity?",
        whyRequired: "Safety constraints cannot be invented from social copy.",
        preferredSourceType: "government_regulatory",
      },
    }), { params: Promise.resolve({ id: pkg.id }) })).json()).request;
    const candidate = (await (await candidateRoute.POST(request(`/api/growth/evidence-requests/${created.id}/candidates`, {
      email: "admin@example.com", method: "POST",
      body: {
        title: "Rejected generator note",
        publisher: "Example Blog",
        canonicalUrl: "https://www.osha.gov/publications/osha-rejected-note",
        excerpt,
      },
    }), { params: Promise.resolve({ id: created.id }) })).json());
    const rejected = await corpusReviewRoute.POST(request(`/api/marketplace/corpus/${candidate.document.id}`, {
      email: "admin@example.com", method: "POST",
      body: { action: "reject", reason: "Insufficient technical authority." },
    }), { params: Promise.resolve({ id: candidate.document.id }) });
    assert.equal(rejected.status, 200);
    const resolveRejected = await resolveRoute.POST(request(`/api/growth/evidence-requests/${created.id}/resolve`, {
      email: "admin@example.com", method: "POST", body: {},
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(resolveRejected.status, 400);
    const requestReject = await rejectRoute.POST(request(`/api/growth/evidence-requests/${created.id}/reject`, {
      email: "admin@example.com", method: "POST",
      body: { reason: "Candidate was rejected by corpus review." },
    }), { params: Promise.resolve({ id: created.id }) });
    assert.equal(requestReject.status, 200);
    assert.equal((await requestReject.json()).request.status, "rejected");
    const claim = await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "rejected-claim",
        claimText: "A rejected source cannot size a generator.",
        safetySensitive: true,
        evidence: { kind: "corpus_document", id: candidate.document.id },
      },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(claim.status, 400);
    assert.equal((await evaluatePackageApprovalGate(db, pkg.id)).canApprove, false);
  });
});

test("bridge does not enable live research, crawl, or social publishing", async () => {
  assert.equal(LIVE_RESEARCH_ENABLED, false);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.throws(() => publishSocialPackage(), /cannot publish/);
  const files = [
    "app/growth/social/evidence-requests.ts",
    "db/social-evidence-request-repository.ts",
    "app/api/growth/packages/[id]/evidence-requests/route.ts",
    "app/api/growth/evidence-requests/[id]/candidates/route.ts",
    "app/api/growth/evidence-requests/[id]/resolve/route.ts",
    "app/api/growth/evidence-requests/[id]/reject/route.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /LIVE_RESEARCH_ENABLED\s*=\s*true/);
    assert.doesNotMatch(source, /graph\.facebook|cron|cloudflare queue|auto.?publish|oauth/i);
  }
  const capability = await readFile(new URL("../app/lib/research/capability.ts", import.meta.url), "utf8");
  assert.match(capability, /export const LIVE_RESEARCH_ENABLED = false/);
  const corpus = await corpusListRoute.GET(request("/api/marketplace/corpus"));
  assert.equal(corpus.status, 401);
});
