import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const nav = await readFile(new URL("../app/components/PublicNav.tsx", import.meta.url), "utf8");
const recipes = await readFile(new URL("../app/recipes/page.tsx", import.meta.url), "utf8");
const cut = await readFile(new URL("../app/cut-intelligence/page.tsx", import.meta.url), "utf8");
const brief = await readFile(new URL("../app/services/repair-or-replace/DecisionBriefForm.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");
const approved = await readFile(new URL("../app/styles/approved-home.css", import.meta.url), "utf8");
const globals = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("homepage keeps Ask immediately after a compact hero and five regions total", () => {
  const hero = home.indexOf("cg-approved-hero");
  const intake = home.indexOf("cg-approved-intake");
  assert.ok(hero >= 0 && intake > hero);
  assert.equal((home.match(/<section /g) ?? []).length, 5);
  assert.match(home, /id="grow"/);
  assert.match(home, /href="#operator-question">Ask Chef Gringo/);
  assert.doesNotMatch(approved, /min-height:\s*3[14]rem/);
  assert.match(approved, /\.cg-approved-quote \{ display: none; \}/);
});

test("public headings wrap inside their containers instead of overflowing", () => {
  assert.match(css, /\.cg-public-scope h1 \{[\s\S]*?clamp\(1\.7rem, 5vw, 2\.75rem\)/);
  assert.match(css, /\.cg-public-scope h1,[\s\S]*?overflow-wrap:\s*break-word/);
  assert.match(approved, /\.cg-approved-hero h1 \{[\s\S]*?clamp\(1\.85rem, 5\.4vw, 3rem\)/);
  assert.match(approved, /overflow-wrap:\s*break-word/);
  assert.match(css, /width: calc\(100% - \(2 \* var\(--cg-gutter\)\)\)/);
});

test("closed navigation panels are not rendered into the accessibility tree", () => {
  assert.match(nav, /\{open \? \(/);
  assert.match(nav, /aria-controls=\{open \? panelId : undefined\}/);
  assert.doesNotMatch(nav, /hidden=\{!open\}/);
  assert.match(nav, /aria-expanded=\{open\}/);
});

test("tab strips, filters, and comparison tables keep edge padding and 44px targets", () => {
  assert.match(css, /\.cg-filter-chip \{[\s\S]*?min-height: 44px/);
  assert.match(css, /\.cg-nav-trigger \{[\s\S]*?min-height:\s*2\.75rem/);
  assert.match(globals, /\.mode-selector button \{[\s\S]*?min-height:2\.75rem/);
  assert.match(globals, /\.knowledge-subnav \.container \{[\s\S]*?overflow-x:auto/);
  assert.match(css, /\.cg-compare-scroll \{[\s\S]*?overflow-x: auto/);
  assert.match(css, /\.cg-compare-scroll \{[\s\S]*?scroll-padding-inline: 1rem/);
});

test("recipe provenance is complete-not-tested and Cut Intelligence stays a preview", () => {
  assert.match(recipes, /Not a tested library/);
  assert.match(recipes, /Kitchen-test logs are not in this repository/);
  assert.match(recipes, /Not kitchen-tested in this repository/);
  assert.doesNotMatch(recipes, /First tested/);
  assert.doesNotMatch(home, /First tested/);
  assert.match(cut, /Preview/);
  assert.match(cut, /no photo identifier/i);
  assert.match(cut, /cg-cut-today/);
  assert.match(cut, /href="\/#operator-question"/);
});

test("repair-or-replace CTA and reduced-motion remain present", () => {
  assert.match(brief, /Continue to secure \$99 test checkout/);
  assert.match(css, /\.decision-brief-form \.cg-button \{[\s\S]*?min-height:\s*3rem/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(globals, /prefers-reduced-motion:reduce/);
  assert.match(css, /@media \(max-width: 22rem\)/);
});
