import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Mother Sauces flagship article keeps the locked title, verified history, and source contract", async () => {
  const page = await readFile(new URL("../app/learn/mother-sauces-foundations-of-flavor/page.tsx", import.meta.url), "utf8");

  assert.match(page, /Mother Sauces: Five Bases, a Thousand Dinners/);
  assert.match(page, /Food Intelligence · Foundations of Flavor No\. 2/);
  assert.match(page, /Carême had four/);
  assert.match(page, /Escoffier made it five/);
  assert.match(page, /1833 · Carême/);
  assert.match(page, /1907 · The English edition/);
  assert.match(page, /not, strictly speaking, a basic sauce/);
  assert.match(page, /The\s+basic sauces: Espagnole, Velouté, Béchamel, Tomato, and Hollandaise/);

  assert.match(page, /mother_sauces_five_sauciers_overhead\.png/);
  assert.match(page, /roux_stages_white_blond_brown\.png/);
  assert.match(page, /recipe_bechamel\.png/);
  assert.match(page, /recipe_veloute\.png/);
  assert.match(page, /recipe_espagnole\.png/);
  assert.match(page, /recipe_sauce_tomate\.png/);
  assert.match(page, /recipe_hollandaise\.png/);

  assert.match(page, /en\.wikisource\.org\/wiki\/Page:Escoffier_-_A_Guide_to_Modern_Cookery\.djvu\/28/);
  assert.match(page, /exhibits\.library\.cornell\.edu\/food\/feature\/gastronomy/);
  assert.match(page, /pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC4554620/);
  assert.match(page, /fda\.gov\/food\/fda-food-code\/food-code-2022/);

  // In-article Field Notes block and the honest "in development" Food Bible line.
  assert.match(page, /NewsletterForm source="field-notes"/);
  assert.match(page, /in\s+development/);

  // Bottom affiliate section: only the two approved partner routes, disclosure adjacent.
  assert.match(page, /href="\/go\/thermoworks"/);
  assert.match(page, /href="\/go\/gustus-vitae"/);
  assert.match(page, /AffiliateDisclosure/);

  // The article links to all five companion recipes.
  for (const slug of ["bechamel", "veloute", "espagnole", "sauce-tomate", "hollandaise"]) {
    assert.match(page, new RegExp(`href="/recipes/${slug}"`));
  }
});

test("five mother-sauce recipe pages exist with derivatives, scaling notes, and the hollandaise safety block", async () => {
  const slugs = ["bechamel", "veloute", "espagnole", "sauce-tomate", "hollandaise"];
  for (const slug of slugs) {
    const page = await readFile(new URL(`../app/recipes/${slug}/page.tsx`, import.meta.url), "utf8");
    assert.match(page, /The complete recipe/);
    assert.match(page, /Scaling notes|Scaling Notes/);
    assert.match(page, /source-ready/);
    assert.match(page, /Kitchen-test logs are not in this repository/);
  }
  const hollandaise = await readFile(new URL("../app/recipes/hollandaise/page.tsx", import.meta.url), "utf8");
  assert.match(hollandaise, /135 °F \(57 °C\)/);
  assert.match(hollandaise, /four hours/);
  assert.match(hollandaise, /not a make-ahead-and-reheat sauce/);
});

test("recipes index lists the five sauces and no longer previews the category as coming later", async () => {
  const recipes = await readFile(new URL("../app/recipes/page.tsx", import.meta.url), "utf8");
  assert.match(recipes, /Seven complete recipes/);
  for (const slug of ["bechamel", "veloute", "espagnole", "sauce-tomate", "hollandaise"]) {
    assert.match(recipes, new RegExp(`/recipes/${slug}`));
  }
  assert.doesNotMatch(recipes, /"Sauces and condiments"/);
});

test("editorial registry leads with the Mother Sauces feature", async () => {
  const registry = await readFile(new URL("../app/lib/editorial-registry.ts", import.meta.url), "utf8");
  const motherIndex = registry.indexOf("/learn/mother-sauces-foundations-of-flavor");
  const mirepoixIndex = registry.indexOf("/learn/mirepoix-foundations-of-flavor");
  assert.ok(motherIndex >= 0 && mirepoixIndex > motherIndex);
});
