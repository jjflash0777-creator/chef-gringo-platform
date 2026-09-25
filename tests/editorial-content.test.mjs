import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const dir = new URL("../content/articles/", import.meta.url);
const allowedSections = new Set([
  "front-of-house",
  "back-of-house",
  "independent-mobile",
  "health-better-living",
  "food-intelligence",
]);

async function articles() {
  const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  return Promise.all(files.map(async (name) => JSON.parse(await readFile(new URL(name, dir), "utf8"))));
}

test("editorial content files are complete and uniquely addressable", async () => {
  const items = await articles();
  assert.ok(items.length >= 6, "expected featured story plus five daily section stories");
  const slugs = new Set();
  for (const article of items) {
    for (const field of ["id","slug","headline","deck","section","format","author","publishedAt","heroImage","seoTitle","seoDescription","analyticsContentId"]) {
      assert.ok(article[field], `${article.slug || article.id || "article"} missing ${field}`);
    }
    assert.ok(allowedSections.has(article.section), `unsupported section: ${article.section}`);
    assert.ok(Array.isArray(article.body) && article.body.length > 0, `${article.slug} needs body paragraphs`);
    assert.ok(!slugs.has(article.slug), `duplicate article slug: ${article.slug}`);
    slugs.add(article.slug);
    if (article.commercialDestination?.href) {
      assert.match(article.commercialDestination.href, /^\//, `${article.slug} should route readers through Chef Gringo before merchant checkout`);
    }
  }
});

test("weekly homepage inventory has one feature and one daily story per section", async () => {
  const items = (await articles()).filter((article) => article.status === "published");
  const featured = items.filter((article) => article.featured);
  assert.equal(featured.length, 1, "homepage needs exactly one weekly featured story");
  const daily = items.filter((article) => article.homepageSlot === "daily");
  assert.equal(daily.length, 5, "homepage needs five daily editorial stories");
  assert.deepEqual(new Set(daily.map((article) => article.section)), allowedSections);
});

test("health editorial content carries no commercial shortcut by default", async () => {
  const items = await articles();
  const health = items.filter((article) => article.section === "health-better-living");
  assert.ok(health.length > 0);
  for (const article of health) {
    assert.equal(article.commercialDestination, undefined, `${article.slug} should not default health guidance into a sales route`);
  }
});
