import { calculateLandedCost, compareRouteSavings, determineVerdict, snapshotDecisionCase, type DecisionCase, type LandedCostInputs, type RiskGate } from "../decision-engine.ts";

const date = "2026-08-08";
const usd = (cents: number, basis: "observed" | "estimated" = "estimated") => ({ lowCents: cents, expectedCents: cents, highCents: cents, currency: "USD", basis } as const);

const domesticInputs: LandedCostInputs = {
  productPrice: usd(1_200_000, "observed"), shippingFreight: usd(45_000), dutyTariff: null,
  brokerageCustoms: null, taxes: usd(84_000), finalMileDelivery: usd(25_000), accessoriesAdaptation: usd(0), otherCosts: [],
  notApplicable: ["dutyTariff", "brokerageCustoms"], destinationAssumptions: ["Synthetic test destination: commercial kitchen in the continental United States"], calculatedAt: date,
};

const factoryDirectInputs: LandedCostInputs = {
  productPrice: usd(480_000, "observed"), shippingFreight: null, dutyTariff: null, brokerageCustoms: null,
  taxes: null, finalMileDelivery: null, accessoriesAdaptation: null, otherCosts: [], notApplicable: [],
  destinationAssumptions: ["Synthetic test destination: commercial kitchen in the continental United States", "No tariff lookup or freight quote has been performed"], calculatedAt: date,
};

export const blastChillerDecisionCase = snapshotDecisionCase({
  id: "fixture:blast-chiller-001",
  problem: "Fixture only: compare a domestic blast-chiller route with a possible factory-direct route without treating factory price as customer cost.",
  knownProductId: null,
  useCase: "Rapidly chill prepared food in a commercial kitchen",
  operatingEnvironment: "Fixture commercial kitchen; site utilities and local code requirements unverified",
  budget: null,
  urgency: "soon",
  destinationAssumptions: [...domesticInputs.destinationAssumptions],
  attachmentRefs: [],
  options: [
    { id: "fixture:domestic", route: "domestic", label: "Synthetic domestic route", productId: null, entityId: null, landedCostInputs: domesticInputs, evidenceClaimIds: ["fixture:evidence:domestic-price"] },
    { id: "fixture:factory-direct", route: "factory_direct", label: "Synthetic factory-direct route", productId: null, entityId: null, landedCostInputs: factoryDirectInputs, evidenceClaimIds: ["fixture:evidence:factory-price"] },
  ],
  unresolvedQuestions: ["Freight quote", "Electrical compatibility", "Certification and local compliance", "Warranty coverage", "Replacement-parts access", "Duties, brokerage, taxes, and final-mile cost", "Seller and manufacturer identity verification"],
  evidence: [
    { id: "fixture:evidence:domestic-price", subjectType: "offer", subjectId: "fixture:domestic", sourceUrl: "https://example.invalid/fixture-domestic", sourceLabel: "Explicit synthetic domestic price fixture", evidenceType: "editorial_judgment", claim: "Test-only domestic product price input; not a market claim.", retrievedAt: date, confidence: "low", verificationStatus: "unverified", limitations: ["Fixture value only"] },
    { id: "fixture:evidence:factory-price", subjectType: "offer", subjectId: "fixture:factory-direct", sourceUrl: "https://example.invalid/fixture-factory", sourceLabel: "Explicit synthetic factory price fixture", evidenceType: "editorial_judgment", claim: "Test-only factory price input; not landed cost and not a supplier claim.", retrievedAt: date, confidence: "insufficient", verificationStatus: "unverified", limitations: ["Fixture value only", "Freight, import costs, compliance, warranty, and identity are unknown"] },
  ],
  confidence: "insufficient",
  scenarios: [
    { kind: "best", assumptions: ["All missing factory-direct inputs would need verified favorable values"], estimatedCost: null, majorRisks: ["Unknown freight and compliance"], confidence: "insufficient", evidenceRequirements: ["Freight quote", "Compliance documentation"] },
    { kind: "expected", assumptions: ["No unverified cost is inferred"], estimatedCost: null, majorRisks: ["Unknown total customer cost"], confidence: "insufficient", evidenceRequirements: ["Complete landed-cost quote"] },
    { kind: "worst", assumptions: ["Import or adaptation problems may make the route nonviable"], estimatedCost: null, majorRisks: ["Compliance failure", "No warranty or parts support"], confidence: "insufficient", evidenceRequirements: ["Electrical, certification, warranty, and parts verification"] },
  ],
  recommendationStatus: "verify_first",
} satisfies DecisionCase);

export const blastChillerRiskGates: RiskGate[] = [
  { type: "electrical_compatibility", status: "unknown", blocking: true, evidenceClaimIds: [], note: "Fixture has no verified electrical data." },
  { type: "certification_compliance", status: "unknown", blocking: true, evidenceClaimIds: [], note: "Fixture has no verified compliance data." },
  { type: "warranty", status: "unknown", blocking: true, evidenceClaimIds: [], note: "Warranty is unknown." },
  { type: "replacement_parts", status: "unknown", blocking: true, evidenceClaimIds: [], note: "Parts support is unknown." },
  { type: "shipping", status: "unknown", blocking: true, evidenceClaimIds: [], note: "Freight is unknown." },
  { type: "duties_import", status: "unknown", blocking: true, evidenceClaimIds: [], note: "Import assumptions are unknown." },
  { type: "seller_manufacturer_identity", status: "unknown", blocking: true, evidenceClaimIds: [], note: "Fixture does not assert a verified seller or manufacturer." },
];

export function evaluateBlastChillerFixture() {
  const domestic = calculateLandedCost(domesticInputs);
  const factoryDirect = calculateLandedCost(factoryDirectInputs);
  const comparison = compareRouteSavings("domestic", domestic, "factory_direct", factoryDirect);
  const verdict = determineVerdict({ preferredRoute: "factory_direct", cost: factoryDirect, gates: blastChillerRiskGates, calculatedAt: date });
  return { domestic, factoryDirect, comparison, verdict };
}
