import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { authorizeMarketplaceEmail } from "../app/lib/marketplace-permissions.ts";
import { evaluateDecisionCase } from "../app/marketplace/intelligence/decision-case-service.ts";
import { buildLabCase, createBlastChillerDemoDraft } from "../app/admin/marketplace/intelligence/lab-model.ts";
import { getFollowUpQuestions, prepareConversationalDraft } from "../app/admin/marketplace/intelligence/conversation.ts";

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

test("private page and analysis endpoint both enforce server-side Marketplace authorization", async () => {
  const page = await readFile(new URL("../app/admin/marketplace/intelligence/page.tsx", import.meta.url), "utf8");
  const actions = await readFile(new URL("../app/api/marketplace/intelligence/analyze/route.ts", import.meta.url), "utf8");
  assert.match(page, /await requireMarketplaceAdministrator\("\/admin\/marketplace\/intelligence"\)/);
  assert.match(actions, /authorizeMarketplaceRequest\(request\)/);
  assert.doesNotMatch(page + actions, /requireChatGPTUser/);
});

test("synthetic blast-chiller demo loads domestic and factory-direct routes", () => {
  const draft = createBlastChillerDemoDraft();
  assert.equal(draft.routes.domestic.enabled, true);
  assert.equal(draft.routes.factory_direct.enabled, true);
  assert.equal(draft.requestedRoute, "factory_direct");
  assert.match(draft.problem, /Fixture only/);
});

test("analysis endpoint delegates to the existing Decision Case Service", async () => {
  const actions = await readFile(new URL("../app/api/marketplace/intelligence/analyze/route.ts", import.meta.url), "utf8");
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
  assert.match(source, /unresolvedPrompts\.map/);
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

test("blank request has a useful visible validation state", async () => {
  const source = await readFile(new URL("../app/admin/marketplace/intelligence/IntelligenceLab.tsx", import.meta.url), "utf8");
  assert.match(source, /Tell Chef Gringo what you are trying to fix/);
  assert.match(source, /setState\("validation_error"\)/);
});

test("simple repair request asks only repair-versus-replacement questions", () => {
  const draft = createBlastChillerDemoDraft();
  Object.assign(draft, { problem: "My reach-in cooler is broken and I need to fix it", equipmentCondition: "", equipmentAge: "", repairEstimate: "", replacementQuote: "" });
  const questions = getFollowUpQuestions(draft);
  assert.deepEqual(questions.map((item) => item.field), ["equipmentCondition", "equipmentAge", "repairEstimate", "replacementQuote"]);
  assert.ok(questions.every((item) => !["factoryPrice", "factoryFreight", "powerCompliance"].includes(item.field)));
});

test("simple purchase request asks only capacity, environment, destination, and quote", () => {
  const draft = createBlastChillerDemoDraft();
  Object.assign(draft, { problem: "I want to buy a new convection oven", category: "", environment: "", country: "", replacementQuote: "" });
  const questions = getFollowUpQuestions(draft);
  assert.deepEqual(questions.map((item) => item.field), ["category", "environment", "country", "replacementQuote"]);
});

test("sufficient conversational repair information runs the deterministic service", () => {
  const draft = createBlastChillerDemoDraft();
  draft.problem = "My current refrigerator is broken and I need to repair or replace it";
  draft.equipmentCondition = "Still usable but unreliable"; draft.equipmentAge = "8 years"; draft.repairEstimate = "600"; draft.replacementQuote = "1800"; draft.country = "United States";
  for (const route of ["domestic", "factory_direct"]) draft.routes[route].enabled = false;
  draft.requestedRoute = null;
  assert.deepEqual(getFollowUpQuestions(draft), []);
  const built = buildLabCase(prepareConversationalDraft(draft), date);
  assert.deepEqual(built.errors, []);
  assert.equal(evaluateDecisionCase(built.input).verdict.verdict, "REPAIR");
});

test("Ask Chef Gringo always exposes loading, follow-up, validation, service error, or success", async () => {
  const source = await readFile(new URL("../app/admin/marketplace/intelligence/IntelligenceLab.tsx", import.meta.url), "utf8");
  for (const state of ["loading", "follow_up", "validation_error", "service_error", "success"]) assert.match(source, new RegExp(state));
  assert.match(source, /Ask Chef Gringo/);
  assert.match(source, /catch \{ setErrors/);
});

test("unresolved engine questions are converted into conversational prompts", async () => {
  const source = await readFile(new URL("../app/admin/marketplace/intelligence/IntelligenceLab.tsx", import.meta.url), "utf8");
  assert.match(source, /followUpsFromUnresolved\(result\.unresolvedQuestions\)/);
});

test("Advanced details retains manual route, cost, risk, evidence, and commercial controls", async () => {
  const source = await readFile(new URL("../app/admin/marketplace/intelligence/IntelligenceLab.tsx", import.meta.url), "utf8");
  assert.match(source, /<details className="advanced-details">/);
  for (const marker of ["Manual route controls", "Evidence \/ source URL", "Risk and verification", "Commercial classification"]) assert.match(source, new RegExp(marker));
});

test("private analysis endpoint rejects missing and non-admin identities and accepts the administrator", async () => {
  const { POST } = await import("../app/api/marketplace/intelligence/analyze/route.ts");
  const input = buildLabCase(createBlastChillerDemoDraft(), date).input;
  process.env.MARKETPLACE_ADMIN_EMAILS = "founder@example.com";
  try {
    assert.equal((await POST(new Request("http://local/api", { method: "POST", body: JSON.stringify(input) }))).status, 401);
    assert.equal((await POST(new Request("http://local/api", { method: "POST", headers: { "oai-authenticated-user-email": "viewer@example.com" }, body: JSON.stringify(input) }))).status, 403);
    const accepted = await POST(new Request("http://local/api", { method: "POST", headers: { "oai-authenticated-user-email": "founder@example.com" }, body: JSON.stringify(input) }));
    assert.equal(accepted.status, 200); assert.equal((await accepted.json()).result.verdict.verdict, "VERIFY_FIRST");
  } finally { delete process.env.MARKETPLACE_ADMIN_EMAILS; }
});
