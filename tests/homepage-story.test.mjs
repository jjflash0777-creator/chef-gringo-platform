import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateBlastChillerFixture } from "../app/marketplace/intelligence/fixtures/blast-chiller-case.ts";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");

test("homepage tells one problem-to-decision story below the preserved hero", () => {
  const hero = page.match(/<section className="cg-home-hero">([\s\S]*?)<\/section>/)?.[0] ?? "";
  assert.match(hero, /What are you working on\?/);
  assert.match(hero, /<HomepageIntake/);
  assert.match(hero, /Recommendations are based on operator value—not commission/);
  for (const step of ["Start with the problem", "Identify", "Investigate", "Compare", "Decide"])
    assert.match(page, new RegExp(step));
  assert.doesNotMatch(page, /Powerful AI|unlock your potential|revolutionary platform/i);
});

test("problem examples sound like real requests instead of feature claims", () => {
  for (const problem of ["freezer is running warm", "equivalent for less", "will this replacement actually fit", "repair this equipment or replace it"])
    assert.match(page, new RegExp(problem));
});

test("problem proof matches the existing synthetic fixture and refuses fake savings", () => {
  const fixture = evaluateBlastChillerFixture();
  assert.equal(fixture.domestic.total?.expectedCents, 1_354_000);
  assert.equal(fixture.factoryDirect.productPrice?.expectedCents, 480_000);
  assert.equal(fixture.factoryDirect.total, null);
  assert.equal(fixture.comparison.publishable, false);
  assert.equal(fixture.verdict.verdict, "VERIFY_FIRST");
  for (const copy of ["$13,540", "$4,800", "Landed cost", "Unknown", "Verify first", "Insufficient"])
    assert.match(page, new RegExp(copy.replace("$", "\\$"), "i"));
  assert.doesNotMatch(page, /you save|guaranteed savings|factory-direct savings/i);
});

test("comparison, independence, and second intake preserve honest public routing", () => {
  for (const dimension of ["Repair cost", "Shipping & landed cost", "Downtime", "Compatibility", "Warranty", "Supplier risk"])
    assert.match(page, new RegExp(dimension.replace("&", "&")));
  assert.match(page, /A commission can support the work\. It cannot change the answer\./);
  assert.match(page, /href="#operator-question">Tell Chef Gringo/);
  assert.match(page, /id="grow"/);
  assert.match(page, /\/marketplace#how-we-score/);
});

test("story CSS stacks comparisons without shrinking touch targets or creating fixed widths", () => {
  assert.match(css, /@media \(max-width: 32rem\)[\s\S]*\.cg-proof-routes \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.cg-story-cta \.cg-button[^}]*min-width:\s*13rem/);
  assert.doesNotMatch(css, /\.cg-story[^}]*width:\s*[4-9]\d\dpx/);
});
