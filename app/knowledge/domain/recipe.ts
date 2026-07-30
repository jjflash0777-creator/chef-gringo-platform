import type { Recipe, RecipeIngredient } from "./types.ts";

export interface ScaledIngredient extends RecipeIngredient {
  scaledQuantity: number;
}

export function validateServings(servings: number) {
  if (!Number.isInteger(servings) || servings < 1 || servings > 100) {
    throw new Error("Servings must be a whole number from 1 to 100.");
  }
}

export function scaleRecipe(recipe: Recipe, servings: number): ScaledIngredient[] {
  validateServings(servings);
  const factor = servings / recipe.baseYield;
  return recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity: Number((ingredient.quantity * factor).toFixed(1)),
  }));
}

export function buildShoppingList(recipe: Recipe, servings: number) {
  const scaled = scaleRecipe(recipe, servings);
  return ["protein", "refrigerated", "pantry", "produce"].flatMap((group) => {
    const items = scaled.filter((item) => item.group === group);
    return items.length ? [{ group, items }] : [];
  });
}

export function formatMetric(quantity: number, unit: RecipeIngredient["unit"]) {
  if (unit === "each") return `${quantity} ${quantity === 1 ? "egg" : "eggs"}`;
  return `${quantity} ${unit === "gram" ? "g" : "ml"}`;
}
