import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_CHANNELS,
  SOCIAL_PUBLISH_AVAILABLE,
  hasValidSocialPublicationAuthority,
  parsePlatformPostUrl,
  socialPublicationId,
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

const PLATFORM_URLS = {
  facebook: "https://www.facebook.com/chefgringo/posts/111",
  instagram: "https://www.instagram.com/p/AbC111/",
  pinterest: "https://www.pinterest.com/pin/111/",
  tiktok: "https://www.tiktok.com/@chefgringo/video/111",
};

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

async function seedApprovedWorkspace(db, slug = "manual-record") {
  const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-opp`, problem: "Need a recorded practice note.", audience: "home_cook", usefulnessTest: "Names mirepoix." },
  }))).json()).opportunity;
  const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-pkg`, opportunityId: opportunity.id, thesis: "Practice note.", usefulnessTest: "No live-web claim.", commercialPosture: "none" },
  }))).json()).package;
  const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
  await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-claim`, claimText: "Mirepoix is onion, carrot, and celery.", evidence: { kind: "knowledge_source", id: String(source.id) }, safetySensitive: false },
  }), { params: Promise.resolve({ id: pkg.id }) });
  const variants = {};
  for (const channel of SOCIAL_CHANNELS) {
    const created = await variantRoute.POST(request("/api/growth/variants", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: `${slug}-${channel}`,
        packageId: pkg.id,
        channel,
        copy: `${channel} caption for manual posting.`,
        destinationPath: "/learn",
      },
    }));
    assert.equal(created.status, 201);
    variants[channel] = await created.json();
  }
  const approved = await approvalRoute.POST(request("/api/growth/approvals", {
    email: "admin@example.com", method: "POST",
    body: { slug: `${slug}-approved`, subjectKind: "package", subjectId: pkg.id, decision: "approved", reason: "Useful and evidenced." },
  }));
  assert.equal(approved.status, 201);
  return { opportunity, pkg, variants };
}

function recordBody(workspace, channel, overrides = {}) {
  const created = workspace.variants[channel];
  return {
    slug: `post-${channel}-${overrides.slugSuffix ?? "one"}`,
    packageId: workspace.pkg.id,
    variantId: created.variant.id,
    channel,
    platformPostUrl: PLATFORM_URLS[channel],
    platformPostId: overrides.platformPostId,
    publishedAt: "2026-08-22T16:00:00.000Z",
    destinationUrlId: created.destination.id,
    ...overrides,
  };
}

test("platform URL validation is local, conservative, and channel-bound", () => {
  assert.equal(parsePlatformPostUrl("https://www.facebook.com/posts/1", "facebook").href, "https://facebook.com/posts/1");
  assert.equal(parsePlatformPostUrl("https://instagram.com/p/AbC/", "instagram").href, "https://instagram.com/p/AbC");
  assert.equal(parsePlatformPostUrl("https://www.pinterest.com/pin/9/", "pinterest").channel, "pinterest");
  assert.equal(parsePlatformPostUrl("https://www.tiktok.com/@chef/video/9", "tiktok").channel, "tiktok");
  assert.throws(() => parsePlatformPostUrl("https://www.instagram.com/p/AbC/", "facebook"), /does not match the facebook variant/);
  assert.throws(() => parsePlatformPostUrl("https://example.com/p/AbC", "instagram"), /matching Facebook, Instagram, Pinterest, or TikTok host/);
  assert.throws(() => parsePlatformPostUrl("javascript:alert(1)", "tiktok"), /unsafe protocol/);
  assert.throws(() => parsePlatformPostUrl("data:text/html,hi", "tiktok"), /unsafe protocol/);
  assert.throws(() => parsePlatformPostUrl("file:///tmp/post", "pinterest"), /unsafe protocol|malformed/);
  assert.throws(() => parsePlatformPostUrl("https://user:pass@instagram.com/p/AbC", "instagram"), /credentials/);
  assert.throws(() => parsePlatformPostUrl("not a url", "facebook"), /malformed/);
  assert.throws(() => parsePlatformPostUrl("https://l.facebook.com/l.php?u=1", "facebook"), /matching Facebook|does not match/);
  assert.equal(
    parsePlatformPostUrl("https://www.instagram.com/p/ABC123/?igsh=xyz#comments", "instagram").identity,
    parsePlatformPostUrl("https://instagram.com/p/ABC123/", "instagram").identity,
  );
  assert.equal(
    parsePlatformPostUrl("https://facebook.com/story.php?story_fbid=9&fbclid=aaa", "facebook").identity,
    parsePlatformPostUrl("https://www.facebook.com/story.php?story_fbid=9&fbclid=bbb", "facebook").identity,
  );
  assert.notEqual(
    parsePlatformPostUrl("https://facebook.com/story.php?story_fbid=9", "facebook").identity,
    parsePlatformPostUrl("https://facebook.com/story.php?story_fbid=10", "facebook").identity,
  );
});

test("unauthorized publication-record access is rejected", async () => {
  await withAdmin(async () => {
    const unauthenticated = await publicationRoute.POST(request("/api/growth/publications", {
      method: "POST",
      body: { platformPostUrl: PLATFORM_URLS.instagram },
    }));
    assert.equal(unauthenticated.status, 401);
    const forbidden = await publicationRoute.POST(request("/api/growth/publications", {
      email: "viewer@example.com", method: "POST",
      body: { platformPostUrl: PLATFORM_URLS.instagram },
    }));
    assert.equal(forbidden.status, 403);
    const prepareDenied = await prepareRoute.POST(request("/api/growth/publications/prepare", {
      method: "POST",
      body: { slug: "nope" },
    }));
    assert.equal(prepareDenied.status, 401);
  });
});

test("approved variant can create a manual publication record with server-side actor identity", async () => {
  await withAdmin(async (db) => {
    const workspace = await seedApprovedWorkspace(db, "record-ok");
    const created = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: {
        ...recordBody(workspace, "instagram"),
        actorEmail: "impostor@example.com",
      },
    }));
    assert.equal(created.status, 201);
    const body = await created.json();
    assert.equal(body.publishingEnabled, false);
    assert.equal(body.publication.mode, "manual");
    assert.equal(body.publication.channel, "instagram");
    assert.equal(body.publication.actorEmail, "admin@example.com");
    assert.notEqual(body.publication.actorEmail, "impostor@example.com");
    assert.equal(body.publication.destinationUrlId, workspace.variants.instagram.destination.id);
    assert.equal(body.publication.platformPostUrl, "https://instagram.com/p/AbC111");
    assert.equal(body.publication.id, socialPublicationId("post-instagram-one"));
    assert.equal(body.publication.status, "recorded");
    assert.equal(body.attribution.utmCampaign, workspace.pkg.id);
    assert.equal(body.attribution.utmContent, workspace.variants.instagram.variant.id);
    assert.equal(body.attribution.utmTerm, body.publication.id);
    assert.equal(body.attribution.publicationId, body.publication.id);
    assert.equal(body.attribution.destinationUrlId, workspace.variants.instagram.destination.id);
    assert.equal(new URL(body.publication.trackedHref).searchParams.get("utm_term"), body.publication.id);
    assert.equal(new URL(body.publication.trackedHref).searchParams.get("utm_campaign"), workspace.pkg.id);
    assert.equal(new URL(body.publication.trackedHref).searchParams.get("utm_content"), workspace.variants.instagram.variant.id);
    const row = db.database.prepare("SELECT actor_email AS email, mode, destination_url_id AS destinationId FROM social_publications WHERE id = ?").get(body.publication.id);
    assert.equal(row.email, "admin@example.com");
    assert.equal(row.mode, "manual");
    assert.equal(row.destinationId, workspace.variants.instagram.destination.id);
  });
});

test("unapproved subjects and status-only approval cannot create a publication record", async () => {
  await withAdmin(async (db) => {
    const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com", method: "POST",
      body: { slug: "unapproved-opp", problem: "Need a note.", audience: "home_cook", usefulnessTest: "Names mirepoix." },
    }))).json()).opportunity;
    const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com", method: "POST",
      body: { slug: "unapproved-pkg", opportunityId: opportunity.id, thesis: "Note.", usefulnessTest: "On-file only.", commercialPosture: "none" },
    }))).json()).package;
    const created = await variantRoute.POST(request("/api/growth/variants", {
      email: "admin@example.com", method: "POST",
      body: { slug: "unapproved-ig", packageId: pkg.id, channel: "instagram", copy: "Draft.", destinationPath: "/learn" },
    }));
    const variant = await created.json();
    const unapproved = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "unapproved-post",
        packageId: pkg.id,
        variantId: variant.variant.id,
        channel: "instagram",
        platformPostUrl: PLATFORM_URLS.instagram,
        publishedAt: "2026-08-22T16:00:00.000Z",
      },
    }));
    assert.equal(unapproved.status, 400);
    db.database.prepare("UPDATE social_content_packages SET status = 'approved' WHERE id = ?").run(pkg.id);
    const statusOnly = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "status-only-post",
        packageId: pkg.id,
        variantId: variant.variant.id,
        platformPostUrl: PLATFORM_URLS.instagram,
        publishedAt: "2026-08-22T16:00:00.000Z",
      },
    }));
    assert.equal(statusOnly.status, 400);
    assert.equal(hasValidSocialPublicationAuthority({
      packageId: pkg.id,
      variantId: variant.variant.id,
      approvals: [],
      packageStatus: "approved",
    }), false);
  });
});

test("package, channel, and destination mismatches are rejected", async () => {
  await withAdmin(async (db) => {
    const first = await seedApprovedWorkspace(db, "mismatch-a");
    const second = await seedApprovedWorkspace(db, "mismatch-b");
    const packageMismatch = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(first, "pinterest", { packageId: second.pkg.id }),
    }));
    assert.equal(packageMismatch.status, 400);
    const channelMismatch = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(first, "pinterest", { channel: "facebook" }),
    }));
    assert.equal(channelMismatch.status, 400);
    const destinationMismatch = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(first, "pinterest", { destinationUrlId: first.variants.facebook.destination.id }),
    }));
    assert.equal(destinationMismatch.status, 400);
  });
});

test("each platform URL is accepted only for its matching channel", async () => {
  await withAdmin(async (db) => {
    const workspace = await seedApprovedWorkspace(db, "hosts");
    for (const channel of SOCIAL_CHANNELS) {
      const accepted = await publicationRoute.POST(request("/api/growth/publications", {
        email: "admin@example.com", method: "POST",
        body: recordBody(workspace, channel, { slugSuffix: "ok" }),
      }));
      assert.equal(accepted.status, 201, channel);
      const wrong = SOCIAL_CHANNELS.find((item) => item !== channel);
      const rejected = await publicationRoute.POST(request("/api/growth/publications", {
        email: "admin@example.com", method: "POST",
        body: recordBody(workspace, channel, {
          slugSuffix: `wrong-${wrong}`,
          platformPostUrl: PLATFORM_URLS[wrong],
        }),
      }));
      assert.equal(rejected.status, 400, `${channel} rejected ${wrong}`);
    }
  });
});

test("malformed, unsafe, and external platform URLs are rejected", async () => {
  await withAdmin(async (db) => {
    const workspace = await seedApprovedWorkspace(db, "unsafe-url");
    const rejected = [
      "javascript:alert(1)",
      "data:text/html,post",
      "https://user:pass@instagram.com/p/AbC111",
      "https://example.com/p/AbC111",
      "https://amazon.com/dp/B000EXAMPLE",
      "not-a-url",
    ];
    for (const [index, platformPostUrl] of rejected.entries()) {
      const response = await publicationRoute.POST(request("/api/growth/publications", {
        email: "admin@example.com", method: "POST",
        body: recordBody(workspace, "instagram", { slugSuffix: `bad-${index}`, platformPostUrl }),
      }));
      assert.equal(response.status, 400, platformPostUrl);
    }
  });
});

test("duplicate publication URL is rejected and a distinct reshare is allowed", async () => {
  await withAdmin(async (db) => {
    const workspace = await seedApprovedWorkspace(db, "dupes");
    const first = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(workspace, "tiktok", { slugSuffix: "first", platformPostId: "video-111" }),
    }));
    assert.equal(first.status, 201);
    const sameUrl = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(workspace, "tiktok", {
        slugSuffix: "same-url",
        platformPostUrl: "https://tiktok.com/@chefgringo/video/111",
        platformPostId: "video-222",
      }),
    }));
    assert.equal(sameUrl.status, 400);
    const sameId = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(workspace, "tiktok", {
        slugSuffix: "same-id",
        platformPostUrl: "https://www.tiktok.com/@chefgringo/video/999",
        platformPostId: "video-111",
      }),
    }));
    assert.equal(sameId.status, 400);
    const reshare = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(workspace, "tiktok", {
        slugSuffix: "reshare",
        platformPostUrl: "https://www.tiktok.com/@chefgringo/video/222",
        platformPostId: "video-222",
      }),
    }));
    assert.equal(reshare.status, 201);
    assert.equal((await reshare.json()).publication.platformPostUrl, "https://tiktok.com/@chefgringo/video/222");
    const firstIg = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(workspace, "instagram", { slugSuffix: "canonical" }),
    }));
    assert.equal(firstIg.status, 201);
    const trackedCopy = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(workspace, "instagram", {
        slugSuffix: "tracked-copy",
        platformPostUrl: "https://www.instagram.com/p/AbC111/?igsh=xyz#comments",
      }),
    }));
    assert.equal(trackedCopy.status, 400);
  });
});

test("manual records never enable network publishing and do not fetch", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.throws(() => publishSocialPackage(), /cannot publish/);
  const files = [
    "app/growth/social/platform-urls.ts",
    "app/growth/social/publications.ts",
    "app/api/growth/publications/route.ts",
    "app/api/growth/publications/prepare/route.ts",
    "db/social-growth-repository.ts",
    "app/admin/growth/GrowthQueue.tsx",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /graph\.facebook|api\.pinterest|open\.tiktok|instagram\.com\/oauth|fbq\(|Conversions API/i);
    if (!file.endsWith("GrowthQueue.tsx")) assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /schedulePost|cron|cloudflare queue|auto.?publish/i);
  }
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /MANUAL PUBLICATION RECORD — Chef Gringo does not post to the platform/);
  assert.match(ui, /Save publication record/);
  assert.match(ui, /Prepare tracked URL/);
  assert.match(ui, /utm_term/);
  assert.doesNotMatch(ui, />Publish</);
  const route = await readFile(new URL("../app/api/growth/publications/route.ts", import.meta.url), "utf8");
  assert.match(route, /administrator\.email/);
  assert.doesNotMatch(route, /body\.actorEmail/);
});

test("prepare reserves a stable publication id and distinguishable tracked destinations", async () => {
  await withAdmin(async (db) => {
    const workspace = await seedApprovedWorkspace(db, "reserve");
    const missingSlug = await prepareRoute.POST(request("/api/growth/publications/prepare", {
      email: "admin@example.com", method: "POST",
      body: { packageId: workspace.pkg.id, variantId: workspace.variants.pinterest.variant.id },
    }));
    assert.equal(missingSlug.status, 400);
    const first = await prepareRoute.POST(request("/api/growth/publications/prepare", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "pin-one",
        packageId: workspace.pkg.id,
        variantId: workspace.variants.pinterest.variant.id,
        actorEmail: "impostor@example.com",
      },
    }));
    assert.equal(first.status, 201);
    const reserved = await first.json();
    assert.equal(reserved.publication.id, socialPublicationId("pin-one"));
    assert.equal(reserved.publication.status, "reserved");
    assert.equal(reserved.publication.actorEmail, "admin@example.com");
    assert.equal(reserved.attribution.utmTerm, reserved.publication.id);
    assert.equal(reserved.attribution.utmCampaign, workspace.pkg.id);
    assert.equal(reserved.attribution.utmContent, workspace.variants.pinterest.variant.id);
    const again = await prepareRoute.POST(request("/api/growth/publications/prepare", {
      email: "admin@example.com", method: "POST",
      body: { slug: "pin-one", packageId: workspace.pkg.id, variantId: workspace.variants.pinterest.variant.id },
    }));
    assert.equal((await again.json()).publication.id, reserved.publication.id);
    const second = await prepareRoute.POST(request("/api/growth/publications/prepare", {
      email: "admin@example.com", method: "POST",
      body: { slug: "pin-two", packageId: workspace.pkg.id, variantId: workspace.variants.pinterest.variant.id },
    }));
    const other = await second.json();
    assert.equal(second.status, 201);
    assert.notEqual(other.publication.trackedHref, reserved.publication.trackedHref);
    assert.equal(new URL(other.publication.trackedHref).searchParams.get("utm_campaign"), workspace.pkg.id);
    assert.equal(new URL(other.publication.trackedHref).searchParams.get("utm_content"), workspace.variants.pinterest.variant.id);
    assert.equal(new URL(other.publication.trackedHref).searchParams.get("utm_term"), other.publication.id);
    const completed = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "pin-one",
        packageId: workspace.pkg.id,
        variantId: workspace.variants.pinterest.variant.id,
        platformPostUrl: PLATFORM_URLS.pinterest,
        publishedAt: "2026-08-22T16:00:00.000Z",
      },
    }));
    assert.equal(completed.status, 201);
    assert.equal((await completed.json()).publication.status, "recorded");
  });
});

test("publication id survives first-party UTM capture", async () => {
  await withAdmin(async (db) => {
    const workspace = await seedApprovedWorkspace(db, "analytics");
    const created = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(workspace, "facebook"),
    }));
    const publication = (await created.json()).publication;
    await recordCommercialEvent(db, {
      id: "event:social-term",
      eventType: "page_view",
      occurredAt: "2026-08-22T16:05:00.000Z",
      pagePath: "/learn",
      campaignId: workspace.pkg.id,
      contentId: workspace.variants.facebook.variant.id,
      source: "facebook",
      channel: "social",
      metadata: {
        attribution: {
          source: "facebook",
          medium: "social",
          campaignId: workspace.pkg.id,
          content: workspace.variants.facebook.variant.id,
          term: publication.id,
        },
      },
    });
    const row = db.database.prepare("SELECT campaign_id AS campaignId, content_id AS contentId, metadata FROM commercial_events WHERE id = ?").get("event:social-term");
    assert.equal(row.campaignId, workspace.pkg.id);
    assert.equal(row.contentId, workspace.variants.facebook.variant.id);
    assert.equal(JSON.parse(row.metadata).attribution.term, publication.id);
    const bridge = await readFile(new URL("../app/components/AnalyticsBridge.tsx", import.meta.url), "utf8");
    assert.match(bridge, /params\.get\("utm_term"\)/);
    assert.match(bridge, /attribution/);
  });
});

test("migration uniqueness protections exist after the normal migration sequence", async () => {
  await withAdmin(async (db) => {
    const indexes = db.database.prepare(`
      SELECT name, sql FROM sqlite_master
      WHERE type = 'index' AND name IN ('social_publications_variant_url_idx', 'social_publications_variant_post_id_idx')
      ORDER BY name
    `).all();
    assert.equal(indexes.length, 2);
    for (const index of indexes) assert.match(index.sql, /WHERE/i);
    const workspace = await seedApprovedWorkspace(db, "idx");
    const recorded = await publicationRoute.POST(request("/api/growth/publications", {
      email: "admin@example.com", method: "POST",
      body: recordBody(workspace, "facebook", { slugSuffix: "one", platformPostId: "fb-1" }),
    }));
    assert.equal(recorded.status, 201);
    const publication = (await recorded.json()).publication;
    const duplicateId = () => db.database.prepare(`
      INSERT INTO social_publications (
        id, package_id, variant_id, channel, mode, status, platform_post_id, platform_post_url,
        destination_url_id, tracked_href, published_at, recorded_at, actor_email
      ) VALUES (?, ?, ?, 'facebook', 'manual', 'recorded', ?, ?, ?, 'https://chefgringo.com/learn', '2026-08-22T16:00:00.000Z', '2026-08-22T16:00:00.000Z', 'admin@example.com')
    `);
    assert.throws(() => duplicateId().run(
      "sgo:publication:idx-dup-url",
      publication.packageId,
      publication.variantId,
      "fb-2",
      publication.platformPostUrl,
      publication.destinationUrlId,
    ));
    assert.throws(() => duplicateId().run(
      "sgo:publication:idx-dup-post",
      publication.packageId,
      publication.variantId,
      "fb-1",
      "https://facebook.com/chefgringo/posts/999",
      publication.destinationUrlId,
    ));
    duplicateId().run(
      "sgo:publication:idx-distinct",
      publication.packageId,
      publication.variantId,
      "fb-9",
      "https://facebook.com/chefgringo/posts/999",
      publication.destinationUrlId,
    );
    const reservedA = await prepareRoute.POST(request("/api/growth/publications/prepare", {
      email: "admin@example.com", method: "POST",
      body: { slug: "idx-reserved-a", packageId: workspace.pkg.id, variantId: workspace.variants.instagram.variant.id },
    }));
    const reservedB = await prepareRoute.POST(request("/api/growth/publications/prepare", {
      email: "admin@example.com", method: "POST",
      body: { slug: "idx-reserved-b", packageId: workspace.pkg.id, variantId: workspace.variants.instagram.variant.id },
    }));
    assert.equal(reservedA.status, 201);
    assert.equal(reservedB.status, 201);
    const nullCount = db.database.prepare(`
      SELECT count(*) AS count FROM social_publications
      WHERE variant_id = ? AND platform_post_id IS NULL AND platform_post_url IS NULL
    `).get(workspace.variants.instagram.variant.id);
    assert.equal(nullCount.count, 2);
  });
});
