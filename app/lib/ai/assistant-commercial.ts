import { marketplaceCatalog } from "../../marketplace/catalog.ts";
import { purchaseLink } from "../../marketplace/commercial-links.ts";
import { facetsOf } from "../../marketplace/query.ts";
import { detectCommercialIntent } from "./commercialIntelligence.ts";
import type { AssistantCommercialBlock, AssistantIntent } from "./assistant-contract.ts";

const COMMERCIAL_INTENTS = new Set<AssistantIntent>([
  "equipment_selection",
  "marketplace_comparison",
  "equipment_troubleshooting",
  "software_operations",
  "sourcing",
]);

/**
 * Commercial suggestions are a separate block. Ranking stays editorial
 * (workflow fit, evidence). Pending programs are never treated as affiliate
 * and are never sorted ahead of others for commission.
 */
export function commercialBlockFor(question: string, intent: AssistantIntent): AssistantCommercialBlock | null {
  if (!COMMERCIAL_INTENTS.has(intent)) return null;
  const detected = detectCommercialIntent(question);
  if (!detected.commercialEligible || !detected.workflowId) return null;

  const routes = marketplaceCatalog.products
    .filter((product) => product.workflowId === detected.workflowId)
    .slice()
    .sort((left, right) => right.scores.workflowFit - left.scores.workflowFit || right.scores.evidenceQuality - left.scores.evidenceQuality)
    .slice(0, 3)
    .map((product) => {
      const link = purchaseLink(product);
      const evidence = product.evidence[0];
      return {
        productId: product.id,
        name: product.name,
        manufacturer: product.manufacturer,
        bestFor: product.editorial.bestFor,
        whySuggested: `${product.editorial.why} Catalog fit ${product.scores.workflowFit}/10; evidence quality ${product.scores.evidenceQuality}/10. ${facetsOf(product).recommendationStatus === "publication-ready" ? "Publication review completed." : "Still in discovery or verification."}`,
        priceContext: product.price.context,
        evidenceLabel: evidence?.label ?? "No source on file",
        evidenceUrl: evidence?.url ?? "",
        commercialKind: link.kind,
        monetized: link.monetized,
        href: link.href,
        rel: link.rel,
        note: link.note,
        workflowId: product.workflowId,
      };
    });

  const disclosureRequired = routes.some((route) => route.monetized);
  return { eligible: routes.length > 0, disclosureRequired, routes };
}
