import type { CommercialOpportunityScorecard, EvidenceClaim, IntelligenceConfidence } from "./types.ts";

export const DECISION_ROUTES = ["repair", "domestic", "used_refurbished", "factory_direct", "upgrade"] as const;
export type DecisionRoute = typeof DECISION_ROUTES[number];

export const VERDICTS = [
  "REPAIR", "BUY_DOMESTIC", "BUY_USED_OR_REFURBISHED", "BUY_FACTORY_DIRECT", "UPGRADE",
  "GET_QUOTE", "VERIFY_FIRST", "PROFESSIONAL_SERVICE", "INSUFFICIENT_EVIDENCE",
] as const;
export type ChefGringoVerdict = typeof VERDICTS[number];

export type MoneyRange = {
  lowCents: number;
  expectedCents: number;
  highCents: number;
  currency: string;
  basis: "observed" | "estimated";
};

export type LandedCostInputs = {
  productPrice: MoneyRange | null;
  shippingFreight: MoneyRange | null;
  dutyTariff: MoneyRange | null;
  brokerageCustoms: MoneyRange | null;
  taxes: MoneyRange | null;
  finalMileDelivery: MoneyRange | null;
  accessoriesAdaptation: MoneyRange | null;
  otherCosts: Array<{ label: string; cost: MoneyRange }>;
  notApplicable: Array<Exclude<keyof LandedCostInputs, "otherCosts" | "notApplicable">>;
  destinationAssumptions: string[];
  calculatedAt: string;
};

export type LandedCostResult = {
  productPrice: MoneyRange | null;
  total: MoneyRange | null;
  knownSubtotal: MoneyRange | null;
  missingInputs: string[];
  complete: boolean;
  destinationAssumptions: string[];
  calculatedAt: string;
};

export type DecisionOption = {
  id: string;
  route: DecisionRoute;
  label: string;
  productId: string | null;
  entityId: string | null;
  landedCostInputs: LandedCostInputs;
  evidenceClaimIds: string[];
};

export type Scenario = {
  kind: "best" | "expected" | "worst";
  assumptions: string[];
  estimatedCost: MoneyRange | null;
  majorRisks: string[];
  confidence: IntelligenceConfidence;
  evidenceRequirements: string[];
};

export const RISK_GATE_TYPES = [
  "electrical_compatibility", "certification_compliance", "warranty", "replacement_parts",
  "shipping", "duties_import", "seller_manufacturer_identity",
] as const;
export type RiskGateType = typeof RISK_GATE_TYPES[number];

export type RiskGate = {
  type: RiskGateType;
  status: "verified" | "unknown" | "failed" | "not_applicable";
  blocking: boolean;
  evidenceClaimIds: string[];
  note: string;
};

export type DecisionCase = {
  id: string;
  problem: string;
  knownProductId: string | null;
  useCase: string;
  operatingEnvironment: string;
  budget: MoneyRange | null;
  urgency: "routine" | "soon" | "urgent";
  destinationAssumptions: string[];
  attachmentRefs: Array<{ id: string; kind: "photo" | "document"; label: string }>;
  options: DecisionOption[];
  unresolvedQuestions: string[];
  evidence: readonly EvidenceClaim[];
  confidence: IntelligenceConfidence;
  scenarios: Scenario[];
  recommendationStatus: "draft" | "verify_first" | "ready" | "rejected";
};

export type SavingsComparison = {
  baselineRoute: DecisionRoute;
  candidateRoute: DecisionRoute;
  upfrontDifference: MoneyRange | null;
  estimatedLandedSavings: MoneyRange | null;
  percentageSavings: { low: number; expected: number; high: number } | null;
  missingCostWarning: string | null;
  publishable: boolean;
};

export type VerdictResult = {
  verdict: ChefGringoVerdict;
  selectedRoute: DecisionRoute | null;
  rationale: string;
  blockingRisks: RiskGateType[];
  calculatedAt: string;
};

export type CommercialOpportunity = {
  type: "affiliate" | "referral" | "direct_manufacturer" | "wholesale" | "dropship" | "oem_private_label" | "saas_recurring" | "none";
  scorecard: CommercialOpportunityScorecard | null;
  note: string;
};

const costKeys = ["productPrice", "shippingFreight", "dutyTariff", "brokerageCustoms", "taxes", "finalMileDelivery", "accessoriesAdaptation"] as const;

function validRange(value: MoneyRange) {
  return Number.isInteger(value.lowCents) && value.lowCents >= 0 && value.lowCents <= value.expectedCents && value.expectedCents <= value.highCents && Boolean(value.currency);
}

function sumRanges(values: MoneyRange[]): MoneyRange | null {
  if (values.length === 0) return null;
  const currency = values[0].currency;
  if (values.some((value) => !validRange(value) || value.currency !== currency)) throw new Error("Cost ranges must be valid and use one currency.");
  return {
    lowCents: values.reduce((sum, value) => sum + value.lowCents, 0),
    expectedCents: values.reduce((sum, value) => sum + value.expectedCents, 0),
    highCents: values.reduce((sum, value) => sum + value.highCents, 0),
    currency,
    basis: values.every((value) => value.basis === "observed") ? "observed" : "estimated",
  };
}

export function calculateLandedCost(inputs: LandedCostInputs): LandedCostResult {
  if (!/^\d{4}-\d{2}-\d{2}/.test(inputs.calculatedAt)) throw new Error("Landed cost requires a calculation date.");
  if (inputs.destinationAssumptions.length === 0) throw new Error("Landed cost requires destination assumptions.");
  const applicable = costKeys.filter((key) => !inputs.notApplicable.includes(key));
  const missingInputs = applicable.filter((key) => inputs[key] === null);
  const known = [...applicable.map((key) => inputs[key]).filter((value): value is MoneyRange => value !== null), ...inputs.otherCosts.map((item) => item.cost)];
  const knownSubtotal = sumRanges(known);
  return {
    productPrice: inputs.productPrice ? structuredClone(inputs.productPrice) : null,
    total: missingInputs.length === 0 ? knownSubtotal : null,
    knownSubtotal,
    missingInputs,
    complete: missingInputs.length === 0,
    destinationAssumptions: [...inputs.destinationAssumptions],
    calculatedAt: inputs.calculatedAt,
  };
}

function subtractRanges(baseline: MoneyRange, candidate: MoneyRange): MoneyRange {
  if (baseline.currency !== candidate.currency) throw new Error("Savings comparisons require one currency.");
  return {
    lowCents: baseline.lowCents - candidate.highCents,
    expectedCents: baseline.expectedCents - candidate.expectedCents,
    highCents: baseline.highCents - candidate.lowCents,
    currency: baseline.currency,
    basis: "estimated",
  };
}

export function compareRouteSavings(baselineRoute: DecisionRoute, baseline: LandedCostResult, candidateRoute: DecisionRoute, candidate: LandedCostResult): SavingsComparison {
  const missing = [...baseline.missingInputs.map((item) => `${baselineRoute}:${item}`), ...candidate.missingInputs.map((item) => `${candidateRoute}:${item}`)];
  const upfrontDifference = baseline.productPrice && candidate.productPrice ? subtractRanges(baseline.productPrice, candidate.productPrice) : null;
  if (!baseline.total || !candidate.total) {
    return { baselineRoute, candidateRoute, upfrontDifference, estimatedLandedSavings: null, percentageSavings: null, missingCostWarning: `Comparison is incomplete: ${missing.join(", ")}.`, publishable: false };
  }
  const savings = subtractRanges(baseline.total, candidate.total);
  return {
    baselineRoute,
    candidateRoute,
    upfrontDifference,
    estimatedLandedSavings: savings,
    percentageSavings: {
      low: baseline.total.highCents === 0 ? 0 : Math.round((savings.lowCents / baseline.total.highCents) * 10_000) / 100,
      expected: baseline.total.expectedCents === 0 ? 0 : Math.round((savings.expectedCents / baseline.total.expectedCents) * 10_000) / 100,
      high: baseline.total.lowCents === 0 ? 0 : Math.round((savings.highCents / baseline.total.lowCents) * 10_000) / 100,
    },
    missingCostWarning: null,
    publishable: true,
  };
}

export function validateScenarios(scenarios: Scenario[]): string[] {
  const failures: string[] = [];
  for (const kind of ["best", "expected", "worst"] as const) if (scenarios.filter((scenario) => scenario.kind === kind).length !== 1) failures.push(`scenario_${kind}_required_once`);
  for (const scenario of scenarios) {
    if (scenario.assumptions.length === 0) failures.push(`scenario_${scenario.kind}_assumptions_missing`);
    if (scenario.evidenceRequirements.length === 0) failures.push(`scenario_${scenario.kind}_evidence_missing`);
    if (scenario.estimatedCost && !validRange(scenario.estimatedCost)) failures.push(`scenario_${scenario.kind}_cost_invalid`);
    if (!scenario.estimatedCost && scenario.confidence !== "insufficient") failures.push(`scenario_${scenario.kind}_cost_unknown_but_confident`);
  }
  const [best, expected, worst] = (["best", "expected", "worst"] as const).map((kind) => scenarios.find((scenario) => scenario.kind === kind));
  if (best?.estimatedCost && expected?.estimatedCost && worst?.estimatedCost &&
      !(best.estimatedCost.expectedCents <= expected.estimatedCost.expectedCents && expected.estimatedCost.expectedCents <= worst.estimatedCost.expectedCents)) {
    failures.push("scenario_cost_order_invalid");
  }
  return failures;
}

export function evaluateRiskGates(gates: RiskGate[]) {
  const missing = RISK_GATE_TYPES.filter((type) => !gates.some((gate) => gate.type === type));
  const blocking = gates.filter((gate) => gate.blocking && (gate.status === "unknown" || gate.status === "failed" || (gate.status === "verified" && gate.evidenceClaimIds.length === 0)));
  return { viable: missing.length === 0 && blocking.length === 0, missing, blocking };
}

const verdictByRoute: Record<DecisionRoute, ChefGringoVerdict> = {
  repair: "REPAIR", domestic: "BUY_DOMESTIC", used_refurbished: "BUY_USED_OR_REFURBISHED", factory_direct: "BUY_FACTORY_DIRECT", upgrade: "UPGRADE",
};

export function determineVerdict(input: { preferredRoute: DecisionRoute | null; cost: LandedCostResult | null; gates: RiskGate[]; professionalServiceRequired?: boolean; calculatedAt: string }): VerdictResult {
  const allowed = new Set(["preferredRoute", "cost", "gates", "professionalServiceRequired", "calculatedAt"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) throw new Error("Verdict inputs cannot include commercial economics.");
  const risks = evaluateRiskGates(input.gates);
  if (input.professionalServiceRequired) return { verdict: "PROFESSIONAL_SERVICE", selectedRoute: null, rationale: "The case requires qualified professional service before a purchase decision.", blockingRisks: risks.blocking.map((gate) => gate.type), calculatedAt: input.calculatedAt };
  if (!input.preferredRoute) return { verdict: "INSUFFICIENT_EVIDENCE", selectedRoute: null, rationale: "No route has enough evidence to evaluate.", blockingRisks: risks.blocking.map((gate) => gate.type), calculatedAt: input.calculatedAt };
  if (risks.missing.length > 0) return { verdict: "VERIFY_FIRST", selectedRoute: input.preferredRoute, rationale: "Required viability gates have not been evaluated.", blockingRisks: risks.missing, calculatedAt: input.calculatedAt };
  const identityOrCompliance = risks.blocking.some((gate) => gate.type === "seller_manufacturer_identity" || gate.type === "certification_compliance" || gate.type === "electrical_compatibility");
  if (identityOrCompliance) return { verdict: "VERIFY_FIRST", selectedRoute: input.preferredRoute, rationale: "Identity, compliance, or electrical compatibility requires verification before recommendation.", blockingRisks: risks.blocking.map((gate) => gate.type), calculatedAt: input.calculatedAt };
  if (!input.cost?.complete || risks.blocking.length > 0) return { verdict: "GET_QUOTE", selectedRoute: input.preferredRoute, rationale: "A complete delivered-cost quote and remaining risk details are required.", blockingRisks: risks.blocking.map((gate) => gate.type), calculatedAt: input.calculatedAt };
  return { verdict: verdictByRoute[input.preferredRoute], selectedRoute: input.preferredRoute, rationale: "The selected route has complete entered costs and no unresolved blocking gate.", blockingRisks: [], calculatedAt: input.calculatedAt };
}

export function attachCommercialOpportunity(verdict: VerdictResult, opportunities: CommercialOpportunity[]) {
  return { verdict: structuredClone(verdict), opportunities: structuredClone(opportunities) };
}

export function snapshotDecisionCase(decisionCase: DecisionCase): Readonly<DecisionCase> {
  const snapshot = structuredClone(decisionCase);
  const freeze = (value: unknown): unknown => {
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
    return value;
  };
  return freeze(snapshot) as Readonly<DecisionCase>;
}
