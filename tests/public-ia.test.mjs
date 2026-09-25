import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PRIMARY_NAV, publicHrefs } from "../app/lib/public-ia.ts";

const shell = await readFile(new URL("../app/components/PublicShell.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../app/components/PublicNav.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const frame = await readFile(new URL("../app/components/editorial/PublicationFrame.tsx", import.meta.url), "utf8");
const types = await readFile(new URL("../app/editorial/types.ts", import.meta.url), "utf8");
const cut = await readFile(new URL("../app/cut-intelligence/page.tsx", import.meta.url), "utf8");
const repair = await readFile(new URL("../app/services/repair-or-replace/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/publication-home.css", import.meta.url), "utf8");

test("publication navigation exposes the five permanent editorial sections", () => {
  for (const label of ["Front of House","Back of House","Independent & Mobile","Health & Better Living","Food Intelligence"]) {
    assert.ok(frame.includes(label), label);
    assert.ok(types.includes(label), label);
  }
  assert.match(frame, /The Marketplace/);
});

test("legacy navigation stays usable without dead publication anchors or paid brief promotion", () => {
  assert.equal(PRIMARY_NAV[0].label, "Stories");
  assert.equal(PRIMARY_NAV[0].href, "/");
  const hrefs = publicHrefs().join(" ");
  assert.doesNotMatch(hrefs, /#recommended|operator-question/);
  assert.doesNotMatch(JSON.stringify(PRIMARY_NAV), /Paid decision-brief pilot/);
});

test("legacy dropdown navigation remains accessible on non-publication utility routes", () => {
  assert.match(nav, /aria-expanded=\{open\}/);
  assert.match(nav, /aria-controls=\{open \? panelId : undefined\}/);
  assert.match(nav, /event\.key !== "Escape"/);
  assert.match(shell, /aria-label="Mobile navigation"/);
  assert.match(shell, /isPublicationPath/);
});

test("admin and internal research routes stay out of public navigation", () => {
  assert.doesNotMatch(publicHrefs().join(" "), /\/admin/);
  assert.doesNotMatch(frame, /Intelligence Lab|Partner Hunt/);
});

test("homepage order is editorial: feature, daily lanes, commerce, recent stories", () => {
  const order = ["cg-pub-featured","cg-pub-daily","cg-pub-commerce","cg-pub-recent"];
  let cursor = 0;
  for (const name of order) {
    const next = home.indexOf(name, cursor);
    assert.ok(next > cursor, name);
    cursor = next;
  }
  assert.match(home, /dailyHomepageArticles/);
  assert.match(home, /featuredArticle/);
});

test("retired homepage intake anchors no longer leak from preview and repair routes", () => {
  assert.doesNotMatch(cut, /#operator-question/);
  assert.doesNotMatch(repair, /#operator-question|\$99 decision brief to begin/);
  assert.match(repair, /marketplace\?goal=replace-or-repair-equipment/);
});

test("publication homepage has an explicit narrow-screen layout", () => {
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /@media \(max-width: 520px\)/);
});
