import type { ProductRecord } from "../catalog.ts";
import { calculateCommercialOpportunityScore, calculateRecommendationScore } from "./scoring.ts";
import type { CommercialOpportunityComponents, PartnerEntity, ProductIntelligenceRecord } from "./types.ts";

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function entity(id: string, name: string, role: PartnerEntity["roles"][number], url: string, checked: string, confidence: PartnerEntity["confidence"]): PartnerEntity {
  return { id, name, roles: [role], aliases: [], primaryUrl: url, headquartersCountry: null, confidence, verificationStatus: "unverified", lastVerifiedAt: checked };
}

const emptyCommercialComponents: CommercialOpportunityComponents = {
  commissionPotential: null,
  cookieDuration: null,
  recurringRevenue: null,
  averageOrderValue: null,
  directPartnershipPotential: null,
  integrationQuality: null,
};

export function adaptProductToIntelligence(product: ProductRecord): ProductIntelligenceRecord {
  const manufacturerId = `partner:${slug(product.manufacturer)}`;
  const merchant = product.merchants[0];
  const sellerId = `partner:${slug(merchant.name)}`;
  const checked = product.evidence[0]?.checked ?? merchant.checked;
  const partnerEntities = [entity(manufacturerId, product.manufacturer, "manufacturer", product.evidence[0].url, checked, product.evidenceStrength === "strong" ? "high" : "moderate")];
  if (sellerId === manufacturerId) partnerEntities[0].roles.push("retailer");
  else partnerEntities.push(entity(sellerId, merchant.name, "retailer", merchant.url, merchant.checked, "moderate"));

  const partnerProgramId = product.affiliate.program ? `program:${product.id}:affiliate` : null;
  const partnerPrograms = partnerProgramId ? [{
    id: partnerProgramId,
    entityId: manufacturerId,
    type: "affiliate" as const,
    name: product.affiliate.program!,
    status: product.affiliate.status,
    applicationUrl: null,
    commission: product.affiliate.commission,
    commissionType: null,
    cookieDurationDays: product.affiliate.cookieWindow,
    recurringRevenue: null,
    apiOrFeedAvailable: null,
    observedAt: product.affiliate.lastChecked,
    confidence: "insufficient" as const,
  }] : [];

  const recommendationScore = calculateRecommendationScore(product.scores);
  return {
    productId: product.id,
    partnerEntities,
    partnerPrograms,
    offers: product.merchants.map((item, index) => ({
      id: `offer:${product.id}:${index + 1}`,
      productId: product.id,
      sellerEntityId: `partner:${slug(item.name)}`,
      partnerProgramId,
      url: item.url,
      observedPrice: null,
      priceContext: product.price.context,
      shipping: null,
      estimatedLandedCost: null,
      availability: item.availability,
      observedAt: item.checked,
    })),
    evidenceClaims: product.evidence.map((source, index) => ({
      id: `evidence:${product.id}:${index + 1}`,
      subjectType: "product" as const,
      subjectId: product.id,
      sourceUrl: source.url,
      sourceLabel: source.label,
      evidenceType: source.type === "manufacturer" ? "manufacturer_documentation" as const : "merchant_observation" as const,
      claim: product.editorial.why,
      retrievedAt: source.checked,
      confidence: product.evidenceStrength === "strong" ? "high" as const : "moderate" as const,
      verificationStatus: "unverified" as const,
      limitations: [...product.limitations],
    })),
    recommendationScorecard: {
      id: `recommendation:${product.id}:${product.workflowId}`,
      productId: product.id,
      useCaseId: product.workflowId,
      rubricVersion: 1,
      components: { ...product.scores },
      score: recommendationScore,
      confidence: product.evidenceStrength === "strong" ? "high" : "moderate",
      status: "active",
      calculatedAt: checked,
      revision: 1,
      challenges: [],
    },
    commercialOpportunityScorecards: partnerProgramId ? [{
      id: `commercial:${partnerProgramId}`,
      entityId: manufacturerId,
      partnerProgramId,
      rubricVersion: 1,
      components: { ...emptyCommercialComponents },
      score: calculateCommercialOpportunityScore(emptyCommercialComponents),
      calculatedAt: product.affiliate.lastChecked,
    }] : [],
    relationships: [],
    researchState: "score",
    unresolvedQuestions: [...product.unresolvedQuestions],
  };
}

export function adaptCatalogToIntelligence(products: ProductRecord[]) {
  return products.map(adaptProductToIntelligence);
}
