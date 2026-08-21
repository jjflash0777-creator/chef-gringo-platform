import type { AssistantIntent, AssistantRequest } from "./assistant-contract.ts";

type Signal = { intent: AssistantIntent; weight: number; test: (text: string) => boolean };

function has(text: string, pattern: RegExp) {
  return pattern.test(text);
}

/**
 * Structured intent scoring. Signals are labeled and weighted so a single
 * regex cannot hijack routing. The model is not required to classify.
 */
const SIGNALS: Signal[] = [
  { intent: "food_safety", weight: 4, test: (t) => has(t, /\b(food.?borne|salmonella|e\.?\s?coli|listeria|danger zone|time[-\s]?temp|left out|safe to (eat|serve)|is this .*safe)\b/i) },
  { intent: "food_safety", weight: 3, test: (t) => has(t, /\b(thermometer|cooling|reheat|hot hold|cold hold|cross[- ]contaminat)\b/i) && has(t, /\b(safe|safety|temp|temperature|chicken|meat|rice|dairy)\b/i) },
  { intent: "dietary_accommodation", weight: 4, test: (t) => has(t, /\b(allergen|allergy|gluten[- ]free|celiac|iddsi|dysphagia|thickened liquid|therapeutic diet|diabetic diet|renal diet|medical diet)\b/i) },
  { intent: "equipment_troubleshooting", weight: 4, test: (t) => has(t, /\b(not cooling|not heating|won'?t start|stopped working|broken|repair|diagnose|tripping breaker|warm freezer|not holding temp|high[- ]limit|work live|bypass)\b/i) },
  { intent: "equipment_selection", weight: 3, test: (t) => has(t, /\b(what (oven|mixer|fridge|refrigerator|freezer|range|dishwasher|thermometer) should i (buy|get)|buy (an? )?(oven|mixer|fridge))\b/i) },
  { intent: "equipment_selection", weight: 2, test: (t) => has(t, /\b(oven|mixer|refrigerat|freezer|dishwasher|range|blast chiller|immersion blender)\b/i) && has(t, /\b(buy|purchase|recommend|which|looking for|need a|need an)\b/i) },
  { intent: "marketplace_comparison", weight: 3, test: (t) => has(t, /\b(compare|versus|vs\.?|side by side|which (model|one|brand))\b/i) && has(t, /\b(product|equipment|thermometers?|mixers?|software|pos|ovens?)\b/i) },
  { intent: "ingredient_substitution", weight: 3, test: (t) => has(t, /substitut|\bswap\b|instead of|don['’]t have|do not have|can i use .{1,40} instead/i) },
  { intent: "recipe_help", weight: 3, test: (t) => has(t, /\b(recipe|help me make|how do i make|cook|marinara|scale (this|the recipe)|shopping list)\b/i) },
  { intent: "culinary_technique", weight: 3, test: (t) => has(t, /\b(what(?:'s| is)|define|explain|how do (you|i) (sweat|saut[eé]|deglaze|emulsif|temper|fold|blanch|confit|mirepoix|roux))\b/i) },
  { intent: "culinary_technique", weight: 2, test: (t) => has(t, /\b(technique|mirepoix|soffritto|holy trinity|roux|emulsion|temper(ing)? eggs)\b/i) },
  { intent: "software_operations", weight: 3, test: (t) => has(t, /\b(pos\b|point of sale|scheduling software|inventory software|payroll|reservation system)\b/i) },
  { intent: "food_cost_labor", weight: 3, test: (t) => has(t, /\b(food cost|labor cost|prime cost|overtime|waste|invoice|overpay|food[- ]cost %)\b/i) },
  { intent: "sourcing", weight: 2, test: (t) => has(t, /\b(where (do i|can i) (buy|source|get)|supplier|wholesaler|purveyor|sysco|us foods)\b/i) },
  { intent: "business_startup", weight: 4, test: (t) => has(t, /\b(start selling|cottage food|home bakery|food truck|open a restaurant|start a food business|sell baked goods from home|licensing)\b/i) },
];

export function classifyIntent(request: AssistantRequest): AssistantIntent {
  if (request.intent) return request.intent;
  const text = joinedText(request);
  const scores = new Map<AssistantIntent, number>();
  for (const signal of SIGNALS) {
    if (signal.test(text)) scores.set(signal.intent, (scores.get(signal.intent) ?? 0) + signal.weight);
  }
  let best: AssistantIntent = "general";
  let bestScore = 0;
  for (const [intent, score] of scores) {
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best;
}

export function joinedText(request: AssistantRequest) {
  return [
    request.question,
    request.location,
    request.budget,
    request.operatingContext,
    request.dietaryContext,
    ...(request.conversation ?? []).map((turn) => turn.content),
  ].filter(Boolean).join("\n").toLowerCase();
}

export function isDefinitionalQuestion(question: string) {
  return /^(what(?:'s| is)|whats|define|explain)\b/i.test(question.trim());
}
