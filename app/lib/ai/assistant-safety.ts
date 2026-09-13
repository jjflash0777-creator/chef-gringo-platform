import type { AssistantIntent, AssistantRequest, AssistantSafety } from "./assistant-contract.ts";
import { joinedText } from "./assistant-intents.ts";

/**
 * Contextual safety notes. These annotate an answer; they do not replace one.
 * Unqualified readers are never told to bypass safety devices, work live
 * electrical, defeat gas controls, or serve food that cannot be established as safe.
 */

const BANNED_GUIDANCE = /\b(bypass|defeat|jumper|hot-wire|work live|remove the (guard|safety)|disable the (limit|high[- ]limit|gas valve))\b/i;

export function safetyFor(intent: AssistantIntent, request: AssistantRequest, draftAnswer = ""): AssistantSafety | null {
  const text = `${joinedText(request)}\n${draftAnswer}`;

  if (/\b(iddsi|dysphagia|choking|thickened liquid|puree diet)\b/i.test(text)) {
    return {
      level: "escalate",
      topic: "choking/dysphagia",
      text: "Texture-modified diets and choking risk need a qualified clinician. Chef Gringo can talk technique and equipment, not prescribe an IDDSI level or a medical diet.",
    };
  }

  if (/\b(therapeutic|renal|diabetic diet|medical diet|tube feed|clinical nutrition)\b/i.test(text)) {
    return {
      level: "escalate",
      topic: "therapeutic/medical diets",
      text: "Medical and therapeutic diets need a qualified clinician. This is culinary context, not treatment.",
    };
  }

  if (/\b(allergen|allergy|anaphylax|gluten|nut[- ]free|shellfish)\b/i.test(text)) {
    return {
      level: "escalate",
      topic: "allergens",
      text: "Allergen control is an operations and labeling problem. If someone can have a reaction, do not guess — use verified ingredients and a process you can defend.",
    };
  }

  if (intent === "food_safety" || /\b(chicken|left out|danger zone|food.?borne)\b/i.test(text)) {
    return {
      level: "note",
      topic: "foodborne-illness risk",
      text: "When time and temperature are unknown, treat the food as unsafe to serve. Do not taste your way to a decision.",
    };
  }

  if (/\b(gas (valve|line|leak)|electrical|live wire|breaker|refrigerant|ammonia|chemical|sanitizer|oven cleaner)\b/i.test(text) || intent === "equipment_troubleshooting") {
    if (BANNED_GUIDANCE.test(text)) {
      return {
        level: "escalate",
        topic: "gas/electrical/refrigeration hazards",
        text: "Stop. Do not bypass safety devices, work on live electrical equipment, or defeat gas controls. Shut it down safely and call a qualified technician.",
      };
    }
    return {
      level: "note",
      topic: "gas/electrical/refrigeration hazards",
      text: "Stay at observation and shut-down. Anything behind a panel, on a live circuit, on a gas valve, or involving refrigerant belongs to a qualified technician.",
    };
  }

  if (intent === "business_startup" || /\b(license|permit|cottage food|health department|llc|insurance)\b/i.test(text)) {
    return {
      level: "note",
      topic: "legal/licensing questions",
      text: "Licensing, cottage-food rules, and health permits are local. Chef Gringo can name the questions; a regulator or licensed advisor has to answer them for your place.",
    };
  }

  if (intent === "food_cost_labor" || /\b(loan|investor|payroll tax|tip credit)\b/i.test(text)) {
    return {
      level: "note",
      topic: "financial or regulatory decisions",
      text: "Cost math here is operational, not financial, tax, or legal advice.",
    };
  }

  return null;
}

export function refuseUnsafeInstruction(answer: string) {
  if (!BANNED_GUIDANCE.test(answer)) return answer;
  return "I will not walk you through bypassing a safety device, working live electrical, or defeating a gas control. Shut the equipment down, keep the area safe, and get a qualified technician in.";
}
