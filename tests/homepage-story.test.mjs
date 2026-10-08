import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const publicationCss = await readFile(new URL("../app/styles/publication-home.css", import.meta.url), "utf8");
const recipeOfTheDay = await readFile(new URL("../app/home/recipe-of-the-day.ts", import.meta.url), "utf8");

test("homepage presents a food publication hero without intelligence-platform branding", () => {
  assert.match(page, /Food worth understanding/);
  assert.match(page, /Recipes worth cooking/);
  assert.match(page, /Kitchen knowledge worth keeping/);
  assert.match(page, /chef-led food publication/i);
  assert.doesNotMatch(page, /Hospitality intelligence that ends in action/i);
  assert.doesNotMatch(page, /Decision → Action|Decision standard|Evidence before recommendation/i);
  assert.doesNotMatch(page, /One platform|Food intelligence|intelligence platform/i);
  assert.doesNotMatch(page, /Powerful AI|unlock your potential|revolutionary platform/i);
});

test("homepage features Recipe of the Day and the kids editorial article", () => {
  assert.match(page, /recipeOfTheDay/);
  assert.match(recipeOfTheDay, /Recipe of the Day/);
  assert.match(recipeOfTheDay, /\/knowledge\/dishes\/carbonara/);
  assert.match(page, /What Are We Feeding Our Kids\?/);
  assert.match(page, /\/learn\/what-are-we-feeding-our-kids/);
  assert.match(page, /child-grocery-aisle\.jpg/);
});

test("homepage keeps Ask Chef Gringo secondary and commercial section restrained", () => {
  assert.match(page, /Have a kitchen question\?/);
  assert.match(page, /<HomepageIntake/);
  assert.match(page, /Chef Gringo recommends/);
  assert.match(page, /\/marketplace\?workflow=better-thermometer/);
  assert.match(page, /\/marketplace\/products\/thermoworks-thermapen-one/);
  assert.match(page, /\/go\/thermoworks/);
  assert.match(page, /Affiliate disclosure/);
  assert.doesNotMatch(page, /you save|guaranteed savings|factory-direct savings|limited-time price/i);
  assert.doesNotMatch(page, /Load synthetic case/i);
});

test("publication homepage stays responsive without fixed desktop widths", () => {
  assert.match(publicationCss, /@media \(max-width: 56rem\)/);
  assert.match(publicationCss, /\.cg-pub-hero/);
  assert.match(publicationCss, /\.cg-pub-rotd/);
  assert.doesNotMatch(publicationCss, /\.cg-pub-more-card[^}]*width:\s*[4-9]\d\dpx/);
});
