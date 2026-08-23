import { assertActorEmail } from "./approvals.ts";
import { SOCIAL_EVIDENCE_KINDS, type SocialEvidenceRef } from "./claims.ts";
import { assertSocialGrowthId, normalizeSocialSlug, socialGrowthId } from "./ids.ts";

export const SOCIAL_EVIDENCE_REQUEST_STATUSES = [
  "open",
  "candidate_submitted",
  "under_review",
  "resolved",
  "rejected",
] as const;
export type SocialEvidenceRequestStatus = typeof SOCIAL_EVIDENCE_REQUEST_STATUSES[number];

export const SOCIAL_EVIDENCE_PREFERRED_SOURCE_TYPES = [
  "government_regulatory",
  "electrical_code_standard",
  "manufacturer_technical",
  "equipment_manual",
  "industry_organization",
  "primary_documentation",
  "editorial",
] as const;
export type SocialEvidencePreferredSourceType = typeof SOCIAL_EVIDENCE_PREFERRED_SOURCE_TYPES[number];

/**
 * Workflow metadata only. This is not evidence and cannot satisfy the
 * package evidence gate. Resolution stores a pointer to an existing
 * corpus_document or knowledge-core source after authorized review.
 */
export type SocialEvidenceRequest = {
  id: string;
  packageId: string;
  opportunityId: string | null;
  question: string;
  whyRequired: string;
  preferredSourceType: SocialEvidencePreferredSourceType | null;
  status: SocialEvidenceRequestStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  candidateDocumentId: string | null;
  notes: string | null;
  resolvedEvidence: SocialEvidenceRef | null;
};

export function isSocialEvidenceRequestStatus(value: string): value is SocialEvidenceRequestStatus {
  return (SOCIAL_EVIDENCE_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isSocialEvidencePreferredSourceType(value: string): value is SocialEvidencePreferredSourceType {
  return (SOCIAL_EVIDENCE_PREFERRED_SOURCE_TYPES as readonly string[]).includes(value);
}

export function socialEvidenceRequestId(slug: string) {
  return socialGrowthId("evidence-request", slug);
}

export function createEvidenceRequestDraft(input: {
  slug: string;
  packageId: string;
  opportunityId?: string | null;
  question: string;
  whyRequired: string;
  preferredSourceType?: string | null;
  createdBy: string;
}): Omit<SocialEvidenceRequest, "createdAt" | "updatedAt"> {
  assertSocialGrowthId("package", input.packageId);
  if (input.opportunityId) assertSocialGrowthId("opportunity", input.opportunityId);
  const question = required(input.question, "Evidence request question");
  const whyRequired = required(input.whyRequired, "Why evidence is required");
  let preferredSourceType: SocialEvidencePreferredSourceType | null = null;
  if (input.preferredSourceType) {
    if (!isSocialEvidencePreferredSourceType(input.preferredSourceType)) {
      throw new Error("Preferred source type is not a recognized Growth evidence class.");
    }
    preferredSourceType = input.preferredSourceType;
  }
  return {
    id: socialEvidenceRequestId(normalizeSocialSlug(input.slug)),
    packageId: input.packageId,
    opportunityId: input.opportunityId ?? null,
    question,
    whyRequired,
    preferredSourceType,
    status: "open",
    createdBy: assertActorEmail(input.createdBy, "Evidence requests"),
    candidateDocumentId: null,
    notes: null,
    resolvedEvidence: null,
  };
}

export function candidateStatusFromCorpus(ingestionStatus: string | null | undefined): SocialEvidenceRequestStatus {
  if (ingestionStatus === "awaiting_review") return "under_review";
  return "candidate_submitted";
}

export function requestMayResolveFromCorpus(ingestionStatus: string | null | undefined) {
  return ingestionStatus === "accepted";
}

export function assertResolvedEvidenceRef(ref: SocialEvidenceRef): SocialEvidenceRef {
  if (!(SOCIAL_EVIDENCE_KINDS as readonly string[]).includes(ref.kind)) {
    throw new Error("Resolved evidence must be an existing Chef Gringo evidence kind.");
  }
  if (!ref.id.trim()) throw new Error("Resolved evidence must point at an existing corpus or knowledge record.");
  return ref;
}

export function evidenceRequestCannotSatisfyGate() {
  return true;
}

function required(value: string, label: string) {
  const text = value.trim();
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > 2000) throw new Error(`${label} is too long.`);
  return text;
}
