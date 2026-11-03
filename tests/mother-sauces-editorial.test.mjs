import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Mother Sauces flagship article preserves the history, technique, and source contract", async () => {
  const page = await readFile(new URL("../app/learn/mother-sauces/page.tsx", import.meta.url), "utf8");

  assert.match(page, /The Five Mother Sauces: Learn the System, Not the Recipes/);
  assert.match(page, /Marie-Antoine Carême/);
  assert.match(page, /Auguste Escoffier/);
  assert.match(page, /Béchamel/);
  assert.match(page, /Velouté/);
  assert.match(page, /Espagnole/);
  assert.match(page, /Sauce Tomate/);
  assert.match(page, /Hollandaise/);
  assert.match(page, /nappé/);
  assert.match(page, /Mornay/);
  assert.match(page, /Suprême/);
  assert.match(page, /Béarnaise/);
  assert.match(page, /Learn the system, and the recipes stop owning you/);

  assert.match(page, /gallica\.bnf\.fr/);
  assert.match(page, /wikisource\.org/);
  assert.match(page, /ciafoodies\.com/);
  assert.match(page, /exploratorium\.edu/);
});

test("Mother Sauces is registered as the next Foundations of Flavor feature", async () => {
  const registry = await readFile(new URL("../app/lib/editorial-registry.ts", import.meta.url), "utf8");
  assert.match(registry, /\/learn\/mother-sauces/);
  assert.match(registry, /2026-11-16/);
  assert.match(registry, /Food Intelligence · Foundations of Flavor/);
});
