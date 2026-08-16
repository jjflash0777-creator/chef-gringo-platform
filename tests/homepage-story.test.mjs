import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");

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

test("homepage categories and intake sound like real operator work", () => {
  for (const problem of ["Refrigeration", "Food Prep", "Warewashing", "Buying equipment", "Comparing software"])
    assert.match(page, new RegExp(problem));
});

test("featured marketplace proof uses real candidates and refuses fake savings", () => {
  for (const copy of ["True", "T-49-HC", "Turbo Air", "M3R47-2-N", "ThermoWorks", "Hobart"])
    assert.match(page, new RegExp(copy, "i"));
  assert.doesNotMatch(page, /you save|guaranteed savings|factory-direct savings/i);
  assert.doesNotMatch(page, /Load synthetic case/i);
});

test("independence and intake preserve honest public routing", () => {
  assert.match(page, /The recommendation comes first; commercial routes come after/);
  assert.match(page, /href="#operator-question">Ask Chef Gringo/);
  assert.match(page, /id="grow"/);
  assert.match(page, /href="\/marketplace"/);
});

test("story CSS stacks comparisons without shrinking touch targets or creating fixed widths", () => {
  assert.match(css, /@media \(max-width: 32rem\)[\s\S]*\.cg-proof-routes \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.cg-story-cta \.cg-button[^}]*min-width:\s*13rem/);
  assert.doesNotMatch(css, /\.cg-story[^}]*width:\s*[4-9]\d\dpx/);
});
