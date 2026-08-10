import type { DecisionRoute } from "../marketplace/intelligence/decision-engine.ts";

export const INVESTIGATION_STATUSES = ["NEEDS_INFORMATION", "INVESTIGATING", "PROFESSIONAL_VERIFICATION_REQUIRED", "VERIFY_FIRST", "READY_FOR_DECISION", "NO_VIABLE_ROUTE"] as const;
export type InvestigationStatus = typeof INVESTIGATION_STATUSES[number];
export type EvidenceState = "user_provided" | "externally_sourced" | "inferred" | "verified" | "unknown";
export type EvidenceConsistency = "consistent" | "conflicting" | "superseded";
export type SafetyState = "safe_observation" | "professional_verification_required" | "do_not_proceed";
export type InvestigationCategory = "refrigeration" | "cooking_equipment" | "dishwashing" | "unknown_foodservice_equipment";
export type RequirementPriority = "critical_now" | "high_value" | "useful_later" | "professional_only";
export type FollowUpAnswerType = "yes_no_unsure" | "numeric" | "temperature" | "currency" | "short_text" | "model_serial" | "error_code" | "photo" | "document" | "service_invoice";

export type InvestigationEvidence = {
  id: string;
  topic: string;
  claim: string;
  value: string | number | boolean | null;
  source: string;
  sourceType: "user_report" | "user_follow_up" | "data_plate_image" | "manufacturer_documentation" | "technician_report" | "service_invoice" | "parts_documentation" | "seller_listing" | "distributor_quote" | "regulatory_document" | "system_inference";
  state: EvidenceState;
  consistency: EvidenceConsistency;
  supersedesEvidenceId: string | null;
  timestamp: string;
  confidence: "insufficient" | "low" | "moderate" | "high";
  notes: string[];
  sourceDocumentId: string | null;
  sourceLocation: string | null;
  supportingSnippet: string | null;
  sourceValidation: "unverified_source" | "credible_source" | "authoritative_source" | "conflicting_source" | null;
};

export type InvestigationRequirement = {
  id: string;
  label: string;
  question: string;
  why: string;
  decisionImpact: string;
  priority: RequirementPriority;
  safetyClassification: "safe_observation" | "professional_only";
  answerableByUser: boolean;
  requiresProfessional: boolean;
  answerType: FollowUpAnswerType;
  futureAnswerTypes: Array<"photo" | "document" | "service_invoice">;
};

export type FollowUpQuestion = Pick<InvestigationRequirement, "id" | "question" | "why" | "decisionImpact" | "priority" | "safetyClassification" | "answerType">;
export type FollowUpAnswer = { requirementId: string; value: string | number | boolean | null; answeredAt: string };
export type CaseTransition = { from: InvestigationStatus | null; to: InvestigationStatus; at: string; reason: string };

export type InvestigationCase = {
  id: string;
  version: number;
  versionId: string;
  previousVersionId: string | null;
  userProblem: string;
  category: InvestigationCategory;
  equipment: { identity: string | null; manufacturer: string | null; modelNumber: string | null; serialNumber: string | null; photosSupplied: number };
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
  nextQuestion: FollowUpQuestion | null;
  progress: { criticalFactsKnown: number; criticalFactsMissing: number; identityEstablished: boolean; operatingState: "unknown" | "partial" | "established"; causeEstablished: false; decisionReady: false };
  candidateRoutes: Array<{ route: DecisionRoute; status: "not_ready" | "needs_quote" | "needs_compatibility_verification"; rationale: string }>;
  investigationPlan: string[];
  safety: { state: SafetyState; reason: string; allowedActions: string[] };
  transitions: CaseTransition[];
  status: InvestigationStatus;
  recommendation: null;
  capturedAt: string;
  updatedAt: string;
};

export type SuppliedCaseEvidence = {
  claim: string;
  source: string;
  sourceType: "data_plate_image" | "manufacturer_documentation" | "technician_report";
  state: "user_provided" | "verified";
  confidence: "low" | "moderate" | "high";
  field?: "manufacturer" | "modelNumber" | "serialNumber";
  value?: string;
};

const equipmentPatterns: Array<[RegExp, string, InvestigationCategory]> = [
  [/walk[ -]?in freezer/i, "Walk-in freezer", "refrigeration"],
  [/reach[ -]?in (?:refrigerator|fridge|freezer)/i, "Reach-in refrigeration unit", "refrigeration"],
  [/blast chiller/i, "Blast chiller", "refrigeration"], [/ice machine/i, "Ice machine", "refrigeration"],
  [/(?:refrigerator|fridge)/i, "Refrigerator", "refrigeration"], [/freezer/i, "Freezer", "refrigeration"],
  [/(?:oven|range)/i, "Oven or range", "cooking_equipment"], [/dishwasher/i, "Commercial dishwasher", "dishwashing"],
  [/(?:foodservice|commercial kitchen|kitchen equipment)/i, "Foodservice equipment", "unknown_foodservice_equipment"],
];

const priorityRank: Record<RequirementPriority, number> = { critical_now: 0, high_value: 1, useful_later: 2, professional_only: 3 };

function stableId(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `investigation:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
function unique(values: string[]) { return [...new Set(values)]; }
function extractNamedValue(problem: string, label: string) {
  return problem.match(new RegExp(`\\b${label}(?:\\s+(?:number|no\\.?))?\\s*(?:is|:|#)?\\s*([a-z0-9][a-z0-9._/-]{2,})`, "i"))?.[1] ?? null;
}
function activeEvidence(evidence: InvestigationEvidence[], topic: string) {
  return [...evidence].reverse().find((item) => item.topic === topic && item.consistency !== "superseded");
}
function requirement(input: Omit<InvestigationRequirement, "futureAnswerTypes"> & { futureAnswerTypes?: InvestigationRequirement["futureAnswerTypes"] }): InvestigationRequirement {
  return { ...input, futureAnswerTypes: input.futureAnswerTypes ?? [] };
}

function buildRequirements(investigation: Pick<InvestigationCase, "category" | "equipment" | "evidence" | "location" | "urgency" | "downtimeTolerance">) {
  const requirements: InvestigationRequirement[] = [];
  const has = (topic: string) => Boolean(activeEvidence(investigation.evidence, topic));
  if (!investigation.equipment.identity) requirements.push(requirement({ id: "equipment_identity", label: "Equipment identity", question: "What kind of foodservice equipment is this?", why: "The safe observations and realistic routes depend on the equipment category.", decisionImpact: "Establishes the investigation domain.", priority: "critical_now", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "short_text" }));
  if (!investigation.equipment.modelNumber) requirements.push(requirement({ id: "data_plate", label: "Model number or data plate", question: "Can you provide the model number shown on the data plate?", why: "Identity is needed for documentation, electrical requirements, parts, and serviceability.", decisionImpact: "Clears the equipment-identity gate but remains user-provided until verified.", priority: "high_value", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "model_serial", futureAnswerTypes: ["photo", "document"] }));
  if (investigation.category === "refrigeration") {
    if (!has("current_temperature")) requirements.push(requirement({ id: "current_temperature", label: "Current temperature", question: "What temperature is the equipment currently showing or measuring?", why: "Temperature establishes the operating condition without asserting a cause.", decisionImpact: "Moves the case from a vague symptom to a measured operating observation.", priority: "critical_now", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "temperature" }));
    if (!has("evaporator_fans")) requirements.push(requirement({ id: "evaporator_fans", label: "Evaporator fan observation", question: "From a safe position, do the evaporator fans inside appear to be running?", why: "This observation helps localize the operating-state investigation without naming a failed component.", decisionImpact: "Separates interior airflow state from the condensing-side observation.", priority: has("current_temperature") ? "critical_now" : "useful_later", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "yes_no_unsure" }));
    if (!has("condenser_state")) requirements.push(requirement({ id: "condenser_state", label: "Condenser operating observation", question: "From a safe distance, does the outdoor or remote condenser appear to be running?", why: "The observed operating state is needed before repair and replacement routes can progress.", decisionImpact: "Establishes whether the condensing-side state remains unresolved.", priority: "high_value", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "yes_no_unsure" }));
    if (!has("controller_error")) requirements.push(requirement({ id: "controller_error", label: "Controller error code", question: "Is an error code visible on the controller? Enter the code, or “none” or “unsure.”", why: "A visible code can be matched to model-specific documentation later.", decisionImpact: "Adds a model-dependent observation without interpreting it as a diagnosis.", priority: "high_value", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "error_code" }));
    const condenser = activeEvidence(investigation.evidence, "condenser_state")?.value;
    const evaporator = activeEvidence(investigation.evidence, "evaporator_fans")?.value;
    if (condenser === "not_running" && evaporator === "running" && investigation.equipment.modelNumber && !has("technician_operating_findings")) requirements.push(requirement({ id: "professional_electrical_verification", label: "Qualified electrical and control verification", question: "A qualified technician must verify the condensing unit’s electrical and control state.", why: "The next useful checks would cross a live-electrical and potentially refrigerant safety boundary.", decisionImpact: "Professional findings are required before the repair route can progress.", priority: "professional_only", safetyClassification: "professional_only", answerableByUser: false, requiresProfessional: true, answerType: "document", futureAnswerTypes: ["document", "service_invoice"] }));
    if (!has("service_history")) requirements.push(requirement({ id: "service_history", label: "Recent service history", question: "Has this equipment been serviced recently? If so, what work was reported?", why: "Prior work and recurring failures affect repair-versus-replace readiness.", decisionImpact: "Informs expected repair scope and useful-life questions.", priority: "useful_later", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "short_text", futureAnswerTypes: ["document", "service_invoice"] }));
  }
  if (!investigation.location) requirements.push(requirement({ id: "location", label: "Operating location", question: "Where is the equipment operating? City and state are enough.", why: "Climate, service availability, code, and logistics can change viable routes.", decisionImpact: "Supports later service and replacement-route verification.", priority: "useful_later", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "short_text" }));
  if (investigation.urgency === "unknown" && !investigation.downtimeTolerance) requirements.push(requirement({ id: "downtime", label: "Urgency and downtime", question: "How urgent is this, and how much downtime can the operation tolerate?", why: "A technically viable route may fail the operation’s timing constraint.", decisionImpact: "Adds an operating constraint to later route comparisons.", priority: "useful_later", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "short_text" }));
  return requirements;
}

function selectNextQuestion(requirements: InvestigationRequirement[]): FollowUpQuestion | null {
  const next = requirements.filter((item) => item.answerableByUser && !item.requiresProfessional).sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])[0];
  return next ? { id: next.id, question: next.question, why: next.why, decisionImpact: next.decisionImpact, priority: next.priority, safetyClassification: next.safetyClassification, answerType: next.answerType } : null;
}

export function recomputeInvestigationCase(investigation: InvestigationCase, transitionAt: string, reason: string): InvestigationCase {
  const next = structuredClone(investigation);
  next.evidenceRequirements = buildRequirements(next);
  next.nextQuestion = selectNextQuestion(next.evidenceRequirements);
  const active = next.evidence.filter((item) => item.consistency !== "superseded");
  next.knownFacts = unique(active.filter((item) => item.state === "user_provided" || item.state === "verified").map((item) => item.claim));
  next.userProvidedClaims = unique(active.filter((item) => item.state === "user_provided").map((item) => item.claim));
  next.verifiedFacts = unique(active.filter((item) => item.state === "verified").map((item) => item.claim));
  next.unknowns = unique([...(next.equipment.manufacturer ? [] : ["Manufacturer"]), ...(next.equipment.modelNumber ? [] : ["Model number"]), "Root cause", "Electrical operating state", ...(next.category === "refrigeration" ? ["Refrigerant state"] : []), "Repair cost and expected restored life", "Replacement fit and installed total cost"]);
  const operationalTopics = ["current_temperature", "evaporator_fans", "condenser_state", "controller_error"].filter((topic) => activeEvidence(next.evidence, topic));
  const criticalMissing = next.evidenceRequirements.filter((item) => item.priority === "critical_now" || item.priority === "high_value").length;
  const professionalRequired = next.safety.state === "do_not_proceed" || next.evidenceRequirements.some((item) => item.requiresProfessional);
  const technicianEvidence = activeEvidence(next.evidence, "technician_operating_findings") || activeEvidence(next.evidence, "technician_diagnosis");
  const verifiedIdentity = activeEvidence(next.evidence, "model_number")?.state === "verified";
  const status: InvestigationStatus = professionalRequired ? "PROFESSIONAL_VERIFICATION_REQUIRED" : verifiedIdentity && technicianEvidence ? "VERIFY_FIRST" : operationalTopics.length + (next.equipment.modelNumber ? 1 : 0) >= 2 ? "INVESTIGATING" : "NEEDS_INFORMATION";
  if (next.safety.state !== "do_not_proceed" && professionalRequired) next.safety = { state: "professional_verification_required", reason: "The next useful evidence requires qualified electrical, refrigerant, combustion, pressure, or control verification.", allowedActions: ["Preserve the current observations and equipment identity.", "Do not open energized panels or probe live components.", "Ask a qualified commercial technician to document the required findings."] };
  if (professionalRequired) next.nextQuestion = null;
  next.progress = { criticalFactsKnown: Math.max(0, 4 - criticalMissing), criticalFactsMissing: criticalMissing, identityEstablished: Boolean(next.equipment.modelNumber), operatingState: operationalTopics.length >= 3 ? "established" : operationalTopics.length ? "partial" : "unknown", causeEstablished: false, decisionReady: false };
  next.candidateRoutes = next.candidateRoutes.map((route) => {
    if (route.route === "repair" && operationalTopics.length >= 2) return { ...route, status: "needs_quote", rationale: "Operating observations are partially established; professional scope, price, and restored-life evidence are still required." };
    if (next.equipment.modelNumber && route.route !== "repair") return { ...route, status: "needs_compatibility_verification", rationale: "User-provided model identity allows candidate research, but fit, compliance, availability, and total cost remain unverified." };
    return route;
  });
  if (status !== next.status) next.transitions.push({ from: next.status, to: status, at: transitionAt, reason });
  next.status = status;
  next.updatedAt = transitionAt;
  return next;
}

export function supportsRealInvestigation(problem: string) { return equipmentPatterns.some(([pattern]) => pattern.test(problem)); }

export function createInvestigationCase(input: { problem: string; capturedAt: string; suppliedEvidence?: SuppliedCaseEvidence[] }): InvestigationCase {
  const problem = input.problem.trim();
  if (!problem) throw new Error("A user problem is required.");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input.capturedAt)) throw new Error("A valid capture timestamp is required.");
  const matched = equipmentPatterns.find(([pattern]) => pattern.test(problem));
  const equipmentIdentity = matched?.[1] ?? null;
  const category = matched?.[2] ?? "unknown_foodservice_equipment";
  const supplied = input.suppliedEvidence ?? [];
  let manufacturer = extractNamedValue(problem, "manufacturer"); let modelNumber = extractNamedValue(problem, "model"); let serialNumber = extractNamedValue(problem, "serial");
  const budget = problem.match(/\bbudget(?: is|:)?\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.[1] ?? null;
  const repairEstimate = problem.match(/\brepair (?:estimate|quote)(?: is|:)?\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.[1] ?? null;
  const replacementQuote = problem.match(/\breplacement quote(?: is|:)?\s*(\$[\d,]+(?:\.\d{1,2})?)/i)?.[1] ?? null;
  const downtimeTolerance = problem.match(/(?:can (?:only )?(?:be )?down|downtime(?: tolerance)?(?: is|:)?)[^\d]*(\d+\s*(?:hours?|days?))/i)?.[1] ?? null;
  const location = problem.match(/\b(?:located|location is|operating in)\s+([A-Za-z .'-]+(?:,\s*[A-Z]{2})?)(?:[.;]|$)/i)?.[1]?.trim() ?? null;
  const urgency: InvestigationCase["urgency"] = /urgent|immediately|today|emergency/i.test(problem) ? "urgent" : /this week|soon/i.test(problem) ? "soon" : /routine|no rush/i.test(problem) ? "routine" : "unknown";
  for (const item of supplied) { if (item.field === "manufacturer" && item.value) manufacturer = item.value; if (item.field === "modelNumber" && item.value) modelNumber = item.value; if (item.field === "serialNumber" && item.value) serialNumber = item.value; }
  const caseId = stableId(problem); const evidence: InvestigationEvidence[] = []; const symptoms: string[] = [];
  const add = (topic: string, claim: string, value: InvestigationEvidence["value"], state: EvidenceState, confidence: InvestigationEvidence["confidence"], notes: string[] = []) => evidence.push({ id: `${caseId}:e${evidence.length + 1}`, topic, claim, value, source: "Operator intake", sourceType: state === "inferred" ? "system_inference" : "user_report", state, consistency: "consistent", supersedesEvidenceId: null, timestamp: input.capturedAt, confidence, notes, sourceDocumentId: null, sourceLocation: null, supportingSnippet: null, sourceValidation: null });
  if (equipmentIdentity) add("equipment_identity", `Equipment described as ${equipmentIdentity}.`, equipmentIdentity, "inferred", "moderate", ["Category extraction only; manufacturer and model remain separate."]);
  const temperature = problem.match(/(?:at|reads?|reading|temperature(?: is|:)?)[^\d-]*(-?\d{1,3})\s*(?:°\s*)?f\b/i)?.[1];
  if (temperature) { symptoms.push(`Reported temperature: ${temperature}°F`); add("current_temperature", `Operator reports a temperature of ${temperature}°F.`, Number(temperature), "user_provided", "low", ["Reading method and instrument accuracy are not verified."]); }
  if (/condenser (?:isn['’]?t|is not|appears? (?:off|not to (?:run|be running))|not running|appears off)/i.test(problem)) { symptoms.push("Condenser appears not to be running"); add("condenser_state", "Operator reports that the condenser appears not to run.", "not_running", "user_provided", "low", ["Observation does not establish which component, control, or power condition is responsible."]); }
  if (/(?:breaker|nothing).*(?:isn['’]?t|not|looks?)(?: visibly)? tripped|nothing looks tripped/i.test(problem)) { symptoms.push("No breaker appears visibly tripped"); add("breaker_observation", "Operator reports no visibly tripped breaker.", "not_visibly_tripped", "user_provided", "low", ["This is not verification of voltage, disconnect state, or electrical continuity."]); }
  if (/(?:warm|not cool|isn['’]?t cool|is not cool)/i.test(problem)) { symptoms.push("Equipment is reported warm or not cooling"); add("warm_condition", "Operator reports that the equipment is warm or not cooling.", "warm", "user_provided", "low"); }
  const errorCode = problem.match(/error code\s*[:#]?\s*([a-z0-9-]+)/i)?.[1]; if (errorCode) { symptoms.push(`Reported error code: ${errorCode}`); add("controller_error", `Operator reports error code ${errorCode}.`, errorCode, "user_provided", "low", ["Meaning requires model-specific documentation."]); }
  if (modelNumber) add("model_number", `Model number reported as ${modelNumber}.`, modelNumber, "user_provided", "low", ["Requires a data-plate photo or manufacturer document to verify."]);
  if (manufacturer) add("manufacturer", `Manufacturer reported as ${manufacturer}.`, manufacturer, "user_provided", "low");
  if (serialNumber) add("serial_number", `Serial number reported as ${serialNumber}.`, serialNumber, "user_provided", "low", ["Requires a data-plate photo or service record to verify."]);
  if (budget) add("budget", `Operator reports a budget of ${budget}.`, budget, "user_provided", "low");
  if (repairEstimate) add("repair_estimate", `Operator reports an existing repair estimate of ${repairEstimate}.`, repairEstimate, "user_provided", "low", ["Estimate scope and provider terms are not verified."]);
  if (replacementQuote) add("replacement_quote", `Operator reports an existing replacement quote of ${replacementQuote}.`, replacementQuote, "user_provided", "low", ["Installed scope, compatibility, and quote terms are not verified."]);
  if (downtimeTolerance) add("downtime", `Operator reports acceptable downtime of ${downtimeTolerance}.`, downtimeTolerance, "user_provided", "low");
  if (location) add("location", `Operator reports the operating location as ${location}.`, location, "user_provided", "low");
  for (const item of supplied) { const topic = item.field === "modelNumber" ? "model_number" : item.field === "serialNumber" ? "serial_number" : item.field ?? "supplied_evidence"; evidence.push({ id: `${caseId}:e${evidence.length + 1}`, topic, claim: item.claim, value: item.value ?? item.claim, source: item.source, sourceType: item.sourceType, state: item.state, consistency: "consistent", supersedesEvidenceId: null, timestamp: input.capturedAt, confidence: item.confidence, notes: [], sourceDocumentId: `${caseId}:supplied:${evidence.length + 1}`, sourceLocation: null, supportingSnippet: item.claim, sourceValidation: item.state === "verified" ? "authoritative_source" : "unverified_source" }); }
  const hazardous = /(?:probe|test|measure|check).{0,30}(?:live|voltage|amperage|electrical|contactor)|bypass.{0,25}(?:safety|switch|control)|open.{0,20}(?:refrigerant|gas) line/i.test(problem);
  const safety = hazardous ? { state: "do_not_proceed" as const, reason: "The request involves live electrical, refrigerant, combustion, pressure, or bypass work that should not be attempted through this interface.", allowedActions: ["Record equipment identity without opening energized panels.", "Photograph only accessible exterior labels with power left undisturbed.", "Contact a qualified commercial service professional."] } : { state: "safe_observation" as const, reason: "The next requested evidence is limited to non-invasive observation. Diagnosis may still require a qualified professional.", allowedActions: ["Record displayed temperatures and error codes.", "Photograph accessible labels and exterior components without removing energized covers.", "Report sounds, airflow, and visible operating state from a safe distance."] };
  const initialStatus: InvestigationStatus = hazardous ? "PROFESSIONAL_VERIFICATION_REQUIRED" : evidence.filter((item) => item.state === "user_provided").length >= 2 ? "INVESTIGATING" : "NEEDS_INFORMATION";
  const shell: InvestigationCase = { id: caseId, version: 1, versionId: `${caseId}:v1`, previousVersionId: null, userProblem: problem, category, equipment: { identity: equipmentIdentity, manufacturer, modelNumber, serialNumber, photosSupplied: supplied.filter((item) => item.sourceType === "data_plate_image").length }, symptoms, currentCondition: symptoms.length ? symptoms.join("; ") : null, userConstraints: unique([...(budget ? [`Budget: ${budget}`] : []), ...(downtimeTolerance ? [`Downtime tolerance: ${downtimeTolerance}`] : []), ...(urgency !== "unknown" ? [`Urgency: ${urgency}`] : [])]), location, urgency, budget, downtimeTolerance, existingRepairEstimate: repairEstimate, existingReplacementQuote: replacementQuote, evidence, knownFacts: [], userProvidedClaims: [], verifiedFacts: [], unknowns: [], evidenceRequirements: [], nextQuestion: null, progress: { criticalFactsKnown: 0, criticalFactsMissing: 0, identityEstablished: Boolean(modelNumber), operatingState: "unknown", causeEstablished: false, decisionReady: false }, candidateRoutes: [
    { route: "repair", status: "not_ready", rationale: "Diagnosis, repair scope, cost, and expected restored life are not established." },
    { route: "domestic", status: "not_ready", rationale: "Equipment identity, fit, availability, and installed total cost require evidence." },
    { route: "used_refurbished", status: "not_ready", rationale: "No inspected candidate, condition evidence, warranty, or delivered cost is available." },
    { route: "factory_direct", status: "not_ready", rationale: "No verified candidate, compatibility, compliance, supplier, or landed-cost evidence is available." },
    { route: "upgrade", status: "not_ready", rationale: "Capacity, workflow, utility, budget, and downtime requirements are incomplete." },
  ], investigationPlan: ["Confirm equipment identity from an accessible data plate or reliable record.", "Establish the current operating state using safe observations only.", "Group plausible failure domains without naming an unsupported cause.", "Escalate electrical, refrigerant, combustion, or pressure verification to a qualified professional.", "Compare repair and replacement routes only after scope, fit, downtime, and total cost have evidence."], safety, transitions: [{ from: null, to: initialStatus, at: input.capturedAt, reason: "Initial case structured from operator intake." }], status: initialStatus, recommendation: null, capturedAt: input.capturedAt, updatedAt: input.capturedAt };
  return recomputeInvestigationCase(shell, input.capturedAt, "Initial evidence requirements computed.");
}

function normalizedAnswer(requirement: InvestigationRequirement, value: FollowUpAnswer["value"]) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("An answer is required.");
  if (requirement.answerType === "temperature") { const match = raw.match(/-?\d{1,3}(?:\.\d+)?/); if (!match) throw new Error("Enter a temperature in degrees Fahrenheit."); return { value: Number(match[0]), display: `${Number(match[0])}°F` }; }
  if (requirement.answerType === "yes_no_unsure") { const normalized = raw.toLowerCase(); if (!["yes", "no", "unsure"].includes(normalized)) throw new Error("Choose yes, no, or unsure."); const mapped = requirement.id === "condenser_state" || requirement.id === "evaporator_fans" ? normalized === "yes" ? "running" : normalized === "no" ? "not_running" : "unsure" : normalized; return { value: mapped, display: normalized }; }
  return { value: raw, display: raw };
}

export function applyFollowUpAnswer(original: InvestigationCase, answer: FollowUpAnswer): InvestigationCase {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(answer.answeredAt)) throw new Error("A valid answer timestamp is required.");
  const correctionLabels: Record<string, [string, string]> = { condenser_state: ["Condenser operating observation", "From a safe distance, does the condenser now appear to be running?"], evaporator_fans: ["Evaporator fan observation", "From a safe position, do the evaporator fans now appear to be running?"] };
  const correction = correctionLabels[answer.requirementId];
  const selectedRequirement = original.evidenceRequirements.find((item) => item.id === answer.requirementId) ?? (correction ? requirement({ id: answer.requirementId, label: correction[0], question: correction[1], why: "A corrected observation must remain in the evidence history alongside the earlier report.", decisionImpact: "Updates the active operating summary without erasing the prior claim.", priority: "high_value", safetyClassification: "safe_observation", answerableByUser: true, requiresProfessional: false, answerType: "yes_no_unsure" }) : null);
  if (!selectedRequirement || selectedRequirement.requiresProfessional || !selectedRequirement.answerableByUser) throw new Error("This follow-up cannot be answered through the user workflow.");
  const normalized = normalizedAnswer(selectedRequirement, answer.value);
  const next = structuredClone(original);
  next.previousVersionId = original.versionId; next.version = original.version + 1; next.versionId = `${original.id}:v${next.version}`;
  const topicByRequirement: Record<string, string> = { data_plate: "model_number", current_temperature: "current_temperature", evaporator_fans: "evaporator_fans", condenser_state: "condenser_state", controller_error: "controller_error", equipment_identity: "equipment_identity", service_history: "service_history", location: "location", downtime: "downtime" };
  const topic = topicByRequirement[selectedRequirement.id] ?? selectedRequirement.id;
  const previous = activeEvidence(next.evidence, topic);
  const contradiction = Boolean(previous && String(previous.value) !== String(normalized.value));
  if (contradiction && previous) { const stored = next.evidence.find((item) => item.id === previous.id)!; stored.consistency = "superseded"; stored.notes.push(`Superseded by follow-up evidence ${next.id}:e${next.evidence.length + 1}; both observations remain in history.`); }
  const labelByTopic: Record<string, string> = { model_number: `Operator follow-up reports model number ${normalized.display}.`, current_temperature: `Operator follow-up reports a temperature of ${normalized.display}.`, evaporator_fans: `Operator follow-up reports evaporator fans are ${normalized.value}.`, condenser_state: `Operator follow-up reports the condenser is ${normalized.value}.`, controller_error: `Operator follow-up reports controller error response: ${normalized.display}.`, equipment_identity: `Operator follow-up identifies the equipment as ${normalized.display}.`, service_history: `Operator follow-up reports service history: ${normalized.display}.`, location: `Operator follow-up reports the operating location as ${normalized.display}.`, downtime: `Operator follow-up reports urgency or downtime: ${normalized.display}.` };
  next.evidence.push({ id: `${next.id}:e${next.evidence.length + 1}`, topic, claim: labelByTopic[topic] ?? `Operator follow-up reports ${normalized.display}.`, value: normalized.value, source: "Operator follow-up", sourceType: "user_follow_up", state: "user_provided", consistency: contradiction ? "conflicting" : "consistent", supersedesEvidenceId: contradiction ? previous!.id : null, timestamp: answer.answeredAt, confidence: "low", notes: contradiction ? ["This newer observation conflicts with and supersedes the earlier active report; neither is externally verified."] : ["Structured follow-up evidence remains user-provided until independently verified."], sourceDocumentId: null, sourceLocation: null, supportingSnippet: null, sourceValidation: null });
  if (selectedRequirement.id === "data_plate") next.equipment.modelNumber = String(normalized.value);
  if (selectedRequirement.id === "equipment_identity") next.equipment.identity = String(normalized.value);
  if (selectedRequirement.id === "location") next.location = String(normalized.value);
  if (selectedRequirement.id === "downtime") next.downtimeTolerance = String(normalized.value);
  if (selectedRequirement.id === "current_temperature") next.symptoms = unique([...next.symptoms, `Reported temperature: ${normalized.display}`]);
  if (selectedRequirement.id === "evaporator_fans") next.symptoms = unique([...next.symptoms.filter((item) => !/evaporator fan/i.test(item)), `Evaporator fans reported ${normalized.value}`]);
  if (selectedRequirement.id === "condenser_state") next.symptoms = unique([...next.symptoms.filter((item) => !/condenser appears|condenser reported/i.test(item)), `Condenser reported ${normalized.value}`]);
  next.currentCondition = next.symptoms.length ? next.symptoms.join("; ") : null;
  return recomputeInvestigationCase(next, answer.answeredAt, `Follow-up evidence added for ${selectedRequirement.id}.`);
}
