import type { AssistantIntent, AssistantRequest } from "./assistant-contract.ts";
import { isDefinitionalQuestion, joinedText } from "./assistant-intents.ts";

/**
 * Ask one focused follow-up only when the missing information would materially
 * change the answer. Definitional and ordinary cooking questions skip this.
 */

export type ClarificationDecision = {
  needed: boolean;
  question?: string;
};

function present(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

function hasAny(text: string, pattern: RegExp) {
  return pattern.test(text);
}

export function clarificationFor(intent: AssistantIntent, request: AssistantRequest): ClarificationDecision {
  if (isDefinitionalQuestion(request.question)) return { needed: false };

  const text = joinedText(request);
  const followUpAlready = (request.conversation ?? []).some((turn) => turn.role === "assistant");
  if (followUpAlready && (request.conversation ?? []).filter((turn) => turn.role === "user").length >= 2) {
    return { needed: false };
  }

  if (intent === "equipment_selection") {
    if (hasAny(text, /\b(current price|how much|availability|in stock|amazon)\b/i)) {
      return { needed: false };
    }
    if (hasAny(text, /\bthermapen one\b/i) && hasAny(text, /\b(response|spec|accurac|fast|time|manual|stated)\b/i)) {
      return { needed: false };
    }
    const volume = present(request.operatingContext) || hasAny(text, /\b(\d+\s*(covers?|meals?|pax|qt|quart|sheet pans?|home|restaurant|food truck))\b/i);
    const power = hasAny(text, /\b(gas|electric|propane|208|240|induction|phase)\b/i);
    const budget = present(request.budget) || hasAny(text, /\$\s*\d+/);
    const job = hasAny(text, /\b(pizza|bread|roast|bake|retherm|finishing|home kitchen|production)\b/i);
    if ([volume, power, budget, job].filter(Boolean).length >= 2) return { needed: false };
    return {
      needed: true,
      question: "What does it need to do, at what volume, on what power, in what space, and roughly what can you spend?",
    };
  }

  if (intent === "food_safety" && /\b(thaw|defrost|danger zone|cool(?:ing|ed)?|sanitiz|allergen|cross-contact|internal temperature|ground beef)\b/i.test(text) && !/\bleft out|is this .*safe|out a while\b/i.test(text)) {
    return { needed: false };
  }

  if (intent === "food_safety" && /\b(chicken|meat|rice|dairy|left out|is this .*safe)\b/i.test(text)) {
    if (hasAny(text, /\b(safe (minimum )?internal temperature|what temperature|cook(?:ed)? to|160\s*°?\s*f|ground beef)\b/i) && !hasAny(text, /\bleft out|is this .*safe\b/i)) {
      return { needed: false };
    }
    const time = hasAny(text, /\b(\d+\s*(minutes?|hours?|hrs?)|overnight|all day|this morning)\b/i);
    const temp = present(request.operatingContext) || hasAny(text, /\b(\d+\s*°?\s*f|fridge|refrigerat|freezer|counter|danger zone)\b/i);
    if (time && temp) return { needed: false };
    return {
      needed: true,
      question: "How long has it been out, at about what temperature, and how was it stored or handled?",
    };
  }

  if (intent === "business_startup") {
    if (hasAny(text, /\bflorida\b/i) && hasAny(text, /\b(license|permit|dbpr|who licenses|regulat|cottage food|sell baked|from (her |the )?kitchen|from home)\b/i)) {
      return { needed: false };
    }
    const location = present(request.location) || hasAny(text, /\b(state|county|city|california|texas|florida|new york|cottage food)\b/i);
    const product = hasAny(text, /\b(cookie|bread|cake|pie|jam|baked|meal|taco|coffee)\b/i);
    const channel = hasAny(text, /\b(farmers['’]? market|online|wholesale|from home|food truck|storefront)\b/i);
    if (location && product && channel) return { needed: false };
    return {
      needed: true,
      question: "Where would you sell, what are you making, through what channel, and is this a home project or a licensed kitchen?",
    };
  }

  if (intent === "dietary_accommodation" && !present(request.dietaryContext) && !hasAny(text, /\b(celiac|nut|shellfish|iddsi|level \d|texture)\b/i)) {
    return {
      needed: true,
      question: "Which restriction or accommodation matters, and is this home cooking, a restaurant, or care dining?",
    };
  }

  return { needed: false };
}
