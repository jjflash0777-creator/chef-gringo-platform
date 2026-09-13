/**
 * Domain-aware culinary source hierarchy.
 * Blogs, videos, forums, affiliate pages, AI-generated pages, and retailer copy
 * may be leads. They must not silently become high-authority evidence.
 */

export const AUTHORITY_TIERS = [1, 2, 3] as const;
export type AuthorityTier = typeof AUTHORITY_TIERS[number];

export const CULINARY_DOMAINS = [
  "food_safety_public_health",
  "nutrition_therapeutic_diets",
  "equipment",
  "culinary_technique",
  "business_licensing",
  "commercial_claims",
] as const;
export type CulinaryDomain = typeof CULINARY_DOMAINS[number];

export const LEAD_ONLY_SOURCE_CLASSES = [
  "blog",
  "video",
  "forum",
  "affiliate_page",
  "ai_generated_page",
  "retailer_copy",
  "seller_listing",
] as const;

export type SourcePolicyBand = {
  domain: CulinaryDomain;
  preferredAuthorities: string[];
  notes: string;
};

export const SOURCE_HIERARCHY: SourcePolicyBand[] = [
  {
    domain: "food_safety_public_health",
    preferredAuthorities: [
      "U.S. Food and Drug Administration",
      "USDA Food Safety and Inspection Service",
      "Centers for Disease Control and Prevention",
      "state health departments",
      "recognized public-health authorities",
    ],
    notes: "Thresholds and outbreak guidance require primary public-health sources. Kitchen practice does not outrank them.",
  },
  {
    domain: "nutrition_therapeutic_diets",
    preferredAuthorities: [
      "USDA",
      "National Institutes of Health",
      "U.S. Food and Drug Administration",
      "peer-reviewed literature",
      "professional clinical organizations",
      "qualified healthcare guidance",
    ],
    notes: "Therapeutic diets stay clinician-owned. Culinary help is workflow, not a prescription.",
  },
  {
    domain: "equipment",
    preferredAuthorities: [
      "exact manufacturer manuals",
      "certification listings",
      "regulatory documentation",
      "service manuals",
      "reputable distributors for clearly labeled commercial facts",
    ],
    notes: "Exact model coverage is required. Similar models and seller compatibility claims are leads only.",
  },
  {
    domain: "culinary_technique",
    preferredAuthorities: [
      "primary culinary references",
      "recognized educational institutions",
      "established professional practice",
      "clearly labeled Chef Gringo professional judgment",
    ],
    notes: "Ordinary technique may be answered from practice without pretending a live source check occurred.",
  },
  {
    domain: "business_licensing",
    preferredAuthorities: [
      "federal primary sources",
      "state primary sources",
      "county and municipal primary sources",
      "official tax and licensing agencies",
      "current statutes or rules where practical",
    ],
    notes: "A landing page is identity, not a complete legal answer. Local rules still need the operator’s jurisdiction.",
  },
  {
    domain: "commercial_claims",
    preferredAuthorities: [
      "official program terms",
      "merchant documentation",
      "independently verified product information",
    ],
    notes: "Pending affiliate programs are not live affiliates. Catalog matching is not a product test.",
  },
];

export function compareAuthorityTier(left: AuthorityTier, right: AuthorityTier) {
  return left - right;
}

export function isLeadOnlySourceClass(value: string) {
  return (LEAD_ONLY_SOURCE_CLASSES as readonly string[]).includes(value);
}

export function policyFor(domain: CulinaryDomain) {
  return SOURCE_HIERARCHY.find((band) => band.domain === domain) ?? SOURCE_HIERARCHY[3];
}
