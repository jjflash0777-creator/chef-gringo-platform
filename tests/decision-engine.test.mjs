import assert from "node:assert/strict";
import test from "node:test";
import {
  attachCommercialOpportunity, calculateLandedCost, compareRouteSavings, determineVerdict,
  evaluateRiskGates, validateScenarios,
} from "../app/marketplace/intelligence/decision-engine.ts";
import { blastChillerDecisionCase, blastChillerRiskGates, evaluateBlastChillerFixture } from "../app/marketplace/intelligence/fixtures/blast-chiller-case.ts";

const money = (low, expected = low, high = expected, basis = "estimated") => ({ lowCents: low, expectedCents: expected, highCents: high, currency: "USD", basis });
const completeInputs = (overrides = {}) => ({
  productPrice: money(100_000, 110_000, 120_000, "observed"),
  shippingFreight: money(10_000),
  dutyTariff: money(5_000),
  brokerageCustoms: money(2_000),
  taxes: money(8_000),
  finalMileDelivery: money(3_000),
  accessoriesAdaptation: money(4_000),
  otherCosts: [{ label: "Inspection", cost: money(1_000) }],
  notApplicable: [],
  destinationAssumptions: ["Fixture destination in the continental United States"],
  calculatedAt: "2026-08-08",
  ...overrides,
});
const verifiedGates = blastChillerRiskGates.map((gate) => ({ ...gate, status: "verified", evidenceClaimIds: ["fixture:evidence:domestic-price"] }));

test("landed cost performs exact arithmetic across every entered component", () => {
  const result = calculateLandedCost(completeInputs({ productPrice: money(100_000) }));
  assert.deepEqual(result.total, money(133_000));
  assert.equal(result.complete, true);
});

test("landed cost adds ranges without collapsing uncertainty", () => {
  const result = calculateLandedCost(completeInputs());
  assert.deepEqual(result.total, money(133_000, 143_000, 153_000));
});

test("unknown costs remain unknown while known subtotal is retained", () => {
  const result = calculateLandedCost(completeInputs({ shippingFreight: null, dutyTariff: null }));
  assert.equal(result.total, null);
  assert.equal(result.complete, false);
  assert.deepEqual(result.missingInputs, ["shippingFreight", "dutyTariff"]);
  assert.ok(result.knownSubtotal.expectedCents > 0);
});

test("savings engine calculates upfront, landed, and percentage differences", () => {
  const domestic = calculateLandedCost(completeInputs({ productPrice: money(200_000), otherCosts: [] }));
  const candidate = calculateLandedCost(completeInputs({ productPrice: money(100_000), otherCosts: [] }));
  const comparison = compareRouteSavings("domestic", domestic, "factory_direct", candidate);
  assert.equal(comparison.upfrontDifference.expectedCents, 100_000);
  assert.equal(comparison.estimatedLandedSavings.expectedCents, 100_000);
  assert.equal(comparison.publishable, true);
  assert.ok(comparison.percentageSavings.expected > 0);
});

test("savings engine refuses to publish an incomplete comparison", () => {
  const domestic = calculateLandedCost(completeInputs());
  const incomplete = calculateLandedCost(completeInputs({ shippingFreight: null }));
  const comparison = compareRouteSavings("domestic", domestic, "factory_direct", incomplete);
  assert.equal(comparison.publishable, false);
  assert.ok(comparison.upfrontDifference);
  assert.equal(comparison.estimatedLandedSavings, null);
  assert.match(comparison.missingCostWarning, /shippingFreight/);
});

test("best, expected, and worst scenarios require assumptions, evidence, honest confidence, and ordering", () => {
  assert.deepEqual(validateScenarios(blastChillerDecisionCase.scenarios), []);
  const invalid = structuredClone(blastChillerDecisionCase.scenarios);
  invalid[0].estimatedCost = money(300_000);
  invalid[0].confidence = "moderate";
  invalid[1].estimatedCost = money(200_000);
  invalid[1].confidence = "moderate";
  invalid[2].estimatedCost = money(100_000);
  invalid[2].confidence = "moderate";
  assert.ok(validateScenarios(invalid).includes("scenario_cost_order_invalid"));
});

test("risk gates identify unresolved viability blockers", () => {
  const result = evaluateRiskGates(blastChillerRiskGates);
  assert.equal(result.viable, false);
  assert.equal(result.missing.length, 0);
  assert.equal(result.blocking.length, 7);
  assert.equal(evaluateRiskGates(verifiedGates).viable, true);
});

test("cheaper factory price loses when landed cost and required verification are missing", () => {
  const output = evaluateBlastChillerFixture();
  assert.equal(output.domestic.complete, true);
  assert.equal(output.factoryDirect.complete, false);
  assert.equal(output.comparison.publishable, false);
  assert.equal(output.verdict.verdict, "VERIFY_FIRST");
  assert.notEqual(output.verdict.verdict, "BUY_FACTORY_DIRECT");
});

test("complete viable routes map deterministically to the supported purchase verdicts", () => {
  const cost = calculateLandedCost(completeInputs());
  const expected = { repair: "REPAIR", domestic: "BUY_DOMESTIC", used_refurbished: "BUY_USED_OR_REFURBISHED", factory_direct: "BUY_FACTORY_DIRECT", upgrade: "UPGRADE" };
  for (const [preferredRoute, verdict] of Object.entries(expected)) {
    assert.equal(determineVerdict({ preferredRoute, cost, gates: verifiedGates, calculatedAt: "2026-08-08" }).verdict, verdict);
  }
});

test("commercial fields are rejected by verdict calculation and opportunities attach only afterward", () => {
  const cost = calculateLandedCost(completeInputs());
  const input = { preferredRoute: "domestic", cost, gates: verifiedGates, calculatedAt: "2026-08-08" };
  const verdict = determineVerdict(input);
  assert.throws(() => determineVerdict({ ...input, commissionPotential: 100 }), /cannot include commercial/i);
  const attached = attachCommercialOpportunity(verdict, [{ type: "affiliate", scorecard: null, note: "Test-only opportunity" }]);
  const changed = attachCommercialOpportunity(verdict, [{ type: "none", scorecard: null, note: "No opportunity" }]);
  assert.deepEqual(attached.verdict, verdict);
  assert.deepEqual(changed.verdict, verdict);
});

test("decision-case evidence and provenance are immutable snapshots", () => {
  const before = structuredClone(blastChillerDecisionCase.evidence);
  assert.throws(() => { blastChillerDecisionCase.evidence[0].claim = "mutated"; }, TypeError);
  evaluateBlastChillerFixture();
  assert.deepEqual(blastChillerDecisionCase.evidence, before);
  assert.equal(blastChillerDecisionCase.attachmentRefs.length, 0);
});
