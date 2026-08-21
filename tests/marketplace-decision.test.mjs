import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { marketplaceCatalog } from "../app/marketplace/catalog.ts";
import { COMMERCIAL_LINK_KINDS, purchaseLink } from "../app/marketplace/commercial-links.ts";
import { pendingProgramRecords } from "../app/marketplace/pending-programs.ts";
import {
  BROWSE_ALL_QUERY,
  EMPTY_QUERY,
  FULL_RESET_HREF,
  OPENING_CARD_LIMIT,
  PAGE_SIZE,
  activeFilters,
  applyQuery,
  buildHref,
  clearFiltersHref,
  parseQuery,
  paginate,
  startingRecommendations,
} from "../app/marketplace/query.ts";
import { FILTER_AUDIENCES, FOOD_TRUCK_FILTER_NOTE, facetsFor } from "../app/marketplace/taxonomy.ts";
import { AFFILIATE_DISCLOSURE_TEXT } from "../app/components/affiliate-disclosure-copy.ts";

async function render(path) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
  return { status: response.status, html: await response.text() };
}

function cardCount(html) {
  return html.split('class="cg-product-card"').length - 1;
}

function visibleText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

test("opening view renders at most six product cards", async () => {
  assert.equal(startingRecommendations().length <= OPENING_CARD_LIMIT, true);
  assert.equal(OPENING_CARD_LIMIT, 6);
  const { html } = await render("/marketplace");
  assert.ok(cardCount(html) <= OPENING_CARD_LIMIT, `opening cards ${cardCount(html)}`);
  assert.match(html, /Solve a problem/);
  assert.match(html, /What are you trying to accomplish/);
  assert.match(html, /Browse everything/);
  assert.match(html, /Nothing researched yet/);
});

test("browse-all paginates at twelve cards", async () => {
  assert.equal(PAGE_SIZE, 12);
  const all = applyQuery(BROWSE_ALL_QUERY);
  assert.equal(all.length, 100);
  const { items, pageCount } = paginate(all, 1);
  assert.equal(items.length, PAGE_SIZE);
  assert.ok(pageCount > 1);
  const { html } = await render("/marketplace?all=1");
  assert.equal(cardCount(html), PAGE_SIZE);
  assert.match(html, /Show more/);
  const page2 = await render("/marketplace?all=1&page=2");
  assert.equal(cardCount(page2.html), PAGE_SIZE);
});

test("category and goal paths narrow the catalogue deterministically", () => {
  const equipment = applyQuery({ ...EMPTY_QUERY, path: "equipment" });
  const safety = applyQuery({ ...EMPTY_QUERY, path: "food-safety-and-compliance" });
  const software = applyQuery({ ...EMPTY_QUERY, path: "software-and-operations" });
  const ingredients = applyQuery({ ...EMPTY_QUERY, path: "food-and-ingredients" });
  assert.equal(equipment.length + safety.length + software.length + ingredients.length, 100);
  assert.equal(ingredients.length, 0);
  assert.equal(applyQuery({ ...EMPTY_QUERY, path: "business-startup" }).length, 0);
  assert.equal(applyQuery({ ...EMPTY_QUERY, path: "home-growing" }).length, 0);

  const thermometers = applyQuery({ ...EMPTY_QUERY, goal: "choose-a-thermometer" });
  assert.equal(thermometers.length, 5);
  assert.ok(thermometers.every((product) => product.workflowId === "better-thermometer"));
});

test("filters, chip removal, contextual reset, and full reset preserve URL state", () => {
  const filtered = parseQuery({ all: "1", audience: "restaurant", evidence: "verified" });
  assert.equal(filtered.all, true);
  assert.deepEqual(filtered.audience, ["restaurant"]);
  const href = buildHref(filtered);
  assert.match(href, /all=1|audience=restaurant/);
  assert.match(href, /evidence=verified/);

  const chips = activeFilters(filtered);
  assert.ok(chips.some((chip) => chip.key === "audience:restaurant"));
  const withoutAudience = chips.find((chip) => chip.key === "audience:restaurant").removeHref;
  assert.match(withoutAudience, /evidence=verified/);
  assert.doesNotMatch(withoutAudience, /audience=restaurant/);

  const onGoal = parseQuery({ goal: "choose-a-thermometer", audience: "home-cook" });
  const cleared = clearFiltersHref(onGoal);
  assert.match(cleared, /goal=choose-a-thermometer/);
  assert.doesNotMatch(cleared, /audience=/);
  assert.equal(FULL_RESET_HREF, "/marketplace");
  assert.ok(!cleared.startsWith("/marketplace?") || cleared.includes("goal="));
});

test("empty results explain how to broaden the search", async () => {
  const { html } = await render("/marketplace?path=home-growing");
  assert.match(html, /No products match/);
  assert.match(html, /No growing|Nothing here yet|self-sufficiency/i);
  const combo = await render("/marketplace?all=1&commercial=affiliate");
  assert.match(combo.html, /No products match|0 products match/);
});

test("solve a problem lists researched workflows without dumping the catalogue", async () => {
  const { html } = await render("/marketplace?view=problems");
  assert.match(html, /Solve a problem/);
  assert.match(html, /I need a better thermometer/);
  assert.equal(cardCount(html), 0);
});

test("food-truck is not offered as a live empty filter", async () => {
  assert.equal(FILTER_AUDIENCES.includes("food-truck"), false);
  assert.ok(marketplaceCatalog.products.every((product) => !facetsFor(product).audience.includes("food-truck")));
  const { html } = await render("/marketplace?all=1");
  assert.match(html, new RegExp(FOOD_TRUCK_FILTER_NOTE.slice(0, 40)));
  assert.doesNotMatch(html, /name="audience" value="food-truck"/);
});

test("direct product URLs resolve; invalid ids 404", async () => {
  const ok = await render("/marketplace/products/thermoworks-thermapen-one");
  assert.equal(ok.status, 200);
  assert.match(ok.html, /Thermapen ONE/);
  assert.ok(ok.html.includes(AFFILIATE_DISCLOSURE_TEXT.slice(0, 40)));
  const missing = await render("/marketplace/products/not-a-real-product");
  assert.equal(missing.status, 404);
});

test("FragmentRouter only redirects known product ids", async () => {
  const source = await readFile(new URL("../app/marketplace/components/FragmentRouter.tsx", import.meta.url), "utf8");
  assert.match(source, /known\.has\(hash\)/);
  assert.doesNotMatch(source, /PRODUCT_ID = \/\^\[a-z0-9\]/);
  const { html } = await render("/marketplace");
  assert.match(html, /id="how-we-score"/);
  assert.match(html, /id="affiliate-disclosure"/);
});

test("comparison is bounded to 2–4 products and does not fabricate gaps", async () => {
  const tooFew = await render("/marketplace/compare?ids=thermoworks-thermapen-one");
  assert.match(tooFew.html, /Choose[\s\S]{0,40}2[\s\S]{0,20}to[\s\S]{0,20}4[\s\S]{0,20}products/);
  const ok = await render("/marketplace/compare?ids=thermoworks-thermapen-one,thermoworks-thermopop-2");
  assert.match(ok.html, /Comparing[\s\S]{0,20}2[\s\S]{0,20}products/);
  assert.match(ok.html, /Not yet verified|Observed price|No commercial relationship|No active relationship/);
  const tooMany = await render("/marketplace/compare?ids=thermoworks-thermapen-one,thermoworks-thermopop-2,comark-pdt300,cooper-atkins-dfp450w,thermoworks-chefalarm");
  assert.match(tooMany.html, /Showing the first[\s\S]{0,20}4/);
  const missing = await render("/marketplace/compare?ids=not-a-real-product,thermoworks-thermapen-one");
  assert.match(missing.html, /Not found/);
});

test("filters are keyboard-accessible GET controls with live result count", async () => {
  const { html } = await render("/marketplace?all=1");
  assert.match(html, /<form class="cg-filter-form" action="\/marketplace" method="get"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<fieldset>/);
  assert.match(html, /<legend>Category<\/legend>/);
});

test("listing cards have one primary action and no inert compare-details control", async () => {
  const card = await readFile(new URL("../app/marketplace/components/ProductCard.tsx", import.meta.url), "utf8");
  assert.match(card, /See full details/);
  assert.doesNotMatch(card, /Compare details/);
  assert.doesNotMatch(card, /aria-disabled/);
  const { html } = await render("/marketplace");
  assert.doesNotMatch(html, /Compare details/);
  assert.doesNotMatch(html, /MarketplaceAdvisor|Ask Chef Gringo about a kitchen problem/);
});

test("no false affiliate claims and no raw unknown prices on marketplace surfaces", async () => {
  assert.equal(marketplaceCatalog.products.filter((product) => product.affiliate.status === "available").length, 0);
  for (const product of marketplaceCatalog.products) {
    const link = purchaseLink(product);
    assert.ok(COMMERCIAL_LINK_KINDS.includes(link.kind));
    if (product.affiliate.status === "unknown") assert.equal(link.kind, "pending");
    if (product.affiliate.status === "unavailable") assert.equal(link.kind, "direct");
    assert.notEqual(link.kind, "affiliate");
  }
  for (const path of ["/marketplace", "/marketplace?all=1", "/marketplace/products/thermoworks-thermapen-one"]) {
    const { html } = await render(path);
    const text = visibleText(html);
    assert.doesNotMatch(html, /rel="sponsored/);
    assert.doesNotMatch(text, /\bCHECK CURRENT PRICE\b.*\bunknown\b|\bObserved price\b\s+unknown/i);
    assert.doesNotMatch(html, />unknown</);
  }
});

test("pending-program registry covers every unknown affiliate record", () => {
  const rows = pendingProgramRecords();
  const unknown = marketplaceCatalog.products.filter((product) => product.affiliate.status === "unknown");
  assert.equal(rows.length, 9);
  assert.equal(rows.length, unknown.length);
  for (const row of rows) {
    assert.ok(row.productId);
    assert.ok(row.productName);
    assert.ok(row.programWording === null || /unverified|opportunity/i.test(row.programWording));
    assert.ok(row.destinationUrl);
    assert.ok(row.evidenceUrl);
    assert.match(row.verificationNeeded, /live program/);
    assert.match(row.uiTreatment, /pending/);
    assert.doesNotMatch(row.uiTreatment, /partner/i);
  }
});

test("opening marketplace HTML stays below the Stage-2 100-card size", async () => {
  const { html } = await render("/marketplace");
  const bytes = Buffer.byteLength(html);
  assert.ok(bytes < 550_000, `opening HTML was ${bytes} bytes; Stage 2 was ~918kB`);
  assert.ok(cardCount(html) <= OPENING_CARD_LIMIT);
});

test("sitemap lists every product detail URL without putting 100 cards on the opening page", async () => {
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /marketplaceCatalog\.products\.map/);
  assert.match(sitemap, /\/marketplace\/products\//);
  const page = await readFile(new URL("../app/marketplace/products/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /generateStaticParams/);
});
