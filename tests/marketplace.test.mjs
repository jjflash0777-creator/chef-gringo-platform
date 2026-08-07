import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SqliteD1Adapter, applyMigrations } from "./helpers/sqlite-d1.mjs";

async function render(path) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("Marketplace is problem-led and publishes its trust model", async () => {
  const response = await render("/marketplace");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Buy for the work, not the hype/);
  assert.match(html, /What are you trying to solve/);
  assert.match(html, /Professional judgment comes before commission/);
  assert.match(html, /Best for/);
  assert.match(html, /Consider/);
});

test("Marketplace schema separates knowledge, editorial, and commerce domains", async () => {
  const schema = await readFile(new URL("../db/schema.ts", import.meta.url), "utf8");
  for (const table of ["products", "brands", "categories", "customerPersonas", "culinaryEnvironments", "useCases", "merchantLinks", "affiliatePartners", "reviews", "buyingGuides", "comparisons", "editorialEvents"]) {
    assert.match(schema, new RegExp(`export const ${table}`), table);
  }
  assert.match(schema, /fitScore/);
  assert.match(schema, /editorialStatus/);
  assert.match(schema, /commissionValue/);
});

test("Marketplace product APIs enforce administrator authorization before database mutation", async () => {
  const collection = await import("../app/api/marketplace/products/route.ts");
  const member = await import("../app/api/marketplace/products/[id]/route.ts");
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db };
  process.env.MARKETPLACE_ADMIN_EMAILS = " ADMIN@example.com ";
  const productPayload = {
    name: "Security Test Thermometer",
    brand: "Test Brand",
    category: "Thermometers",
    summary: "A test-only product used to verify authorization.",
    bestFor: "Authorization regression tests",
    evidenceLevel: "research",
  };
  const productCount = () => db.database.prepare("SELECT COUNT(*) AS count FROM products").get().count;
  const brandCount = () => db.database.prepare("SELECT COUNT(*) AS count FROM brands").get().count;

  try {
    const initialProducts = productCount();
    const initialBrands = brandCount();
    const unauthenticated = await collection.POST(productRequest(null, productPayload));
    assert.equal(unauthenticated.status, 401);
    assert.equal(productCount(), initialProducts);
    assert.equal(brandCount(), initialBrands);

    const unauthorized = await collection.POST(productRequest("viewer@example.com", productPayload));
    assert.equal(unauthorized.status, 403);
    assert.equal(productCount(), initialProducts);
    assert.equal(brandCount(), initialBrands);

    const unauthorizedRead = await collection.GET(productRequest("viewer@example.com"));
    assert.equal(unauthorizedRead.status, 403);

    const authorized = await collection.POST(productRequest("admin@EXAMPLE.com", productPayload));
    assert.equal(authorized.status, 201);
    const { product } = await authorized.json();
    assert.equal(productCount(), initialProducts + 1);

    const statusBefore = db.database.prepare("SELECT editorial_status FROM products WHERE id = ?").get(product.id).editorial_status;
    const forbiddenPatch = await member.PATCH(productRequest("viewer@example.com", { editorialStatus: "published" }, `/api/marketplace/products/${product.id}`, "PATCH"), {
      params: Promise.resolve({ id: String(product.id) }),
    });
    assert.equal(forbiddenPatch.status, 403);
    assert.equal(db.database.prepare("SELECT editorial_status FROM products WHERE id = ?").get(product.id).editorial_status, statusBefore);

    const allowedPatch = await member.PATCH(productRequest("ADMIN@example.com", { editorialStatus: "in_review" }, `/api/marketplace/products/${product.id}`, "PATCH"), {
      params: Promise.resolve({ id: String(product.id) }),
    });
    assert.equal(allowedPatch.status, 200);
    assert.equal(db.database.prepare("SELECT editorial_status FROM products WHERE id = ?").get(product.id).editorial_status, "in_review");
  } finally {
    delete globalThis.__CHEF_GRINGO_ENV__;
    delete process.env.MARKETPLACE_ADMIN_EMAILS;
    db.close();
  }
});

function productRequest(email, body, path = "/api/marketplace/products", method = "POST") {
  const headers = { "content-type": "application/json" };
  if (email) headers["oai-authenticated-user-email"] = email;
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test("Marketplace admin page requires centralized server-side administrator authorization", async () => {
  const page = await readFile(new URL("../app/admin/marketplace/page.tsx", import.meta.url), "utf8");
  assert.match(page, /await requireMarketplaceAdministrator\("\/admin\/marketplace"\)/);
  assert.doesNotMatch(page, /requireChatGPTUser/);
});
