export const PARTNER_ENTITY_ROLES = [
  "manufacturer",
  "factory",
  "distributor",
  "retailer",
  "affiliate_network",
  "saas_provider",
  "repair_parts_supplier",
] as const;

export type PartnerEntityRole = typeof PARTNER_ENTITY_ROLES[number];

export const PARTNER_PROGRAM_TYPES = [
  "affiliate",
  "referral",
  "dropship",
  "wholesale",
  "direct_manufacturer",
  "oem_private_label",
  "saas_recurring",
  "api_product_feed",
] as const;

export type PartnerProgramType = typeof PARTNER_PROGRAM_TYPES[number];

export const CONFIDENCE_LEVELS = ["insufficient", "low", "moderate", "high"] as const;
export type IntelligenceConfidence = typeof CONFIDENCE_LEVELS[number];

export const VERIFICATION_STATUSES = ["unverified", "verified", "disputed", "superseded", "withdrawn"] as const;
export type IntelligenceVerificationStatus = typeof VERIFICATION_STATUSES[number];

export type PartnerEntity = {
  id: string;
  name: string;
  roles: PartnerEntityRole[];
  aliases: string[];
  primaryUrl: string | null;
  headquartersCountry: string | null;
  confidence: IntelligenceConfidence;
  verificationStatus: IntelligenceVerificationStatus;
  lastVerifiedAt: string | null;
};

export type PartnerProgram = {
  id: string;
  entityId: string;
  type: PartnerProgramType;
  name: string;
  status: "unknown" | "researching" | "available" | "unavailable";
  applicationUrl: string | null;
  commission: number | null;
  commissionType: "percentage" | "flat" | "recurring" | null;
  cookieDurationDays: number | null;
  recurringRevenue: boolean | null;
  apiOrFeedAvailable: boolean | null;
  observedAt: string;
  confidence: IntelligenceConfidence;
};

export type Offer = {
  id: string;
  productId: string;
  sellerEntityId: string;
  partnerProgramId: string | null;
  url: string;
  observedPrice: { amountCents: number; currency: string } | null;
  priceContext: string;
  shipping: { amountCents: number; currency: string } | null;
  estimatedLandedCost: {
    lowCents: number;
    expectedCents: number;
    highCents: number;
    currency: string;
    destinationCountry: string;
    assumptions: string[];
  } | null;
  availability: string;
  observedAt: string;
};

export type EvidenceSubjectType = "product" | "partner_entity" | "partner_program" | "offer" | "relationship" | "scorecard";

export type EvidenceClaim = {
  id: string;
  subjectType: EvidenceSubjectType;
  subjectId: string;
  sourceUrl: string;
  sourceLabel: string;
  evidenceType: "manufacturer_documentation" | "merchant_observation" | "professional_experience" | "editorial_judgment";
  claim: string;
  retrievedAt: string;
  confidence: IntelligenceConfidence;
  verificationStatus: IntelligenceVerificationStatus;
  limitations: string[];
};

export type RecommendationComponents = {
  workflowFit: number;
  durability: number;
  sanitation: number;
  performance: number;
  serviceability: number;
  value: number;
  evidenceQuality: number;
  environmentFit: number;
};

export type RecommendationChallenge = {
  id: string;
  createdAt: string;
  reason: string;
  previousScore: number;
  previousConfidence: IntelligenceConfidence;
  outcome: "flagged" | "confidence_reduced" | "rejected";
};

export type RecommendationScorecard = {
  id: string;
  productId: string;
  useCaseId: string;
  rubricVersion: 1;
  components: RecommendationComponents;
  score: number;
  confidence: IntelligenceConfidence;
  status: "active" | "challenged" | "rejected";
  calculatedAt: string;
  revision: number;
  challenges: RecommendationChallenge[];
};

export type CommercialOpportunityComponents = {
  commissionPotential: number | null;
  cookieDuration: number | null;
  recurringRevenue: number | null;
  averageOrderValue: number | null;
  directPartnershipPotential: number | null;
  integrationQuality: number | null;
};

export type CommercialOpportunityScorecard = {
  id: string;
  entityId: string;
  partnerProgramId: string | null;
  rubricVersion: 1;
  components: CommercialOpportunityComponents;
  score: number | null;
  calculatedAt: string;
};

export const PRODUCT_RELATIONSHIP_TYPES = [
  "alternative",
  "compatible_part",
  "replacement",
  "upgrade",
  "possible_oem_relationship",
  "domestic_equivalent",
  "factory_direct_alternative",
] as const;

export type ProductRelationshipType = typeof PRODUCT_RELATIONSHIP_TYPES[number];

export const ENTITY_RELATIONSHIP_TYPES = [
  "parent",
  "subsidiary",
  "manufactures_for",
  "distributes_for",
  "authorized_seller",
  "repair_provider",
  "possible_oem_relationship",
] as const;

export type EntityRelationshipType = typeof ENTITY_RELATIONSHIP_TYPES[number];

export type IntelligenceRelationship = {
  id: string;
  fromId: string;
  toId: string;
  subjectType: "product" | "partner_entity";
  relationshipType: ProductRelationshipType | EntityRelationshipType;
  rationale: string;
  confidence: IntelligenceConfidence;
  verificationStatus: IntelligenceVerificationStatus;
  evidenceClaimIds: string[];
  observedAt: string;
};

export const RESEARCH_LIFECYCLE_STATES = [
  "discover", "resolve_identity", "verify", "enrich", "compare", "challenge", "score", "monitor", "learn",
] as const;

export type ResearchLifecycleState = typeof RESEARCH_LIFECYCLE_STATES[number];

export type ProductIntelligenceRecord = {
  productId: string;
  partnerEntities: PartnerEntity[];
  partnerPrograms: PartnerProgram[];
  offers: Offer[];
  evidenceClaims: EvidenceClaim[];
  recommendationScorecard: RecommendationScorecard;
  commercialOpportunityScorecards: CommercialOpportunityScorecard[];
  relationships: IntelligenceRelationship[];
  researchState: ResearchLifecycleState;
  unresolvedQuestions: string[];
};
