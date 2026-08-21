import type { AssistantIntent } from "../ai/assistant-contract.ts";
import { isDefinitionalQuestion } from "../ai/assistant-intents.ts";

export type ResearchTriggerDecision =
  | "skip"
  | "prefer_repository"
  | "plan_only"
  | "unavailable";

const HIGH_CONSEQUENCE = /\b(regulat|license|permit|statute|food.?safety|internal temperature|ground beef|therapeutic|iddsi|dysphagia|exact (model|spec)|thermapen|manual for|voltage|warranty|pricing|availability|source|cite|research this|look this up|thaw|danger zone|sanitiz|allergen|cross-contact|food cost per serving|food-cost percentage|edible.?portion|yield %|freezer is \d+)\b/i;

const USUALLY_SKIP = /\b(mirepoix|roux|soffritto|holy trinity|marinara|taste|flavor|substitut|swap|help me make|how do i (sweat|saut|fold|deglaze))\b/i;

export function researchTriggerFor(question: string, intent: AssistantIntent): ResearchTriggerDecision {
  const text = question.trim();
  if (/\bresearch this\b|\blook this up\b|\bfind (me )?(a |the )?source/i.test(text)) return "plan_only";
  if (intent === "food_safety" || intent === "dietary_accommodation" || intent === "business_startup") return "prefer_repository";
  if (intent === "food_cost_labor" && /\b(calculate|percentage|edible.?portion|per serving)\b/i.test(text)) return "prefer_repository";
  if (HIGH_CONSEQUENCE.test(text)) return "prefer_repository";
  if (intent === "equipment_selection" && /\b(thermapen|model|manual|spec)\b/i.test(text)) return "prefer_repository";
  if (isDefinitionalQuestion(text) && USUALLY_SKIP.test(text)) return "skip";
  if (intent === "culinary_technique" || intent === "recipe_help" || intent === "ingredient_substitution") return "skip";
  if (intent === "general" && !HIGH_CONSEQUENCE.test(text)) return "skip";
  return "skip";
}

export function shouldBypassResearch(question: string, intent: AssistantIntent) {
  return researchTriggerFor(question, intent) === "skip";
}
