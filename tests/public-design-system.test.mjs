import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");
const pub = await readFile(new URL("../app/styles/publication-home.css", import.meta.url), "utf8");
const article = await readFile(new URL("../app/styles/publication-article.css", import.meta.url), "utf8");
const shell = await readFile(new URL("../app/components/PublicShell.tsx", import.meta.url), "utf8");

test("root layout loads only active global/publication style layers", () => {
  assert.match(layout, /globals\.css/);
  assert.match(layout, /design-system\.css/);
  assert.match(layout, /recipes\.css/);
  assert.match(layout, /publication-home\.css/);
  assert.match(layout, /publication-article\.css/);
  assert.doesNotMatch(layout, /homepage-v4\.css|commerce-homepage\.css/);
});

test("canonical design tokens remain available to legacy tools", () => {
  for (const token of ["--cg-gutter","--cg-touch","--cg-focus","--cg-width-wide","--cg-text"]) {
    assert.match(css, new RegExp(token));
  }
});

test("publication gets a distinct visual layer without styling admin interfaces", () => {
  assert.match(pub, /\.cg-publication-home/);
  assert.match(pub, /\.cg-pub-header/);
  assert.match(article, /\.cg-article/);
  assert.doesNotMatch(pub + article, /\.admin-|\.partner-hunt|\.intelligence-/);
});

test("publication routes bypass the legacy shell while admin stays isolated", () => {
  assert.match(shell, /isPublicationPath/);
  assert.match(shell, /pathname\.startsWith\("\/admin\/"\)/);
  assert.match(shell, /pathname\.startsWith\("\/articles\/"\)/);
});

test("publication styles include responsive behavior", () => {
  assert.match(pub, /@media \(max-width: 820px\)/);
  assert.match(pub, /@media \(max-width: 520px\)/);
  assert.match(article, /@media \(max-width: 860px\)/);
  assert.match(article, /@media \(max-width: 560px\)/);
});
