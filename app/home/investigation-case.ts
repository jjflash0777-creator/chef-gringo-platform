import type { DecisionRoute } from "../marketplace/intelligence/decision-engine.ts";

export const INVESTIGATION_STATUSES = [
  "NEEDS_INFORMATION",
  "INVESTIGATING",
  "PROFESSIONAL_VERIFICATION_REQUIRED",
  "VERIFY_FIRST",
  "READY_FOR_DECISION",
  "NO_VIABLE_ROUTE",
] as const;

export type InvestigationStatus = typeof INVESTIGATION_STATUSES[number];
export type EvidenceState = "user_provided" | "inferred" | "verified" | "unknown";
export type SafetyState = "safe_observation" | "professional_verification_required" | "do_not_proceed";
export type InvestigationCategory = "refrigeration" | "cooking_equipment" | "dishwashing" | "unknown_foodservice_equipment";

export type InvestigationEvidence = {
  id: string;
  claim: string;
  source: string;
  sourceType: "user_report" | "photo" | "manufacturer_documentation" | "service_record" | "seller_listing" | "system_inference";
  state: EvidenceState;
  timestamp: string;
  confidence: "insufficient" | "low" | "moderate" | "high";
  notes: string[];
};

export type InvestigationRequirement = {
  id: string;
  label: string;
  why: string;
  priority: "required_now" | "useful_later";
  safeForUser: boolean;
};

export type InvestigationCase = {
  id: string;
  userProblem: string;
  category: InvestigationCategory;
  equipment: {
    identity: string | null;
    manufacturer: string | null;
    modelNumber: string | null;
    serialNumber: string | null;
    photosSupplied: number;
  };
  symptoms: string[];
  currentCondition: string | null;
  userConstraints: string[];
  location: string | null;
  urgency: "unknown" | "routine" | "soon" | "urgent";
  budget: string | null;
  downtimeTolerance: string | null;
  existingRepairEstimate: string | null;
  existingReplacementQuote: string | null;
  evidence: InvestigationEvidence[];
  knownFacts: string[];
  userProvidedClaims: string[];
  verifiedFacts: string[];
  unknowns: string[];
  evidenceRequirements: InvestigationRequirement[];
  candidateRoutes: Array<{ route: DecisionRoute; status: "candidate" | "not_ready"; rationale: string }>;
  investigationPlan: string[];
  safety: { state: SafetyState; reason: string; allowedActions: string[] };
  status: InvestigationStatus;
  recommendation: null;
  capturedAt: string;
};

export type SuppliedCaseEvidence = {
  claim: string;
  source: string;
  sourceType: "photo" | "manufacturer_documentation" | "service_record";
  state: "user_provided" | "verified";
  confidence: "low" | "moderate" | "high";
  field?: "manufacturer" | "modelNumber" | "serialNumber";
  value?: string;
};

const equipmentPatterns: Array<[RegExp, string, InvestigationCategory]> = [
  [/walk[ -]?in freezer/i, "Walk-in freezer", "refrigeration"],
  [/reach[ -]?in (?:refrigerator|fridge|freezer)/i, "Reach-in refrigeration unit", "refrigeration"],
  [/blast chiller/i, "Blast chiller", "refrigeration"],
  [/ice machine/i, "Ice machine", "refrigeration"],
  [/(?:refrigerator|fridge)/i, "Refrigerator", "refrigeration"],
  [/freezer/i, "Freezer", "refrigeration"],
  [/(?:oven|range)/i, "Oven or range", "cooking_equipment"],
  [/dishwasher/i, "Commercial dishwasher", "dishwashing"],
  [/(?:foodservice|commercial kitchen|kitchen equipment)/i, "Foodservice equipment", "unknown_foodservice_equipment"],
];

function stableId(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `investigation:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function extractNamedValue(problem: string, label: string) {
  const match = problem.match(new RegExp(`\\b${label}(?:\\s+(?:number|no\\.?))?\\s*(?:is|:|#)?\\s*([a-z0-9][a-z0-9._/-]{2,})`, "i"));
  return match?.[1] ?? null;
}

export function supportsRealInvestigation(problem: string) {
  return equipmentPatterns.some(([pattern]) => pattern.test(problem));
}

export function createInvestigationCase(input: { problem: string; capturedAt: string; suppliedEvidence?: SuppliedCaseEvidence[] }): InvestigationCase {
  const problem = input.problem.trim();
  if (!problem) throw new Error("A user problem is required.");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input.capturedAt)) throw new Error("A valid capture timestamp is required.");

  const matched = equipmentPatterns.find(([pattern]) => pattern.test(problem));
  const equipment = matched?.[1] ?? null;
  const category = matched?.[2] ?? "unknown_foodservice_equipment";
  const supplied = input.suppliedEvidence ?? [];
  let manufacturer = extractNamedValue(problem, "manufacturer");
  let modelNumber = extractNamedValue(problem, "model");
  let serialNumber = extractNamedValue(problem, "serial");
  const budget = problem.match(/\bbudget(?: is|:)?\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.[1] ?? null;
  const repairEstimate = problem.match(/\brepair (?:estimate|quote)(?: is|:)?\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.[1] ?? null;
  const replacementQuote = problem.match(/\breplacement quote(?: is|:)?\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.[1] ?? null;
  const downtimeTolerance = problem.match(/(?:can (?:only )?(?:be )?down|downtime(?: tolerance)?(?: is|:)?)[^\d]*(\d+\s*(?:hours?|days?))/i)?.[1] ?? null;
  const location = problem.match(/\b(?:located|location is|operating in)\s+([A-Za-z .'-]+(?:,\s*[A-Z]{2})?)(?:[.;]|$)/i)?.[1]?.trim() ?? null;
  const urgency: InvestigationCase["urgency"] = /urgent|immediately|today|emergency/i.test(problem) ? "urgent" : /this week|soon/i.test(problem) ? "soon" : /routine|no rush/i.test(problem) ? "routine" : "unknown";
  for (const item of supplied) {
    if (item.field === "manufacturer" && item.value) manufacturer = item.value;
    if (item.field === "modelNumber" && item.value) modelNumber = item.value;
    if (item.field === "serialNumber" && item.value) serialNumber = item.value;
  }

  const evidence: InvestigationEvidence[] = [];
  const addEvidence = (claim: string, state: EvidenceState, confidence: InvestigationEvidence["confidence"], notes: string[] = []) => {
    evidence.push({ id: `${stableId(problem)}:e${evidence.length + 1}`, claim, source: "Operator intake", sourceType: state === "inferred" ? "system_inference" : "user_report", state, timestamp: input.capturedAt, confidence, notes });
  };
  if (equipment) addEvidence(`Equipment described as ${equipment}.`, "inferred", "moderate", ["Category extraction only; manufacturer and model remain separate."]);

  const symptoms: string[] = [];
  const temperature = problem.match(/(?:at|reads?|reading|temperature(?: is|:)?)[^\d-]*(-?\d{1,3})\s*(?:°\s*)?f\b/i)?.[1];
  if (temperature) {
    symptoms.push(`Reported temperature: ${temperature}°F`);
    addEvidence(`Operator reports a temperature of ${temperature}°F.`, "user_provided", "low", ["Reading method and instrument accuracy are not verified."]);
  }
  if (/condenser (?:isn['’]?t|is not|appears? (?:off|not to (?:run|be running))|not running|appears off)/i.test(problem)) {
    symptoms.push("Condenser appears not to be running");
    addEvidence("Operator reports that the condenser appears not to run.", "user_provided", "low", ["Observation does not establish which component, control, or power condition is responsible."]);
  }
  if (/(?:breaker|nothing).*(?:isn['’]?t|not|looks?)(?: visibly)? tripped|nothing looks tripped/i.test(problem)) {
    symptoms.push("No breaker appears visibly tripped");
    addEvidence("Operator reports no visibly tripped breaker.", "user_provided", "low", ["This is not verification of voltage, disconnect state, or electrical continuity."]);
  }
  if (/(?:warm|not cool|isn['’]?t cool|is not cool)/i.test(problem)) {
    symptoms.push("Equipment is reported warm or not cooling");
    addEvidence("Operator reports that the equipment is warm or not cooling.", "user_provided", "low");
  }
  if (/error code\s*[:#]?\s*([a-z0-9-]+)/i.test(problem)) {
    const code = problem.match(/error code\s*[:#]?\s*([a-z0-9-]+)/i)![1];
    symptoms.push(`Reported error code: ${code}`);
    addEvidence(`Operator reports error code ${code}.`, "user_provided", "low", ["Meaning requires model-specific documentation."]);
  }
  if (modelNumber) addEvidence(`Model number reported as ${modelNumber}.`, "user_provided", "low", ["Requires a data-plate photo or manufacturer document to verify."]);
  if (manufacturer) addEvidence(`Manufacturer reported as ${manufacturer}.`, "user_provided", "low");
  if (serialNumber) addEvidence(`Serial number reported as ${serialNumber}.`, "user_provided", "low", ["Requires a data-plate photo or service record to verify."]);
  if (budget) addEvidence(`Operator reports a budget of ${budget}.`, "user_provided", "low");
  if (repairEstimate) addEvidence(`Operator reports an existing repair estimate of ${repairEstimate}.`, "user_provided", "low", ["Estimate scope and provider terms are not verified."]);
  if (replacementQuote) addEvidence(`Operator reports an existing replacement quote of ${replacementQuote}.`, "user_provided", "low", ["Installed scope, compatibility, and quote terms are not verified."]);
  if (downtimeTolerance) addEvidence(`Operator reports acceptable downtime of ${downtimeTolerance}.`, "user_provided", "low");
  if (location) addEvidence(`Operator reports the operating location as ${location}.`, "user_provided", "low");
  for (const item of supplied) evidence.push({ id: `${stableId(problem)}:e${evidence.length + 1}`, claim: item.claim, source: item.source, sourceType: item.sourceType, state: item.state, timestamp: input.capturedAt, confidence: item.confidence, notes: [] });

  const hazardousRequest = /(?:probe|test|measure|check).{0,30}(?:live|voltage|amperage|electrical|contactor)|bypass.{0,25}(?:safety|switch|control)|open.{0,20}(?:refrigerant|gas) line/i.test(problem);
  const safety = hazardousRequest
    ? { state: "do_not_proceed" as const, reason: "The request involves live electrical, refrigerant, combustion, pressure, or bypass work that should not be attempted through this interface.", allowedActions: ["Record equipment identity without opening energized panels.", "Photograph only accessible exterior labels with power left undisturbed.", "Contact a qualified commercial service professional."] }
    : { state: "safe_observation" as const, reason: "The next requested evidence is limited to non-invasive observation. Diagnosis may still require a qualified professional.", allowedActions: ["Record displayed temperatures and error codes.", "Photograph accessible labels and exterior components without removing energized covers.", "Report sounds, airflow, and visible operating state from a safe distance."] };

  const hasIdentityEvidence = Boolean(modelNumber) || supplied.some((item) => item.field === "modelNumber" && item.value);
  const requirements: InvestigationRequirement[] = [];
  const addRequirement = (id: string, label: string, why: string, priority: InvestigationRequirement["priority"], safeForUser = true) => requirements.push({ id, label, why, priority, safeForUser });
  if (!equipment) addRequirement("equipment_identity", "What kind of foodservice equipment is this?", "The safe observations and realistic routes depend on the equipment category.", "required_now");
  if (!hasIdentityEvidence) addRequirement("data_plate", "Equipment data plate or model number", "Model identity is needed for documentation, electrical requirements, parts, and serviceability.", "required_now");
  if (category === "refrigeration") {
    if (!temperature) addRequirement("current_temperature", "Current displayed or measured temperature", "Temperature establishes the operating condition without asserting a cause.", "required_now");
    if (!/evaporator fan/i.test(problem)) addRequirement("evaporator_fans", "Whether evaporator fans appear to run", "This safe observation helps narrow the next professional checks.", temperature ? "required_now" : "useful_later");
    if (!/condenser/i.test(problem)) addRequirement("condenser_state", "Whether the outdoor or remote condenser appears to run", "Operating state is needed before repair and replacement routes can be compared.", "required_now");
    addRequirement("service_history", "Recent service history", "Prior work and recurring failures affect repair-versus-replace readiness.", "useful_later");
  }
  if (!location) addRequirement("location", "Operating location", "Climate, service availability, code, and replacement logistics can change the viable routes.", "useful_later");
  if (urgency === "unknown" && !downtimeTolerance) addRequirement("downtime", "Urgency and acceptable downtime", "A technically viable route may still fail the operation's timing constraint.", "useful_later");

  const requiredNow = requirements.filter((item) => item.priority === "required_now");
  const status: InvestigationStatus = hazardousRequest
    ? "PROFESSIONAL_VERIFICATION_REQUIRED"
    : requiredNow.length >= 3 || symptoms.length === 0
      ? "NEEDS_INFORMATION"
      : "INVESTIGATING";
  const unknowns = unique([
    ...(!manufacturer ? ["Manufacturer"] : []),
    ...(!modelNumber ? ["Model number"] : []),
    "Root cause",
    "Electrical operating state",
    ...(category === "refrigeration" ? ["Refrigerant state"] : []),
    "Repair cost and expected restored life",
    "Replacement fit and installed total cost",
  ]);

  return {
    id: stableId(problem),
    userProblem: problem,
    category,
    equipment: { identity: equipment, manufacturer, modelNumber, serialNumber, photosSupplied: supplied.filter((item) => item.sourceType === "photo").length },
    symptoms,
    currentCondition: symptoms.length ? symptoms.join("; ") : null,
    userConstraints: unique([...(budget ? [`Budget: ${budget}`] : []), ...(downtimeTolerance ? [`Downtime tolerance: ${downtimeTolerance}`] : []), ...(urgency !== "unknown" ? [`Urgency: ${urgency}`] : [])]),
    location,
    urgency,
    budget,
    downtimeTolerance,
    existingRepairEstimate: repairEstimate,
    existingReplacementQuote: replacementQuote,
    evidence,
    knownFacts: evidence.filter((item) => item.state === "user_provided" || item.state === "verified").map((item) => item.claim),
    userProvidedClaims: evidence.filter((item) => item.state === "user_provided").map((item) => item.claim),
    verifiedFacts: evidence.filter((item) => item.state === "verified").map((item) => item.claim),
    unknowns,
    evidenceRequirements: requirements,
    candidateRoutes: [
      { route: "repair", status: "not_ready", rationale: "Diagnosis, repair scope, cost, and expected restored life are not established." },
      { route: "domestic", status: "not_ready", rationale: "Equipment identity, fit, availability, and installed total cost require evidence." },
      { route: "used_refurbished", status: "not_ready", rationale: "No inspected candidate, condition evidence, warranty, or delivered cost is available." },
      { route: "factory_direct", status: "not_ready", rationale: "No verified candidate, compatibility, compliance, supplier, or landed-cost evidence is available." },
      { route: "upgrade", status: "not_ready", rationale: "Capacity, workflow, utility, budget, and downtime requirements are incomplete." },
    ],
    investigationPlan: [
      "Confirm equipment identity from an accessible data plate or reliable record.",
      "Establish the current operating state using safe observations only.",
      "Group plausible failure domains without naming an unsupported cause.",
      "Escalate electrical, refrigerant, combustion, or pressure verification to a qualified professional.",
      "Compare repair and replacement routes only after scope, fit, downtime, and total cost have evidence.",
    ],
    safety,
    status,
    recommendation: null,
    capturedAt: input.capturedAt,
  };
}
