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
  if (/\bflorida\b/i.test(question) && /licen|dbpr|permit|restaurant/i.test(question)) {
    return FLORIDA_LICENSE;
  }
  if (/\bthermapen one\b/i.test(question) && /\b(response|spec|accurate|accuracy|time)\b/i.test(question)) {
    return THERMAPEN_ONE;
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
