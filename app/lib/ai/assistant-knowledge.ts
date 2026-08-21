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
      evidence: [{ kind: "practice", label: "Standard culinary practice — not a live source check" }],
      confidence: "high",
      assumptions: ["You mean the French aromatic base, not a branded mix."],
    },
  },
  {
    match: /\broux\b/i,
    value: {
      answer: "A roux is equal parts fat and flour cooked together to thicken a sauce. How dark you take it changes flavor and thickening power — paler thickens more, darker tastes nuttier and thickens less.",
      evidence: [{ kind: "practice", label: "Standard culinary practice — not a live source check" }],
      confidence: "high",
      assumptions: [],
    },
  },
];

export function deterministicAnswerFor(question: string, intent: AssistantIntent): DeterministicAnswer | null {
  for (const entry of DEFINITIONS) {
    if (entry.match.test(question)) return entry.value;
  }

  if (intent === "recipe_help" && /marinara/i.test(question)) {
    return {
      answer: "Start with good canned tomatoes, olive oil, garlic, and salt. Warm the oil, soften the garlic without browning it, add tomatoes, and simmer until the raw edge is gone — usually 20 to 40 minutes. Finish with basil if you have it.",
      explanation: "That is a working marinara, not a restaurant secret. If you want it richer, longer and a rind of hard cheese. If you want it brighter, less time and a splash of the tomato packing juice. I have not tested a specific brand of tomato for you.",
      evidence: [{ kind: "practice", label: "Standard culinary practice — not a live source check" }],
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
