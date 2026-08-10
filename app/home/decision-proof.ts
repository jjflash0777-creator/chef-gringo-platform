import { evaluateDecisionCase, type DecisionCaseServiceOutput } from "../marketplace/intelligence/decision-case-service.ts";
import { RISK_GATE_TYPES, type ChefGringoVerdict, type DecisionRoute, type RiskGate } from "../marketplace/intelligence/decision-engine.ts";
import { blastChillerDecisionCase, blastChillerRiskGates } from "../marketplace/intelligence/fixtures/blast-chiller-case.ts";

export type PublicRecommendationState = "evidence_incomplete" | "verify_first" | "recommendation_available" | "no_viable_route";
export type PublicDecisionRoute = {
  route: DecisionRoute;
  label: string;
  availability: "available" | "not_evaluated";
  status: string;
  cost: string;
  detail: string;
};

export type PublicDecisionProof = {
  id: string;
  synthetic: true;
  problem: string;
  identifiedItem: string;
  knownFacts: string[];
  missingInformation: string[];
  routes: PublicDecisionRoute[];
  checks: Array<{ label: string; status: "verified" | "unknown" | "failed" | "not_applicable"; detail: string }>;
  bestOption: string;
  cheapestViableOption: string;
  expectedTotalCost: string;
  recommendationState: PublicRecommendationState;
  verdict: ChefGringoVerdict;
  verdictLabel: string;
  explanation: string;
  confidence: string;
  evidenceSummary: string;
  commercialSummary: string;
};

const routeLabels: Record<DecisionRoute, string> = {
  repair: "Repair",
  domestic: "Domestic replacement",
  used_refurbished: "Used / refurbished",
  factory_direct: "Factory-direct alternative",
  upgrade: "Upgrade",
};

const gateLabels = {
  electrical_compatibility: "Electrical compatibility",
  certification_compliance: "Certification & compliance",
  warranty: "Warranty coverage",
  replacement_parts: "Parts & service access",
  shipping: "Freight & delivery",
  duties_import: "Duties & import cost",
  seller_manufacturer_identity: "Supplier identity",
} as const;

function money(cents: number | null | undefined) {
  if (cents == null) return "Unknown";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function derivePublicRecommendationState(output: DecisionCaseServiceOutput): PublicRecommendationState {
  if (output.verdict.verdict === "VERIFY_FIRST") return "verify_first";
  if (output.verdict.verdict === "INSUFFICIENT_EVIDENCE" && !output.availableRoutes.some((route) => route.viable)) return "no_viable_route";
  if (["REPAIR", "BUY_DOMESTIC", "BUY_USED_OR_REFURBISHED", "BUY_FACTORY_DIRECT", "UPGRADE"].includes(output.verdict.verdict)) return "recommendation_available";
  return "evidence_incomplete";
}

export function buildBlastChillerPublicProof(): PublicDecisionProof {
  const domesticGates: RiskGate[] = RISK_GATE_TYPES.map((type) => ({ type, status: "not_applicable", blocking: false, evidenceClaimIds: [], note: "Not required for the complete synthetic domestic cost reference." }));
  const output = evaluateDecisionCase({
    decisionCase: structuredClone(blastChillerDecisionCase),
    riskGatesByOptionId: {
      "fixture:domestic": domesticGates,
      "fixture:factory-direct": structuredClone(blastChillerRiskGates),
    },
    requestedRoute: "factory_direct",
    baselineRoute: "domestic",
    calculatedAt: "2026-08-08",
    commercialOpportunities: [],
  });
  const domestic = output.availableRoutes.find((route) => route.route === "domestic")!;
  const factory = output.availableRoutes.find((route) => route.route === "factory_direct")!;
  const routes = output.availableRoutes.map((route): PublicDecisionRoute => {
    if (!route.available) return { route: route.route, label: routeLabels[route.route], availability: "not_evaluated", status: "Not evaluated", cost: "Unknown", detail: "No evidence or cost inputs are attached to this route." };
    const product = route.landedCost?.productPrice?.expectedCents;
    const total = route.landedCost?.total?.expectedCents;
    return {
      route: route.route,
      label: routeLabels[route.route],
      availability: "available",
      status: route.viable ? "Viable reference" : "Verify first",
      cost: total == null ? "Expected total unknown" : `${money(total)} expected total`,
      detail: total == null ? `${money(product)} product price only; missing costs remain unknown.` : "Complete synthetic cost inputs for this route.",
    };
  });
  return {
    id: output.normalizedCase.id,
    synthetic: true,
    problem: "Compare a domestic blast-chiller replacement with a possible factory-direct route without mistaking factory price for customer cost.",
    identifiedItem: "Commercial blast chiller · manufacturer and model not identified",
    knownFacts: [
      `Domestic synthetic product price: ${money(domestic.landedCost?.productPrice?.expectedCents)}`,
      `Domestic synthetic expected total: ${money(domestic.landedCost?.total?.expectedCents)}`,
      `Factory-direct synthetic product price: ${money(factory.landedCost?.productPrice?.expectedCents)}`,
      "Destination assumption: commercial kitchen in the continental United States",
    ],
    missingInformation: [...output.normalizedCase.unresolvedQuestions],
    routes,
    checks: blastChillerRiskGates.map((gate) => ({ label: gateLabels[gate.type], status: gate.status, detail: gate.note })),
    bestOption: "No recommendation yet",
    cheapestViableOption: `Domestic reference at ${money(domestic.landedCost?.total?.expectedCents)} based on current synthetic inputs`,
    expectedTotalCost: `Domestic ${money(domestic.landedCost?.total?.expectedCents)} · Factory-direct unknown`,
    recommendationState: derivePublicRecommendationState(output),
    verdict: output.verdict.verdict,
    verdictLabel: "Verify first",
    explanation: "The factory-direct sticker price is lower, but freight, import cost, electrical fit, compliance, warranty, parts, supplier identity, and delivery remain unresolved. Publishing savings or recommending that route would require guessing.",
    confidence: output.evidenceConfidence.caseConfidence,
    evidenceSummary: `${output.evidenceConfidence.totalClaims} synthetic claims · ${output.evidenceConfidence.verificationCounts.unverified} unverified · no network lookup`,
    commercialSummary: "No commercial opportunity is attached. Commercial economics are excluded from the verdict.",
  };
}
