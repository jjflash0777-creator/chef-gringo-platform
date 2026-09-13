import type { CommercialEventName } from "../commercial-events.ts";
import type { SocialPublication } from "./types.ts";

export const SOCIAL_PERFORMANCE_WINDOWS = [
  "since_publication",
  "first_24h",
  "first_7d",
  "first_30d",
] as const;
export type SocialPerformanceWindow = typeof SOCIAL_PERFORMANCE_WINDOWS[number];

export const SOCIAL_ATTRIBUTION_STATES = [
  "publication_exact",
  "variant_only",
  "package_only",
  "unattributed",
] as const;
export type SocialAttributionState = typeof SOCIAL_ATTRIBUTION_STATES[number];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type SocialPerformanceEvent = {
  id?: string;
  eventType: CommercialEventName | string;
  occurredAt: string;
  campaignId?: string | null;
  contentId?: string | null;
  anonymousSessionId?: string | null;
  monetaryAmountCents?: number | null;
  commissionAmountCents?: number | null;
  metadata?: Record<string, unknown> | string | null;
};

/**
 * Publication-level metrics count only publication_exact events.
 *
 * publication_exact requires metadata.attribution.term === publicationId.
 * Package and variant identifiers are integrity checks, not a join key:
 * if metadata.attribution.campaignId / content or the event campaignId /
 * contentId columns are present, they must match this publication.
 * Any mismatch fails closed to unattributed.
 *
 * variant_only and package_only are diagnostic only and never roll into
 * publication metrics. Those states are read from metadata.attribution
 * (utm_content / utm_campaign) so a leftover content_id column cannot
 * silently upgrade a package-only event. Dates alone never attribute.
 */
export function classifySocialEventAttribution(
  event: SocialPerformanceEvent,
  publication: Pick<SocialPublication, "id" | "packageId" | "variantId">,
): SocialAttributionState {
  const attribution = readAttribution(event.metadata);
  const term = text(attribution.term);
  const metaCampaign = text(attribution.campaignId);
  const metaContent = text(attribution.content);
  const columnCampaign = text(event.campaignId);
  const columnContent = text(event.contentId);
  const campaignConflict = [metaCampaign, columnCampaign].some((value) => value && value !== publication.packageId);
  const contentConflict = [metaContent, columnContent].some((value) => value && value !== publication.variantId);
  if (term === publication.id) {
    if (campaignConflict || contentConflict) return "unattributed";
    return "publication_exact";
  }
  if (metaContent === publication.variantId) {
    if (metaCampaign && metaCampaign !== publication.packageId) return "unattributed";
    return "variant_only";
  }
  if (metaCampaign === publication.packageId) return "package_only";
  return "unattributed";
}

export function isSocialPerformanceWindow(value: string): value is SocialPerformanceWindow {
  return (SOCIAL_PERFORMANCE_WINDOWS as readonly string[]).includes(value);
}

/**
 * Windows are half-open [start, end) in UTC milliseconds from Date.parse.
 * first_* windows are exact 24/7/30 * 24h durations, not calendar months.
 * since_publication ends at `now`. Every window is clipped to `now` so a
 * future-dated publication yields an empty range (start >= now).
 */
export function resolveSocialPerformanceWindow(input: {
  publishedAt: string;
  window: SocialPerformanceWindow;
  now?: string;
}) {
  const startMs = Date.parse(input.publishedAt);
  if (Number.isNaN(startMs)) throw new Error("A valid UTC published timestamp is required for performance reporting.");
  const nowMs = Date.parse(input.now ?? new Date().toISOString());
  if (Number.isNaN(nowMs)) throw new Error("Performance reporting requires a valid UTC now timestamp.");
  const duration = input.window === "first_24h" ? DAY
    : input.window === "first_7d" ? 7 * DAY
    : input.window === "first_30d" ? 30 * DAY
    : null;
  const rawEnd = duration === null ? nowMs : startMs + duration;
  const endMs = Math.min(rawEnd, nowMs);
  const empty = startMs >= nowMs || startMs >= endMs;
  return {
    window: input.window,
    start: new Date(startMs).toISOString(),
    end: new Date(empty ? startMs : endMs).toISOString(),
    startMs,
    endMs: empty ? startMs : endMs,
    empty,
    futurePublication: startMs > nowMs,
    halfOpen: "[start, end)" as const,
    clock: "utc" as const,
  };
}

export function eventOccursInWindow(occurredAt: string, window: { startMs: number; endMs: number; empty: boolean }) {
  if (window.empty) return false;
  const at = Date.parse(occurredAt);
  if (Number.isNaN(at)) return false;
  return at >= window.startMs && at < window.endMs;
}

export type SocialPublicationMetrics = {
  pageViews: number;
  uniqueSessions: number;
  contentViews: number;
  marketplaceViews: number;
  recommendationViews: number;
  merchantClicks: number;
  affiliateClicks: number;
  emailSignups: number;
  verifiedLeads: number;
  verifiedSales: number;
  verifiedSalesAmountCents: number | null;
  verifiedCommissionPending: number;
  verifiedCommissionApproved: number;
  verifiedCommissionPaid: number;
  verifiedCommissionPendingCents: number | null;
  verifiedCommissionApprovedCents: number | null;
  verifiedCommissionPaidCents: number | null;
};

export type SocialPerformanceReport = {
  publicationId: string;
  packageId: string;
  variantId: string;
  channel: string;
  publishedAt: string;
  trackedHref: string;
  window: ReturnType<typeof resolveSocialPerformanceWindow>;
  attributionState: SocialAttributionState;
  metrics: SocialPublicationMetrics;
  diagnostics: {
    publicationExactEvents: number;
    variantOnlyEvents: number;
    packageOnlyEvents: number;
    unattributedCandidates: number;
  };
  platformReachConnected: false;
  publishingEnabled: false;
};

export function emptySocialPublicationMetrics(): SocialPublicationMetrics {
  return {
    pageViews: 0,
    uniqueSessions: 0,
    contentViews: 0,
    marketplaceViews: 0,
    recommendationViews: 0,
    merchantClicks: 0,
    affiliateClicks: 0,
    emailSignups: 0,
    verifiedLeads: 0,
    verifiedSales: 0,
    verifiedSalesAmountCents: null,
    verifiedCommissionPending: 0,
    verifiedCommissionApproved: 0,
    verifiedCommissionPaid: 0,
    verifiedCommissionPendingCents: null,
    verifiedCommissionApprovedCents: null,
    verifiedCommissionPaidCents: null,
  };
}

export function aggregateSocialPerformance(input: {
  publication: SocialPublication;
  events: SocialPerformanceEvent[];
  window: SocialPerformanceWindow;
  now?: string;
}): SocialPerformanceReport {
  if (!input.publication.publishedAt) throw new Error("Performance is available after a publication is recorded with a published timestamp.");
  const window = resolveSocialPerformanceWindow({
    publishedAt: input.publication.publishedAt,
    window: input.window,
    now: input.now,
  });
  const classified = input.events
    .filter((event) => eventOccursInWindow(event.occurredAt, window))
    .map((event) => ({ event, state: classifySocialEventAttribution(event, input.publication) }));
  const exact = classified.filter((item) => item.state === "publication_exact").map((item) => item.event);
  const metrics = emptySocialPublicationMetrics();
  const sessions = new Set<string>();
  let salesAmount = 0;
  let salesKnown = false;
  let pendingAmount = 0;
  let pendingKnown = false;
  let approvedAmount = 0;
  let approvedKnown = false;
  let paidAmount = 0;
  let paidKnown = false;
  for (const event of exact) {
    if (event.eventType === "page_view") {
      metrics.pageViews += 1;
      const session = text(event.anonymousSessionId);
      if (session) sessions.add(session);
    }
    if (event.eventType === "content_view") metrics.contentViews += 1;
    if (event.eventType === "marketplace_view") metrics.marketplaceViews += 1;
    if (event.eventType === "recommendation_view") metrics.recommendationViews += 1;
    if (event.eventType === "merchant_click") metrics.merchantClicks += 1;
    if (event.eventType === "affiliate_click") metrics.affiliateClicks += 1;
    if (event.eventType === "email_signup") metrics.emailSignups += 1;
    if (event.eventType === "lead") metrics.verifiedLeads += 1;
    if (event.eventType === "sale") {
      metrics.verifiedSales += 1;
      if (typeof event.monetaryAmountCents === "number") {
        salesAmount += event.monetaryAmountCents;
        salesKnown = true;
      }
    }
    if (event.eventType === "commission_pending") {
      metrics.verifiedCommissionPending += 1;
      if (typeof event.commissionAmountCents === "number") {
        pendingAmount += event.commissionAmountCents;
        pendingKnown = true;
      }
    }
    if (event.eventType === "commission_approved") {
      metrics.verifiedCommissionApproved += 1;
      if (typeof event.commissionAmountCents === "number") {
        approvedAmount += event.commissionAmountCents;
        approvedKnown = true;
      }
    }
    if (event.eventType === "commission_paid") {
      metrics.verifiedCommissionPaid += 1;
      if (typeof event.commissionAmountCents === "number") {
        paidAmount += event.commissionAmountCents;
        paidKnown = true;
      }
    }
  }
  metrics.uniqueSessions = sessions.size;
  metrics.verifiedSalesAmountCents = salesKnown ? salesAmount : null;
  metrics.verifiedCommissionPendingCents = pendingKnown ? pendingAmount : null;
  metrics.verifiedCommissionApprovedCents = approvedKnown ? approvedAmount : null;
  metrics.verifiedCommissionPaidCents = paidKnown ? paidAmount : null;
  const diagnostics = {
    publicationExactEvents: exact.length,
    variantOnlyEvents: classified.filter((item) => item.state === "variant_only").length,
    packageOnlyEvents: classified.filter((item) => item.state === "package_only").length,
    unattributedCandidates: classified.filter((item) => item.state === "unattributed").length,
  };
  return {
    publicationId: input.publication.id,
    packageId: input.publication.packageId,
    variantId: input.publication.variantId,
    channel: input.publication.channel,
    publishedAt: input.publication.publishedAt,
    trackedHref: input.publication.trackedHref,
    window,
    attributionState: diagnostics.publicationExactEvents ? "publication_exact"
      : diagnostics.variantOnlyEvents ? "variant_only"
      : diagnostics.packageOnlyEvents ? "package_only"
      : "unattributed",
    metrics,
    diagnostics,
    platformReachConnected: false,
    publishingEnabled: false,
  };
}

function readAttribution(metadata: SocialPerformanceEvent["metadata"]) {
  const record = typeof metadata === "string" ? parseJson(metadata) : metadata ?? {};
  const attribution = record.attribution;
  return attribution && typeof attribution === "object" ? attribution as Record<string, unknown> : {};
}

function parseJson(value: string) {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

function text(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}
