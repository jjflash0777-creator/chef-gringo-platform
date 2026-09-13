export type HomepageIntent = "equipment" | "software" | "repair" | "cost" | "growth" | "learning" | "unknown";
export type HomepageIntakeState = "follow_up" | "unsupported" | "handoff";

export type HomepageIntakeResult = {
  state: HomepageIntakeState;
  intent: HomepageIntent;
  heading: string;
  message: string;
  href?: string;
  actionLabel?: string;
};

export const homepageIntentPrompts = [
  { label: "Find equipment", value: "I need help finding equipment for my operation." },
  { label: "Compare software", value: "I want to compare software for my operation." },
  { label: "Check a repair", value: "I need to decide whether to repair or replace a piece of equipment." },
  { label: "Lower a cost", value: "I need to lower an operating cost." },
  { label: "Grow the business", value: "I need help bringing more customers into the business." },
] as const;

function hasUsefulDetail(request: string) {
  return request.trim().split(/\s+/).length >= 9;
}

export function evaluateHomepageRequest(rawRequest: string): HomepageIntakeResult {
  const request = rawRequest.trim();
  const normalized = request.toLowerCase();

  if (/repair|broken|fix|stopped|won't|not working|replace/.test(normalized)) {
    if (!hasUsefulDetail(request)) return {
      state: "follow_up",
      intent: "repair",
      heading: "One more detail will help",
      message: "What equipment is it, and what happens when you try to use it?",
    };
    return {
      state: "handoff",
      intent: "repair",
      heading: "Here’s what I’d look at",
      message: "Start by comparing the repair path with replacement options. Cost, downtime, parts, service access, and remaining useful life still need verification.",
      href: "/marketplace",
      actionLabel: "Compare the available routes",
    };
  }

  if (/software|pos\b|payroll|scheduling|reservation|merchant service|payment processing/.test(normalized)) {
    if (!hasUsefulDetail(request)) return {
      state: "follow_up",
      intent: "software",
      heading: "One more detail will help",
      message: "Which system are you evaluating, what does it cost now, and what problem must the replacement solve?",
    };
    return {
      state: "unsupported",
      intent: "software",
      heading: "This still needs verification",
      message: "Public software comparisons are not active yet. Keep the current quote, contract term, processing assumptions, and required features together so they can be compared honestly.",
    };
  }

  if (/cost|expensive|invoice|overpay|lower|save|spend/.test(normalized)) return {
    state: "follow_up",
    intent: "cost",
    heading: "One more detail will help",
    message: "Which recurring cost, invoice, quote, or contract should we examine first?",
  };

  if (/grow|customer|marketing|sales|revenue|traffic|slow night/.test(normalized)) return {
    state: "handoff",
    intent: "growth",
    heading: "Here’s what I’d look at",
    message: "Start with the offer, who it is for, and the business result that matters. Chef Gringo’s current Growth work shows the operating loop without inventing performance claims.",
    href: "/#grow",
    actionLabel: "See the Growth approach",
  };

  if (/learn|recipe|cook|technique|ingredient|dish|carbonara|culinary/.test(normalized)) return {
    state: "handoff",
    intent: "learning",
    heading: "Here’s what I’d look at",
    message: "The Knowledge prototype can help you explore dishes, ingredients, techniques, equipment questions, and the work around them.",
    href: "/discover",
    actionLabel: "Explore hospitality knowledge",
  };

  if (/buy|equipment|machine|mixer|refriger|freezer|oven|blender|brewer|grinder/.test(normalized)) {
    if (!hasUsefulDetail(request)) return {
      state: "follow_up",
      intent: "equipment",
      heading: "One more detail will help",
      message: "What job must it do, at what capacity, in which operating environment, and within what budget?",
    };
    return {
      state: "handoff",
      intent: "equipment",
      heading: "Here’s what I’d look at",
      message: "Compare options by the work they must do, operating fit, evidence quality, serviceability, and total cost—not marketing claims.",
      href: "/marketplace",
      actionLabel: "Open the Marketplace",
    };
  }

  return {
    state: "follow_up",
    intent: "unknown",
    heading: "One more detail will help",
    message: "Are you trying to buy something, fix something, lower a cost, learn a technique, or grow the business?",
  };
}
