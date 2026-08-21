import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { marketplaceCatalog } from "../app/marketplace/catalog.ts";
import { COMMERCIAL_LINK_KINDS, evidenceLink, isMonetized, purchaseLink } from "../app/marketplace/commercial-links.ts";
import { priceBasisLabel, productCardViewModel } from "../app/marketplace/view-models.ts";
import { AFFILIATE_DISCLOSURE_TEXT } from "../app/components/affiliate-disclosure-copy.ts";

const products = marketplaceCatalog.products;

function productWithAffiliateStatus(status) {
  const base = products[0];
  return { ...base, affiliate: { ...base.affiliate, status } };
}

async function render(path) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
  return response.text();
}

// --- WCAG contrast, computed rather than asserted -------------------------

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function cssToken(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `expected token ${name} to be defined`);
  return match[1];
}

// --- Link classification --------------------------------------------------

test("every commercial link kind is derived from the stored record, not the URL", () => {
  assert.deepEqual([...COMMERCIAL_LINK_KINDS], ["affiliate", "pending", "direct", "informational", "unavailable"]);

  const affiliate = purchaseLink(productWithAffiliateStatus("available"));
  assert.equal(affiliate.kind, "affiliate");
  assert.equal(affiliate.monetized, true);
  assert.equal(affiliate.event, "affiliate_click");
  assert.match(affiliate.rel, /sponsored/);

  const pending = purchaseLink(productWithAffiliateStatus("unknown"));
  assert.equal(pending.kind, "pending");
  assert.equal(pending.monetized, false);
  assert.equal(pending.event, "merchant_click");
  assert.doesNotMatch(pending.rel, /sponsored/);

  const direct = purchaseLink(productWithAffiliateStatus("unavailable"));
  assert.equal(direct.kind, "direct");
  assert.equal(direct.monetized, false);
  assert.equal(direct.event, "merchant_click");
  assert.doesNotMatch(direct.rel, /sponsored/);

  const informational = evidenceLink(products[0]);
  assert.equal(informational.kind, "informational");
  assert.equal(informational.monetized, false);
  assert.equal(informational.event, null, "reference links must never report a commercial event");

  const unavailable = purchaseLink({ ...products[0], merchants: [] });
  assert.equal(unavailable.kind, "unavailable");
  assert.equal(unavailable.href, null);
  assert.equal(unavailable.event, null);
  assert.equal(unavailable.monetized, false);
});

test("only a live affiliate program counts as monetized or claims sponsorship", () => {
  for (const status of ["available", "unknown", "unavailable"]) {
    const link = purchaseLink(productWithAffiliateStatus(status));
    assert.equal(isMonetized(link), status === "available", `status ${status}`);
    assert.equal(/sponsored/.test(link.rel ?? ""), status === "available", `rel for status ${status}`);
  }
});

test("pending relationships are never presented as active partnerships", () => {
  const pending = purchaseLink(productWithAffiliateStatus("unknown"));
  assert.match(pending.note, /unverified/i);
  assert.match(pending.note, /earns nothing/i);
  assert.doesNotMatch(pending.note, /\bpartner(ship)?\b/i);
});

test("external commercial links carry safe rel values and open deliberately", () => {
  for (const status of ["available", "unknown", "unavailable"]) {
    const link = purchaseLink(productWithAffiliateStatus(status));
    assert.equal(link.external, true);
    assert.match(link.rel, /noopener/);
    assert.match(link.rel, /noreferrer/);
  }
});

// --- Price honesty --------------------------------------------------------

test("raw price basis values never become customer-facing text", () => {
  assert.equal(priceBasisLabel("observed", true), "Observed price");
  assert.equal(priceBasisLabel("estimated", true), "Estimated price");
  assert.equal(priceBasisLabel("unknown", true), "Check current price");
  assert.equal(priceBasisLabel("unknown", false), "Price unavailable");

  for (const product of products) {
    const { pricePresentation } = productCardViewModel(product);
    assert.notEqual(pricePresentation.basisLabel, "unknown", product.id);
    assert.doesNotMatch(pricePresentation.basisLabel, /^(observed|estimated|unknown)$/, product.id);
  }
});

test("an unpriced record only invites a price check when a destination exists", () => {
  const withDestination = productCardViewModel({ ...products[0], price: { context: "Quote required", checked: "2026-08-07" } });
  assert.equal(withDestination.pricePresentation.basisLabel, "Check current price");

  const withoutDestination = productCardViewModel({ ...products[0], merchants: [], price: { context: "Quote required", checked: "2026-08-07" } });
  assert.equal(withoutDestination.pricePresentation.basisLabel, "Price unavailable");
});

// --- Disclosure visibility and contrast -----------------------------------

test("the disclosure is one reusable component with the agreed wording", async () => {
  const source = await readFile(new URL("../app/components/AffiliateDisclosure.tsx", import.meta.url), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(AFFILIATE_DISCLOSURE_TEXT, /may earn a commission/);
  assert.match(AFFILIATE_DISCLOSURE_TEXT, /at no additional cost to you/);
  assert.match(AFFILIATE_DISCLOSURE_TEXT, /not commission alone/);
  assert.doesNotMatch(code, /<details|title=|onMouseOver|:hover/, "the disclosure must not hide behind interaction");
  assert.doesNotMatch(code, /data-event/, "reading a disclosure is not a product click");
});

test("the disclosure renders as visible text without any interaction", async () => {
  const html = await render("/marketplace");
  const disclosure = html.indexOf(AFFILIATE_DISCLOSURE_TEXT.slice(0, 60));
  assert.ok(disclosure > 0, "disclosure text must be present in the served HTML");

  // Nothing between the document start and the disclosure may be an unopened
  // <details>, so the text cannot be inside a collapsed element.
  const before = html.slice(0, disclosure);
  assert.equal(before.split("<details").length - 1, before.split("</details>").length - 1, "disclosure must not sit inside a collapsed element");
  assert.doesNotMatch(html.slice(disclosure - 400, disclosure), /hidden|aria-hidden="true"/);
});

test("the disclosure appears before the first monetized recommendation", async () => {
  // Outbound commercial links live on the product page, so that is where the
  // ordering has to hold.
  const html = await render("/marketplace/products/thermoworks-thermapen-one");
  const disclosure = html.indexOf(AFFILIATE_DISCLOSURE_TEXT.slice(0, 60));
  const firstCommercialLink = html.indexOf("data-link-kind=");
  assert.ok(disclosure > 0, "product page must carry the disclosure");
  assert.ok(firstCommercialLink > 0, "product page must carry a classified commercial link");
  assert.ok(disclosure < firstCommercialLink, "disclosure must precede the first commercial link");
});

test("the disclosure is shown once per page, never once per card", async () => {
  // Count rendered elements, not raw text: the serialized RSC payload repeats
  // the wording in escaped form without producing a second visible disclosure.
  for (const path of ["/marketplace", "/marketplace?all=1", "/marketplace/products/thermoworks-thermapen-one"]) {
    const html = await render(path);
    const rendered = html.split('class="cg-affiliate-disclosure"').length - 1;
    assert.equal(rendered, 1, `${path} must render exactly one disclosure`);
  }
  const listing = await render("/marketplace?all=1");
  assert.ok(listing.split('class="cg-product-card"').length - 1 > 1, "listing should hold several cards under one disclosure");
});

test("disclosure colours meet WCAG AA", async () => {
  const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");
  const background = cssToken(css, "--cg-paper-gray");
  const text = cssToken(css, "--cg-text");
  const link = cssToken(css, "--cg-oxide-strong");

  const block = css.match(/\.cg-affiliate-disclosure \{[\s\S]*?\}/);
  assert.ok(block, "the disclosure needs its own style block");
  assert.match(block[0], /background: var\(--cg-paper-gray\)/);

  assert.ok(contrastRatio(text, background) >= 4.5, `disclosure text contrast ${contrastRatio(text, background).toFixed(2)}:1 must be at least 4.5:1`);
  assert.ok(contrastRatio(link, background) >= 4.5, `disclosure link contrast ${contrastRatio(link, background).toFixed(2)}:1 must be at least 4.5:1`);

  // The old collapsed disclosure ran at 2.03:1 and must not come back.
  assert.doesNotMatch(css, /#aeb7c2/);
});

test("the retired low-contrast affiliate line is gone", async () => {
  const [globals, card, detail] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/marketplace/components/ProductCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/marketplace/products/[id]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(globals, /\.affiliate-line \{/);
  assert.doesNotMatch(card + detail, /affiliate-line/);
  assert.doesNotMatch(card + detail, /\{product\.affiliate\.status\}/, "raw affiliate enum must not render");
});

// --- Tracking integrity ---------------------------------------------------

test("disclosure impressions cannot be recorded as product clicks", async () => {
  const html = await render("/marketplace");
  const start = html.indexOf('class="cg-affiliate-disclosure"');
  assert.ok(start > 0);
  const block = html.slice(start, html.indexOf("</aside>", start));
  assert.doesNotMatch(block, /data-event/);
  assert.doesNotMatch(block, /merchant_click|affiliate_click/);
});

test("served commercial links report the event their kind allows", async () => {
  const html = await render("/marketplace");
  for (const [, kind] of html.matchAll(/data-link-kind="([a-z]+)"/g)) {
    assert.ok(COMMERCIAL_LINK_KINDS.includes(kind), `unknown link kind ${kind}`);
  }
  // No product is on a live program today, so nothing may claim sponsorship.
  const liveAffiliates = products.filter((product) => product.affiliate.status === "available");
  assert.equal(liveAffiliates.length, 0, "catalogue changed: re-check sponsored rel and affiliate_click coverage");
  assert.doesNotMatch(html, /rel="sponsored/);
  assert.doesNotMatch(html, /data-event="affiliate_click"/);
});

test("no product invents a price, rating, stock level, review, or commission", () => {
  for (const product of products) {
    assert.equal(product.affiliate.commission, null, product.id);
    assert.equal(product.affiliate.cookieWindow, null, product.id);
    assert.ok(typeof product.price.context === "string" && product.price.context.length > 0, product.id);
    assert.ok(product.price.checked, product.id);
  }
});

test("product imagery is never rendered, because no product carries a reuse grant", async () => {
  const { imageStatusOf } = await import("../app/marketplace/taxonomy.ts");
  for (const product of products) {
    assert.notEqual(imageStatusOf(product), "licensed", `${product.id} claims a licence it does not have`);
  }
  // No marketplace surface may emit an image element for a product, and no
  // empty frame may stand in for one either.
  for (const path of ["/marketplace", "/marketplace?all=1", "/marketplace/products/thermoworks-thermapen-one"]) {
    const html = await render(path);
    const main = html.slice(html.indexOf("<main"));
    assert.doesNotMatch(main, /commerce-media/, "the empty product image frame must not come back");
    assert.doesNotMatch(main, /<img[^>]+alt="[^"]*product image/i);
  }
});
