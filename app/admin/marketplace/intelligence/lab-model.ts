import type { DecisionCaseServiceInput } from "../../../marketplace/intelligence/decision-case-service.ts";
import { DECISION_ROUTES, RISK_GATE_TYPES, type CommercialOpportunity, type DecisionRoute, type MoneyRange, type RiskGate } from "../../../marketplace/intelligence/decision-engine.ts";
import { blastChillerDecisionCase, blastChillerRiskGates } from "../../../marketplace/intelligence/fixtures/blast-chiller-case.ts";
import type { EvidenceClaim, IntelligenceConfidence } from "../../../marketplace/intelligence/types.ts";

export const routeLabels: Record<DecisionRoute, string> = { repair: "Repair", domestic: "Domestic", used_refurbished: "Used / refurbished", factory_direct: "Factory direct", upgrade: "Upgrade" };
export const costKeys = ["productPrice", "shippingFreight", "dutyTariff", "brokerageCustoms", "taxes", "finalMileDelivery", "accessoriesAdaptation"] as const;
export type CostKey = typeof costKeys[number];
export const costLabels: Record<CostKey, string> = { productPrice: "Product price", shippingFreight: "Shipping / freight", dutyTariff: "Duty / tariff", brokerageCustoms: "Brokerage / customs", taxes: "Taxes", finalMileDelivery: "Final-mile delivery", accessoriesAdaptation: "Accessories / adaptation" };
export const gateLabels: Record<(typeof RISK_GATE_TYPES)[number], string> = { seller_manufacturer_identity: "Seller / manufacturer identity", electrical_compatibility: "Electrical compatibility", certification_compliance: "Certification / compliance", warranty: "Warranty", replacement_parts: "Replacement parts", shipping: "Shipping", duties_import: "Duties / import assumptions" };

export type RouteDraft = { enabled: boolean; label: string; supplier: string; currency: string; basis: "observed" | "estimated"; costs: Record<CostKey, string>; otherLabel: string; otherCost: string; sourceUrl: string; confidence: IntelligenceConfidence; gates: Record<(typeof RISK_GATE_TYPES)[number], RiskGate["status"]> };
export type LabDraft = { problem: string; productName: string; modelNumber: string; category: string; environment: string; budget: string; urgency: "routine" | "soon" | "urgent"; country: string; region: string; postalCode: string; equipmentAge: string; equipmentCondition: string; repairEstimate: string; replacementQuote: string; factoryPrice: string; factoryFreight: string; powerCompliance: string; commercialType: CommercialOpportunity["type"]; requestedRoute: DecisionRoute | null; routes: Record<DecisionRoute, RouteDraft> };
const blankCosts = () => Object.fromEntries(costKeys.map((key) => [key, ""])) as Record<CostKey, string>;
const blankGates = () => Object.fromEntries(RISK_GATE_TYPES.map((gate) => [gate, "unknown"])) as RouteDraft["gates"];
const blankRoute = (): RouteDraft => ({ enabled: false, label: "", supplier: "", currency: "USD", basis: "estimated", costs: blankCosts(), otherLabel: "", otherCost: "", sourceUrl: "", confidence: "insufficient", gates: blankGates() });

export function createEmptyDraft(): LabDraft {
  return { problem: "", productName: "", modelNumber: "", category: "", environment: "", budget: "", urgency: "soon", country: "", region: "", postalCode: "", equipmentAge: "", equipmentCondition: "", repairEstimate: "", replacementQuote: "", factoryPrice: "", factoryFreight: "", powerCompliance: "", commercialType: "none", requestedRoute: null, routes: Object.fromEntries(DECISION_ROUTES.map((route) => [route, blankRoute()])) as Record<DecisionRoute, RouteDraft> };
}

function parseMoney(value: string, currency: string, basis: "observed" | "estimated", field: string, errors: string[]): MoneyRange | null {
  if (!value.trim()) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) { errors.push(`${field} must be a non-negative amount with no more than two decimal places.`); return null; }
  const cents = Math.round(Number(value) * 100);
  return { lowCents: cents, expectedCents: cents, highCents: cents, currency, basis };
}

export function buildLabCase(draft: LabDraft, calculatedAt: string): { input?: DecisionCaseServiceInput; errors: string[] } {
  const errors: string[] = [];
  if (!draft.problem.trim()) errors.push("Problem description is required.");
  if (!draft.environment.trim()) errors.push("Operating environment is required.");
  if (!draft.country.trim()) errors.push("Destination country is required.");
  const destination = [draft.country, draft.region, draft.postalCode].map((value) => value.trim()).filter(Boolean).join(", ");
  const evidence: EvidenceClaim[] = [];
  const riskGatesByOptionId: Record<string, RiskGate[]> = {};
  const options = DECISION_ROUTES.flatMap((route) => {
    const item = draft.routes[route];
    if (!item.enabled) return [];
    if (!/^[A-Z]{3}$/.test(item.currency)) errors.push(`${routeLabels[route]} currency must be a three-letter uppercase code.`);
    const optionId = `manual:${route}`; const claimId = `manual:evidence:${route}`; const evidenceClaimIds: string[] = [];
    if (item.sourceUrl.trim()) {
      if (!/^https:\/\//.test(item.sourceUrl.trim())) errors.push(`${routeLabels[route]} evidence must use an HTTPS URL.`);
      evidence.push({ id: claimId, subjectType: "offer", subjectId: optionId, sourceUrl: item.sourceUrl.trim(), sourceLabel: `${routeLabels[route]} manually entered source`, evidenceType: "merchant_observation", claim: `Manual source for ${item.label.trim() || routeLabels[route]}.`, retrievedAt: calculatedAt, confidence: item.confidence, verificationStatus: "unverified", limitations: ["Manually entered; requires independent verification"] });
      evidenceClaimIds.push(claimId);
    }
    const costs = Object.fromEntries(costKeys.map((key) => [key, parseMoney(item.costs[key], item.currency, key === "productPrice" ? item.basis : "estimated", `${routeLabels[route]} ${costLabels[key]}`, errors)])) as Record<CostKey, MoneyRange | null>;
    if (route === "repair" && !costs.productPrice && draft.repairEstimate) costs.productPrice = parseMoney(draft.repairEstimate, item.currency, "estimated", "Repair estimate", errors);
    if (route === "domestic" && !costs.productPrice && draft.replacementQuote) costs.productPrice = parseMoney(draft.replacementQuote, item.currency, "observed", "Replacement quote", errors);
    riskGatesByOptionId[optionId] = RISK_GATE_TYPES.map((type) => ({ type, status: item.gates[type], blocking: true, evidenceClaimIds: item.gates[type] === "verified" ? evidenceClaimIds : [], note: item.gates[type] === "unknown" ? "Not yet verified." : `Manually marked ${item.gates[type]}.` }));
    const otherCost = parseMoney(item.otherCost, item.currency, "estimated", `${routeLabels[route]} other cost`, errors);
    return [{ id: optionId, route, label: item.label.trim() || routeLabels[route], productId: draft.productName.trim() || null, entityId: item.supplier.trim() || null, landedCostInputs: { ...costs, otherCosts: otherCost && item.otherLabel.trim() ? [{ label: item.otherLabel.trim(), cost: otherCost }] : [], notApplicable: [], destinationAssumptions: [destination], calculatedAt }, evidenceClaimIds }];
  });
  if (!options.length) errors.push("Add at least one route to analyze.");
  const budget = parseMoney(draft.budget, "USD", "estimated", "Budget", errors);
  if (errors.length) return { errors };
  const unresolved = [!draft.modelNumber.trim() && "Model number", !draft.equipmentCondition.trim() && "Current equipment condition", ...options.flatMap((option) => riskGatesByOptionId[option.id].filter((gate) => gate.status === "unknown").map((gate) => `${routeLabels[option.route]}: ${gateLabels[gate.type]}`))].filter((value): value is string => Boolean(value));
  const completeTotals = options.map((option) => { const values = costKeys.map((key) => option.landedCostInputs[key]); return values.some((value) => value === null) ? null : values.reduce((sum, value) => sum + value!.expectedCents, 0) + option.landedCostInputs.otherCosts.reduce((sum, item) => sum + item.cost.expectedCents, 0); });
  const complete = completeTotals.every((value) => value !== null) && completeTotals.length > 0; const totals = completeTotals.filter((value): value is number => value !== null);
  const scenarioCost = (kind: "best" | "expected" | "worst"): MoneyRange | null => complete ? { lowCents: Math.min(...totals), expectedCents: kind === "best" ? Math.min(...totals) : kind === "worst" ? Math.max(...totals) : totals[0], highCents: Math.max(...totals), currency: options[0].landedCostInputs.productPrice?.currency || "USD", basis: "estimated" } : null;
  return { errors, input: { decisionCase: {
    id: `manual:${calculatedAt}`, problem: draft.problem.trim(), knownProductId: [draft.productName, draft.modelNumber].map((value) => value.trim()).filter(Boolean).join(" · ") || null, useCase: draft.category.trim() || "Hospitality purchasing decision", operatingEnvironment: [draft.environment, draft.equipmentAge && `Approximate age: ${draft.equipmentAge}`, draft.equipmentCondition && `Condition: ${draft.equipmentCondition}`].filter(Boolean).join(" · "), budget, urgency: draft.urgency, destinationAssumptions: [destination], attachmentRefs: [], options, unresolvedQuestions: unresolved, evidence, confidence: evidence.length ? "low" : "insufficient", scenarios: (["best", "expected", "worst"] as const).map((kind) => ({ kind, assumptions: [complete ? "All manually entered costs hold" : "Missing values remain unknown"], estimatedCost: scenarioCost(kind), majorRisks: unresolved, confidence: complete ? "low" : "insufficient", evidenceRequirements: ["Verify manually entered costs and risk gates"] })), recommendationStatus: complete ? "ready" : "verify_first",
  }, riskGatesByOptionId, requestedRoute: draft.requestedRoute, baselineRoute: options.some((option) => option.route === "domestic") ? "domestic" : options[0].route, calculatedAt, commercialOpportunities: [{ type: draft.commercialType, scorecard: null, note: "Founder-entered commercial classification; excluded from verdict calculation." }] } };
}

export function createBlastChillerDemoDraft(): LabDraft {
  const draft = createEmptyDraft(); draft.problem = blastChillerDecisionCase.problem; draft.category = blastChillerDecisionCase.useCase; draft.environment = blastChillerDecisionCase.operatingEnvironment; draft.country = "United States"; draft.requestedRoute = "factory_direct";
  for (const option of blastChillerDecisionCase.options) { const target = draft.routes[option.route]; target.enabled = true; target.label = option.label; target.basis = "observed"; for (const key of costKeys) target.costs[key] = option.landedCostInputs[key] ? String(option.landedCostInputs[key]!.expectedCents / 100) : option.landedCostInputs.notApplicable.includes(key) ? "0" : ""; const gates = option.route === "factory_direct" ? blastChillerRiskGates : RISK_GATE_TYPES.map((type) => ({ type, status: "not_applicable" as const })); for (const gate of gates) target.gates[gate.type] = gate.status; }
  return draft;
}
