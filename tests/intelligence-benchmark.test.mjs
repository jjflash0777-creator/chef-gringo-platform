import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const benchmark = JSON.parse(await readFile(new URL("./fixtures/intelligence-benchmark-v1.json", import.meta.url), "utf8"));

test("intelligence benchmark has broad domain coverage and unique stable ids", () => {
  assert.ok(benchmark.cases.length >= 30);
  assert.equal(new Set(benchmark.cases.map((c) => c.id)).size, benchmark.cases.length);
  assert.ok(new Set(benchmark.cases.map((c) => c.domain)).size >= 12);
  assert.ok(benchmark.cases.filter((c) => c.safetyCritical).length >= 6);
});

test("every benchmark case declares desired routing and answer checks", () => {
  for (const c of benchmark.cases) {
    assert.match(c.id, /^[a-z]+-\d{3}$/);
    assert.ok(c.question.length >= 8);
    assert.ok(c.expectedIntent);
    assert.ok(["answered", "needs_clarification"].includes(c.expectedStatus));
    assert.ok((c.mustIncludeAny?.length ?? 0) + (c.mustNotInclude?.length ?? 0) > 0);
  }
});
