import assert from "node:assert/strict";
import test from "node:test";
import { evaluateDecisionCase } from "../app/marketplace/intelligence/decision-case-service.ts";
import { blastChillerDecisionCase, blastChillerRiskGates } from "../app/marketplace/intelligence/fixtures/blast-chiller-case.ts";

const money = (cents, basis = "estimated") => ({ lowCents: cents, expectedCents: cents, highCents: cents, currency: "USD", basis });
const completeCost = (price) => ({
  productPrice: money(price, "observed"), shippingFreight: money(10_000), dutyTariff: money(5_000),
  brokerageCustoms: money(2_000), taxes: money(8_000), finalMileDelivery: money(3_000),
  accessoriesAdaptation: money(2_000), otherCosts: [], notApplicable: [],
  destinationAssumptions: ["Synthetic continental United States destination"], calculatedAt: "2026-08-08",
});
const verifiedGates = () => blastChillerRiskGates.map((gate) => ({ ...gate, status: "verified", evidenceClaimIds: ["fixture:evidence:domestic-price"] }));

function caseWithOptions(options) {
  const decisionCase = structuredClone(blastChillerDecisionCase);
  decisionCase.options = options;
  decisionCase.confidence = "moderate";
  decisionCase.recommendationStatus = "ready";
  return decisionCase;
}

function option(id, route, price) {
  return { id, route, label: `Synthetic ${route}`, productId: null, entityId: null, landedCostInputs: completeCost(price), evidenceClaimIds: [] };
}

function inputFor(decisionCase, overrides = {}) {
  return {
    decisionCase,
    riskGatesByOptionId: Object.fromEntries(decisionCase.options.map((item) => [item.id, verifiedGates()])),
    calculatedAt: "2026-08-08",
    ...overrides,
  };
}

test("complete domestic and factory-direct case returns structured routes, costs, comparisons, and the lower viable route", () => {
  const decisionCase = caseWithOptions([option("domestic", "domestic", 200_000), option("factory", "factory_direct", 120_000)]);
  const output = evaluateDecisionCase(inputFor(decisionCase));
  assert.equal(output.availableRoutes.length, 5);
  assert.equal(output.availableRoutes.filter((route) => route.available).length, 2);
  assert.equal(output.landedCosts.domestic.complete, true);
  assert.equal(output.savingsComparisons[0].publishable, true);
  assert.equal(output.verdict.verdict, "BUY_FACTORY_DIRECT");
});

test("incomplete factory-direct route returns VERIFY_FIRST", () => {
  const output = evaluateDecisionCase({
    decisionCase: structuredClone(blastChillerDecisionCase),
    riskGatesByOptionId: { "fixture:domestic": verifiedGates(), "fixture:factory-direct": structuredClone(blastChillerRiskGates) },
    requestedRoute: "factory_direct",
    calculatedAt: "2026-08-08",
  });
  assert.equal(output.verdict.verdict, "VERIFY_FIRST");
  assert.equal(output.landedCosts["fixture:factory-direct"].total, null);
});

test("repair wins when it is the cheaper complete viable route", () => {
  const decisionCase = caseWithOptions([option("repair", "repair", 30_000), option("replace", "domestic", 180_000)]);
  assert.equal(evaluateDecisionCase(inputFor(decisionCase)).verdict.verdict, "REPAIR");
});

test("used or refurbished wins when it is the cheaper complete viable route", () => {
  const decisionCase = caseWithOptions([option("domestic", "domestic", 220_000), option("used", "used_refurbished", 90_000)]);
  assert.equal(evaluateDecisionCase(inputFor(decisionCase)).verdict.verdict, "BUY_USED_OR_REFURBISHED");
});

test("professional-service flag overrides purchase selection", () => {
  const decisionCase = caseWithOptions([option("repair", "repair", 20_000)]);
  assert.equal(evaluateDecisionCase(inputFor(decisionCase, { professionalServiceRequired: true })).verdict.verdict, "PROFESSIONAL_SERVICE");
});

test("case without an evaluable route returns insufficient evidence", () => {
  const decisionCase = caseWithOptions([]);
  assert.equal(evaluateDecisionCase(inputFor(decisionCase)).verdict.verdict, "INSUFFICIENT_EVIDENCE");
});

test("identical input produces byte-for-byte identical structured output", () => {
  const decisionCase = caseWithOptions([option("domestic", "domestic", 120_000), option("upgrade", "upgrade", 150_000)]);
  const input = inputFor(decisionCase);
  assert.equal(JSON.stringify(evaluateDecisionCase(input)), JSON.stringify(evaluateDecisionCase(input)));
});

test("changing commercial opportunities cannot change the verdict", () => {
  const decisionCase = caseWithOptions([option("domestic", "domestic", 120_000)]);
  const withoutCommercial = evaluateDecisionCase(inputFor(decisionCase));
  const withCommercial = evaluateDecisionCase(inputFor(decisionCase, { commercialOpportunities: [{ type: "affiliate", scorecard: null, note: "Synthetic test" }] }));
  assert.deepEqual(withCommercial.verdict, withoutCommercial.verdict);
  assert.equal(withCommercial.commercialOpportunities.length, 1);
});

test("manual and derived unresolved questions are surfaced", () => {
  const decisionCase = structuredClone(blastChillerDecisionCase);
  decisionCase.unresolvedQuestions.push("Manual fixture question");
  const output = evaluateDecisionCase({ decisionCase, riskGatesByOptionId: {}, requestedRoute: "factory_direct", calculatedAt: "2026-08-08" });
  assert.ok(output.unresolvedQuestions.includes("Manual fixture question"));
  assert.ok(output.unresolvedQuestions.some((question) => question.includes("shippingFreight is unknown")));
  assert.ok(output.unresolvedQuestions.some((question) => question.includes("electrical_compatibility has not been evaluated")));
});

test("service preserves observed and estimated money bases and evidence references", () => {
  const decisionCase = caseWithOptions([option("domestic", "domestic", 120_000)]);
  const output = evaluateDecisionCase(inputFor(decisionCase));
  assert.equal(output.landedCosts.domestic.productPrice.basis, "observed");
  assert.equal(output.landedCosts.domestic.total.basis, "estimated");
  assert.deepEqual(output.evidenceConfidence.referencedClaimIds, ["fixture:evidence:domestic-price"]);
  assert.deepEqual(output.evidenceConfidence.missingReferencedClaimIds, []);
  assert.equal(output.evidenceConfidence.totalClaims, 2);
});
