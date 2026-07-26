export const units = ["teaspoon", "tablespoon", "fluid ounce", "cup", "pint", "quart", "gallon", "ounce", "pound", "gram", "kilogram", "each"];

export function validateServings(original, desired) {
  const errors = {};
  if (!Number.isFinite(Number(original)) || Number(original) <= 0) errors.original = "Original servings must be a number greater than zero.";
  if (!Number.isFinite(Number(desired)) || Number(desired) <= 0) errors.desired = "Desired servings must be a number greater than zero.";
  return errors;
}

export function scaleQuantity(quantity, original, desired) {
  const values = [quantity, original, desired].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("All scaling values must be numbers greater than zero.");
  return values[0] * (values[2] / values[1]);
}

export function formatQuantity(value) {
  return Number(value.toFixed(3)).toLocaleString("en-US", { maximumFractionDigits: 3 });
}
