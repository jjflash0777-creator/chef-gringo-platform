import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { marketplaceCatalog } from "../app/marketplace/catalog.ts";
import { AGENTS, DEFAULT_BUDGET, modelForTask, qaProduct, recommendationScore, runHarvest } from "../scripts/marketplace-research/pipeline.mjs";

test("Product Harvest Wave 1 publishes 100 unique real product candidates across thirteen workflows", () => {
  assert.equal(marketplaceCatalog.products.length, 100);
  assert.equal(marketplaceCatalog.workflows.length, 13);
  assert.equal(new Set(marketplaceCatalog.products.map((item) => item.id)).size, 100);
  assert.equal(new Set(marketplaceCatalog.products.map((item) => `${item.manufacturer}|${item.model}`.toLowerCase())).size, 100);
  const waveOneRecords = marketplaceCatalog.products.filter((item) => item.price.checked === "2026-08-13");
  assert.equal(waveOneRecords.length, 70);
  assert.equal(waveOneRecords.filter(item=>item.price.context==="Current price must be checked"||/quote required/i.test(item.price.context)).length,70);
});

test("records carry evidence, merchant, image provenance, dated price, editorial, and affiliate status", () => {
  for (const item of marketplaceCatalog.products) {
    assert.deepEqual(qaProduct(item), [], item.id);
    assert.match(item.evidence[0].url, /^https:\/\//);
    assert.match(item.evidence[0].checked, /^2026-08-(07|13)$/);
    assert.match(item.merchants[0].url, /^https:\/\//);
    assert.match(item.price.checked, /^2026-08-(07|13)$/);
    assert.equal(item.image.licensing, "reference-only");
    assert.ok(["unknown", "unavailable"].includes(item.affiliate.status));
    assert.equal(item.status, "published");
  }
});

test("affiliate economics cannot contaminate editorial scoring", () => {
  const base = { workflowFit: 90, durability: 80, sanitation: 70 };
  assert.equal(recommendationScore(base), 80);
  assert.equal(recommendationScore({ ...base, affiliateCommission: 1000 }), 80);
  for (const item of marketplaceCatalog.products) assert.equal("affiliateCommission" in item.scores, false);
});

test("orchestrator runs all roles under explicit budgets and returns the publication set", () => {
  const result = runHarvest(marketplaceCatalog, DEFAULT_BUDGET);
  assert.deepEqual(result.agents, AGENTS);
  assert.equal(result.candidates, 100);
  assert.equal(result.rejected.length, 0);
  assert.equal(result.published.length, 100);
  assert.equal(result.stoppedBecause, null);
  assert.equal(modelForTask("normalization").tier, "economy");
  assert.equal(modelForTask("operator-analysis").tier, "reasoning");
});

test("QA detects duplicates, missing evidence, and affiliate score contamination", () => {
  const weak = structuredClone(marketplaceCatalog.products[0]);
  weak.evidence = [];
  weak.scores.affiliateCommission = 8;
  assert.deepEqual(qaProduct(weak).sort(), ["affiliate-score-contamination", "evidence-missing", "primary-source-missing"]);
  const duplicateCatalog = { ...marketplaceCatalog, products: [marketplaceCatalog.products[0], marketplaceCatalog.products[0]] };
  assert.equal(runHarvest(duplicateCatalog).rejected[0].failures.includes("duplicate-product"), true);
});

test("Marketplace renders products, merchant CTAs, disclosures, comparisons, and uses D1 only for event persistence", async () => {
  const [page, card, catalog, hosting] = await Promise.all([
    readFile(new URL("../app/marketplace/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/marketplace/components/RecommendationCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/marketplace/catalog.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Quick comparison/);
  assert.match(card, /See current price/);
  assert.match(card, /Check evidence/);
  assert.match(card, /Editorial score is independent/);
  assert.match(catalog, /manufacturer product page or specification sheet/);
  assert.doesNotMatch(page + card + catalog, /getDb|D1Database|env\.DB/);
  assert.equal(JSON.parse(hosting).d1, "DB");
});

test("homepage and Carbonara connect active product value to Marketplace", async () => {
  const [home, carbonara] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/knowledge/dishes/carbonara/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(home, /Tell Chef Gringo/);
  assert.match(home, /Refrigeration/);
  assert.match(home, /Food Prep/);
  assert.match(home, /\/marketplace/);
  assert.match(carbonara, /marketplace#better-thermometer/);
});
