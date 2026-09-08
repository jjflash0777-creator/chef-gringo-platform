import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const approvedCss = await readFile(new URL("../app/styles/approved-home.css", import.meta.url), "utf8");
const editorialCss = await readFile(new URL("../app/styles/home-editorial-v2.css", import.meta.url), "utf8");

test("homepage tells one problem-to-decision story through the approved hero and intake", () => {
  const hero = page.match(/<section className="cg-approved-hero"([\s\S]*?)<\/section>/)?.[0] ?? "";
  assert.match(hero, /Know More\. Waste Less/);
  assert.match(hero, /Hospitality intelligence that ends in action/);
  assert.match(page, /<HomepageIntake/);
  assert.match(page, /recommendation comes first; commercial routes come after/i);
  for (const step of ["Identify", "Investigate", "Decide", "Act"])
    assert.match(page, new RegExp(step));
  assert.doesNotMatch(page, /Powerful AI|unlock your potential|revolutionary platform/i);
});

test("homepage surfaces food intelligence and real operator pathways", () => {
  for (const copy of [
    "Beets: More Than a Beautiful Root",
    "What are you working on?",
    "Buying equipment",
    "Comparing software",
    "Learn it. Solve it. Build it. Shop it. Manage it.",
  ]) assert.match(page, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
});

test("featured marketplace proof uses real candidates and refuses fake savings", () => {
  for (const copy of ["True", "T-49-HC", "Turbo Air", "M3R47-2-N", "Hobart", "Quote required"])
    assert.match(page, new RegExp(copy, "i"));
  assert.doesNotMatch(page, /you save|guaranteed savings|factory-direct savings/i);
  assert.doesNotMatch(page, /Load synthetic case/i);
});

test("independence and intake preserve honest public routing", () => {
  assert.match(page, /The recommendation comes first; commercial routes come after/);
  assert.match(page, /href="#operator-question">Ask Chef Gringo/);
  assert.match(page, /id="operator-question"/);
  assert.match(page, /href="\/marketplace"/);
  assert.match(page, /href="\/cut-intelligence"/);
});

test("editorial homepage stays responsive without fixed desktop widths", () => {
  assert.match(editorialCss, /@media \(max-width: 46rem\)[\s\S]*?\.cg-food-feature \{ grid-template-columns: 1fr; \}/);
  assert.match(editorialCss, /@media \(max-width: 46rem\)[\s\S]*?\.cg-home-pathway-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(approvedCss, /\.cg-approved-actions \.cg-button/);
  assert.doesNotMatch(editorialCss, /\.cg-food-feature[^}]*width:\s*[4-9]\d\dpx/);
});
