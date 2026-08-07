import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("Marketplace writes require platform identity", async () => {
  const { POST } = await import("../app/api/marketplace/products/route.ts");
  const response = await POST(new Request("http://localhost/api/marketplace/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  }));
  assert.equal(response.status, 401);
});
