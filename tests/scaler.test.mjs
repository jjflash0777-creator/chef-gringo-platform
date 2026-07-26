import assert from "node:assert/strict";
import test from "node:test";
import { formatQuantity, scaleQuantity, units, validateServings } from "../app/tools/recipe-scaler/scaler.mjs";

test("calculates the scaling factor and scales quantities", () => {
  assert.equal(scaleQuantity(2, 4, 10), 5);
  assert.equal(scaleQuantity(1.5, 8, 24), 4.5);
});
test("supports all MVP units without converting them", () => {
  assert.deepEqual(units, ["teaspoon", "tablespoon", "fluid ounce", "cup", "pint", "quart", "gallon", "ounce", "pound", "gram", "kilogram", "each"]);
});
test("rejects zero, negative, missing, and nonnumeric serving values", () => {
  assert.ok(validateServings(0, 2).original);
  assert.ok(validateServings(2, -1).desired);
  assert.ok(validateServings("", 2).original);
  assert.ok(validateServings(2, "nope").desired);
  assert.throws(() => scaleQuantity(0, 4, 8));
});
test("formats scaled quantities without noisy floating point digits", () => {
  assert.equal(formatQuantity(2.333333333), "2.333");
  assert.equal(formatQuantity(3), "3");
});
