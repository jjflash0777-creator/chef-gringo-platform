import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const homeCss = await readFile(new URL("../app/styles/publication-home.css", import.meta.url), "utf8");
const articleCss = await readFile(new URL("../app/styles/publication-article.css", import.meta.url), "utf8");
const article = await readFile(new URL("../app/articles/[slug]/page.tsx", import.meta.url), "utf8");
const section = await readFile(new URL("../app/editorial/SectionPage.tsx", import.meta.url), "utf8");
const recipes = await readFile(new URL("../app/recipes/page.tsx", import.meta.url), "utf8");

test("homepage keeps weekly feature, five daily lanes, commerce row, and recent stories", () => {
  assert.match(home, /cg-pub-featured/);
  assert.match(home, /cg-pub-daily-grid/);
  assert.match(home, /cg-pub-commerce-grid/);
  assert.match(home, /cg-pub-recent-grid/);
  assert.match(home, /Today on Chef Gringo/);
  assert.doesNotMatch(home, /cg-approved-hero|cg-approved-intake|HomepageIntake/);
});

test("publication visual system preserves the approved dense editorial hierarchy", () => {
  assert.match(homeCss, /\.cg-pub-header/);
  assert.match(homeCss, /\.cg-pub-featured h1/);
  assert.match(homeCss, /grid-template-columns: repeat\(5/);
  assert.match(homeCss, /\.cg-pub-story-section/);
  assert.match(homeCss, /\.cg-pub-commerce-grid/);
  assert.match(homeCss, /\.cg-pub-footer/);
});

test("article and section pages stay inside the same publication design", () => {
  assert.match(article, /PublicationFrame/);
  assert.match(article, /JoshTake/);
  assert.match(article, /application\/ld\+json/);
  assert.match(section, /PublicationFrame/);
  assert.match(section, /EditorialArticleCard/);
  assert.match(articleCss, /\.cg-article-hero/);
  assert.match(articleCss, /\.cg-section-hero/);
});

test("mobile editorial cards remain scrollable and article layout collapses safely", () => {
  assert.match(homeCss, /@media \(max-width: 820px\)[\s\S]*?\.cg-pub-daily-grid/);
  assert.match(homeCss, /overflow-x: auto/);
  assert.match(articleCss, /@media \(max-width: 860px\)/);
  assert.match(articleCss, /\.cg-article-layout \{[\s\S]*?grid-template-columns: 1fr/);
});

test("recipe system remains available behind the publication", () => {
  assert.match(recipes, /Huli Huli Braised Short Ribs/);
  assert.match(recipes, /Recipe of the week/);
  assert.match(recipes, /recipe-scaler/);
});
