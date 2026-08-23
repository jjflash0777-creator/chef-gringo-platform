import { COMMERCIAL_LINK_KINDS, type CommercialLinkKind } from "../../marketplace/commercial-links.ts";

/**
 * Package-level commercial posture. Link-level truth remains CommercialLink.
 * Commission, payout, EPC, and other economics are forbidden ranking fields.
 */
export const SOCIAL_COMMERCIAL_POSTURES = ["none", "informational", "pending", "affiliate"] as const;
export type SocialCommercialPosture = typeof SOCIAL_COMMERCIAL_POSTURES[number];

const POSTURE_TO_LINK: Record<SocialCommercialPosture, CommercialLinkKind | null> = {
  none: null,
  informational: "informational",
  pending: "pending",
  affiliate: "affiliate",
};

const FORBIDDEN_RANKING_KEYS = [
  "commission",
  "commissionCents",
  "commissionAmountCents",
  "commissionValue",
  "payout",
  "payoutCents",
  "epc",
  "earningsPerClick",
  "earningsPerClickCents",
  "roas",
  "revenueShare",
  "revenueSharePercent",
  "expectedLifetimeRevenue",
  "expectedCommercialValue",
] as const;

export function isSocialCommercialPosture(value: string): value is SocialCommercialPosture {
  return (SOCIAL_COMMERCIAL_POSTURES as readonly string[]).includes(value);
}

export function assertSocialCommercialPosture(value: string): SocialCommercialPosture {
  if (!isSocialCommercialPosture(value)) {
    throw new Error("Social package commercial posture must be none, informational, pending, or affiliate.");
  }
  return value;
}

export function commercialLinkKindForPosture(posture: SocialCommercialPosture): CommercialLinkKind | null {
  return POSTURE_TO_LINK[posture];
}

export function assertPostureMatchesLinkKind(posture: SocialCommercialPosture, kind: CommercialLinkKind | null) {
  const expected = commercialLinkKindForPosture(posture);
  if (expected === null) {
    if (kind === "affiliate" || kind === "pending") {
      throw new Error("A non-commercial package cannot reference a pending or affiliate CommercialLink.");
    }
    return;
  }
  if (kind !== expected) {
    throw new Error(`Package posture ${posture} requires a ${expected} CommercialLink, not ${kind ?? "none"}.`);
  }
}

export function assertNoEconomicsRankingFields(record: Record<string, unknown>) {
  const present = FORBIDDEN_RANKING_KEYS.filter((key) => record[key] !== undefined);
  if (present.length) {
    throw new Error(`Social Growth records cannot store economics ranking fields: ${present.join(", ")}.`);
  }
  if (!COMMERCIAL_LINK_KINDS.length) throw new Error("CommercialLink classifications are required.");
}

export function socialPackageMayMonetize(posture: SocialCommercialPosture) {
  return posture === "affiliate";
}
