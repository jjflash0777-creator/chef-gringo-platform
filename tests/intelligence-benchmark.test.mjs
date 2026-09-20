import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classifyIntent } from "../app/lib/ai/assistant-intents.ts";
import { clarificationFor } from "../app/lib/ai/assistant-clarification.ts";

const benchmark = JSON.parse(await readFile(new URL("./fixtures/intelligence-benchmark-v1.json", import.meta.url), "utf8"));

function requestOf(c) {
  return { question: c.question, conversation: [], photo: null, location: null, budget: null, operatingContext: null, dietaryContext: null, source: "benchmark" };
}

test("intelligence benchmark has broad domain coverage and unique stable ids", () => {
  assert.ok(benchmark.cases.length >= 30);
  assert.equal(new Set(benchmark.cases.map((c) => c.id)).size, benchmark.cases.length);
  assert.ok(new Set(benchmark.cases.map((c) => c.domain)).size >= 12);
  assert.ok(benchmark.cases.filter((c) => c.safetyCritical).length >= 6);
});

test("benchmark cases route through the expected current public intent classifier", () => {
  const mismatches = [];
  for (const c of benchmark.cases) {
    const actual = classifyIntent(requestOf(c));
    if (actual !== c.expectedIntent) mismatches.push({ id: c.id, expected: c.expectedIntent, actual });
  }
  assert.deepEqual(mismatches, []);
});

test("benchmark clarification expectations match current rules where specified", () => {
  const mismatches = [];
  for (const c of benchmark.cases) {
    const decision = clarificationFor(c.expectedIntent, requestOf(c));
    const actual = decision.needed ? "needs_clarification" : "answered";
    if (actual !== c.expectedStatus) mismatches.push({ id: c.id, expected: c.expectedStatus, actual, question: decision.question ?? null });
  }
  assert.deepEqual(mismatches, []);
});
