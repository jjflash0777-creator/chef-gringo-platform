import type { ProductRecord, WorkflowId } from "./catalog.ts";
import { purchaseLink, type CommercialLinkKind } from "./commercial-links.ts";

/**
 * Structured marketplace metadata.
 *
 * Every field here is DERIVED from data already stored on the product record.
 * Nothing is invented. Where the catalogue does not support a claim the value
 * is `unknown` (we have not established it) or `not-applicable` (the question
 * does not apply), and those two are deliberately not interchangeable.
 *
 * Adding a field here is only legitimate if an existing stored field can
 * justify it. If it cannot, the honest answer is `unknown`.
 */

export const MARKETPLACE_CATEGORIES = [
  "equipment",
  "food-and-ingredients",
  "software-and-operations",
  "food-safety-and-compliance",
  "business-startup",
  "home-growing",
] as const;
export type MarketplaceCategory = typeof MARKETPLACE_CATEGORIES[number];

export const AUDIENCES = [
  "home-cook",
  "restaurant",
  "food-truck",
  "caterer",
  "cafe-bakery",
  "healthcare-senior-dining",
  "caregiver",
  "institutional",
] as const;
export type Audience = typeof AUDIENCES[number];

/**
 * Food-truck is a real audience the product should serve, but no catalog
 * environment string maps to it. Offering it as a live filter would show an
 * empty result that looks like a data error. The Equip a food truck goal uses
 * mobile/outdoor notes instead, with a caveat.
 */
export const FILTER_AUDIENCES = AUDIENCES.filter((value) => value !== "food-truck");
export const FOOD_TRUCK_FILTER_NOTE =
  "No product is tagged as food-truck-specific. Use Equip a food truck, which searches records noted for mobile or outdoor service — inferred from catering notes, not vehicle fit.";

export const OPERATING_ENVIRONMENTS = [
  "home-kitchen",
  "commercial-kitchen",
  "senior-living",
  "healthcare",
  "institutional",
  "mobile-or-outdoor",
] as const;
export type OperatingEnvironment = typeof OPERATING_ENVIRONMENTS[number];

/** How well we know what this costs. `unknown` is a real answer, not a gap to paper over. */
export const PRICE_AVAILABILITY = ["observed", "range", "quote-required", "unknown"] as const;
export type PriceAvailability = typeof PRICE_AVAILABILITY[number];

export const EVIDENCE_STATUS = ["verified", "provisional", "unknown"] as const;
export type EvidenceStatus = typeof EVIDENCE_STATUS[number];

export const RECOMMENDATION_STATUS = ["publication-ready", "needs-verification", "discovery"] as const;
export type RecommendationStatus = typeof RECOMMENDATION_STATUS[number];

/** No product currently carries a reuse grant, so every record resolves to `unavailable`. */
export const IMAGE_STATUS = ["licensed", "reference-only", "unavailable"] as const;
export type ImageStatus = typeof IMAGE_STATUS[number];

export const BUSINESS_STAGES = ["planning", "opening", "operating", "scaling", "unknown"] as const;
export type BusinessStage = typeof BUSINESS_STAGES[number];

export type ProductFacets = {
  id: string;
  category: MarketplaceCategory;
  subcategory: string;
  audience: Audience[];
  problemSolved: string;
  businessStage: BusinessStage;
  operatingEnvironment: OperatingEnvironment[];
  priceAvailability: PriceAvailability;
  commercialLinkStatus: CommercialLinkKind;
  evidenceStatus: EvidenceStatus;
  recommendationStatus: RecommendationStatus;
  imageStatus: ImageStatus;
};

/**
 * Workflow -> primary category. Each of the 13 research workflows maps to
 * exactly one shelf. Software is the only non-equipment shelf the catalogue
 * actually stocks; see CATEGORY_DEFINITIONS for the ones that are empty.
 */
const WORKFLOW_CATEGORY: Record<WorkflowId, MarketplaceCategory> = {
  "better-thermometer": "food-safety-and-compliance",
  "memory-care-dining": "equipment",
  "immersion-blender": "equipment",
  "coffee-setup": "equipment",
  "adaptive-dining": "equipment",
  "commercial-mixer": "equipment",
  smallwares: "equipment",
  "repair-maintenance": "equipment",
  "countertop-equipment": "equipment",
  "high-aov-equipment": "equipment",
  "operator-software": "software-and-operations",
  "senior-healthcare": "equipment",
  "manufacturer-direct": "equipment",
};

/**
 * Products whose own category text shows they exist to enforce food safety,
 * regardless of which research workflow found them.
 */
const FOOD_SAFETY_CATEGORY = /thermometer|sanitation|food labeling|cutting board|temperature|hand sink|warewash|dishwash/i;

const ENVIRONMENT_AUDIENCE: Record<string, Audience[]> = {
  home: ["home-cook"],
  caregiver: ["caregiver"],
  "supportive dining": ["caregiver", "healthcare-senior-dining"],
  restaurant: ["restaurant"],
  "commercial foodservice": ["restaurant"],
  hospitality: ["restaurant"],
  catering: ["caterer"],
  café: ["cafe-bakery"],
  bakery: ["cafe-bakery"],
  "senior living": ["healthcare-senior-dining"],
  healthcare: ["healthcare-senior-dining"],
  institutional: ["institutional"],
};

const ENVIRONMENT_SETTING: Record<string, OperatingEnvironment[]> = {
  home: ["home-kitchen"],
  caregiver: ["home-kitchen"],
  "supportive dining": ["senior-living"],
  restaurant: ["commercial-kitchen"],
  "commercial foodservice": ["commercial-kitchen"],
  hospitality: ["commercial-kitchen"],
  catering: ["commercial-kitchen", "mobile-or-outdoor"],
  café: ["commercial-kitchen"],
  bakery: ["commercial-kitchen"],
  "senior living": ["senior-living"],
  healthcare: ["healthcare"],
  institutional: ["institutional"],
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function priceAvailabilityOf(product: ProductRecord): PriceAvailability {
  const context = product.price.context;
  if (/quote required|must be checked|inquiry/i.test(context)) return "quote-required";
  if (/varies/i.test(context)) return "unknown";
  if (/\$[\d,]+\s*[–-]\s*\$?[\d,]+/u.test(context)) return "range";
  if (/\$[\d,]+/.test(context)) return "observed";
  return "unknown";
}

export function evidenceStatusOf(product: ProductRecord): EvidenceStatus {
  // "Verified" requires both a strong source and a completed publication review.
  if (product.evidenceStrength === "strong" && product.publication?.status === "publication_ready") return "verified";
  if (product.evidenceStrength === "strong" || product.publication?.status === "publication_ready") return "provisional";
  return "unknown";
}

export function recommendationStatusOf(product: ProductRecord): RecommendationStatus {
  if (product.publication?.status === "publication_ready") return "publication-ready";
  if (product.publication?.status === "verify") return "needs-verification";
  return "discovery";
}

export function imageStatusOf(product: ProductRecord): ImageStatus {
  if (product.image.licensing === "authorized" || product.image.licensing === "licensed") return "licensed";
  if (product.image.licensing === "reference-only") return "reference-only";
  return "unavailable";
}

export function categoryOf(product: ProductRecord): MarketplaceCategory {
  if (FOOD_SAFETY_CATEGORY.test(product.category)) return "food-safety-and-compliance";
  return WORKFLOW_CATEGORY[product.workflowId] ?? "equipment";
}

export function facetsFor(product: ProductRecord): ProductFacets {
  const environments = product.environments;
  return {
    id: product.id,
    category: categoryOf(product),
    subcategory: product.category,
    audience: unique(environments.flatMap((value) => ENVIRONMENT_AUDIENCE[value] ?? [])),
    problemSolved: product.editorial.bestFor,
    // Nothing in the catalogue records the maturity of the buying business.
    businessStage: "unknown",
    operatingEnvironment: unique(environments.flatMap((value) => ENVIRONMENT_SETTING[value] ?? [])),
    priceAvailability: priceAvailabilityOf(product),
    commercialLinkStatus: purchaseLink(product).kind,
    evidenceStatus: evidenceStatusOf(product),
    recommendationStatus: recommendationStatusOf(product),
    imageStatus: imageStatusOf(product),
  };
}

// --- Reader-facing labels. Raw enum values must never reach the page. -------

export const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  equipment: "Equipment",
  "food-and-ingredients": "Food and ingredients",
  "software-and-operations": "Software and operations",
  "food-safety-and-compliance": "Food safety and compliance",
  "business-startup": "Business startup",
  "home-growing": "Home growing and self-sufficiency",
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  "home-cook": "Home cook",
  restaurant: "Restaurant",
  "food-truck": "Food truck",
  caterer: "Caterer",
  "cafe-bakery": "Café or bakery",
  "healthcare-senior-dining": "Healthcare and senior dining",
  caregiver: "Caregiver",
  institutional: "Institutional kitchen",
};

export const ENVIRONMENT_LABELS: Record<OperatingEnvironment, string> = {
  "home-kitchen": "Home kitchen",
  "commercial-kitchen": "Commercial kitchen",
  "senior-living": "Senior living",
  healthcare: "Healthcare",
  institutional: "Institutional",
  "mobile-or-outdoor": "Mobile or outdoor",
};

export const PRICE_LABELS: Record<PriceAvailability, string> = {
  observed: "Observed price",
  range: "Observed range",
  "quote-required": "Quote required",
  unknown: "Price not established",
};

export const EVIDENCE_LABELS: Record<EvidenceStatus, string> = {
  verified: "Verified",
  provisional: "Provisional",
  unknown: "Not yet verified",
};

export const RECOMMENDATION_LABELS: Record<RecommendationStatus, string> = {
  "publication-ready": "Publication ready",
  "needs-verification": "Needs verification",
  discovery: "Discovery",
};

export const COMMERCIAL_LABELS: Record<CommercialLinkKind, string> = {
  affiliate: "Affiliate link",
  pending: "No active relationship",
  direct: "No commercial relationship",
  informational: "Reference only",
  unavailable: "No verified destination",
};
