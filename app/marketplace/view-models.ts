import type { ProductRecord } from "./catalog";

export type MarketplaceIntent = "emergency" | "repair" | "replacement" | "new_purchase" | "budget" | "factory_direct" | "upgrade" | "unknown";
export type ProductMedia = { kind: "primary" | "alternate" | "manufacturer" | "in_use" | "detail" | "installation" | "video"; url: string | null; sourceUrl: string; sourceLabel: string; rights: "authorized" | "licensed" | "reference_only" | "unknown"; alt: string };
export type PricePresentation = { label: string; value: string; basis: "observed" | "estimated" | "unknown"; verifiedAt: string; unknownCosts: string[] };

export function productCardViewModel(product: ProductRecord) {
  const basis: PricePresentation["basis"] = /quote required|must be checked|varies|inquiry/i.test(product.price.context) ? "unknown" : /estimated/i.test(product.price.context) ? "estimated" : "observed";
  return { ...product, recommendation: product.editorial.badge, attributes: product.editorial.strengths.slice(0, 3), media: { kind: "primary" as const, url: null, sourceUrl: product.image.referenceUrl, sourceLabel: product.image.provenance, rights: "reference_only" as const, alt: `${product.name} product image` }, pricePresentation: { label: basis === "unknown" ? "Price context" : /–|-/u.test(product.price.context) ? "Typical observed range" : "Best verified price", value: product.price.context, basis, verifiedAt: product.price.checked, unknownCosts: ["Shipping", "Installation", "Taxes and final delivered cost"] } };
}

export function merchandisingLabel(product: ProductRecord) {
  if (/best overall/i.test(product.editorial.badge)) return "Chef Gringo's pick";
  if (/best value|low-cost|budget/i.test(product.editorial.badge)) return "Best bang for your buck";
  return null;
}
