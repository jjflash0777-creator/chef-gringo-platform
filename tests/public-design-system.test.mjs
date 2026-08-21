import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");
const approved = await readFile(new URL("../app/styles/approved-home.css", import.meta.url), "utf8");
const shell = await readFile(new URL("../app/components/PublicShell.tsx", import.meta.url), "utf8");
const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const compare = await readFile(new URL("../app/marketplace/compare/page.tsx", import.meta.url), "utf8");
const start = await readFile(new URL("../app/start/page.tsx", import.meta.url), "utf8");

const PUBLIC_CEILING_BYTES = 70_000;

test("public stylesheets load in canonical order", () => {
  const order = [
    'import "./globals.css"',
    'import "./styles/public-design.css"',
    'import "./styles/approved-home.css"',
    'import "./styles/ai-runtime.css"',
    'import "./styles/ai-conversation.css"',
  ];
  let cursor = 0;
  for (const line of order) {
    const next = layout.indexOf(line, cursor);
    assert.ok(next > cursor, line);
    cursor = next;
  }
});

test("canonical tokens cover layout, motion, touch, and status without a second color family", () => {
  for (const token of ["--cg-gutter", "--cg-touch", "--cg-header-height", "--cg-sticky-offset", "--cg-motion", "--cg-accent", "--cg-status-preview"]) {
    assert.match(css, new RegExp(`${token}:`));
  }
  assert.doesNotMatch(approved, /--cg-approved-/);
  assert.doesNotMatch(css, /linear-gradient|@keyframes|@font-face/);
});

test("obsolete global navigation and removed homepage selectors stay out of the public foundation", () => {
  assert.doesNotMatch(css, /^\s*nav\s*\{/m);
  assert.doesNotMatch(css, /\.cg-home-hero[\s{]/);
  assert.doesNotMatch(approved, /\.cg-approved-category[\s{]/);
  assert.doesNotMatch(approved, /\.cg-approved-featured[\s{]/);
  assert.doesNotMatch(approved, /\.cg-approved-process[\s{]/);
  assert.doesNotMatch(shell, /cg-header-cta/);
});

test("wordmark gutter, nav density breakpoint, and Ask CTA deduplication hold", () => {
  assert.match(css, /padding-inline-start:\s*0\.45rem/);
  assert.match(css, /@media \(max-width: 70rem\)/);
  assert.match(css, /\.cg-public-scope \.cg-desktop-nav \{ display: none; \}/);
  assert.match(home, /cg-hero-ask/);
  assert.match(approved, /@media \(min-width: 70rem\)[\s\S]*?\.cg-hero-ask \{ display: none; \}/);
  assert.equal([...shell.matchAll(/Ask Chef Gringo/g)].length, 1);
});

test("touch, focus, reduced motion, sticky offset, and compare affordance remain explicit", () => {
  assert.match(css, /--cg-touch:\s*2\.75rem/);
  assert.match(css, /\.cg-public-scope :focus-visible \{[\s\S]*?outline: 3px solid var\(--cg-focus\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /scroll-margin-top: var\(--cg-sticky-offset\)/);
  assert.match(css, /\.cg-compare-hint \{/);
  assert.match(compare, /Scroll sideways to compare/);
  assert.match(css, /\.cg-compare-scroll \{[\s\S]*?overflow-x: auto/);
});

test("public-design.css stays under the stylesheet-size regression ceiling", () => {
  assert.ok(Buffer.byteLength(css) < PUBLIC_CEILING_BYTES, `public-design.css is ${Buffer.byteLength(css)} bytes`);
});

test("guided start no longer depends on a page-level inline visual system", () => {
  assert.match(start, /cg-guided-start/);
  assert.doesNotMatch(start, /style=\{\{/);
});
