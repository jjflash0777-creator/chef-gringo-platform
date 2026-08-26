import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasValidSocialApproval, publicationIsAuthorized } from "../app/growth/social/index.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const queueRoute = await import("../app/api/growth/queue/route.ts");
const opportunityRoute = await import("../app/api/growth/opportunities/route.ts");
const opportunityIdRoute = await import("../app/api/growth/opportunities/[id]/route.ts");
const packageRoute = await import("../app/api/growth/packages/route.ts");
const packageIdRoute = await import("../app/api/growth/packages/[id]/route.ts");
const claimRoute = await import("../app/api/growth/packages/[id]/claims/route.ts");
const assetRoute = await import("../app/api/growth/assets/route.ts");
const variantRoute = await import("../app/api/growth/variants/route.ts");
const approvalRoute = await import("../app/api/growth/approvals/route.ts");
const previewRoute = await import("../app/api/growth/destination-preview/route.ts");

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

test("Growth Queue page is server-authorized and not indexed", async () => {
  const page = await readFile(new URL("../app/admin/growth/page.tsx", import.meta.url), "utf8");
  assert.match(page, /requireMarketplaceAdministrator\("\/admin\/growth"\)/);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(page, /force-dynamic/);
});

test("unauthorized admin access is rejected on Growth write and read routes", async () => {
  await withAdmin(async () => {
    const unauthenticated = await queueRoute.GET(request("/api/growth/queue"));
    assert.equal(unauthenticated.status, 401);
    const forbidden = await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "viewer@example.com",
      method: "POST",
      body: { slug: "nope" },
    }));
    assert.equal(forbidden.status, 403);
    const preview = await previewRoute.POST(request("/api/growth/destination-preview", {
      method: "POST",
      body: { pathOrUrl: "/learn", channel: "pinterest", packageId: "sgo:package:x", variantId: "sgo:variant:y" },
    }));
    assert.equal(preview.status, 401);
  });
});

test("opportunity CRUD and select/discard transitions persist", async () => {
  await withAdmin(async () => {
    const created = await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com",
      method: "POST",
      body: {
        slug: "mirepoix-gap",
        problem: "Home cooks cannot name mirepoix.",
        audience: "home_cook",
        usefulnessTest: "They can name onion, carrot, and celery.",
      },
    }));
    assert.equal(created.status, 201);
    const opportunity = (await created.json()).opportunity;
    assert.equal(opportunity.status, "open");
    const selected = await opportunityIdRoute.PATCH(request(`/api/growth/opportunities/${opportunity.id}`, {
      email: "admin@example.com",
      method: "PATCH",
      body: { status: "selected", problem: "Home cooks ask what mirepoix is." },
    }), { params: Promise.resolve({ id: opportunity.id }) });
    assert.equal(selected.status, 200);
    assert.equal((await selected.json()).opportunity.status, "selected");
    const discarded = await opportunityIdRoute.PATCH(request(`/api/growth/opportunities/${opportunity.id}`, {
      email: "admin@example.com",
      method: "PATCH",
      body: { status: "discarded" },
    }), { params: Promise.resolve({ id: opportunity.id }) });
    assert.equal((await discarded.json()).opportunity.status, "discarded");
  });
});

test("package editing, claim attachment, variant persistence, and destination preview", async () => {
  await withAdmin(async (db) => {
    const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com",
      method: "POST",
      body: { slug: "operator-temp", problem: "Need a grounded ground-beef answer.", audience: "independent_operator", usefulnessTest: "Names 160F as on-file USDA guidance." },
    }))).json()).opportunity;
    const created = await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com",
      method: "POST",
      body: { slug: "ground-beef-note", opportunityId: opportunity.id, thesis: "State the on-file temperature.", usefulnessTest: "Does not invent a live FSIS fetch.", commercialPosture: "informational" },
    }));
    assert.equal(created.status, 201);
    const pkg = (await created.json()).package;
    assert.equal(pkg.status, "drafted");
    const statusPatch = await packageIdRoute.PATCH(request(`/api/growth/packages/${pkg.id}`, {
      email: "admin@example.com",
      method: "PATCH",
      body: { status: "approved" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(statusPatch.status, 400);
    const edited = await packageIdRoute.PATCH(request(`/api/growth/packages/${pkg.id}`, {
      email: "admin@example.com",
      method: "PATCH",
      body: { thesis: "State the on-file USDA temperature without a live lookup.", commercialPosture: "none" },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal((await edited.json()).package.commercialPosture, "none");
    const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
    const claim = await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com",
      method: "POST",
      body: { slug: "temp-claim", claimText: "USDA FSIS lists 160F for ground beef on file.", evidence: { kind: "knowledge_source", id: String(source.id) }, safetySensitive: false },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(claim.status, 201);
    const preview = await previewRoute.POST(request("/api/growth/destination-preview", {
      email: "admin@example.com",
      method: "POST",
      body: { pathOrUrl: "/learn?ref=queue", channel: "instagram", packageId: pkg.id, variantId: "sgo:variant:ground-beef-ig" },
    }));
    assert.equal(preview.status, 200);
    const href = (await preview.json()).destination.href;
    assert.match(href, /utm_source=instagram/);
    assert.match(href, /utm_campaign=sgo%3Apackage%3Aground-beef-note|utm_campaign=sgo:package:ground-beef-note/);
    const asset = await assetRoute.POST(request("/api/growth/assets", {
      email: "admin@example.com",
      method: "POST",
      body: { slug: "queue-still", assetType: "still", altText: "Prep table", license: "editorial", provenanceNote: "Existing still", uri: "/images/editorial/commercial-kitchen-prep.jpg" },
    }));
    assert.equal(asset.status, 201);
    const variant = await variantRoute.POST(request("/api/growth/variants", {
      email: "admin@example.com",
      method: "POST",
      body: { slug: "ground-beef-ig", packageId: pkg.id, channel: "instagram", copy: "160F is on file. Not a live lookup.", destinationPath: "/learn?ref=queue" },
    }));
    assert.equal(variant.status, 201);
    assert.equal((await variant.json()).destination.href, href);
  });
});

test("approval writes an audit record with authenticated identity; spoofed email is ignored", async () => {
  await withAdmin(async (db) => {
    const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com", method: "POST",
      body: { slug: "approve-me", problem: "Need a practice note.", audience: "both", usefulnessTest: "Names mirepoix." },
    }))).json()).opportunity;
    const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com", method: "POST",
      body: { slug: "approve-pkg", opportunityId: opportunity.id, thesis: "Practice note.", usefulnessTest: "No live-web claim.", commercialPosture: "none" },
    }))).json()).package;
    const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
  await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
    email: "admin@example.com", method: "POST",
    body: { slug: "approve-claim", claimText: "Mirepoix is onion, carrot, and celery.", evidence: { kind: "knowledge_source", id: String(source.id) }, safetySensitive: false },
  }), { params: Promise.resolve({ id: pkg.id }) });
    db.database.prepare("UPDATE sources SET verification_status = 'verified' WHERE id = ?").run(source.id);
    const missingReason = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com", method: "POST",
      body: { subjectKind: "package", subjectId: pkg.id, decision: "rejected", reason: "  " },
    }));
    assert.equal(missingReason.status, 400);
    const approved = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "queue-approved",
        subjectKind: "package",
        subjectId: pkg.id,
        decision: "approved",
        reason: "Useful and evidenced.",
        actorEmail: "impostor@example.com",
      },
    }));
    assert.equal(approved.status, 201);
    const approval = (await approved.json()).approval;
    assert.equal(approval.actorEmail, "admin@example.com");
    assert.notEqual(approval.actorEmail, "impostor@example.com");
    assert.ok(approval.occurredAt);
    const row = db.database.prepare("SELECT actor_email AS email, decision FROM social_approvals WHERE id = ?").get(approval.id);
    assert.equal(row.email, "admin@example.com");
    assert.equal(row.decision, "approved");
    const variant = await variantRoute.POST(request("/api/growth/variants", {
      email: "admin@example.com", method: "POST",
      body: { slug: "approve-ig", packageId: pkg.id, channel: "instagram", copy: "Practice note.", destinationPath: "/learn" },
    }));
    const variantId = (await variant.json()).variant.id;
    const variantApproved = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com", method: "POST",
      body: {
        slug: "queue-variant-approved",
        subjectKind: "variant",
        subjectId: variantId,
        decision: "approved",
        reason: "Variant matches the evidenced package.",
        actorEmail: "impostor@example.com",
      },
    }));
    assert.equal(variantApproved.status, 201);
    const variantApproval = (await variantApproved.json()).approval;
    assert.equal(variantApproval.actorEmail, "admin@example.com");
    assert.equal(variantApproval.subjectKind, "variant");
    assert.equal(variantApproval.subjectId, variantId);
  });
});

test("unsafe claims block approval and status alone is not publication authority", async () => {
  await withAdmin(async (db) => {
    const opportunity = (await (await opportunityRoute.POST(request("/api/growth/opportunities", {
      email: "admin@example.com", method: "POST",
      body: { slug: "unsafe-opp", problem: "Ground beef temp.", audience: "home_cook", usefulnessTest: "Does not invent live FSIS." },
    }))).json()).opportunity;
    const pkg = (await (await packageRoute.POST(request("/api/growth/packages", {
      email: "admin@example.com", method: "POST",
      body: { slug: "unsafe-pkg", opportunityId: opportunity.id, thesis: "Temp.", usefulnessTest: "On-file only.", commercialPosture: "none" },
    }))).json()).package;
    const source = db.database.prepare("SELECT id FROM sources ORDER BY id ASC LIMIT 1").get();
    const blockedClaim = await claimRoute.POST(request(`/api/growth/packages/${pkg.id}/claims`, {
      email: "admin@example.com", method: "POST",
      body: { slug: "unsafe-claim", claimText: "Cook ground beef to 160F.", evidence: { kind: "knowledge_source", id: String(source.id) }, safetySensitive: true },
    }), { params: Promise.resolve({ id: pkg.id }) });
    assert.equal(blockedClaim.status, 400);
    const approvedEmpty = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com", method: "POST",
      body: { slug: "empty-approve", subjectKind: "package", subjectId: pkg.id, decision: "approved", reason: "Trying without claims." },
    }));
    assert.equal(approvedEmpty.status, 400);
    db.database.prepare("UPDATE social_content_packages SET status = 'approved' WHERE id = ?").run(pkg.id);
    const queue = await (await queueRoute.GET(request("/api/growth/queue", { email: "admin@example.com" }))).json();
    const authority = queue.publicationAuthority.find((item) => item.packageId === pkg.id);
    assert.equal(authority.status, "approved");
    assert.equal(authority.hasValidApproval, false);
    assert.equal(hasValidSocialApproval({
      subjectKind: "package",
      subjectId: pkg.id,
      approvals: queue.approvals,
      packageStatus: "approved",
    }), false);
    assert.equal(publicationIsAuthorized({
      subjectKind: "package",
      subjectId: pkg.id,
      approvals: queue.approvals,
      packageStatus: "approved",
    }), false);
    assert.equal(queue.publishingEnabled, false);
    const variant = await variantRoute.POST(request("/api/growth/variants", {
      email: "admin@example.com", method: "POST",
      body: { slug: "unsafe-ig", packageId: pkg.id, channel: "instagram", copy: "Draft only.", destinationPath: "/learn" },
    }));
    assert.equal(variant.status, 201);
    const variantId = (await variant.json()).variant.id;
    const blockedVariant = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com", method: "POST",
      body: { slug: "unsafe-variant", subjectKind: "variant", subjectId: variantId, decision: "approved", reason: "Trying a variant without claims." },
    }));
    assert.equal(blockedVariant.status, 400);
  });
});

test("bulk approval is rejected and no publish or social-network capability exists", async () => {
  await withAdmin(async () => {
    const bulk = await approvalRoute.POST(request("/api/growth/approvals", {
      email: "admin@example.com", method: "POST",
      body: { approveAll: true, approvals: [{ subjectId: "sgo:package:a" }], reason: "Nope" },
    }));
    assert.equal(bulk.status, 400);
    const array = await approvalRoute.POST(new Request("http://localhost/api/growth/approvals", {
      method: "POST",
      headers: { "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" },
      body: JSON.stringify([{ subjectId: "sgo:package:a", decision: "approved", reason: "Nope" }]),
    }));
    assert.equal(array.status, 400);
  });
  const files = [
    "app/admin/growth/GrowthQueue.tsx",
    "app/api/growth/approvals/route.ts",
    "app/api/growth/publications/route.ts",
    "app/api/growth/publications/[id]/performance/route.ts",
    "app/api/growth/_shared.ts",
    "db/social-growth-repository.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /graph\.facebook|api\.pinterest|open\.tiktok|fbq\(|Conversions API/i);
    assert.doesNotMatch(source, /schedulePost|auto.?publish|Approve all/i);
  }
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /NO PUBLISHING ENABLED/);
  assert.match(ui, /MANUAL PUBLICATION RECORD/);
  assert.match(ui, /FIRST-PARTY CHEF GRINGO PERFORMANCE/);
  assert.match(ui, /Evidence needed/);
  assert.match(ui, /Submit corpus candidate/);
  assert.match(ui, /Evidence Intelligence/);
  assert.match(ui, /Decision DNA/);
  assert.match(ui, /Content Intelligence/);
  assert.match(ui, /Draft Studio/);
  assert.match(ui, /Historical gate/);
  assert.match(ui, /Intelligence authority/);
  assert.match(ui, /Attach additional evidence/);
  assert.match(ui, /Research Plan/);
  assert.match(ui, /Discover candidates/);
  assert.match(ui, /Discovery:/);
  assert.match(ui, /Submit selected candidates for corpus review/);
  assert.match(ui, /Platform reach\/engagement not connected yet/);
  assert.doesNotMatch(ui, /Approve all/);
  assert.doesNotMatch(ui, />Publish</);
  const approvals = await readFile(new URL("../app/api/growth/approvals/route.ts", import.meta.url), "utf8");
  assert.match(approvals, /publishingEnabled: false/);
});
