import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const publication = await readFile(new URL("../app/home/editorial-publication.ts", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/publication-home.css", import.meta.url), "utf8");

test("homepage is a five-lane Chef Gringo editorial publication", () => {
  for (const copy of ["Front of House","Back of House","Independent & Mobile","Health & Better Living","Food Intelligence","Today on Chef Gringo"]) {
    assert.ok((page + publication).includes(copy), copy);
  }
});

test("homepage leads with one weekly featured story and Josh voice", () => {
  assert.ok(publication.includes("Featured story of the week"));
  assert.ok(publication.includes("What Nearly 30 Years in Hospitality Taught Me About People"));
  assert.ok(page.includes("Chef · Operator · Storyteller"));
  assert.ok(page.includes("Real-world hospitality. No bullshit."));
  assert.doesNotMatch(page, /Recommended tools for hospitality operators|Hospitality intelligence that ends in action/i);
});

test("editorial homepage preserves commerce without becoming a storefront", () => {
  assert.match(page, /Gear I actually use/i);
  assert.match(page, /Deals & operator tools/i);
  assert.match(page, /Join the crew/i);
  assert.match(page, /href="\/go\/thermoworks"/);
  assert.match(page, /href="\/marketplace"/);
  assert.match(page, /NewsletterForm/);
});

test("publication model supports five daily stories", () => {
  assert.match(publication, /export const dailyStories/);
  assert.match(publication, /export const editorialSections/);
  assert.equal((publication.match(/publishedAt: "Today"/g) ?? []).length, 5);
  assert.match(publication, /destination\?:/);
});

test("editorial homepage stays responsive and dense on mobile", () => {
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /\.cg-pub-daily-grid \{[\s\S]*?display: flex;/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /@media \(max-width: 520px\)/);
});
