import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const editorialRegistry = await readFile(new URL("../app/lib/editorial-registry.ts", import.meta.url), "utf8");
const approvedCss = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");
const editorialCss = await readFile(new URL("../app/styles/design-system.css", import.meta.url), "utf8");

test("homepage tells the blog story through the hero and the latest post (2026-11-05 redesign)", () => {
  const hero = page.match(/<section className="cg-approved-hero"([\s\S]*?)<\/section>/)?.[0] ?? "";
  assert.match(hero, /working chef/);
  assert.match(hero, /actually worth buying/);
  assert.match(hero, /latestEditorial\.title/);
  assert.doesNotMatch(page, /<HomepageIntake/);
  assert.doesNotMatch(page, /Hospitality intelligence|Know More\. Waste Less/);
  assert.doesNotMatch(page, /Powerful AI|unlock your potential|revolutionary platform/i);
});

test("homepage surfaces the blog grid, the Foundations track, and downloads", () => {
  for (const copy of [
    "latestEditorial",
    "Foundations of Flavor, in order",
    "Latest posts",
    "DOWNLOAD_PRODUCTS",
    "PartnerBand",
  ]) assert.match(page, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.doesNotMatch(page, /Learn it\. Solve it\. Build it\. Shop it\. Manage it\./);
});

test("homepage shop strip is the partner roster, not a catalog proof block (2026-11-05 redesign)", () => {
  // The 108-record catalog no longer appears on the homepage; the Shop My
  // Kitchen strip (PartnerBand) renders the partner roster instead.
  assert.match(page, /<PartnerBand \/>/);
  assert.doesNotMatch(page, /T-49-HC|M3R47-2-N|Hobart AM16/);
  assert.doesNotMatch(page, /you save|guaranteed savings|factory-direct savings/i);
  assert.doesNotMatch(page, /Load synthetic case/i);
});

test("blog homepage routing stays honest: no intake anchor, no catalog architecture", () => {
  assert.doesNotMatch(page, /operator-question/);
  assert.doesNotMatch(page, /\/marketplace/);
  assert.match(page, /href="\/downloads"/);
  assert.match(page, /href="\/learn"/);
  assert.match(page, /FieldNotesCapture/);
});

test("editorial homepage stays responsive without fixed desktop widths", () => {
  assert.match(editorialCss, /@media \(max-width: 46rem\)[\s\S]*?\.cg-food-feature \{ grid-template-columns: 1fr; \}/);
  assert.match(editorialCss, /@media \(max-width: 46rem\)[\s\S]*?\.cg-home-pathway-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(approvedCss, /\.cg-approved-actions \.cg-button/);
  assert.doesNotMatch(editorialCss, /\.cg-food-feature[^}]*width:\s*[4-9]\d\dpx/);
});
