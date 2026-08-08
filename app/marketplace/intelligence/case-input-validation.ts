import { DECISION_ROUTES, RISK_GATE_TYPES } from "./decision-engine.ts";
import type { DecisionCaseServiceInput } from "./decision-case-service.ts";
import { CONFIDENCE_LEVELS, VERIFICATION_STATUSES } from "./types.ts";

export type InputValidationError = { path: string; message: string };
export type InputValidationResult =
  | { ok: true; value: DecisionCaseServiceInput }
  | { ok: false; errors: InputValidationError[] };

const urgencyValues = ["routine", "soon", "urgent"];
const recommendationStatuses = ["draft", "verify_first", "ready", "rejected"];
const moneyBases = ["observed", "estimated"];
const costKeys = ["productPrice", "shippingFreight", "dutyTariff", "brokerageCustoms", "taxes", "finalMileDelivery", "accessoriesAdaptation"];
const scenarioKinds = ["best", "expected", "worst"];
const riskStatuses = ["verified", "unknown", "failed", "not_applicable"];
const evidenceSubjects = ["product", "partner_entity", "partner_program", "offer", "relationship", "scorecard"];
const evidenceTypes = ["manufacturer_documentation", "merchant_observation", "professional_experience", "editorial_judgment"];
const commercialTypes = ["affiliate", "referral", "direct_manufacturer", "wholesale", "dropship", "oem_private_label", "saas_recurring", "none"];

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function allowedKeys(value: Record<string, unknown>, allowed: string[], path: string, errors: InputValidationError[]) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push({ path: `${path}.${key}`, message: "Unknown field is not allowed." });
}

function requiredString(value: unknown, path: string, errors: InputValidationError[]) {
  if (typeof value !== "string" || !value.trim()) errors.push({ path, message: "A non-empty string is required." });
}

function nullableString(value: unknown, path: string, errors: InputValidationError[]) {
  if (value !== null && (typeof value !== "string" || !value.trim())) errors.push({ path, message: "Must be null or a non-empty string." });
}

function enumValue(value: unknown, allowed: readonly string[], path: string, errors: InputValidationError[]) {
  if (typeof value !== "string" || !allowed.includes(value)) errors.push({ path, message: `Must be one of: ${allowed.join(", ")}.` });
}

function stringArray(value: unknown, path: string, errors: InputValidationError[], requireNonEmpty = false) {
  if (!Array.isArray(value)) return errors.push({ path, message: "An array of non-empty strings is required." });
  if (requireNonEmpty && value.length === 0) errors.push({ path, message: "At least one value is required." });
  value.forEach((item, index) => requiredString(item, `${path}[${index}]`, errors));
}

function money(value: unknown, path: string, errors: InputValidationError[], nullable = true) {
  if (value === null && nullable) return;
  if (!record(value)) return errors.push({ path, message: nullable ? "Must be null or a money range object." : "A money range object is required." });
  allowedKeys(value, ["lowCents", "expectedCents", "highCents", "currency", "basis"], path, errors);
  for (const key of ["lowCents", "expectedCents", "highCents"]) {
    const amount = value[key];
    if (!Number.isInteger(amount) || (amount as number) < 0) errors.push({ path: `${path}.${key}`, message: "Must be a non-negative integer number of cents." });
  }
  if (typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency)) errors.push({ path: `${path}.currency`, message: "Must be a three-letter uppercase currency code." });
  enumValue(value.basis, moneyBases, `${path}.basis`, errors);
  if (Number.isInteger(value.lowCents) && Number.isInteger(value.expectedCents) && Number.isInteger(value.highCents) &&
      !((value.lowCents as number) <= (value.expectedCents as number) && (value.expectedCents as number) <= (value.highCents as number))) {
    errors.push({ path, message: "Range must satisfy lowCents <= expectedCents <= highCents." });
  }
}

function landedCostInputs(value: unknown, path: string, errors: InputValidationError[]) {
  if (!record(value)) return errors.push({ path, message: "Landed-cost inputs are required." });
  allowedKeys(value, [...costKeys, "otherCosts", "notApplicable", "destinationAssumptions", "calculatedAt"], path, errors);
  for (const key of costKeys) money(value[key], `${path}.${key}`, errors);
  if (!Array.isArray(value.otherCosts)) errors.push({ path: `${path}.otherCosts`, message: "An array is required." });
  else value.otherCosts.forEach((item, index) => {
    const itemPath = `${path}.otherCosts[${index}]`;
    if (!record(item)) return errors.push({ path: itemPath, message: "A labeled cost object is required." });
    allowedKeys(item, ["label", "cost"], itemPath, errors);
    requiredString(item.label, `${itemPath}.label`, errors);
    money(item.cost, `${itemPath}.cost`, errors, false);
  });
  if (!Array.isArray(value.notApplicable)) errors.push({ path: `${path}.notApplicable`, message: "An array is required." });
  else value.notApplicable.forEach((item, index) => enumValue(item, costKeys, `${path}.notApplicable[${index}]`, errors));
  stringArray(value.destinationAssumptions, `${path}.destinationAssumptions`, errors, true);
  if (typeof value.calculatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value.calculatedAt)) errors.push({ path: `${path}.calculatedAt`, message: "An ISO-like calculation date is required." });
}

function evidence(value: unknown, path: string, errors: InputValidationError[]) {
  if (!record(value)) return errors.push({ path, message: "An evidence claim object is required." });
  allowedKeys(value, ["id", "subjectType", "subjectId", "sourceUrl", "sourceLabel", "evidenceType", "claim", "retrievedAt", "confidence", "verificationStatus", "limitations"], path, errors);
  for (const key of ["id", "subjectId", "sourceLabel", "claim"]) requiredString(value[key], `${path}.${key}`, errors);
  enumValue(value.subjectType, evidenceSubjects, `${path}.subjectType`, errors);
  enumValue(value.evidenceType, evidenceTypes, `${path}.evidenceType`, errors);
  enumValue(value.confidence, CONFIDENCE_LEVELS, `${path}.confidence`, errors);
  enumValue(value.verificationStatus, VERIFICATION_STATUSES, `${path}.verificationStatus`, errors);
  if (typeof value.sourceUrl !== "string" || !value.sourceUrl.startsWith("https://")) errors.push({ path: `${path}.sourceUrl`, message: "An HTTPS provenance URL is required." });
  if (typeof value.retrievedAt !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value.retrievedAt)) errors.push({ path: `${path}.retrievedAt`, message: "An ISO-like retrieval date is required." });
  stringArray(value.limitations, `${path}.limitations`, errors);
}

function scenario(value: unknown, path: string, errors: InputValidationError[]) {
  if (!record(value)) return errors.push({ path, message: "A scenario object is required." });
  allowedKeys(value, ["kind", "assumptions", "estimatedCost", "majorRisks", "confidence", "evidenceRequirements"], path, errors);
  enumValue(value.kind, scenarioKinds, `${path}.kind`, errors);
  stringArray(value.assumptions, `${path}.assumptions`, errors, true);
  money(value.estimatedCost, `${path}.estimatedCost`, errors);
  stringArray(value.majorRisks, `${path}.majorRisks`, errors);
  enumValue(value.confidence, CONFIDENCE_LEVELS, `${path}.confidence`, errors);
  stringArray(value.evidenceRequirements, `${path}.evidenceRequirements`, errors, true);
  if (value.estimatedCost === null && value.confidence !== "insufficient") errors.push({ path: `${path}.confidence`, message: "Unknown scenario cost requires insufficient confidence." });
}

function option(value: unknown, path: string, errors: InputValidationError[]) {
  if (!record(value)) return errors.push({ path, message: "A Decision Case option is required." });
  allowedKeys(value, ["id", "route", "label", "productId", "entityId", "landedCostInputs", "evidenceClaimIds"], path, errors);
  requiredString(value.id, `${path}.id`, errors);
  enumValue(value.route, DECISION_ROUTES, `${path}.route`, errors);
  requiredString(value.label, `${path}.label`, errors);
  nullableString(value.productId, `${path}.productId`, errors);
  nullableString(value.entityId, `${path}.entityId`, errors);
  landedCostInputs(value.landedCostInputs, `${path}.landedCostInputs`, errors);
  stringArray(value.evidenceClaimIds, `${path}.evidenceClaimIds`, errors);
}

function decisionCase(value: unknown, path: string, errors: InputValidationError[]) {
  if (!record(value)) return errors.push({ path, message: "A Decision Case object is required." });
  allowedKeys(value, ["id", "problem", "knownProductId", "useCase", "operatingEnvironment", "budget", "urgency", "destinationAssumptions", "attachmentRefs", "options", "unresolvedQuestions", "evidence", "confidence", "scenarios", "recommendationStatus"], path, errors);
  requiredString(value.id, `${path}.id`, errors);
  requiredString(value.problem, `${path}.problem`, errors);
  nullableString(value.knownProductId, `${path}.knownProductId`, errors);
  requiredString(value.useCase, `${path}.useCase`, errors);
  requiredString(value.operatingEnvironment, `${path}.operatingEnvironment`, errors);
  money(value.budget, `${path}.budget`, errors);
  enumValue(value.urgency, urgencyValues, `${path}.urgency`, errors);
  stringArray(value.destinationAssumptions, `${path}.destinationAssumptions`, errors, true);
  if (!Array.isArray(value.attachmentRefs)) errors.push({ path: `${path}.attachmentRefs`, message: "An array is required." });
  else value.attachmentRefs.forEach((item, index) => {
    const itemPath = `${path}.attachmentRefs[${index}]`;
    if (!record(item)) return errors.push({ path: itemPath, message: "An attachment reference object is required." });
    allowedKeys(item, ["id", "kind", "label"], itemPath, errors);
    requiredString(item.id, `${itemPath}.id`, errors); enumValue(item.kind, ["photo", "document"], `${itemPath}.kind`, errors); requiredString(item.label, `${itemPath}.label`, errors);
  });
  if (!Array.isArray(value.options)) errors.push({ path: `${path}.options`, message: "An array is required." });
  else {
    value.options.forEach((item, index) => option(item, `${path}.options[${index}]`, errors));
    const ids = value.options.filter(record).map((item) => item.id);
    const routes = value.options.filter(record).map((item) => item.route);
    if (new Set(ids).size !== ids.length) errors.push({ path: `${path}.options`, message: "Option IDs must be unique." });
    if (new Set(routes).size !== routes.length) errors.push({ path: `${path}.options`, message: "Each route may appear at most once." });
  }
  stringArray(value.unresolvedQuestions, `${path}.unresolvedQuestions`, errors);
  if (!Array.isArray(value.evidence)) errors.push({ path: `${path}.evidence`, message: "An array is required." });
  else value.evidence.forEach((item, index) => evidence(item, `${path}.evidence[${index}]`, errors));
  enumValue(value.confidence, CONFIDENCE_LEVELS, `${path}.confidence`, errors);
  if (!Array.isArray(value.scenarios)) errors.push({ path: `${path}.scenarios`, message: "An array is required." });
  else {
    value.scenarios.forEach((item, index) => scenario(item, `${path}.scenarios[${index}]`, errors));
    for (const kind of scenarioKinds) if (value.scenarios.filter((item) => record(item) && item.kind === kind).length !== 1) errors.push({ path: `${path}.scenarios`, message: `Exactly one ${kind} scenario is required.` });
  }
  enumValue(value.recommendationStatus, recommendationStatuses, `${path}.recommendationStatus`, errors);
}

function riskGate(value: unknown, path: string, errors: InputValidationError[]) {
  if (!record(value)) return errors.push({ path, message: "A risk gate object is required." });
  allowedKeys(value, ["type", "status", "blocking", "evidenceClaimIds", "note"], path, errors);
  enumValue(value.type, RISK_GATE_TYPES, `${path}.type`, errors);
  enumValue(value.status, riskStatuses, `${path}.status`, errors);
  if (typeof value.blocking !== "boolean") errors.push({ path: `${path}.blocking`, message: "A boolean is required." });
  stringArray(value.evidenceClaimIds, `${path}.evidenceClaimIds`, errors);
  requiredString(value.note, `${path}.note`, errors);
  if (value.status === "verified" && Array.isArray(value.evidenceClaimIds) && value.evidenceClaimIds.length === 0) errors.push({ path: `${path}.evidenceClaimIds`, message: "A verified gate requires evidence references." });
}

function commercialOpportunity(value: unknown, path: string, errors: InputValidationError[]) {
  if (!record(value)) return errors.push({ path, message: "A commercial opportunity object is required." });
  allowedKeys(value, ["type", "scorecard", "note"], path, errors);
  enumValue(value.type, commercialTypes, `${path}.type`, errors);
  requiredString(value.note, `${path}.note`, errors);
  if (value.scorecard !== null) errors.push({ path: `${path}.scorecard`, message: "Manual runner currently accepts null scorecards only; scorecards must be evaluated separately." });
}

export function validateDecisionCaseInput(input: unknown): InputValidationResult {
  const errors: InputValidationError[] = [];
  if (!record(input)) return { ok: false, errors: [{ path: "$", message: "The root value must be an object." }] };
  allowedKeys(input, ["decisionCase", "riskGatesByOptionId", "requestedRoute", "baselineRoute", "professionalServiceRequired", "commercialOpportunities", "calculatedAt"], "$", errors);
  decisionCase(input.decisionCase, "$.decisionCase", errors);
  if (!record(input.riskGatesByOptionId)) errors.push({ path: "$.riskGatesByOptionId", message: "An option-to-risk-gates object is required." });
  else for (const [optionId, gates] of Object.entries(input.riskGatesByOptionId)) {
    if (!Array.isArray(gates)) errors.push({ path: `$.riskGatesByOptionId.${optionId}`, message: "An array is required." });
    else gates.forEach((gate, index) => riskGate(gate, `$.riskGatesByOptionId.${optionId}[${index}]`, errors));
  }
  if (input.requestedRoute !== undefined && input.requestedRoute !== null) enumValue(input.requestedRoute, DECISION_ROUTES, "$.requestedRoute", errors);
  if (input.baselineRoute !== undefined && input.baselineRoute !== null) enumValue(input.baselineRoute, DECISION_ROUTES, "$.baselineRoute", errors);
  if (input.professionalServiceRequired !== undefined && typeof input.professionalServiceRequired !== "boolean") errors.push({ path: "$.professionalServiceRequired", message: "A boolean is required." });
  if (input.commercialOpportunities !== undefined) {
    if (!Array.isArray(input.commercialOpportunities)) errors.push({ path: "$.commercialOpportunities", message: "An array is required." });
    else input.commercialOpportunities.forEach((item, index) => commercialOpportunity(item, `$.commercialOpportunities[${index}]`, errors));
  }
  if (typeof input.calculatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(input.calculatedAt)) errors.push({ path: "$.calculatedAt", message: "An ISO-like calculation date is required." });
  return errors.length ? { ok: false, errors } : { ok: true, value: structuredClone(input) as DecisionCaseServiceInput };
}
