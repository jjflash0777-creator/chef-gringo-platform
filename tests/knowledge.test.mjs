import assert from "node:assert/strict";
import test from "node:test";
import { carbonara, carbonaraRecipe, knowledgeEntities, relationships } from "../app/knowledge/domain/seed.ts";
import { buildShoppingList, scaleRecipe, validateServings } from "../app/knowledge/domain/recipe.ts";
import { groupResults, localSearchAdapter } from "../app/knowledge/search/search.ts";

test("knowledge model has stable typed entities and explicit relationships", () => {
  assert.equal(carbonara.id, "dish:carbonara");
  assert.ok(knowledgeEntities.some((entity) => entity.entityType === "technique"));
  assert.ok(relationships.some((edge) => edge.fromId === carbonara.id && edge.type === "uses_ingredient"));
  assert.ok(knowledgeEntities.every((entity) => entity.status && entity.verification && Array.isArray(entity.sources)));
});

test("local search finds exact and natural-language Carbonara knowledge", async () => {
  const exact = await localSearchAdapter.search("Carbonara");
  assert.equal(exact[0].entity.id, "dish:carbonara");
  const question = await localSearchAdapter.search("How do I stop eggs from scrambling in carbonara?");
  assert.ok(question.some((result) => result.entity.id === "technique:tempering"));
  assert.ok(groupResults(question).technique?.length);
  assert.deepEqual(await localSearchAdapter.search("telescope repair"), []);
});

test("serving scale validates bounds and performs proportional math", () => {
  assert.equal(scaleRecipe(carbonaraRecipe, 8)[0].scaledQuantity, 800);
  assert.throws(() => validateServings(0), /1 to 100/);
  assert.throws(() => validateServings(2.5), /whole number/);
});

test("shopping list retains every ingredient and groups it for use", () => {
  const groups = buildShoppingList(carbonaraRecipe, 4);
  assert.deepEqual(groups.map(({ group }) => group), ["protein", "refrigerated", "pantry"]);
  assert.equal(groups.flatMap(({ items }) => items).length, carbonaraRecipe.ingredients.length);
});

test("third-party interpretations are summaries with explicit source boundaries", () => {
  const interpretations = knowledgeEntities.filter((entity) => entity.entityType === "chef_interpretation");
  assert.ok(interpretations.every((entity) => entity.tags.includes("attributed-summary")));
  assert.ok(interpretations.every((entity) => entity.sources.some((source) => /no recipe text reproduced/i.test(source.note ?? ""))));
});
