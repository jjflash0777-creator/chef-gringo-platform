import type { CommercialOpportunityComponents, RecommendationComponents } from "./types.ts";

export const EDITORIAL_SCORE_KEYS = [
  "workflowFit", "durability", "sanitation", "performance", "serviceability", "value", "evidenceQuality", "environmentFit",
] as const satisfies readonly (keyof RecommendationComponents)[];

export const COMMERCIAL_SCORE_KEYS = [
  "commissionPotential", "cookieDuration", "recurringRevenue", "averageOrderValue", "directPartnershipPotential", "integrationQuality",
] as const satisfies readonly (keyof CommercialOpportunityComponents)[];

function boundedScore(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

export function calculateRecommendationScore(components: RecommendationComponents): number {
  const record = components as unknown as Record<string, unknown>;
  if (Object.keys(record).some((key) => !EDITORIAL_SCORE_KEYS.includes(key as keyof RecommendationComponents))) {
    throw new Error("Editorial scoring accepts editorial components only.");
  }
  const values = EDITORIAL_SCORE_KEYS.map((key) => components[key]);
  if (values.some((value) => !boundedScore(value))) throw new Error("Editorial score components must be between 0 and 100.");
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function calculateCommercialOpportunityScore(components: CommercialOpportunityComponents): number | null {
  const record = components as unknown as Record<string, unknown>;
  if (Object.keys(record).some((key) => !COMMERCIAL_SCORE_KEYS.includes(key as keyof CommercialOpportunityComponents))) {
    throw new Error("Commercial scoring accepts commercial components only.");
  }
  const values = COMMERCIAL_SCORE_KEYS.map((key) => components[key]).filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  if (values.some((value) => !boundedScore(value))) throw new Error("Commercial score components must be between 0 and 100.");
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
