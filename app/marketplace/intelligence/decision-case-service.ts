import {
  DECISION_ROUTES,
  attachCommercialOpportunity,
  calculateLandedCost,
  compareRouteSavings,
  determineVerdict,
  evaluateRiskGates,
  snapshotDecisionCase,
  validateScenarios,
  type CommercialOpportunity,
  type DecisionCase,
  type DecisionRoute,
  type LandedCostResult,
  type RiskGate,
  type SavingsComparison,
  type VerdictResult,
} from "./decision-engine.ts";
import type { IntelligenceConfidence, IntelligenceVerificationStatus } from "./types.ts";

export type DecisionCaseServiceInput = {
  decisionCase: DecisionCase;
  riskGatesByOptionId: Record<string, RiskGate[]>;
  requestedRoute?: DecisionRoute | null;
  baselineRoute?: DecisionRoute | null;
  professionalServiceRequired?: boolean;
  commercialOpportunities?: CommercialOpportunity[];
  calculatedAt: string;
};

export type RouteEvaluation = {
  route: DecisionRoute;
  available: boolean;
  optionId: string | null;
  landedCost: LandedCostResult | null;
  riskGates: RiskGate[];
  viable: boolean;
  missingRiskGates: string[];
  blockingRiskGates: string[];
};

export type EvidenceConfidenceState = {
  caseConfidence: IntelligenceConfidence;
  totalClaims: number;
  referencedClaimIds: string[];
  missingReferencedClaimIds: string[];
  verificationCounts: Record<IntelligenceVerificationStatus, number>;
};

export type DecisionCaseServiceOutput = {
  normalizedCase: Readonly<DecisionCase>;
  availableRoutes: RouteEvaluation[];
  landedCosts: Record<string, LandedCostResult>;
  savingsComparisons: SavingsComparison[];
  scenarios: DecisionCase["scenarios"];
  scenarioValidation: string[];
  evidenceConfidence: EvidenceConfidenceState;
  verdict: VerdictResult;
  unresolvedQuestions: string[];
  commercialOpportunities: CommercialOpportunity[];
};

function normalizedText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function normalizeCase(decisionCase: DecisionCase): Readonly<DecisionCase> {
  const routeOrder = new Map(DECISION_ROUTES.map((route, index) => [route, index]));
  return snapshotDecisionCase({
    ...structuredClone(decisionCase),
    id: normalizedText(decisionCase.id),
    problem: normalizedText(decisionCase.problem),
    useCase: normalizedText(decisionCase.useCase),
    operatingEnvironment: normalizedText(decisionCase.operatingEnvironment),
    destinationAssumptions: uniqueSorted(decisionCase.destinationAssumptions.map(normalizedText)),
    attachmentRefs: [...decisionCase.attachmentRefs].sort((a, b) => a.id.localeCompare(b.id)),
    options: [...decisionCase.options].sort((a, b) => (routeOrder.get(a.route) ?? 99) - (routeOrder.get(b.route) ?? 99) || a.id.localeCompare(b.id)),
    unresolvedQuestions: uniqueSorted(decisionCase.unresolvedQuestions.map(normalizedText)),
    evidence: [...decisionCase.evidence].sort((a, b) => a.id.localeCompare(b.id)),
    scenarios: [...decisionCase.scenarios].sort((a, b) => ["best", "expected", "worst"].indexOf(a.kind) - ["best", "expected", "worst"].indexOf(b.kind)),
  });
}

function evidenceState(decisionCase: Readonly<DecisionCase>, gatesByOptionId: Record<string, RiskGate[]>): EvidenceConfidenceState {
  const claimIds = new Set(decisionCase.evidence.map((claim) => claim.id));
  const referencedClaimIds = uniqueSorted([
    ...decisionCase.options.flatMap((option) => option.evidenceClaimIds),
    ...Object.values(gatesByOptionId).flatMap((gates) => gates.flatMap((gate) => gate.evidenceClaimIds)),
  ]);
  const verificationCounts = { unverified: 0, verified: 0, disputed: 0, superseded: 0, withdrawn: 0 };
  for (const claim of decisionCase.evidence) verificationCounts[claim.verificationStatus] += 1;
  return {
    caseConfidence: decisionCase.confidence,
    totalClaims: decisionCase.evidence.length,
    referencedClaimIds,
    missingReferencedClaimIds: referencedClaimIds.filter((id) => !claimIds.has(id)),
    verificationCounts,
  };
}

function selectRoute(requestedRoute: DecisionRoute | null | undefined, routes: RouteEvaluation[]) {
  if (requestedRoute) return routes.find((route) => route.route === requestedRoute && route.available) ?? null;
  return routes
    .filter((route) => route.available && route.viable && route.landedCost?.total)
    .sort((a, b) => a.landedCost!.total!.expectedCents - b.landedCost!.total!.expectedCents || DECISION_ROUTES.indexOf(a.route) - DECISION_ROUTES.indexOf(b.route))[0] ?? null;
}

export function evaluateDecisionCase(input: DecisionCaseServiceInput): DecisionCaseServiceOutput {
  if (!/^\d{4}-\d{2}-\d{2}/.test(input.calculatedAt)) throw new Error("Decision Case service requires a calculation date.");
  const normalizedCase = normalizeCase(input.decisionCase);
  const claimIds = new Set(normalizedCase.evidence.map((claim) => claim.id));
  const landedCosts: Record<string, LandedCostResult> = {};
  const availableRoutes = DECISION_ROUTES.map((route): RouteEvaluation => {
    const option = normalizedCase.options.find((candidate) => candidate.route === route);
    if (!option) return { route, available: false, optionId: null, landedCost: null, riskGates: [], viable: false, missingRiskGates: [], blockingRiskGates: [] };
    const landedCost = calculateLandedCost(option.landedCostInputs);
    landedCosts[option.id] = landedCost;
    const riskGates = structuredClone(input.riskGatesByOptionId[option.id] ?? []).map((gate) =>
      gate.status === "verified" && gate.evidenceClaimIds.some((id) => !claimIds.has(id)) ? { ...gate, status: "unknown" as const } : gate
    );
    const risks = evaluateRiskGates(riskGates);
    return {
      route,
      available: true,
      optionId: option.id,
      landedCost,
      riskGates,
      viable: risks.viable && landedCost.complete,
      missingRiskGates: [...risks.missing],
      blockingRiskGates: risks.blocking.map((gate) => gate.type),
    };
  });

  const baseline = (input.baselineRoute && availableRoutes.find((route) => route.route === input.baselineRoute && route.available))
    || availableRoutes.find((route) => route.route === "domestic" && route.available)
    || availableRoutes.find((route) => route.available)
    || null;
  const savingsComparisons = baseline?.landedCost ? availableRoutes
    .filter((route) => route.available && route.route !== baseline.route && route.landedCost)
    .map((route) => compareRouteSavings(baseline.route, baseline.landedCost!, route.route, route.landedCost!)) : [];

  const selected = selectRoute(input.requestedRoute, availableRoutes);
  const verdict = determineVerdict({
    preferredRoute: selected?.route ?? null,
    cost: selected?.landedCost ?? null,
    gates: selected?.riskGates ?? [],
    professionalServiceRequired: input.professionalServiceRequired,
    calculatedAt: input.calculatedAt,
  });
  const scenarioValidation = validateScenarios(normalizedCase.scenarios);
  const evidenceConfidence = evidenceState(normalizedCase, input.riskGatesByOptionId);
  const derivedQuestions = [
    ...normalizedCase.unresolvedQuestions,
    ...availableRoutes.flatMap((route) => route.landedCost?.missingInputs.map((name) => `${route.route}: ${name} is unknown`) ?? []),
    ...availableRoutes.flatMap((route) => route.missingRiskGates.map((name) => `${route.route}: ${name} has not been evaluated`)),
    ...availableRoutes.flatMap((route) => route.blockingRiskGates.map((name) => `${route.route}: ${name} requires resolution`)),
    ...evidenceConfidence.missingReferencedClaimIds.map((id) => `Evidence reference ${id} is missing`),
    ...scenarioValidation,
  ];
  const commercial = attachCommercialOpportunity(verdict, input.commercialOpportunities ?? []);
  return {
    normalizedCase,
    availableRoutes,
    landedCosts,
    savingsComparisons,
    scenarios: structuredClone(normalizedCase.scenarios),
    scenarioValidation,
    evidenceConfidence,
    verdict: commercial.verdict,
    unresolvedQuestions: uniqueSorted(derivedQuestions),
    commercialOpportunities: commercial.opportunities,
  };
}
