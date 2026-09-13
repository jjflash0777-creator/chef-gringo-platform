import type { AssistantEvidence, AssistantIntent } from "./assistant-contract.ts";

/**
 * Small, sourced-or-practice answers used when the model is unavailable or
 * when a definitional question should not wait on a network call.
 * These are standard culinary practice, not live research.
 */

export type DeterministicAnswer = {
  answer: string;
  explanation?: string;
  evidence: AssistantEvidence[];
  confidence: "high" | "medium" | "low";
  assumptions: string[];
};

const DEFINITIONS: Array<{ match: RegExp; value: DeterministicAnswer }> = [
  {
    match: /\bmirepoix\b/i,
    value: {
      answer: "Mirepoix is a flavor base of onion, carrot, and celery, usually two parts onion to one part each carrot and celery, cooked gently in fat without browning.",
      explanation: "French kitchens use it under stocks, sauces, and braises. Cajun and Creole cooking uses a similar ‘holy trinity’ with bell pepper instead of carrot. Italian soffritto often adds garlic and herbs. Ratios shift with the dish; the idea is aromatic sweetness, not a rigid recipe.",
      evidence: [{ kind: "practice", label: "Standard culinary practice — not a live source check", authorityLabel: "professional practice" }],
      confidence: "high",
      assumptions: ["You mean the French aromatic base, not a branded mix."],
    },
  },
  {
    match: /\broux\b/i,
    value: {
      answer: "A roux is equal parts fat and flour cooked together to thicken a sauce. How dark you take it changes flavor and thickening power — paler thickens more, darker tastes nuttier and thickens less.",
      evidence: [{ kind: "practice", label: "Standard culinary practice — not a live source check", authorityLabel: "professional practice" }],
      confidence: "high",
      assumptions: [],
    },
  },
];

const THAW: DeterministicAnswer = {
  answer: "No. Do not thaw meat, poultry, or fish on the counter. USDA FSIS lists refrigerator thawing, cold-water thawing (water changed every 30 minutes), or microwave thawing if you will cook it immediately.",
  explanation: "The outside can sit in the danger zone while the center is still frozen. This is U.S. FSIS guidance, not a live web lookup.",
  evidence: [],
  confidence: "high",
  assumptions: ["U.S. home or foodservice thawing unless you said otherwise."],
};

const COOLING: DeterministicAnswer = {
  answer: "Two different rules are on file and they are not the same. Leftovers sitting out: USDA FSIS says refrigerate perishable cooked food within 2 hours (1 hour if it is above 90°F). Foodservice process cooling: FDA Food Code 2022 cools TCS food from 135°F to 70°F in 2 hours, then to 41°F in 4 more hours.",
  explanation: "Do not average those processes. Use the leftover sit-time for food left out; use two-stage cooling for a kitchen that adopted the Food Code. Chef Gringo has not fetched your local health department’s adopted code.",
  evidence: [],
  confidence: "high",
  assumptions: ["U.S. rules unless you named another jurisdiction."],
};

const ALLERGEN: DeterministicAnswer = {
  answer: "Prevent allergen cross-contact by keeping the allergen out of the dish: separate utensils and boards, wash, and label. FDA names nine major allergens, including sesame.",
  explanation: "This is operational control, not a diagnosis or an epinephrine plan. If someone is reacting, that is medical care, not a kitchen trick.",
  evidence: [],
  confidence: "high",
  assumptions: [],
};

const SANITIZE: DeterministicAnswer = {
  answer: "Cleaning removes soil. Sanitizing is a second step that reduces pathogens on a surface that is already clean. Wiping sanitizer over grease does not sanitize.",
  explanation: "Use the sanitizer label and the food code your kitchen adopted for concentration and contact time. This excerpt is not a chemical recipe.",
  evidence: [],
  confidence: "high",
  assumptions: [],
};

const COTTAGE: DeterministicAnswer = {
  answer: "If she is in Florida, cottage food is an FDACS program — not a DBPR restaurant license. She still has to follow that program’s product and labeling limits, and selling usually means checking Florida Department of Revenue sales-tax registration. Sarasota County specifics are not on file.",
  explanation: "A good cake is not a license. Confirm current FDACS cottage-food limits on the official page before selling. This names agencies; it is not a permit.",
  evidence: [],
  confidence: "medium",
  assumptions: ["Florida home kitchen unless you named another state."],
};

const IDDSI5: DeterministicAnswer = {
  answer: "IDDSI Level 5 is minced and moist: soft, moist pieces, no separate thin liquid. For adults the particle size is no larger than 4 mm. That is the official IDDSI name, not a swallowing order.",
  explanation: "Texture modification for dysphagia belongs to the care team. Chef Gringo will not prescribe a diet.",
  evidence: [],
  confidence: "high",
  assumptions: [],
};

const FOOD_COST: DeterministicAnswer = {
  answer: "Food-cost percentage is food cost of goods sold divided by food sales for the same period. Cost per serving is the recipe’s ingredient cost divided by portions yielded. Chef Gringo does not have a current industry-average percentage on file.",
  explanation: "Use your invoices and your sales. Invented ‘typical 28–32%’ benchmarks are not evidence.",
  evidence: [],
  confidence: "high",
  assumptions: [],
};

const YIELD: DeterministicAnswer = {
  answer: "Edible-portion yield is edible portion weight divided by as-purchased weight. Recipe scaling multiplies ingredients by new servings over original servings; it does not change yield.",
  explanation: "Trim, cook loss, and peeling change EP. If you do not have those weights, the yield is unknown — not 100%.",
  evidence: [],
  confidence: "high",
  assumptions: [],
};

const FREEZER: DeterministicAnswer = {
  answer: "A freezer at 49°F is not holding frozen food safely. Do not reset and hope. Move remaining food if it is still frozen hard, stop using the box for potentially hazardous food, and get qualified service. Chef Gringo will not walk you through bypassing a safety device or working live.",
  explanation: "OSHA treats restaurant electrical and equipment faults as workplace hazards. Confirm the exact model before replacing a commercial refrigerator: voltage, footprint, door swing, and local service.",
  evidence: [],
  confidence: "high",
  assumptions: ["49°F is a measured box temperature, not a setpoint you meant to be 0°F."],
};

const GROUND_BEEF: DeterministicAnswer = {
  answer: "In the United States, cook ground beef to 160°F / 71°C as measured with a food thermometer. That is USDA FSIS minimum internal-temperature guidance on file, not a live lookup of today’s chart.",
  explanation: "Color is not a reliable doneness test. If you are outside the U.S., use the authority that regulates the kitchen you are in. Chef Gringo has not fetched the live FSIS page for this answer.",
  evidence: [],
  confidence: "high",
  assumptions: ["U.S. retail or foodservice cooking unless you said otherwise."],
};

const FLORIDA_LICENSE: DeterministicAnswer = {
  answer: "In Florida, public food service establishments are licensed through the Division of Hotels and Restaurants at the Department of Business and Professional Regulation. That names the agency. It is not a permit, a fee schedule, or a county exemption.",
  explanation: "Cottage-food and home-based rules are different from a restaurant license. Chef Gringo has the official landing page on file and has not retrieved current statute text for your county.",
  evidence: [],
  confidence: "medium",
  assumptions: ["You asked which Florida agency handles food-service licensing, not for a complete legal filing."],
};

const THERMAPEN_ONE: DeterministicAnswer = {
  answer: "ThermoWorks states the Thermapen ONE response time as 1 second for that exact model. That figure comes from the Chef Gringo catalog record of the manufacturer page — not a live fetch, and not a substitute for checking the current spec sheet if you are buying today.",
  explanation: "Do not apply Thermapen ONE numbers to ThermoPop or other models. Current street price and stock are not on file.",
  evidence: [],
  confidence: "high",
  assumptions: ["You mean ThermoWorks Thermapen ONE, not a similar pocket thermometer."],
};

export function deterministicAnswerFor(question: string, intent: AssistantIntent): DeterministicAnswer | null {
  for (const entry of DEFINITIONS) {
    if (entry.match.test(question)) return entry.value;
  }

  if (/\b(ground beef|hamburger)\b/i.test(question) && /\b(temp|temperature|160|safe)\b/i.test(question)) {
    return GROUND_BEEF;
  }
  if (/\bthaw\b/i.test(question) && /\b(counter|meat|chicken|poultry|fish|defrost)\b/i.test(question)) return THAW;
  if (/\b(cool(?:ing|ed)?|danger zone|how quickly)\b/i.test(question) && /\b(food|leftover|cooked|135|2 hours)\b/i.test(question)) return COOLING;
  if (/\ballergen|cross-contact\b/i.test(question)) return ALLERGEN;
  if (/\b(cleaning|sanitiz)\b/i.test(question) && /\b(sanitiz|clean(?:ing)? vs|difference)\b/i.test(question)) return SANITIZE;
  if (/\bflorida\b/i.test(question) && /licen|dbpr|permit|restaurant/i.test(question)) {
    return FLORIDA_LICENSE;
  }
  if (/\bsarasota\b/i.test(question)) return COTTAGE;
  if (/\b(cottage food|sell baked|sell cakes|from (her |the |my )?((florida|home) )?kitchen|mom bakes|home kitchen)\b/i.test(question)) return COTTAGE;
  if (/\biddsi level 5\b/i.test(question)) return IDDSI5;
  if (/\b(food cost per serving|food-cost percentage|how (do i|is) food cost)\b/i.test(question)) return FOOD_COST;
  if (/\b(edible.?portion|ep yield)\b/i.test(question)) return YIELD;
  if (/\bfreezer\b/i.test(question) && /\b49\b/.test(question)) return FREEZER;
  if (/\bthermapen one\b/i.test(question) && /\b(response|spec|accurate|accuracy|time|fast)\b/i.test(question)) {
    return THERMAPEN_ONE;
  }
  if (/\breplac(?:e|ing) a commercial refrigerat/i.test(question)) {
    return {
      answer: "Before replacing a commercial refrigerator, confirm the exact model, voltage, footprint and door swing, drainage, and whether local service can support the replacement. A similar cabinet is not the same model. This is operations practice plus catalog caution, not a live bid.",
      evidence: [],
      confidence: "medium",
      assumptions: [],
    };
  }

  if (intent === "recipe_help" && /marinara/i.test(question)) {
    return {
      answer: "Start with good canned tomatoes, olive oil, garlic, and salt. Warm the oil, soften the garlic without browning it, add tomatoes, and simmer until the raw edge is gone — usually 20 to 40 minutes. Finish with basil if you have it.",
      explanation: "That is a working marinara, not a restaurant secret. If you want it richer, longer and a rind of hard cheese. If you want it brighter, less time and a splash of the tomato packing juice. I have not tested a specific brand of tomato for you.",
      evidence: [{ kind: "practice", label: "Standard culinary practice — not a live source check", authorityLabel: "professional practice" }],
      confidence: "medium",
      assumptions: ["Stovetop, home or small-batch, no dietary restriction stated."],
    };
  }

  return null;
}

export function missingEvidenceLanguage(intent: AssistantIntent) {
  if (intent === "marketplace_comparison" || intent === "equipment_selection") {
    return "Chef Gringo has not run a live product investigation for this question. What follows is professional judgment plus any catalog records already on file.";
  }
  return "I do not have a live cited source for this — I am giving you standard kitchen practice and professional judgment.";
}
