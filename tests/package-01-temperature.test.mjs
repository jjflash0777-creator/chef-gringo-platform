import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

const routes = [
  "/learn/temperature-carryover",
  "/services/thermometer-troubleshooting",
  "/business/food-truck-temperature-kit",
  "/marketplace/thermometer-workflows",
  "/culinary-director-tools/temperature-control-check",
];

test("Package 01 routes render", async () => {
  for (const route of routes) {
    const response = await render(route);
    assert.equal(response.status, 200, route);
  }
});

test("Package 01 commercial article keeps decision-first and disclosure boundaries", async () => {
  const html = await (await render("/marketplace/thermometer-workflows")).text();
  assert.match(html, /Stop asking which thermometer is best/);
  assert.match(html, /Thermapen ONE/);
  assert.match(html, /ThermoPop 2/);
  assert.match(html, /ChefAlarm/);
  assert.match(html, /affiliate/i);
  assert.match(html, /No price claim here/);
  assert.doesNotMatch(html, /\$109|\$35|\$65|sale price|limited-time price/i);
});

test("Package 01 operator pages preserve food-safety and jurisdiction boundaries", async () => {
  const [learn, build, manage] = await Promise.all([
    render("/learn/temperature-carryover").then((r) => r.text()),
    render("/business/food-truck-temperature-kit").then((r) => r.text()),
    render("/culinary-director-tools/temperature-control-check").then((r) => r.text()),
  ]);
  assert.match(learn, /regulatory authority/);
  assert.match(build, /local rules|regulator/i);
  assert.match(manage, /not a substitute for your HACCP plan/i);
});

test("Package 01 is discoverable from hubs and sitemap", async () => {
  const [learnHub, businessHub, marketplaceHub, manageHub, sitemap] = await Promise.all([
    readFile(new URL("../app/learn/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/business/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/marketplace/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/culinary-director-tools/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);
  assert.match(learnHub, /\/learn\/temperature-carryover/);
  assert.match(businessHub, /\/business\/food-truck-temperature-kit/);
  assert.match(marketplaceHub, /\/marketplace\/thermometer-workflows/);
  assert.match(manageHub, /\/culinary-director-tools\/temperature-control-check/);
  for (const route of routes) assert.ok(sitemap.includes(`"${route}"`), route);
});

test("Package 01 social matrix accounts for five posts on every configured network", async () => {
  const social = await readFile(new URL("../docs/packages/PACKAGE-01-SOCIAL-DISTRIBUTION.md", import.meta.url), "utf8");
  assert.match(social, /Facebook: 5\/5 drafted/);
  assert.match(social, /Instagram: 5\/5 drafted/);
  assert.match(social, /Pinterest: 5\/5 drafted/);
  assert.match(social, /TikTok: 5\/5 drafted/);
  assert.match(social, /Total: 20\/20 drafted/);
});
