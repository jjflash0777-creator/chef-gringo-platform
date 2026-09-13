import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  assessClaimSufficiency,
  buildContentIntelligence,
  buildDecisionDna,
  buildEvidenceGapRadar,
  everyFactualSegmentIsTraced,
  planCommercialRoute,
  scoreContentOpportunity,
} from "../app/growth/social/index.ts";
import { recordCommercialEvent } from "../db/revenue-operations-repository.ts";
import { addPackageClaim, createContentOpportunity, createContentPackage } from "../db/social-growth-repository.ts";
import { buildPackageContentIntelligence } from "../db/social-content-intelligence.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const contentRoute = await import("../app/api/growth/packages/[id]/content-intelligence/route.ts");

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

function claimOf(assessment, evidence = snapshot().ref) {
  return {
    id: assessment.claimId,
    packageId: "sgo:package:demo",
    claimText: assessment.claimText,
    safetySensitive: assessment.safetySensitive,
    evidence,
    evidenceRefs: [evidence],
  };
}

function inputFromAssessments(assessments, extra = {}) {
  const opportunity = {
    id: "sgo:opportunity:demo",
    slug: "demo",
    problem: extra.problem ?? "Kitchen crews waste time on undocumented prep lists.",
    audience: extra.audience ?? "independent_operator",
    usefulnessTest: extra.usefulnessTest ?? "They keep a written mise list before service.",
    productId: extra.productId ?? null,
    workflowId: extra.workflowId ?? null,
    partnerOpportunityId: extra.partnerOpportunityId ?? null,
    status: "selected",
  };
  const pkg = {
    id: "sgo:package:demo",
    slug: "demo",
    opportunityId: opportunity.id,
    thesis: extra.thesis ?? "Write the prep list from evidenced kitchen practice.",
    usefulnessTest: extra.usefulnessTest ?? opportunity.usefulnessTest,
    commercialPosture: extra.commercialPosture ?? "none",
    status: "drafted",
  };
  const claims = assessments.map((item) => claimOf(item));
  const decisionDna = buildDecisionDna({
    packageId: pkg.id,
    problem: opportunity.problem,
    audience: opportunity.audience,
    thesis: pkg.thesis,
    commercialPosture: pkg.commercialPosture,
    claims,
    claimAssessments: assessments,
    unresolvedQuestions: extra.unresolvedQuestions ?? [],
    publicationAuthorized: false,
    historicalCanApprove: true,
  });
  return {
    opportunity,
    package: pkg,
    intelligence: {
      packageId: pkg.id,
      policyVersion: "evidence-intelligence-v1",
      historicalApprovalGateSeparate: true,
      historicalCanApprove: true,
      intelligenceAuthorityReady: decisionDna.intelligenceAuthority === "ready",
      autonomyReadiness: decisionDna.autonomyReadiness,
      claimAssessments: assessments,
      radar: buildEvidenceGapRadar({ claimAssessments: assessments, requestItems: [] }),
      decisionDna,
    },
    variants: extra.variants ?? [],
    destinations: extra.destinations ?? [],
    publications: extra.publications ?? [],
    liveCandidates: extra.liveCandidates ?? [],
    events: extra.events ?? [],
  };
}

test("unsupported claim cannot enter the content brief as fact, and accepted evidence can", () => {
  const unsupported = assessClaimSufficiency({
    claim: { id: "sgo:claim:guess", claimText: "Generators must be twenty percent oversized for every kitchen.", safetySensitive: false },
    records: [snapshot({ ingestionStatus: "awaiting_review", validationStatus: "relevant" })],
  });
  const supported = assessClaimSufficiency({
    claim: { id: "sgo:claim:running", claimText: "Running electrical load is the sum of continuous connected loads.", safetySensitive: false },
    records: [snapshot()],
  });
  const blocked = buildContentIntelligence(inputFromAssessments([unsupported]));
  assert.equal(blocked.brief.verifiedFacts.length, 0);
  assert.ok(blocked.brief.claimsMustNotMake.some((item) => item.claimId === "sgo:claim:guess"));
  assert.equal(blocked.drafts.every((draft) => !draft.copy.includes("twenty percent oversized")), true);
  const ready = buildContentIntelligence(inputFromAssessments([supported]));
  assert.equal(ready.brief.verifiedFacts.some((item) => item.claimId === "sgo:claim:running"), true);
  assert.equal(ready.publishingEnabled, false);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("contradiction blocks recommendation language in drafts", () => {
  const conflicted = assessClaimSufficiency({
    claim: {
      id: "sgo:claim:conflict",
      claimText: "Recommended operating headroom should be evidenced under these conditions.",
      safetySensitive: false,
      policyClass: "broad_technical",
    },
    records: [
      snapshot(),
      snapshot({
        ref: { kind: "corpus_document", id: "corpus:northwind-headroom" },
        publisher: "Northwind Power Co",
        canonicalUrl: "https://www.northwind.example/docs/headroom",
        underlyingDocumentId: "corpus:northwind-headroom",
        validationStatus: "contradicted",
      }),
    ],
  });
  const workspace = buildContentIntelligence(inputFromAssessments([conflicted], {
    problem: "Operators guess generator size from informal advice.",
  }));
  assert.ok(workspace.brief.contradictions.length);
  assert.equal(workspace.drafts.every((draft) => draft.recommendationBlocked), true);
  assert.equal(workspace.drafts.every((draft) => /no purchase or product recommendation/i.test(draft.copy)), true);
  assert.equal(workspace.commercialRoute.route, "no_commercial_cta");
});

test("live candidate alone cannot authorize a content fact", () => {
  const unsupported = assessClaimSufficiency({
    claim: { id: "sgo:claim:open", claimText: "A portable generator must include undocumented surge headroom of 40%.", safetySensitive: false },
    records: [snapshot({ ingestionStatus: "awaiting_review" })],
  });
  const workspace = buildContentIntelligence(inputFromAssessments([unsupported], {
    liveCandidates: [{
      canonicalUrl: "https://www.vendor.example/surge-myth.pdf",
      relationship: "supports",
      proposedForReview: true,
      submittedDocumentId: "corpus:awaiting",
      ingestionStatus: "awaiting_review",
    }],
  }));
  assert.equal(workspace.brief.verifiedFacts.length, 0);
  assert.equal(workspace.brief.liveDiscoveryIsNotEvidence, true);
  assert.ok(workspace.brief.claimsMustNotMake.some((item) => item.reason.includes("Live discovery candidates are not evidence")));
  assert.equal(workspace.drafts.every((draft) => !draft.copy.includes("40%")), true);
  assert.equal(workspace.drafts.every((draft) => !draft.copy.includes("vendor.example")), true);
});

test("commission does not increase evidence or content authority", () => {
  const supported = assessClaimSufficiency({
    claim: { id: "sgo:claim:running", claimText: "Running electrical load is the sum of continuous connected loads.", safetySensitive: false },
    records: [snapshot()],
  });
  const base = inputFromAssessments([supported]);
  const withoutMoney = scoreContentOpportunity(base, planCommercialRoute(base));
  assert.throws(() => buildContentIntelligence({ ...base, economics: { commission: 88, epc: 4, payout: 12 } }), /commercial economics|economics ranking/);
  const withCommissionEvents = scoreContentOpportunity({
    ...base,
    events: [{ eventType: "commission_pending", occurredAt: "2026-08-01T00:00:00.000Z", commissionAmountCents: 5000 }],
  }, planCommercialRoute(base));
  assert.equal(withCommissionEvents.factors.firstPartyPerformance, withoutMoney.factors.firstPartyPerformance);
  assert.equal(withCommissionEvents.total, withoutMoney.total);
});

test("usefulness can select no commercial CTA, and an appropriate route can be proposed", () => {
  const supported = assessClaimSufficiency({
    claim: { id: "sgo:claim:running", claimText: "Running electrical load is the sum of continuous connected loads.", safetySensitive: false },
    records: [snapshot()],
  });
  const none = buildContentIntelligence(inputFromAssessments([supported]));
  assert.equal(none.commercialRoute.route, "no_commercial_cta");
  assert.equal(none.commercialRoute.cta, "none");
  assert.equal(none.commercialRoute.helpsUserProblem, false);
  const affiliate = buildContentIntelligence(inputFromAssessments([supported], {
    problem: "Operators cannot choose a generator from running load versus surge.",
    usefulnessTest: "They can separate running load from starting demand.",
    productId: "product:harbor-industrial",
    commercialPosture: "affiliate",
    thesis: "Choose from evidenced electrical facts, not a sales buffer.",
  }));
  assert.equal(affiliate.commercialRoute.route, "affiliate_product");
  assert.equal(affiliate.commercialRoute.helpsUserProblem, true);
  assert.ok(affiliate.formats.some((item) => item.format === "comparison_buying_guide"));
  const tool = buildContentIntelligence(inputFromAssessments([supported], {
    problem: "Cooks cannot calculate a recipe scale without a written method.",
    usefulnessTest: "They can use the scaler with the original ratio.",
    workflowId: 1,
    thesis: "Scale recipes with the Chef Gringo tool.",
  }));
  assert.equal(tool.commercialRoute.route, "internal_tool");
  assert.equal(tool.commercialRoute.spending, false);
  assert.equal(tool.commercialRoute.partnerOutreach, false);
});

test("channel drafts stay inside accepted claims and every factual statement traces", () => {
  const supported = assessClaimSufficiency({
    claim: { id: "sgo:claim:running", claimText: "Running electrical load is the sum of continuous connected loads.", safetySensitive: false },
    records: [snapshot()],
  });
  const prohibited = assessClaimSufficiency({
    claim: { id: "sgo:claim:hype", claimText: "This generator is certified to save $400 a year.", safetySensitive: false },
    records: [snapshot({ ingestionStatus: "awaiting_review" })],
  });
  const workspace = buildContentIntelligence(inputFromAssessments([supported, prohibited]));
  const allowed = new Set(workspace.brief.verifiedFacts.map((item) => item.claimId));
  assert.ok(workspace.drafts.length >= 1);
  for (const draft of workspace.drafts) {
    assert.equal(everyFactualSegmentIsTraced(draft, allowed), true);
    assert.equal(draft.copy.includes("certified to save $400"), false);
    assert.equal(draft.segments.filter((segment) => segment.factual).every((segment) => segment.evidenceRefs.length > 0), true);
  }
  assert.equal(workspace.formats.some((item) => item.format === "chefgringo_article"), true);
  assert.equal(workspace.autonomy.mayPublish, false);
  assert.equal(workspace.autonomy.mayAcceptEvidence, false);
});

test("first-party events create learning signals without inventing external analytics", () => {
  const supported = assessClaimSufficiency({
    claim: { id: "sgo:claim:running", claimText: "Running electrical load is the sum of continuous connected loads.", safetySensitive: false },
    records: [snapshot()],
  });
  const empty = buildContentIntelligence(inputFromAssessments([supported]));
  assert.equal(empty.learning.impressions, null);
  assert.equal(empty.learning.externalAnalyticsInvented, false);
  assert.equal(empty.learning.source, "first_party_commercial_events");
  const withEvents = buildContentIntelligence(inputFromAssessments([supported], {
    events: [
      { eventType: "page_view", occurredAt: "2026-08-02T00:00:00.000Z" },
      { eventType: "page_view", occurredAt: "2026-08-02T01:00:00.000Z" },
      { eventType: "affiliate_click", occurredAt: "2026-08-02T02:00:00.000Z" },
      { eventType: "email_signup", occurredAt: "2026-08-02T03:00:00.000Z" },
      { eventType: "email_signup", occurredAt: "2026-08-02T04:00:00.000Z" },
    ],
  }));
  assert.equal(withEvents.learning.pageViews, 2);
  assert.equal(withEvents.learning.clicks, 1);
  assert.equal(withEvents.learning.emailSignups, 2);
  assert.equal(withEvents.learning.recommendedAction, "repurpose");
  assert.equal(withEvents.learning.mayPublish, false);
  assert.equal(withEvents.learning.mayChangeEvidenceTruth, false);
});

test("content intelligence API is admin-only, persists nothing, and does not publish", async () => {
  await withAdmin(async (db) => {
    const unauthenticated = await contentRoute.GET(request("/api/growth/packages/sgo:package:x/content-intelligence"), { params: Promise.resolve({ id: "sgo:package:x" }) });
    assert.equal(unauthenticated.status, 401);
    const opportunity = await createContentOpportunity(db, {
      slug: "content-intel-opp",
      problem: "Home cooks cannot name mirepoix.",
      audience: "home_cook",
      usefulnessTest: "They can name onion, carrot, and celery.",
      productId: null,
      workflowId: null,
      partnerOpportunityId: null,
      status: "selected",
    });
    const pkg = await createContentPackage(db, {
      slug: "content-intel-pkg",
      opportunityId: opportunity.id,
      thesis: "Explain mirepoix as standard culinary practice.",
      usefulnessTest: "The answer names onion, carrot, and celery.",
      commercialPosture: "none",
    });
    const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
    await addPackageClaim(db, {
      slug: "content-intel-claim",
      packageId: pkg.id,
      claimText: "Mirepoix is a flavor base of onion, carrot, and celery.",
      evidence: { kind: "knowledge_source", id: String(source.id) },
      safetySensitive: false,
    });
    await recordCommercialEvent(db, {
      eventType: "page_view",
      occurredAt: "2026-08-20T12:00:00.000Z",
      campaignId: pkg.id,
      metadata: { attribution: { campaignId: pkg.id } },
    });
    const response = await contentRoute.POST(request(`/api/growth/packages/${pkg.id}/content-intelligence`, {
      email: "admin@example.com",
      method: "POST",
      body: {},
    }), { params: Promise.resolve({ id: pkg.id }) });
    const body = await response.json();
    assert.equal(response.status, 200, body.error || "expected 200");
    assert.equal(body.publishingEnabled, false);
    assert.equal(body.contentIntelligence.publishingEnabled, false);
    assert.equal(body.contentIntelligence.autonomy.mayPublish, false);
    assert.ok(body.contentIntelligence.brief);
    assert.ok(Array.isArray(body.contentIntelligence.drafts));
    const variants = db.database.prepare("SELECT COUNT(*) AS count FROM social_channel_variants WHERE package_id = ?").get(pkg.id);
    assert.equal(variants.count, 0);
    const assembled = await buildPackageContentIntelligence(db, pkg.id);
    assert.equal(assembled?.learning.pageViews, 1);
    assert.equal(assembled?.learning.impressions, null);
    assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  });
});

test("content intelligence stays cycle-free, has no OAuth, and Growth Queue shows the new sections", async () => {
  const assembler = await readFile(new URL("../db/social-content-intelligence.ts", import.meta.url), "utf8");
  assert.doesNotMatch(assembler, /from ["']\.\/social-growth-repository/);
  assert.doesNotMatch(assembler, /createLiveCandidateProvider|createBraveSearchClient|oauth/i);
  const files = [
    "app/growth/social/content-intelligence.ts",
    "app/growth/social/content-drafts.ts",
    "app/growth/social/draft-claim-firewall.ts",
    "app/growth/social/growth-learning.ts",
    "app/api/growth/packages/[id]/content-intelligence/route.ts",
    "app/admin/growth/GrowthQueue.tsx",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /graph\.facebook|api\.pinterest|open\.tiktok|instagram\.com\/oauth|oauth/i);
    assert.doesNotMatch(source, /schedulePost|auto.?publish|publishSocialPackage/);
  }
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /Content Intelligence/);
  assert.match(ui, /Draft Studio/);
  assert.match(ui, /Generate drafts/);
  assert.match(ui, /Claim Firewall/);
  assert.match(ui, /Factual statements authorized/);
  assert.match(ui, /Statements transformed\/removed/);
  assert.match(ui, /Attribution plan/);
  assert.match(ui, /Claims allowed/);
  assert.match(ui, /Commercial route/);
  assert.doesNotMatch(ui, />Publish</);
  assert.doesNotMatch(ui, /Trace: .*no factual statements/);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});
