import {
  CONFIDENCE_LEVELS, ENTITY_RELATIONSHIP_TYPES, PARTNER_ENTITY_ROLES, PARTNER_PROGRAM_TYPES,
  PRODUCT_RELATIONSHIP_TYPES, RESEARCH_LIFECYCLE_STATES, VERIFICATION_STATUSES, type ProductIntelligenceRecord,
} from "./types.ts";
import { calculateRecommendationScore } from "./scoring.ts";

const isoDate = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/;
const controlledRelationships = new Set([...PRODUCT_RELATIONSHIP_TYPES, ...ENTITY_RELATIONSHIP_TYPES]);

function validUrl(value: string) {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function validateIntelligenceRecord(record: ProductIntelligenceRecord): string[] {
  const failures: string[] = [];
  if (!record.productId) failures.push("product-identity-missing");
  if (!RESEARCH_LIFECYCLE_STATES.includes(record.researchState)) failures.push("research-state-invalid");
  if (record.partnerEntities.length === 0) failures.push("partner-entity-missing");
  for (const entity of record.partnerEntities) {
    if (!entity.id || !entity.name || entity.roles.length === 0) failures.push("partner-identity-incomplete");
    if (entity.roles.some((role) => !PARTNER_ENTITY_ROLES.includes(role))) failures.push("partner-role-invalid");
    if (!CONFIDENCE_LEVELS.includes(entity.confidence) || !VERIFICATION_STATUSES.includes(entity.verificationStatus)) failures.push("partner-confidence-invalid");
  }
  for (const program of record.partnerPrograms) {
    if (!PARTNER_PROGRAM_TYPES.includes(program.type)) failures.push("partner-program-type-invalid");
    if (!isoDate.test(program.observedAt)) failures.push("partner-program-date-invalid");
  }
  if (record.evidenceClaims.length === 0) failures.push("evidence-missing");
  for (const evidence of record.evidenceClaims) {
    if (!validUrl(evidence.sourceUrl)) failures.push("evidence-provenance-invalid");
    if (!isoDate.test(evidence.retrievedAt)) failures.push("evidence-retrieval-date-invalid");
    if (!evidence.claim.trim() || !evidence.sourceLabel.trim()) failures.push("evidence-claim-incomplete");
    if (!CONFIDENCE_LEVELS.includes(evidence.confidence) || !VERIFICATION_STATUSES.includes(evidence.verificationStatus)) failures.push("evidence-confidence-invalid");
  }
  if (record.offers.length === 0) failures.push("offer-missing");
  for (const offer of record.offers) {
    if (!validUrl(offer.url) || !isoDate.test(offer.observedAt)) failures.push("offer-provenance-invalid");
    if (!offer.priceContext.trim()) failures.push("offer-price-context-missing");
    if (offer.estimatedLandedCost && offer.estimatedLandedCost.assumptions.length === 0) failures.push("landed-cost-assumptions-missing");
    if (offer.estimatedLandedCost && !(offer.estimatedLandedCost.lowCents <= offer.estimatedLandedCost.expectedCents && offer.estimatedLandedCost.expectedCents <= offer.estimatedLandedCost.highCents)) failures.push("landed-cost-range-invalid");
  }
  for (const relationship of record.relationships) {
    if (!controlledRelationships.has(relationship.relationshipType)) failures.push("relationship-type-invalid");
    if (!isoDate.test(relationship.observedAt) || !relationship.rationale.trim()) failures.push("relationship-evidence-incomplete");
  }
  try {
    if (calculateRecommendationScore(record.recommendationScorecard.components) !== record.recommendationScorecard.score) failures.push("recommendation-score-mismatch");
  } catch { failures.push("recommendation-score-invalid"); }
  return [...new Set(failures)];
}
