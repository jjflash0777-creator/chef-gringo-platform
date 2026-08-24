import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_CHANNELS,
  SOCIAL_GROWTH_STEP,
  SOCIAL_PUBLISH_AVAILABLE,
  hasValidSocialApproval,
  publicationIsAuthorized,
  SOCIAL_UTM_MEDIUM,
  assertNoEconomicsRankingFields,
  assertPostureMatchesLinkKind,
  assertPublishUnavailable,
  canPublishNow,
  claimMaySupportApproval,
  mintSocialDestinationUrl,
  createApprovalRecord,
  socialGrowthId,
  socialPublicationId,
} from "../app/growth/social/index.ts";
import { canonicalizeUrl } from "../app/lib/research/url-safety.ts";
import {
  addPackageClaim,
  createChannelVariant,
  createContentAsset,
  createContentOpportunity,
  createContentPackage,
  getContentPackage,
  getDestinationUrl,
  listSocialGrowthWriteMethods,
  publishSocialPackage,
  recordSocialApproval,
  resolveSocialEvidence,
} from "../db/social-growth-repository.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

async function database() {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  return db;
}

async function seedPackage(db, slug = "mirepoix-explain") {
  const opportunity = await createContentOpportunity(db, {
    slug: `${slug}-opportunity`,
    problem: "Home cooks ask what mirepoix is and get vague answers.",
    audience: "home_cook",
    usefulnessTest: "The reader can name the three vegetables and the usual ratio.",
    productId: null,
    workflowId: null,
    partnerOpportunityId: null,
    status: "selected",
  });
  const pkg = await createContentPackage(db, {
    slug,
    opportunityId: opportunity.id,
    thesis: "Explain mirepoix as standard culinary practice, then offer a next cooking step.",
    usefulnessTest: "The answer names onion, carrot, celery and does not invent a live source check.",
    commercialPosture: "none",
  });
  const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
  const claim = await addPackageClaim(db, {
    slug: `${slug}-claim`,
    packageId: pkg.id,
    claimText: "Mirepoix is a flavor base of onion, carrot, and celery.",
    evidence: { kind: "knowledge_source", id: String(source.id) },
    safetySensitive: false,
  });
  return { opportunity, pkg, claim, sourceId: source.id };
}

test("Social Growth cannot publish and status is not publication authority", () => {
  assert.equal(SOCIAL_GROWTH_STEP, 3);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.equal(hasValidSocialApproval({
    subjectKind: "package",
    subjectId: "sgo:package:example",
    approvals: [],
    packageStatus: "approved",
  }), false);
  assert.equal(publicationIsAuthorized({
    subjectKind: "package",
    subjectId: "sgo:package:example",
    approvals: [{
      id: "sgo:approval:example",
      subjectKind: "package",
      subjectId: "sgo:package:example",
      decision: "approved",
      actorEmail: "founder@chefgringo.com",
      reason: "Useful and evidenced",
      occurredAt: "2026-08-22T00:00:00.000Z",
    }],
  }), false);
  assert.throws(() => assertPublishUnavailable(), /cannot publish/);
  assert.throws(() => publishSocialPackage(), /cannot publish/);
  assert.equal(canPublishNow({
    id: "sgo:approval:example",
    subjectKind: "package",
    subjectId: "sgo:package:example",
    decision: "approved",
    actorEmail: "founder@chefgringo.com",
    reason: "Useful and evidenced",
    occurredAt: "2026-08-22T00:00:00.000Z",
  }), false);
  assert.ok(!listSocialGrowthWriteMethods().includes("publishSocialPackage"));
  assert.throws(() => createApprovalRecord({
    slug: "no-actor",
    subjectKind: "package",
    subjectId: "sgo:package:example",
    decision: "approved",
    actorEmail: "",
    reason: "Missing identity.",
  }), /authenticated administrator email/);
});

test("package and variant identifiers are stable and canonical", () => {
  assert.equal(socialGrowthId("evidence-request", "Running-Load"), "sgo:evidence-request:running-load");
  assert.equal(socialGrowthId("package", "Mirepoix-Explain"), "sgo:package:mirepoix-explain");
  assert.equal(socialGrowthId("variant", "mirepoix-pinterest"), "sgo:variant:mirepoix-pinterest");
  assert.equal(socialPublicationId("mirepoix-ig-one"), "sgo:publication:mirepoix-ig-one");
  assert.equal(socialPublicationId("mirepoix-ig-one"), socialPublicationId("Mirepoix-Ig-One"));
  assert.throws(() => socialGrowthId("package", "Not A Slug"), /kebab slug/);
  assert.throws(() => socialGrowthId("variant", "sgo:package:x"), /kebab slug/);
});

test("UTM minting covers all four channels and preserves legitimate query params", () => {
  const packageId = socialGrowthId("package", "mirepoix-explain");
  const variantId = socialGrowthId("variant", "mirepoix-pin");
  for (const channel of SOCIAL_CHANNELS) {
    const minted = mintSocialDestinationUrl({
      pathOrUrl: "/learn?ref=nav&topic=aromatics",
      channel,
      packageId,
      variantId,
    });
    const url = new URL(minted.href);
    assert.equal(url.origin, "https://chefgringo.com");
    assert.equal(url.pathname, "/learn");
    assert.equal(url.searchParams.get("ref"), "nav");
    assert.equal(url.searchParams.get("topic"), "aromatics");
    assert.equal(url.searchParams.get("utm_source"), channel);
    assert.equal(url.searchParams.get("utm_medium"), SOCIAL_UTM_MEDIUM);
    assert.equal(url.searchParams.get("utm_campaign"), packageId);
    assert.equal(url.searchParams.get("utm_content"), variantId);
    assert.equal(url.searchParams.get("utm_term"), null);
    assert.equal(minted.href, mintSocialDestinationUrl({
      pathOrUrl: "/learn?ref=nav&topic=aromatics",
      channel,
      packageId,
      variantId,
    }).href);
  }
});

test("conflicting reserved UTM keys are replaced, not duplicated", () => {
  const packageId = socialGrowthId("package", "ground-beef-temp");
  const variantId = socialGrowthId("variant", "ground-beef-facebook");
  const minted = mintSocialDestinationUrl({
    pathOrUrl: "https://www.chefgringo.com/learn?utm_source=old-source&utm_medium=email&utm_campaign=stale&utm_content=old&utm_term=keep&ref=hero",
    channel: "facebook",
    packageId,
    variantId,
  });
  const url = new URL(minted.href);
  assert.equal(url.origin, "https://chefgringo.com");
  assert.equal(url.searchParams.get("utm_source"), "facebook");
  assert.equal(url.searchParams.get("utm_medium"), "social");
  assert.equal(url.searchParams.get("utm_campaign"), packageId);
  assert.equal(url.searchParams.get("utm_content"), variantId);
  assert.equal(url.searchParams.get("utm_term"), "keep");
  assert.equal(url.searchParams.get("ref"), "hero");
  assert.equal(url.searchParams.getAll("utm_source").length, 1);
  assert.deepEqual(minted.replacedUtmKeys.sort(), ["utm_campaign", "utm_content", "utm_medium", "utm_source"]);
  const publicationId = socialPublicationId("ground-beef-facebook-one");
  const withTerm = mintSocialDestinationUrl({
    pathOrUrl: "https://www.chefgringo.com/learn?utm_term=keep&ref=hero",
    channel: "facebook",
    packageId,
    variantId,
    publicationId,
  });
  const published = new URL(withTerm.href);
  assert.equal(published.searchParams.get("utm_campaign"), packageId);
  assert.equal(published.searchParams.get("utm_content"), variantId);
  assert.equal(published.searchParams.get("utm_term"), publicationId);
  assert.equal(published.searchParams.getAll("utm_term").length, 1);
});

test("unsafe and external destinations are rejected", () => {
  const packageId = socialGrowthId("package", "safe-dest");
  const variantId = socialGrowthId("variant", "safe-dest-ig");
  const reject = (pathOrUrl) => assert.throws(() => mintSocialDestinationUrl({
    pathOrUrl,
    channel: "instagram",
    packageId,
    variantId,
  }));
  reject("https://amazon.com/dp/B000EXAMPLE");
  reject("https://www.thermoworks.com/thermapen");
  reject("javascript:alert(1)");
  reject("data:text/html,hi");
  reject("//evil.example/phish");
  reject("https://chefgringo.com.evil.example/learn");
  reject("https://user:pass@chefgringo.com/learn");
  reject("http://chefgringo.com/learn");
  reject("amazon.com/dp/1");
});

test("research URL normalization is unchanged and still strips UTMs", () => {
  const research = canonicalizeUrl("https://Example.com/a/?utm_source=x&utm_campaign=y&keep=1");
  assert.equal(research, "https://example.com/a?keep=1");
  const social = mintSocialDestinationUrl({
    pathOrUrl: "/a?keep=1",
    channel: "tiktok",
    packageId: socialGrowthId("package", "norm-check"),
    variantId: socialGrowthId("variant", "norm-check-tt"),
  });
  assert.match(social.href, /utm_source=tiktok/);
  assert.equal(canonicalizeUrl(social.href), "https://chefgringo.com/a?keep=1");
});

test("commercial posture cannot carry economics ranking fields", () => {
  assert.throws(() => assertNoEconomicsRankingFields({ commissionCents: 250 }), /economics ranking fields/);
  assert.throws(() => assertNoEconomicsRankingFields({ epc: 1.2, roas: 4 }), /economics ranking fields/);
  assert.doesNotThrow(() => assertNoEconomicsRankingFields({ commercialPosture: "affiliate" }));
  assert.throws(() => assertPostureMatchesLinkKind("none", "affiliate"), /non-commercial package/);
  assert.doesNotThrow(() => assertPostureMatchesLinkKind("affiliate", "affiliate"));
});

test("claims require existing evidence and do not invent verification", async () => {
  const db = await database();
  const { pkg, sourceId } = await seedPackage(db, "claim-evidence");
  const referenced = await resolveSocialEvidence(db, { kind: "knowledge_source", id: String(sourceId) });
  assert.equal(referenced.exists, true);
  assert.equal(referenced.verificationStatus, "draft");
  assert.equal(claimMaySupportApproval({ safetySensitive: false, referenced }), true);
  assert.equal(claimMaySupportApproval({ safetySensitive: true, referenced }), false);
  await assert.rejects(
    () => addPackageClaim(db, {
      slug: "missing-source",
      packageId: pkg.id,
      claimText: "Invented verification.",
      evidence: { kind: "knowledge_source", id: "999999" },
      safetySensitive: false,
    }),
    /existing Chef Gringo source/,
  );
  await assert.rejects(
    () => addPackageClaim(db, {
      slug: "unsafe-draft",
      packageId: pkg.id,
      claimText: "Cook ground beef to 160°F.",
      evidence: { kind: "knowledge_source", id: String(sourceId) },
      safetySensitive: true,
    }),
    /verified knowledge source/,
  );
  db.close();
});

test("persistence round-trip mints a destination and records approval without publishing", async () => {
  const db = await database();
  const { pkg } = await seedPackage(db, "persist-roundtrip");
  db.database.prepare("UPDATE sources SET verification_status = 'verified' WHERE id IN (SELECT evidence_id FROM social_package_claims WHERE package_id = ?)").run(pkg.id);
  const asset = await createContentAsset(db, {
    slug: "prep-still",
    assetType: "still",
    altText: "Commercial kitchen prep table",
    license: "editorial-unsplash",
    provenanceNote: "Existing Chef Gringo editorial still.",
    uri: "/images/editorial/commercial-kitchen-prep.jpg",
  });
  const { variant, destination } = await createChannelVariant(db, {
    slug: "persist-pinterest",
    packageId: pkg.id,
    channel: "pinterest",
    copy: "Mirepoix is onion, carrot, and celery. Standard practice — not a live lookup.",
    assetIds: [asset.id],
    destinationPath: "/learn?section=aromatics",
  });
  assert.equal(variant.id, "sgo:variant:persist-pinterest");
  assert.equal(variant.packageId, pkg.id);
  assert.equal(destination.href, mintSocialDestinationUrl({
    pathOrUrl: "/learn?section=aromatics",
    channel: "pinterest",
    packageId: pkg.id,
    variantId: variant.id,
  }).href);
  const reloaded = await getDestinationUrl(db, destination.id);
  assert.equal(reloaded.href, destination.href);
  const approval = await recordSocialApproval(db, {
    slug: "persist-approved",
    subjectKind: "package",
    subjectId: pkg.id,
    decision: "approved",
    actorEmail: "Founder@ChefGringo.com",
    reason: "Useful, evidenced, not a live-web claim.",
  });
  assert.equal(approval.actorEmail, "founder@chefgringo.com");
  assert.equal((await getContentPackage(db, pkg.id)).status, "approved");
  assert.equal(canPublishNow(approval), false);
  assert.throws(() => publishSocialPackage(), /cannot publish/);
  const publicationTables = db.database.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('social_publications', 'social_performance_snapshots') ORDER BY name
  `).all();
  assert.deepEqual(publicationTables.map((row) => row.name), ["social_publications"]);
  db.close();
});

test("affiliate merchant URLs cannot be stored as Chef Gringo destinations or assets", async () => {
  const db = await database();
  const { pkg } = await seedPackage(db, "no-affiliate-mask");
  await assert.rejects(
    () => createChannelVariant(db, {
      slug: "masked-amazon",
      packageId: pkg.id,
      channel: "facebook",
      copy: "Buy this.",
      destinationPath: "https://www.amazon.com/dp/B000EXAMPLE",
    }),
    /Chef Gringo-owned/,
  );
  await assert.rejects(
    () => createContentAsset(db, {
      slug: "merchant-photo",
      assetType: "still",
      altText: "Product",
      license: "merchant",
      provenanceNote: "Merchant CDN",
      uri: "https://m.media-amazon.com/images/I/example.jpg",
    }),
    /Chef Gringo-owned|unsafe protocol|malformed/,
  );
  db.close();
});

test("Social Growth modules do not hide network, OAuth, or publish adapters", async () => {
  const files = [
    "app/growth/social/index.ts",
    "app/growth/social/utm.ts",
    "app/growth/social/types.ts",
    "app/growth/social/platform-urls.ts",
    "app/growth/social/publications.ts",
    "app/growth/social/performance.ts",
    "app/growth/social/evidence-requests.ts",
    "app/growth/social/evidence-policy.ts",
    "app/growth/social/evidence-intelligence.ts",
    "db/social-evidence-intelligence.ts",
    "db/social-evidence-request-repository.ts",
    "app/api/growth/publications/route.ts",
    "app/api/growth/publications/[id]/performance/route.ts",
    "db/social-growth-repository.ts",
    "db/social-performance-repository.ts",
    "db/social-evidence-request-repository.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /graph\.facebook|instagram\.com\/oauth|api\.pinterest|open\.tiktok|Conversions API|fbq\(/i);
    assert.doesNotMatch(source, /\bfetch\s*\(/);
    assert.doesNotMatch(source, /schedulePost|cron|cloudflare queue|auto.?publish/i);
  }
});
