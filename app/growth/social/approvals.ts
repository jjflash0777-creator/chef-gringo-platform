import { isSocialGrowthId } from "./ids.ts";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  type SocialApproval,
  type SocialApprovalDecision,
  type SocialApprovalSubjectKind,
} from "./types.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertActorEmail(value: string, purpose = "Approvals") {
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new Error(`${purpose} require an authenticated administrator email.`);
  return email;
}

export function assertApprovalSubject(kind: SocialApprovalSubjectKind, subjectId: string) {
  if (kind === "package" && !isSocialGrowthId("package", subjectId)) throw new Error("Package approvals require a package identifier.");
  if (kind === "variant" && !isSocialGrowthId("variant", subjectId)) throw new Error("Variant approvals require a variant identifier.");
  return subjectId;
}

export function approvalIsValidAuthority(approval: SocialApproval) {
  return approval.decision === "approved"
    && Boolean(approval.actorEmail)
    && Boolean(approval.reason)
    && Boolean(approval.occurredAt)
    && !Number.isNaN(Date.parse(approval.occurredAt));
}

/**
 * Future publication authority. Package or variant status is never sufficient.
 * A later publish writer must call this (or publicationIsAuthorized) against
 * persisted social_approvals rows, not status === "approved".
 */
export function hasValidSocialApproval(input: {
  subjectKind: SocialApprovalSubjectKind;
  subjectId: string;
  approvals: SocialApproval[];
  packageStatus?: string | null;
}) {
  void input.packageStatus;
  return input.approvals.some((approval) => (
    approval.subjectKind === input.subjectKind
    && approval.subjectId === input.subjectId
    && approvalIsValidAuthority(approval)
  ));
}

export function publicationIsAuthorized(input: {
  subjectKind: SocialApprovalSubjectKind;
  subjectId: string;
  approvals: SocialApproval[];
  packageStatus?: string | null;
}) {
  return hasValidSocialApproval(input) && SOCIAL_PUBLISH_AVAILABLE;
}

/**
 * Authority to record that a human already posted a variant externally.
 * Package status is never sufficient. Network publishing remains disabled.
 */
export function hasValidSocialPublicationAuthority(input: {
  packageId: string;
  variantId: string;
  approvals: SocialApproval[];
  packageStatus?: string | null;
}) {
  void input.packageStatus;
  return hasValidSocialApproval({
    subjectKind: "package",
    subjectId: input.packageId,
    approvals: input.approvals,
  }) || hasValidSocialApproval({
    subjectKind: "variant",
    subjectId: input.variantId,
    approvals: input.approvals,
  });
}

export function canPublishNow(approval: SocialApproval) {
  return publicationIsAuthorized({
    subjectKind: approval.subjectKind,
    subjectId: approval.subjectId,
    approvals: [approval],
  });
}

export function assertPublishUnavailable(): never {
  if (SOCIAL_PUBLISH_AVAILABLE) throw new Error("Publish must stay disabled until a later authorized step.");
  throw new Error("Social Growth cannot publish.");
}

export function createApprovalRecord(input: {
  slug: string;
  subjectKind: SocialApprovalSubjectKind;
  subjectId: string;
  decision: SocialApprovalDecision;
  actorEmail: string;
  reason: string;
  occurredAt?: string;
}): Omit<SocialApproval, "id"> & { slug: string } {
  assertApprovalSubject(input.subjectKind, input.subjectId);
  if (input.decision !== "approved" && input.decision !== "rejected") {
    throw new Error("Approval decision must be approved or rejected.");
  }
  if (!input.reason.trim()) throw new Error("Approval records require a reason.");
  return {
    slug: input.slug,
    subjectKind: input.subjectKind,
    subjectId: input.subjectId,
    decision: input.decision,
    actorEmail: assertActorEmail(input.actorEmail),
    reason: input.reason.trim(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
}
