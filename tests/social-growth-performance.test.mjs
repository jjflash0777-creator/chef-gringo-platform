import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  classifySocialEventAttribution,
  eventOccursInWindow,
  resolveSocialPerformanceWindow,
} from "../app/growth/social/index.ts";
import { recordCommercialEvent } from "../db/revenue-operations-repository.ts";
import { publishSocialPackage } from "../db/social-growth-repository.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const opportunityRoute = await import("../app/api/growth/opportunities/route.ts");
const packageRoute = await import("../app/api/growth/packages/route.ts");
const claimRoute = await import("../app/api/growth/packages/[id]/claims/route.ts");
const variantRoute = await import("../app/api/growth/variants/route.ts");
const approvalRoute = await import("../app/api/growth/approvals/route.ts");
const publicationRoute = await import("../app/api/growth/publications/route.ts");
const prepareRoute = await import("../app/api/growth/publications/prepare/route.ts");
const performanceRoute = await import("../app/api/growth/publications/[id]/performance/route.ts");

const PUBLISHED_AT = "2026-08-22T16:00:00.000Z";
const NOW = "2026-09-30T00:00:00.000Z";

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

async function seedRecordedPublication(db, slug = "perf") {
  const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-opp`, problem: "Need a recorded practice note.", audience: "home_cook", usefulnessTest: "Names mirepoix." },
  }))).json()).opportunity;
  const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-pkg`, opportunityId: opportunity.id, thesis: "Practice note.", usefulnessTest: "On-file only.", commercialPosture: "none" },
  }))).json()).package;
  const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
  await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-claim`, claimText: "Mirepoix is onion, carrot, and celery.", evidence: { kind: "knowledge_source", id: String(source.id) }, safetySensitive: false },
  }), { params: Promise.resolve({ id: pkg.id }) });
  db.database.prepare("UPDATE sources SET verification_status = 'verified' WHERE id = ?").run(source.id);
  const created = await variantRoute.POST(request("/api/growth/variants", {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-ig`, packageId: pkg.id, channel: "instagram", copy: "Caption.", destinationPath: "/learn" },
  }));
  const variant = (await created.json()).variant;
  await approvalRoute.POST(request("/api/growth/approvals", {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-approved`, subjectKind: "package", subjectId: pkg.id, decision: "approved", reason: "Useful and evidenced." },
  }));
  const recorded = await publicationRoute.POST(request("/api/growth/publications", {
    email: "admin@example.com", method: "POST",
    body: {
      slug: `${slug}-post`,
      packageId: pkg.id,
      variantId: variant.id,
      platformPostUrl: "https://www.instagram.com/p/Perf111/",
      publishedAt: PUBLISHED_AT,
    },
  }));
  assert.equal(recorded.status, 201);
  return { pkg, variant, publication: (await recorded.json()).publication };
}

function attribution(publication, extras = {}) {
  return {
    attribution: {
      source: "instagram",
      medium: "social",
      campaignId: publication.packageId,
      content: publication.variantId,
      term: publication.id,
      ...extras,
    },
  };
}

async function event(db, publication, input) {
  return recordCommercialEvent(db, {
    occurredAt: input.occurredAt ?? "2026-08-22T16:10:00.000Z",
    eventType: input.eventType,
    anonymousSessionId: input.anonymousSessionId,
    campaignId: "campaignId" in input ? input.campaignId : publication.packageId,
    contentId: "contentId" in input ? input.contentId : publication.variantId,
    monetaryAmountCents: input.monetaryAmountCents,
    commissionAmountCents: input.commissionAmountCents,
    currency: input.currency,
    metadata: input.metadata ?? attribution(publication),
  });
}

async function performance(publication, window = "since_publication") {
  return performanceRoute.GET(request(`/api/growth/publications/${publication.id}/performance?window=${window}&asOf=${NOW}`, {
    email: "admin@example.com",
  }), { params: Promise.resolve({ id: publication.id }) });
}

test("attribution classification is exact-term only and uses package/variant as integrity checks", () => {
  const publication = { id: "sgo:publication:one", packageId: "sgo:package:a", variantId: "sgo:variant:b" };
  assert.equal(classifySocialEventAttribution({
    eventType: "page_view", occurredAt: PUBLISHED_AT, metadata: { attribution: { term: publication.id } },
  }, publication), "publication_exact");
  assert.equal(classifySocialEventAttribution({
    eventType: "page_view", occurredAt: PUBLISHED_AT,
    metadata: { attribution: { term: publication.id, campaignId: publication.packageId, content: publication.variantId } },
  }, publication), "publication_exact");
  assert.equal(classifySocialEventAttribution({
    eventType: "page_view", occurredAt: PUBLISHED_AT,
    metadata: { attribution: { term: publication.id, campaignId: "sgo:package:other" } },
  }, publication), "unattributed");
  assert.equal(classifySocialEventAttribution({
    eventType: "page_view", occurredAt: PUBLISHED_AT,
    metadata: { attribution: { content: publication.variantId } },
  }, publication), "variant_only");
  assert.equal(classifySocialEventAttribution({
    eventType: "page_view", occurredAt: PUBLISHED_AT,
    metadata: { attribution: { campaignId: publication.packageId } },
  }, publication), "package_only");
  assert.equal(classifySocialEventAttribution({
    eventType: "page_view", occurredAt: PUBLISHED_AT, metadata: {},
  }, publication), "unattributed");
  assert.equal(classifySocialEventAttribution({
    eventType: "page_view",
    occurredAt: PUBLISHED_AT,
    campaignId: publication.packageId,
    contentId: publication.variantId,
    metadata: { attribution: { campaignId: publication.packageId } },
  }, publication), "package_only");
  assert.equal(classifySocialEventAttribution({
    eventType: "page_view",
    occurredAt: PUBLISHED_AT,
    campaignId: "sgo:package:other",
    contentId: publication.variantId,
    metadata: { attribution: { term: publication.id, campaignId: publication.packageId, content: publication.variantId } },
  }, publication), "unattributed");
});

test("time windows are half-open UTC ranges and future publications are empty", () => {
  const firstDay = resolveSocialPerformanceWindow({ publishedAt: PUBLISHED_AT, window: "first_24h", now: "2026-08-24T00:00:00.000Z" });
  assert.equal(firstDay.start, PUBLISHED_AT);
  assert.equal(firstDay.end, "2026-08-23T16:00:00.000Z");
  assert.equal(eventOccursInWindow(PUBLISHED_AT, firstDay), true);
  assert.equal(eventOccursInWindow("2026-08-23T15:59:59.000Z", firstDay), true);
  assert.equal(eventOccursInWindow("2026-08-23T16:00:00.000Z", firstDay), false);
  const week = resolveSocialPerformanceWindow({ publishedAt: PUBLISHED_AT, window: "first_7d", now: NOW });
  assert.equal(week.end, "2026-08-29T16:00:00.000Z");
  assert.equal(eventOccursInWindow("2026-08-29T15:59:59.000Z", week), true);
  assert.equal(eventOccursInWindow("2026-08-29T16:00:00.000Z", week), false);
  const month = resolveSocialPerformanceWindow({ publishedAt: PUBLISHED_AT, window: "first_30d", now: NOW });
  assert.equal(month.end, "2026-09-21T16:00:00.000Z");
  assert.equal(eventOccursInWindow("2026-09-21T15:59:59.000Z", month), true);
  assert.equal(eventOccursInWindow("2026-09-21T16:00:00.000Z", month), false);
  const since = resolveSocialPerformanceWindow({ publishedAt: PUBLISHED_AT, window: "since_publication", now: "2026-08-25T00:00:00.000Z" });
  assert.equal(since.end, "2026-08-25T00:00:00.000Z");
  const future = resolveSocialPerformanceWindow({ publishedAt: "2026-12-01T00:00:00.000Z", window: "since_publication", now: PUBLISHED_AT });
  assert.equal(future.empty, true);
  assert.equal(future.futurePublication, true);
  assert.equal(eventOccursInWindow(PUBLISHED_AT, future), false);
});

test("unauthorized performance access is rejected", async () => {
  await withAdmin(async () => {
    const unauthenticated = await performanceRoute.GET(request("/api/growth/publications/sgo:publication:x/performance"), {
      params: Promise.resolve({ id: "sgo:publication:x" }),
    });
    assert.equal(unauthenticated.status, 401);
    const forbidden = await performanceRoute.GET(request("/api/growth/publications/sgo:publication:x/performance", {
      email: "viewer@example.com",
    }), { params: Promise.resolve({ id: "sgo:publication:x" }) });
    assert.equal(forbidden.status, 403);
    const missing = await performanceRoute.GET(request("/api/growth/publications/sgo:publication:missing/performance", {
      email: "admin@example.com",
    }), { params: Promise.resolve({ id: "sgo:publication:missing" }) });
    assert.equal(missing.status, 404);
  });
});

test("publication-exact first-party metrics count only matching utm_term events", async () => {
  await withAdmin(async (db) => {
    const { pkg, variant, publication } = await seedRecordedPublication(db, "exact");
    const reserved = await prepareRoute.POST(request("/api/growth/publications/prepare", {
      email: "admin@example.com", method: "POST",
      body: { slug: "exact-reserved", packageId: pkg.id, variantId: variant.id },
    }));
    assert.equal(reserved.status, 201);
    const reservedId = (await reserved.json()).publication.id;
    const reservedReport = await performanceRoute.GET(request(`/api/growth/publications/${reservedId}/performance`, {
      email: "admin@example.com",
    }), { params: Promise.resolve({ id: reservedId }) });
    assert.equal(reservedReport.status, 400);
    await event(db, publication, { eventType: "page_view", anonymousSessionId: "session-a" });
    await event(db, publication, { eventType: "page_view", anonymousSessionId: "session-a", occurredAt: "2026-08-22T16:20:00.000Z" });
    await event(db, publication, { eventType: "page_view", anonymousSessionId: "session-b", occurredAt: "2026-08-22T16:30:00.000Z" });
    await event(db, publication, { eventType: "content_view" });
    await event(db, publication, { eventType: "marketplace_view" });
    await event(db, publication, { eventType: "recommendation_view" });
    await event(db, publication, { eventType: "merchant_click" });
    await event(db, publication, { eventType: "affiliate_click" });
    await event(db, publication, { eventType: "email_signup" });
    await event(db, publication, { eventType: "lead" });
    await event(db, publication, {
      eventType: "sale",
      monetaryAmountCents: 2500,
      currency: "USD",
    });
    await event(db, publication, {
      eventType: "page_view",
      anonymousSessionId: "session-variant",
      metadata: { attribution: { content: publication.variantId, campaignId: publication.packageId } },
    });
    await event(db, publication, {
      eventType: "page_view",
      anonymousSessionId: "session-package",
      contentId: null,
      metadata: { attribution: { campaignId: publication.packageId } },
    });
    await event(db, publication, {
      eventType: "page_view",
      anonymousSessionId: "session-conflict",
      metadata: { attribution: { term: publication.id, campaignId: "sgo:package:other" } },
    });
    await event(db, publication, {
      eventType: "page_view",
      anonymousSessionId: "session-none",
      campaignId: null,
      contentId: null,
      metadata: {},
    });
    const response = await performance(publication);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.publishingEnabled, false);
    assert.equal(body.platformReachConnected, false);
    assert.equal(body.report.attributionState, "publication_exact");
    assert.equal(body.report.metrics.pageViews, 3);
    assert.equal(body.report.metrics.uniqueSessions, 2);
    assert.equal(body.report.metrics.contentViews, 1);
    assert.equal(body.report.metrics.marketplaceViews, 1);
    assert.equal(body.report.metrics.recommendationViews, 1);
    assert.equal(body.report.metrics.merchantClicks, 1);
    assert.equal(body.report.metrics.affiliateClicks, 1);
    assert.equal(body.report.metrics.emailSignups, 1);
    assert.equal(body.report.metrics.verifiedLeads, 1);
    assert.equal(body.report.metrics.verifiedSales, 1);
    assert.equal(body.report.metrics.verifiedSalesAmountCents, 2500);
    assert.equal(body.report.diagnostics.variantOnlyEvents, 1);
    assert.equal(body.report.diagnostics.packageOnlyEvents, 1);
    assert.equal(body.report.diagnostics.unattributedCandidates, 1);
    assert.equal(body.report.metrics.pageViews + 0, body.report.metrics.pageViews);
    assert.equal("impressions" in body.report.metrics, false);
    assert.equal("reach" in body.report.metrics, false);
  });
});

test("window boundaries exclude the end instant and ignore later events", async () => {
  await withAdmin(async (db) => {
    const { publication } = await seedRecordedPublication(db, "windows");
    await event(db, publication, { eventType: "page_view", occurredAt: PUBLISHED_AT, anonymousSessionId: "in-24h" });
    await event(db, publication, { eventType: "page_view", occurredAt: "2026-08-23T16:00:00.000Z", anonymousSessionId: "end-24h" });
    await event(db, publication, { eventType: "page_view", occurredAt: "2026-08-29T15:59:59.000Z", anonymousSessionId: "in-7d" });
    await event(db, publication, { eventType: "page_view", occurredAt: "2026-08-29T16:00:00.000Z", anonymousSessionId: "end-7d" });
    await event(db, publication, { eventType: "page_view", occurredAt: "2026-09-21T15:59:59.000Z", anonymousSessionId: "in-30d" });
    await event(db, publication, { eventType: "page_view", occurredAt: "2026-09-21T16:00:00.000Z", anonymousSessionId: "end-30d" });
    const day = await (await performance(publication, "first_24h")).json();
    assert.equal(day.report.metrics.pageViews, 1);
    const week = await (await performance(publication, "first_7d")).json();
    assert.equal(week.report.metrics.pageViews, 3);
    const month = await (await performance(publication, "first_30d")).json();
    assert.equal(month.report.metrics.pageViews, 5);
    const since = await (await performance(publication, "since_publication")).json();
    assert.equal(since.report.metrics.pageViews, 6);
  });
});

test("future publications and click events do not invent revenue or reach", async () => {
  await withAdmin(async (db) => {
    const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com", method: "POST",
      body: { slug: "future-opp", problem: "Need a note.", audience: "home_cook", usefulnessTest: "Names mirepoix." },
    }))).json()).opportunity;
    const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com", method: "POST",
      body: { slug: "future-pkg", opportunityId: opportunity.id, thesis: "Note.", usefulnessTest: "On-file.", commercialPosture: "none" },
    }))).json()).package;
    const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
    await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com", method: "POST",
      body: { slug: "future-claim", claimText: "Mirepoix is onion, carrot, and celery.", evidence: { kind: "knowledge_source", id: String(source.id) }, safetySensitive: false },
    }), { params: Promise.resolve({ id: pkg.id }) });
    db.database.prepare("UPDATE sources SET verification_status = 'verified' WHERE id = ?").run(source.id);
    const variant = (await (await variantRoute.POST(request("/api/growth/variants", {
      email: "admin@example.com", method: "POST",
      body: { slug: "future-ig", packageId: pkg.id, channel: "instagram", copy: "Caption.", destinationPath: "/learn" },
    }))).json()).variant;
    await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com", method: "POST",
      body: { slug: "future-approved", subjectKind: "package", subjectId: pkg.id, decision: "approved", reason: "Useful." },
    }));
    const recorded = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "future-post",
        packageId: pkg.id,
        variantId: variant.id,
        platformPostUrl: "https://www.instagram.com/p/Future111/",
        publishedAt: "2026-12-01T00:00:00.000Z",
      },
    }));
    const publication = (await recorded.json()).publication;
    await event(db, publication, { eventType: "affiliate_click", occurredAt: PUBLISHED_AT });
    await event(db, publication, { eventType: "page_view", occurredAt: PUBLISHED_AT });
    const report = await (await performance(publication)).json();
    assert.equal(report.report.window.futurePublication, true);
    assert.equal(report.report.metrics.pageViews, 0);
    assert.equal(report.report.metrics.affiliateClicks, 0);
    assert.equal(report.report.metrics.verifiedSales, 0);
    assert.equal(report.report.metrics.verifiedSalesAmountCents, null);
    assert.equal(report.platformReachConnected, false);
  });
});

test("performance reporting never publishes, fetches, or invents platform metrics", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.throws(() => publishSocialPackage(), /cannot publish/);
  const files = [
    "app/growth/social/types.ts",
    "app/growth/social/performance.ts",
    "db/social-performance-repository.ts",
    "app/api/growth/publications/[id]/performance/route.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /graph\.facebook|insights|api\.pinterest|open\.tiktok|fbq\(|Conversions API/i);
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /schedulePost|cron|cloudflare queue|auto.?publish/i);
    assert.doesNotMatch(source, /impressions|reach|likes|shares|saves/);
  }
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /FIRST-PARTY CHEF GRINGO PERFORMANCE/);
  assert.match(ui, /Platform reach\/engagement not connected yet/);
  assert.doesNotMatch(ui, />Publish</);
});
