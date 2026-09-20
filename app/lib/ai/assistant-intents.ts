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
  { intent: "food_safety", weight: 5, test: (t) => has(t, /\b(ground beef|safe (minimum )?internal temperature|160\s*°?\s*f)\b/i) },
  { intent: "food_safety", weight: 5, test: (t) => has(t, /\b(thaw|defrost|danger zone|left out|counter)\b/i) && has(t, /\b(meat|chicken|poultry|fish|food|beef)\b/i) },
  { intent: "food_safety", weight: 4, test: (t) => has(t, /\b(sanitiz|cleaning vs|cross[- ]contact|allergen cross)\b/i) },
  { intent: "food_cost_labor", weight: 4, test: (t) => has(t, /\b(edible.?portion|ep yield|food cost per serving|yield %|recipe scal)\b/i) },
  { intent: "food_safety", weight: 4, test: (t) => has(t, /\b(food.?borne|salmonella|e\.?\s?coli|listeria|danger zone|time[-\s]?temp|left out|safe to (eat|serve)|is this .*safe)\b/i) },
  { intent: "food_safety", weight: 3, test: (t) => has(t, /\b(thermometer|cooling|reheat|hot hold|cold hold|cross[- ]contaminat)\b/i) && has(t, /\b(safe|safety|temp|temperature|chicken|meat|rice|dairy)\b/i) },
  { intent: "dietary_accommodation", weight: 4, test: (t) => has(t, /\b(allergen|allergy|gluten[- ]free|celiac|iddsi|dysphagia|thickened liquid|therapeutic diet|diabetic diet|renal diet|medical diet)\b/i) },
  { intent: "equipment_troubleshooting", weight: 4, test: (t) => has(t, /\b(not cooling|not heating|won'?t start|stopped working|broken|repair|diagnose|tripping breaker|warm freezer|not holding temp|high[- ]limit|work live|bypass)\b/i) },
  { intent: "equipment_selection", weight: 5, test: (t) => has(t, /\bthermapen one\b/i) },
  { intent: "equipment_selection", weight: 4, test: (t) => has(t, /\b(what (oven|mixer|fridge|refrigerator|freezer|range|dishwasher|thermometer) should i (buy|get)|buy (an? )?(oven|mixer|fridge))\b/i) },
  { intent: "equipment_selection", weight: 2, test: (t) => has(t, /\b(oven|mixer|refrigerat|freezer|dishwasher|range|blast chiller|immersion blender)\b/i) && has(t, /\b(buy|purchase|recommend|which|looking for|need a|need an)\b/i) },
  { intent: "food_safety", weight: 6, test: (t) => has(t, /\b(recall|walk[- ]?in|refrigerator|fridge|freezer|cold display|fruit display|dishwasher|power)\b/i) && has(t, /\b(4[2-9]|5\d)\s*°?\s*f|warm|food safety|safe|temperature|temp|overnight|failed|down|outage|recall)\b/i) },
  { intent: "food_safety", weight: 5, test: (t) => has(t, /\b(cool(?:ing)?|room temperature|thaw|cross[- ]contact|allergen|sanitiz|food recall|temperature log|log .*temperature)\b/i) },
  { intent: "dietary_accommodation", weight: 5, test: (t) => has(t, /\b(puree|pur[eé]e|chewing difficulty|soft(?:er)? food|level 4|iddsi|renal|gluten[- ]free|severe .* allergy|shellfish allergy|therapeutic diet|lower sodium|low sodium|lower[- ]sugar|low sugar)\b/i) },
  { intent: "equipment_troubleshooting", weight: 5, test: (t) => has(t, /\b(cycling warm|holding \d+\s*°?\s*f|production .* dropped|will not ignite|won't ignite|gasket .* torn|box .* sweating|walk[- ]?in failed|dishwasher .* down|ice machine)\b/i) },
  { intent: "equipment_selection", weight: 5, test: (t) => has(t, /\b(immersion blender|commercial dishwasher|combi oven|convection ovens?|bone saw|cut(?:ting)? .* bones?)\b/i) && has(t, /\b(need|what|which|should|spec|buy|look for|safest|compare)\b/i) },
  { intent: "marketplace_comparison", weight: 6, test: (t) => has(t, /\bcompare\b/i) && has(t, /\b(immersion blenders?|thermometers?|mixers?|repair .* replacement|replacement .* repair|commercial equipment)\b/i) },
  { intent: "food_cost_labor", weight: 5, test: (t) => has(t, /\b(raw purchase weight|purchase weight|portions?|hotel pans?|cost per serving|resident day|purchase-price variance|usage variance|yield|trim loss|plate waste|order quantity|par level|inventory|case pack|unit price)\b/i) },
  { intent: "food_cost_labor", weight: 5, test: (t) => has(t, /\b(labor hours?|staffing|short[- ]staffed|cook called out|labor productivity|workload|meals served|service window|prep and closing|events .* labor|revenue .* budget|budget .* revenue|food spend)\b/i) },
  { intent: "sourcing", weight: 5, test: (t) => has(t, /\b(in stock|stock right now|supplier|vendor|used commercial refrigerator|produce vendor|fill rates?|wholesale)\b/i) },
  { intent: "software_operations", weight: 5, test: (t) => has(t, /\b(scheduling system|restaurant365|food[- ]cost tool|inventory system|pos\b|point of sale)\b/i) },
  { intent: "business_startup", weight: 5, test: (t) => has(t, /\b(food truck|cottage[- ]food|cottage food|mobile food|home kitchen|sell .* online|startup equipment)\b/i) },
  { intent: "recipe_help", weight: 5, test: (t) => has(t, /\b(give me|build me|i need|production timeline)\b/i) && has(t, /\b(dinner|breakfast|soup|entree|side|dessert|menu|recipe|sauce|casserole|chicken|cabbage|oktoberfest)\b/i) },
  { intent: "recipe_help", weight: 5, test: (t) => has(t, /\b(40 pounds|40 lb|scale .* recipe|scale .* servings?|marinade .* pounds?|serves? \d+ .* \d+ portions?)\b/i) },
  { intent: "marketplace_comparison", weight: 3, test: (t) => has(t, /\b(compare|versus|vs\.?|side by side|which (model|one|brand))\b/i) && has(t, /\b(product|equipment|thermometers?|mixers?|software|pos|ovens?)\b/i) },
  { intent: "ingredient_substitution", weight: 4, test: (t) => has(t, /substitut|\bswap\b|instead of|don['’]t have|do not have|out of|replace .{1,50} with|alternative to|can i use .{1,40} instead/i) },
  { intent: "recipe_help", weight: 3, test: (t) => has(t, /\b(recipe|help me make|how do i make|cook|marinara|scale (this|the recipe)|shopping list)\b/i) },
  { intent: "culinary_technique", weight: 4, test: (t) => has(t, /^(what(?:'s| is)|define|explain)\s+(mirepoix|soffritto|holy trinity|roux|emulsion|confit|blanching|tempering)\b/i) },
  { intent: "culinary_technique", weight: 4, test: (t) => has(t, /\b(how do (you|i) (sweat|saut[eé]|deglaze|emulsif|temper|fold|blanch|confit)|sear .*before|silver skin|fall[- ]off[- ]the[- ]bone|keep .*crisp|sauce break|add acid .*brais)\b/i) },
  { intent: "culinary_technique", weight: 2, test: (t) => has(t, /\b(technique|mirepoix|soffritto|holy trinity|roux|emulsion|temper(ing)? eggs|brais(?:e|ing)|sear(?:ing)?)\b/i) },
  { intent: "software_operations", weight: 3, test: (t) => has(t, /\b(pos\b|point of sale|scheduling software|inventory software|payroll|reservation system)\b/i) },
  { intent: "food_cost_labor", weight: 3, test: (t) => has(t, /\b(food cost|labor cost|prime cost|overtime|waste|invoice|overpay|food[- ]cost %)\b/i) },
  { intent: "sourcing", weight: 2, test: (t) => has(t, /\b(where (do i|can i) (buy|source|get)|supplier|wholesaler|purveyor|sysco|us foods)\b/i) },
  { intent: "business_startup", weight: 4, test: (t) => has(t, /\b(start selling|cottage food|home bakery|food truck|open a restaurant|start a food business|sell baked goods from home)|licen/i) },
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
