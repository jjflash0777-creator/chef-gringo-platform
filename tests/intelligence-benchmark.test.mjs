import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const benchmark = JSON.parse(await readFile(new URL("./fixtures/intelligence-benchmark-v1.json", import.meta.url), "utf8"));

test("intelligence benchmark has broad domain coverage and unique stable ids", () => {
  assert.ok(benchmark.cases.length >= 100);
  assert.equal(new Set(benchmark.cases.map((c) => c.id)).size, benchmark.cases.length);
  assert.ok(new Set(benchmark.cases.map((c) => c.domain)).size >= 20);
  assert.ok(benchmark.cases.filter((c) => c.safetyCritical).length >= 15);
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


test("public Chef Gringo has one canonical prompt and no duplicate chat client", async () => {
  const [service, runtime, prompt] = await Promise.all([
    readFile(new URL("../app/lib/ai/assistant-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/ai/chefGringoRuntime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/ai/assistant-prompt.ts", import.meta.url), "utf8"),
  ]);
  assert.match(service, /CHEF_GRINGO_SYSTEM_PROMPT/);
  assert.match(prompt, /You are Chef Gringo/);
  assert.doesNotMatch(runtime, /askChefGringoAi|QUICK_REPLY_PROMPT|SYSTEM_PROMPT|chat\/completions/);
});

test("live quality benchmark refuses implicit local Ollama by default", async () => {
  const runner = await readFile(new URL("../scripts/intelligence/run-benchmark.mjs", import.meta.url), "utf8");
  assert.match(runner, /--allow-local-ollama/);
  assert.match(runner, /requires an explicitly configured CHEF_GRINGO_AI_BASE_URL and CHEF_GRINGO_AI_MODEL/);
});
