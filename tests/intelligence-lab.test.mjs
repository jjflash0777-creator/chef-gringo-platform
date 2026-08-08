import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { authorizeMarketplaceEmail } from "../app/lib/marketplace-permissions.ts";
import { evaluateDecisionCase } from "../app/marketplace/intelligence/decision-case-service.ts";
import { buildLabCase, createBlastChillerDemoDraft } from "../app/admin/marketplace/intelligence/lab-model.ts";

const date = "2026-08-08";

test("Intelligence Lab rejects unauthenticated access", () => {
  assert.equal(authorizeMarketplaceEmail(null, "founder@example.com"), null);
});

test("Intelligence Lab rejects a signed-in non-administrator", () => {
  assert.equal(authorizeMarketplaceEmail("viewer@example.com", "founder@example.com"), null);
});

test("Intelligence Lab accepts an allowlisted administrator", () => {
  assert.deepEqual(authorizeMarketplaceEmail("FOUNDER@example.com", "founder@example.com"), { email: "founder@example.com" });
});

test("private page and analysis action both enforce server-side Marketplace authorization", async () => {
  const page = await readFile(new URL("../app/admin/marketplace/intelligence/page.tsx", import.meta.url), "utf8");
  const actions = await readFile(new URL("../app/admin/marketplace/intelligence/actions.ts", import.meta.url), "utf8");
  assert.match(page, /await requireMarketplaceAdministrator\("\/admin\/marketplace\/intelligence"\)/);
  assert.match(actions, /await requireMarketplaceAdministrator\("\/admin\/marketplace\/intelligence"\)/);
  assert.doesNotMatch(page + actions, /requireChatGPTUser/);
});

test("synthetic blast-chiller demo loads domestic and factory-direct routes", () => {
  const draft = createBlastChillerDemoDraft();
  assert.equal(draft.routes.domestic.enabled, true);
  assert.equal(draft.routes.factory_direct.enabled, true);
  assert.equal(draft.requestedRoute, "factory_direct");
  assert.match(draft.problem, /Fixture only/);
});

test("Analyze action delegates to the existing Decision Case Service", async () => {
  const actions = await readFile(new URL("../app/admin/marketplace/intelligence/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /evaluateDecisionCase\(validation\.value\)/);
  assert.match(actions, /validateDecisionCaseInput\(input\)/);
});

test("blast-chiller demo deterministically displays VERIFY_FIRST", () => {
  const built = buildLabCase(createBlastChillerDemoDraft(), date);
  assert.deepEqual(built.errors, []);
  const result = evaluateDecisionCase(built.input);
  assert.equal(result.verdict.verdict, "VERIFY_FIRST");
  assert.equal(result.verdict.selectedRoute, "factory_direct");
});

test("incomplete factory landed cost never creates publishable savings", () => {
  const built = buildLabCase(createBlastChillerDemoDraft(), date);
  const result = evaluateDecisionCase(built.input);
  const comparison = result.savingsComparisons.find((item) => item.candidateRoute === "factory_direct");
  assert.equal(comparison.publishable, false);
  assert.equal(comparison.estimatedLandedSavings, null);
  assert.match(comparison.missingCostWarning, /incomplete/i);
});

test("unresolved questions render and commercial intelligence stays visibly separate", async () => {
  const source = await readFile(new URL("../app/admin/marketplace/intelligence/IntelligenceLab.tsx", import.meta.url), "utf8");
  assert.match(source, /result\.unresolvedQuestions\.map/);
  assert.match(source, /Internal only · Separated from recommendation/);
  assert.match(source, /Commercial economics were attached after the verdict was calculated/);
});

test("commercial changes cannot contaminate the lab verdict", () => {
  const first = createBlastChillerDemoDraft();
  const second = structuredClone(first); second.commercialType = "affiliate";
  const firstResult = evaluateDecisionCase(buildLabCase(first, date).input);
  const secondResult = evaluateDecisionCase(buildLabCase(second, date).input);
  assert.deepEqual(firstResult.verdict, secondResult.verdict);
  assert.notDeepEqual(firstResult.commercialOpportunities, secondResult.commercialOpportunities);
});

test("lab styles collapse comparison and form grids for mobile", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width:700px\).*\.comparison-grid.*grid-template-columns:1fr/s);
  assert.match(css, /\.analyze-bar \{ position:static;/);
});
