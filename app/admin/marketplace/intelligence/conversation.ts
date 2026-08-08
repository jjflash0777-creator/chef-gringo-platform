import { RISK_GATE_TYPES, type DecisionRoute } from "../../../marketplace/intelligence/decision-engine.ts";
import type { LabDraft } from "./lab-model.ts";
export type ConversationIntent = "repair" | "purchase" | "factory_direct";
export type FollowUpField = "equipmentCondition" | "equipmentAge" | "repairEstimate" | "replacementQuote" | "category" | "environment" | "country" | "factoryPrice" | "factoryFreight" | "powerCompliance";
export type FollowUpQuestion = { field: FollowUpField; label: string; prompt: string; inputMode?: "decimal" };
const repairPattern = /\b(repair|fix|broken|stopped|failing|leak|noise|not working|malfunction)/i;
const factoryPattern = /\b(factory|factory-direct|direct from|import|overseas|manufacturer|alibaba|international supplier)/i;
export function inferConversationIntent(problem: string): ConversationIntent { if (factoryPattern.test(problem)) return "factory_direct"; if (repairPattern.test(problem)) return "repair"; return "purchase"; }
const question = (field: FollowUpField, label: string, prompt: string, inputMode?: "decimal"): FollowUpQuestion => ({ field, label, prompt, inputMode });
export function getFollowUpQuestions(draft: LabDraft): FollowUpQuestion[] {
  if (!draft.problem.trim()) return [];
  const intent = inferConversationIntent(draft.problem);
  if (intent === "repair") return [!draft.equipmentCondition.trim() && question("equipmentCondition", "Current condition", "What is the equipment doing now, and is it still usable?"), !draft.equipmentAge.trim() && question("equipmentAge", "Approximate age", "About how old is it?"), !draft.repairEstimate.trim() && question("repairEstimate", "Repair estimate", "What is the all-in repair estimate, if you have one?", "decimal"), !draft.replacementQuote.trim() && question("replacementQuote", "Replacement quote", "What is the best all-in replacement quote you have?", "decimal")].filter((value): value is FollowUpQuestion => Boolean(value));
  const shared = [!draft.category.trim() && question("category", "Capacity and use", "What will it do, and what capacity or volume do you need?"), !draft.environment.trim() && question("environment", "Operating environment", "Where and how will it be used?"), !draft.country.trim() && question("country", "Destination", "What country is the final destination?"), !draft.replacementQuote.trim() && question("replacementQuote", "Domestic option", "What is the best domestic all-in quote you have?", "decimal")].filter((value): value is FollowUpQuestion => Boolean(value));
  if (intent !== "factory_direct") return shared;
  return [...shared, !draft.factoryPrice.trim() && question("factoryPrice", "Factory price", "What factory price was actually observed?", "decimal"), !draft.factoryFreight.trim() && question("factoryFreight", "Freight quote", "What is the freight quote to the final destination?", "decimal"), !draft.powerCompliance.trim() && question("powerCompliance", "Power and compliance", "Are electrical configuration and required certifications verified?")].filter((value): value is FollowUpQuestion => Boolean(value));
}
function setNotApplicable(draft: LabDraft, route: DecisionRoute) { for (const gate of RISK_GATE_TYPES) draft.routes[route].gates[gate] = "not_applicable"; }
export function prepareConversationalDraft(source: LabDraft): LabDraft {
  const draft = structuredClone(source); const intent = inferConversationIntent(draft.problem);
  if (intent === "repair") { draft.routes.repair.enabled = true; draft.routes.repair.label = "Repair current equipment"; draft.routes.repair.costs.productPrice = draft.repairEstimate; draft.routes.domestic.enabled = true; draft.routes.domestic.label = "Domestic replacement"; draft.routes.domestic.costs.productPrice = draft.replacementQuote; for (const route of ["repair", "domestic"] as const) { for (const key of ["shippingFreight", "dutyTariff", "brokerageCustoms", "taxes", "finalMileDelivery", "accessoriesAdaptation"] as const) draft.routes[route].costs[key] = "0"; setNotApplicable(draft, route); } return draft; }
  draft.routes.domestic.enabled = true; draft.routes.domestic.label = "Domestic purchase option"; draft.routes.domestic.costs.productPrice = draft.replacementQuote; for (const key of ["shippingFreight", "dutyTariff", "brokerageCustoms", "taxes", "finalMileDelivery", "accessoriesAdaptation"] as const) draft.routes.domestic.costs[key] = "0"; setNotApplicable(draft, "domestic");
  if (intent === "factory_direct") { draft.requestedRoute = "factory_direct"; draft.routes.factory_direct.enabled = true; draft.routes.factory_direct.label = "Factory-direct option"; draft.routes.factory_direct.costs.productPrice = draft.factoryPrice; draft.routes.factory_direct.costs.shippingFreight = draft.factoryFreight; if (/\b(verified|yes|confirmed)\b/i.test(draft.powerCompliance)) { draft.routes.factory_direct.gates.electrical_compatibility = "not_applicable"; draft.routes.factory_direct.gates.certification_compliance = "not_applicable"; } }
  return draft;
}
export function followUpsFromUnresolved(questions: string[]) { return questions.map((value) => value.replaceAll("_", " ").replace(/^\w+:/, "").trim()).filter(Boolean); }
