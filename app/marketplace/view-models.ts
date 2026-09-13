import type { ProductRecord } from "./catalog";
import { purchaseLink } from "./commercial-links.ts";

export type MarketplaceIntent = "emergency" | "repair" | "replacement" | "new_purchase" | "budget" | "factory_direct" | "upgrade" | "unknown";
export type ProductMedia = { kind: "primary" | "alternate" | "manufacturer" | "in_use" | "detail" | "installation" | "video"; url: string | null; sourceUrl: string; sourceLabel: string; rights: "authorized" | "licensed" | "reference_only" | "unknown"; alt: string };
export type PricePresentation = { label: string; value: string; basis: "observed" | "estimated" | "unknown"; basisLabel: string; verifiedAt: string; unknownCosts: string[] };

/**
 * `basis` stays a machine value; `basisLabel` is the only thing a reader sees.
 * An unpriced record says what to do about it rather than exposing "unknown",
 * and it only invites someone to go check when there is somewhere to go.
 */
export function priceBasisLabel(basis: PricePresentation["basis"], destinationExists: boolean) {
  if (basis === "observed") return "Observed price";
  if (basis === "estimated") return "Estimated price";
  return destinationExists ? "Check current price" : "Price unavailable";
}

export function productCardViewModel(product: ProductRecord) {
  const basis: PricePresentation["basis"] = /quote required|must be checked|varies|inquiry/i.test(product.price.context) ? "unknown" : /estimated/i.test(product.price.context) ? "estimated" : "observed";
  const purchase = purchaseLink(product);
  return { ...product, recommendation: product.editorial.badge, attributes: product.editorial.strengths.slice(0, 3), purchase, media: { kind: "primary" as const, url: null, sourceUrl: product.image.referenceUrl, sourceLabel: product.image.provenance, rights: "reference_only" as const, alt: `${product.name} product image` }, pricePresentation: { label: basis === "unknown" ? "Price context" : /–|-/u.test(product.price.context) ? "Typical observed range" : "Best verified price", value: product.price.context, basis, basisLabel: priceBasisLabel(basis, purchase.href !== null), verifiedAt: product.price.checked, unknownCosts: ["Shipping", "Installation", "Taxes and final delivered cost"] } };
}

export function merchandisingLabel(product: ProductRecord) {
  if (/best overall/i.test(product.editorial.badge)) return "Chef Gringo's pick";
  if (/best value|low-cost|budget/i.test(product.editorial.badge)) return "Best bang for your buck";
  return null;
}
