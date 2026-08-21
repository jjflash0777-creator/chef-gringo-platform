import type { AuthorityTier, CulinaryDomain } from "./source-policy.ts";

export const EVIDENCE_VALIDATION_STATUSES = [
  "submitted",
  "reachable",
  "identified",
  "authoritative",
  "relevant",
  "claim_supporting",
  "contradicted",
  "stale",
  "rejected",
  "manually_overridden",
] as const;

export type EvidenceValidationStatus = typeof EVIDENCE_VALIDATION_STATUSES[number];

export const EVIDENCE_SOURCE_TYPES = [
  "regulatory_document",
  "manufacturer_documentation",
  "professional_practice",
  "clinical_organization",
  "educational_institution",
  "statute_or_rule",
  "commercial_program",
  "distributor_documentation",
  "seller_listing",
  "user_submitted",
  "chef_gringo_judgment",
] as const;

export type ResearchEvidenceSourceType = typeof EVIDENCE_SOURCE_TYPES[number];

export type ValidationOverride = {
  value: EvidenceValidationStatus;
  appliedAt: string;
  appliedBy: string;
  reason: string;
};

export type EvidenceProvenance = {
  recordedIn: "chef-gringo-repository" | "investigation-case" | "test_fixture";
  cataloguedAt: string;
  notes: string;
};

export type ResearchEvidenceItem = {
  id: string;
  title: string;
  sourceOrganization: string;
  sourceUrl: string | null;
  sourceType: ResearchEvidenceSourceType;
  authorityTier: AuthorityTier;
  domain: CulinaryDomain;
  publicationDate: string | null;
  updateDate: string | null;
  retrievedAt: string | null;
  cataloguedAt: string;
  claimSupported: string | null;
  claimContradicted: string | null;
  excerpt: string | null;
  locator: string | null;
  validationStatus: EvidenceValidationStatus;
  originalValidationStatus: EvidenceValidationStatus;
  freshnessStatus: "current" | "stale" | "unknown";
  inclusionDecision: "include" | "exclude" | "lead_only";
  exclusionReason: string | null;
  provenance: EvidenceProvenance;
  overrideHistory: ValidationOverride[];
  confidenceContribution: number;
  productionExposure: boolean;
  topics: string[];
};

export function applyValidationOverride(
  item: ResearchEvidenceItem,
  override: ValidationOverride,
): ResearchEvidenceItem {
  return {
    ...item,
    validationStatus: "manually_overridden",
    overrideHistory: [...item.overrideHistory, override],
    provenance: {
      ...item.provenance,
      notes: `${item.provenance.notes} Manual override recorded; original validation ${item.originalValidationStatus} retained.`,
    },
  };
}

export function urlAloneIsNotEvidence(item: Pick<ResearchEvidenceItem, "sourceUrl" | "claimSupported" | "excerpt" | "locator">) {
  return Boolean(item.sourceUrl) && !item.claimSupported && !item.excerpt && !item.locator;
}

export function isPubliclyCitable(item: ResearchEvidenceItem) {
  if (!item.productionExposure) return false;
  if (item.inclusionDecision === "exclude") return false;
  if (item.validationStatus === "rejected") return false;
  if (urlAloneIsNotEvidence(item)) return false;
  return item.validationStatus === "claim_supporting"
    || item.validationStatus === "authoritative"
    || item.validationStatus === "relevant"
    || item.validationStatus === "identified"
    || item.validationStatus === "manually_overridden";
}
