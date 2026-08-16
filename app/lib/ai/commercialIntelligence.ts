import { productsForWorkflow, type ProductRecord, type WorkflowId } from "../../marketplace/catalog.ts";

export const COMMERCIAL_INTENT_KINDS = ["none", "research", "compare", "repair", "replace", "buy", "source"] as const;
export type CommercialIntentKind = typeof COMMERCIAL_INTENT_KINDS[number];

export type CommercialIntent = {
  kind: CommercialIntentKind;
  confidence: "low" | "moderate" | "high";
  workflowId: WorkflowId | null;
  reasons: string[];
  commercialEligible: boolean;
};

export type EvidenceBackedProductRoute = {
  id: string;
  productId: string;
  recommendationId: string;
  workflowId: WorkflowId;
  name: string;
  manufacturer: string;
  bestFor: string;
  why: string;
  priceContext: string;
  merchantName: string;
  merchantUrl: string;
  evidenceLabel: string;
  evidenceUrl: string;
  evidenceCheckedAt: string;
  evidenceStrength: ProductRecord["evidenceStrength"];
  unresolvedQuestions: string[];
  affiliateStatus: ProductRecord["affiliate"]["status"];
  disclosure: string;
};

export type CommercialIntelligence = {
  version: 1;
  intent: CommercialIntent;
  routes: EvidenceBackedProductRoute[];
};

const workflowSignals: Array<{ workflowId: WorkflowId; pattern: RegExp }> = [
  { workflowId: "better-thermometer", pattern: /\b(thermometer|thermapen|temperature probe)\b/i },
  { workflowId: "immersion-blender", pattern: /\b(immersion|stick|hand) blender\b/i },
  { workflowId: "commercial-mixer", pattern: /\b(mixers?|planetary|hobart|dough machine)\b/i },
  { workflowId: "coffee-setup", pattern: /\b(coffee|brewer|grinder|airpot)\b/i },
  { workflowId: "adaptive-dining", pattern: /\b(adaptive|weighted|bendable|non-slip|two-handled).{0,24}(utensil|plate|mat|cup|mug)|\b(adaptive dining)\b/i },
  { workflowId: "operator-software", pattern: /\b(pos|point of sale|food cost software|inventory software|restaurant software)\b/i },
  { workflowId: "repair-maintenance", pattern: /\b(repair|broken|not working|won't (?:run|start|cool|heat)|service technician|replacement part)\b/i },
  { workflowId: "countertop-equipment", pattern: /\b(countertop|toaster|microwave|induction|food processor)\b/i },
  { workflowId: "high-aov-equipment", pattern: /\b(refrigerator|freezer|ice machine|dishwasher|range|oven|blast chiller|commercial equipment)\b/i },
  { workflowId: "smallwares", pattern: /\b(knife|cutting board|pan|smallwares|container)\b/i },
  { workflowId: "senior-healthcare", pattern: /\b(iddsi|dysphagia|thickener|texture modified|senior living)\b/i },
];

const kindSignals: Array<{ kind: Exclude<CommercialIntentKind, "none">; pattern: RegExp }> = [
  { kind: "buy", pattern: /\b(buy|purchase|order|checkout|where can i get|shopping for)\b/i },
  { kind: "replace", pattern: /\b(replace|replacement|new one|upgrade)\b/i },
  { kind: "repair", pattern: /\b(repair|fix|broken|not working|diagnos|part)\b/i },
  { kind: "compare", pattern: /\b(compare|versus|vs\.?|best|which (?:one|model|brand)|options)\b/i },
  { kind: "source", pattern: /\b(source|supplier|manufacturer|wholesale|factory direct|vendor)\b/i },
  { kind: "research", pattern: /\b(find|recommend|research|looking for|need a|need an)\b/i },
];

export function detectCommercialIntent(prompt: string): CommercialIntent {
  const workflow = workflowSignals.find((signal) => signal.pattern.test(prompt));
  const kind = kindSignals.find((signal) => signal.pattern.test(prompt));
  if (!workflow || !kind) return { kind: "none", confidence: "low", workflowId: null, reasons: [], commercialEligible: false };
  const direct = /\b(buy|purchase|replace|compare|supplier|vendor|recommend|best|where can i get)\b/i.test(prompt);
  return {
    kind: kind.kind,
    confidence: direct ? "high" : "moderate",
    workflowId: workflow.workflowId,
    reasons: [`${kind.kind} language`, `${workflow.workflowId} subject`],
    commercialEligible: true,
  };
}

function routeFrom(product: ProductRecord): EvidenceBackedProductRoute | null {
  const evidence = product.evidence[0];
  const merchant = product.merchants[0];
  if (product.status !== "published" || !evidence || !merchant) return null;
  return {
    id: `route:${product.workflowId}:${product.id}`,
    productId: product.id,
    recommendationId: `recommendation:${product.id}:${product.workflowId}`,
    workflowId: product.workflowId,
    name: product.name,
    manufacturer: product.manufacturer,
    bestFor: product.editorial.bestFor,
    why: product.editorial.why,
    priceContext: product.price.context,
    merchantName: merchant.name,
    merchantUrl: merchant.url,
    evidenceLabel: evidence.label,
    evidenceUrl: evidence.url,
    evidenceCheckedAt: evidence.checked,
    evidenceStrength: product.evidenceStrength,
    unresolvedQuestions: product.unresolvedQuestions.slice(0, 2),
    affiliateStatus: product.affiliate.status,
    disclosure: "No verified affiliate relationship is claimed for this route. Commercial status did not affect the recommendation score.",
  };
}

export function buildCommercialIntelligence(prompt: string): CommercialIntelligence {
  const intent = detectCommercialIntent(prompt);
  const routes = intent.workflowId
    ? productsForWorkflow(intent.workflowId)
      .slice()
      .sort((left, right) => right.scores.workflowFit - left.scores.workflowFit || right.scores.evidenceQuality - left.scores.evidenceQuality)
      .flatMap((product) => routeFrom(product) ?? [])
      .slice(0, 3)
    : [];
  return { version: 1, intent, routes };
}
