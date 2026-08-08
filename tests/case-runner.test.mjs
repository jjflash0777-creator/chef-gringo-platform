import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateDecisionCaseInput } from "../app/marketplace/intelligence/case-input-validation.ts";

const completePath = new URL("../app/marketplace/intelligence/fixtures/case-runner-valid-complete.json", import.meta.url);
const incompletePath = new URL("../app/marketplace/intelligence/fixtures/case-runner-valid-incomplete.json", import.meta.url);
const invalidPath = new URL("../app/marketplace/intelligence/fixtures/case-runner-invalid.json", import.meta.url);
const runnerPath = new URL("../scripts/intelligence/run-case.mjs", import.meta.url);

async function fixture(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function run(path) {
  return spawnSync(process.execPath, [fileURLToPath(runnerPath), path], { encoding: "utf8" });
}

test("complete and incomplete synthetic inputs pass runtime validation", async () => {
  assert.equal(validateDecisionCaseInput(await fixture(completePath)).ok, true);
  assert.equal(validateDecisionCaseInput(await fixture(incompletePath)).ok, true);
});

test("malformed JSON exits non-zero with a root-level parse error", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chef-gringo-case-"));
  const path = join(directory, "malformed.json");
  try {
    await writeFile(path, "{ not-json", "utf8");
    const result = run(path);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Malformed JSON/);
    assert.equal(JSON.parse(result.stderr).errors[0].path, "$");
  } finally { await rm(directory, { recursive: true }); }
});

test("missing required fields return clear field-level errors", () => {
  const result = validateDecisionCaseInput({});
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "$.decisionCase"));
  assert.ok(result.errors.some((error) => error.path === "$.riskGatesByOptionId"));
  assert.ok(result.errors.some((error) => error.path === "$.calculatedAt"));
});

test("invalid money values and reversed ranges fail without coercion", async () => {
  const input = await fixture(completePath);
  input.decisionCase.options[0].landedCostInputs.productPrice = { lowCents: "10", expectedCents: 5, highCents: -1, currency: "usd", basis: "guessed" };
  const result = validateDecisionCaseInput(input);
  assert.equal(result.ok, false);
  const paths = result.errors.map((error) => error.path);
  assert.ok(paths.includes("$.decisionCase.options[0].landedCostInputs.productPrice.lowCents"));
  assert.ok(paths.includes("$.decisionCase.options[0].landedCostInputs.productPrice.currency"));
  assert.ok(paths.includes("$.decisionCase.options[0].landedCostInputs.productPrice.basis"));
});

test("invalid route types fail closed", async () => {
  const input = await fixture(completePath);
  input.decisionCase.options[0].route = "sponsored_winner";
  const result = validateDecisionCaseInput(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "$.decisionCase.options[0].route"));
});

test("invalid confidence and evidence values fail closed", async () => {
  const input = await fixture(completePath);
  input.decisionCase.confidence = "certain";
  input.decisionCase.evidence[0].sourceUrl = "http://unsafe.example";
  input.decisionCase.evidence[0].verificationStatus = "probably";
  const result = validateDecisionCaseInput(input);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.path === "$.decisionCase.confidence"));
  assert.ok(result.errors.some((error) => error.path.endsWith(".sourceUrl")));
  assert.ok(result.errors.some((error) => error.path.endsWith(".verificationStatus")));
});

test("incomplete factory-direct fixture runs successfully but returns VERIFY_FIRST", () => {
  const result = run(fileURLToPath(incompletePath));
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).result.verdict.verdict, "VERIFY_FIRST");
});

test("complete fixture produces deterministic BUY_DOMESTIC output without changing its file", async () => {
  const before = await readFile(completePath, "utf8");
  const first = run(fileURLToPath(completePath));
  const second = run(fileURLToPath(completePath));
  assert.equal(first.status, 0);
  assert.equal(first.stdout, second.stdout);
  assert.equal(JSON.parse(first.stdout).result.verdict.verdict, "BUY_DOMESTIC");
  assert.equal(await readFile(completePath, "utf8"), before);
});

test("intentionally invalid fixture exits non-zero with field-level errors", () => {
  const result = run(fileURLToPath(invalidPath));
  assert.notEqual(result.status, 0);
  const output = JSON.parse(result.stderr);
  assert.equal(output.ok, false);
  assert.ok(output.errors.some((error) => error.path.includes("route")));
  assert.ok(output.errors.some((error) => error.path.includes("productPrice")));
});

test("commercial opportunity changes cannot contaminate CLI verdict", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chef-gringo-case-"));
  const path = join(directory, "commercial.json");
  try {
    const input = await fixture(completePath);
    const baseline = JSON.parse(run(fileURLToPath(completePath)).stdout).result.verdict;
    input.commercialOpportunities = [{ type: "affiliate", scorecard: null, note: "Synthetic commercial variation" }];
    await writeFile(path, JSON.stringify(input), "utf8");
    const changed = run(path);
    assert.equal(changed.status, 0);
    assert.deepEqual(JSON.parse(changed.stdout).result.verdict, baseline);
  } finally { await rm(directory, { recursive: true }); }
});
