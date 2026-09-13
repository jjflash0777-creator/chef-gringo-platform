import type { SocialChannel } from "./channels.ts";
import type { SocialCommercialPosture } from "./commercial.ts";
import type { SocialEvidenceRef } from "./claims.ts";

export const SOCIAL_GROWTH_STEP = 3;
export const SOCIAL_PUBLISH_AVAILABLE = false;

export const SOCIAL_OPPORTUNITY_STATUSES = ["open", "selected", "discarded"] as const;
export type SocialOpportunityStatus = typeof SOCIAL_OPPORTUNITY_STATUSES[number];

export const SOCIAL_AUDIENCES = ["home_cook", "independent_operator", "both"] as const;
export type SocialAudience = typeof SOCIAL_AUDIENCES[number];

export const SOCIAL_PACKAGE_STATUSES = ["drafted", "approved", "rejected"] as const;
export type SocialPackageStatus = typeof SOCIAL_PACKAGE_STATUSES[number];

export const SOCIAL_ASSET_TYPES = ["still", "carousel", "pin", "reel_script", "caption"] as const;
export type SocialAssetType = typeof SOCIAL_ASSET_TYPES[number];

export const SOCIAL_APPROVAL_DECISIONS = ["approved", "rejected"] as const;
export type SocialApprovalDecision = typeof SOCIAL_APPROVAL_DECISIONS[number];

export const SOCIAL_APPROVAL_SUBJECTS = ["package", "variant"] as const;
export type SocialApprovalSubjectKind = typeof SOCIAL_APPROVAL_SUBJECTS[number];

export type SocialContentOpportunity = {
  id: string;
  slug: string;
  problem: string;
  audience: SocialAudience;
  usefulnessTest: string;
  productId: string | null;
  workflowId: number | null;
  partnerOpportunityId: string | null;
  status: SocialOpportunityStatus;
};

export type SocialContentPackage = {
  id: string;
  slug: string;
  opportunityId: string;
  thesis: string;
  usefulnessTest: string;
  commercialPosture: SocialCommercialPosture;
  status: SocialPackageStatus;
};

export type SocialPackageClaim = {
  id: string;
  packageId: string;
  claimText: string;
  evidence: SocialEvidenceRef;
  evidenceRefs: SocialEvidenceRef[];
  safetySensitive: boolean;
};

export type SocialContentAsset = {
  id: string;
  assetType: SocialAssetType;
  altText: string;
  license: string;
  provenanceNote: string;
  /** Site-relative path or Chef Gringo URL. Not a merchant/affiliate destination. */
  uri: string | null;
};

export type SocialChannelVariant = {
  id: string;
  packageId: string;
  channel: SocialChannel;
  copy: string;
  assetIds: string[];
  destinationUrlId: string | null;
};

export type SocialApproval = {
  id: string;
  subjectKind: SocialApprovalSubjectKind;
  subjectId: string;
  decision: SocialApprovalDecision;
  actorEmail: string;
  reason: string;
  occurredAt: string;
};

export type SocialDestinationUrl = {
  id: string;
  packageId: string;
  variantId: string;
  channel: SocialChannel;
  path: string;
  href: string;
};

/**
 * Evidence that an administrator already posted a variant externally.
 * Step 2 writes mode=manual only. This is not network publishing.
 */
export type SocialPublication = {
  id: string;
  packageId: string;
  variantId: string;
  channel: SocialChannel;
  mode: "manual" | "api";
  status: "reserved" | "recorded";
  platformPostId: string | null;
  platformPostUrl: string | null;
  destinationUrlId: string;
  trackedHref: string;
  publishedAt: string | null;
  recordedAt: string;
  actorEmail: string;
};

/**
 * Reserved identity only. Step 3 reports live from commercial_events and
 * does not persist snapshots or connect a social analytics adapter.
 */
export type SocialPerformanceSnapshot = {
  id: string;
  publicationId: string;
  asOf: string;
};

export function isSocialOpportunityStatus(value: string): value is SocialOpportunityStatus {
  return (SOCIAL_OPPORTUNITY_STATUSES as readonly string[]).includes(value);
}

export function isSocialPackageStatus(value: string): value is SocialPackageStatus {
  return (SOCIAL_PACKAGE_STATUSES as readonly string[]).includes(value);
}

export function isSocialAudience(value: string): value is SocialAudience {
  return (SOCIAL_AUDIENCES as readonly string[]).includes(value);
}

export function isSocialAssetType(value: string): value is SocialAssetType {
  return (SOCIAL_ASSET_TYPES as readonly string[]).includes(value);
}

export function isSocialApprovalDecision(value: string): value is SocialApprovalDecision {
  return (SOCIAL_APPROVAL_DECISIONS as readonly string[]).includes(value);
}
