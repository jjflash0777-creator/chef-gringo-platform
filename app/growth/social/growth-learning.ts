/**
 * Read-only growth learning from first-party commercial_events.
 * Does not invent platform impressions, change evidence, or publish.
 */

import type { SocialPerformanceEvent } from "./performance.ts";

export const GROWTH_LEARNING_ACTIONS = [
  "continue",
  "revise",
  "repurpose",
  "stop",
  "investigate_evidence_gap",
] as const;
export type GrowthLearningAction = typeof GROWTH_LEARNING_ACTIONS[number];

export type GrowthLearningSignal = {
  opportunityId: string;
  packageId: string;
  source: "first_party_commercial_events";
  externalAnalyticsInvented: false;
  impressions: number | null;
  clicks: number;
  ctr: number | null;
  emailSignups: number;
  leads: number;
  purchases: number;
  revenueCents: number | null;
  pageViews: number;
  contentViews: number;
  channels: string[];
  recommendedAction: GrowthLearningAction;
  reason: string;
  mayChangeEvidenceTruth: false;
  mayPublish: false;
};

export function buildGrowthLearningSignal(input: {
  opportunityId: string;
  packageId: string;
  events: SocialPerformanceEvent[];
  evidenceReadiness: string;
  contradictions: string[];
  formats: string[];
}): GrowthLearningSignal {
  const pageViews = count(input.events, ["page_view"]);
  const contentViews = count(input.events, ["content_view"]);
  const clicks = count(input.events, ["merchant_click", "affiliate_click"]);
  const emailSignups = count(input.events, ["email_signup"]);
  const leads = count(input.events, ["lead"]);
  const purchases = count(input.events, ["sale"]);
  const revenue = sumCents(input.events, "sale", "monetaryAmountCents");
  const ctr = pageViews > 0 ? clicks / pageViews : null;
  const action = recommendAction({
    evidenceReadiness: input.evidenceReadiness,
    contradictions: input.contradictions,
    pageViews,
    clicks,
    emailSignups,
    leads,
  });
  return {
    opportunityId: input.opportunityId,
    packageId: input.packageId,
    source: "first_party_commercial_events",
    externalAnalyticsInvented: false,
    impressions: null,
    clicks,
    ctr,
    emailSignups,
    leads,
    purchases,
    revenueCents: revenue,
    pageViews,
    contentViews,
    channels: input.formats,
    recommendedAction: action.action,
    reason: action.reason,
    mayChangeEvidenceTruth: false,
    mayPublish: false,
  };
}

function count(events: SocialPerformanceEvent[], types: string[]) {
  return events.filter((event) => types.includes(String(event.eventType))).length;
}

function sumCents(events: SocialPerformanceEvent[], type: string, field: "monetaryAmountCents") {
  const matched = events.filter((event) => event.eventType === type);
  if (!matched.length) return null;
  let total = 0;
  for (const event of matched) total += Number(event[field] ?? 0);
  return total;
}

function recommendAction(input: {
  evidenceReadiness: string;
  contradictions: string[];
  pageViews: number;
  clicks: number;
  emailSignups: number;
  leads: number;
}): { action: GrowthLearningAction; reason: string } {
  if (input.contradictions.length) {
    return { action: "investigate_evidence_gap", reason: "A contradiction is unresolved. Do not keep promoting the recommendation." };
  }
  if (input.evidenceReadiness !== "ready") {
    return { action: "investigate_evidence_gap", reason: "Evidence is not ready. Investigate the gap before repeating the content." };
  }
  if (input.pageViews === 0 && input.clicks === 0 && input.emailSignups === 0 && input.leads === 0) {
    return { action: "continue", reason: "No first-party performance yet. Continue only as a planned draft; nothing is published by this signal." };
  }
  if (input.pageViews >= 8 && input.clicks === 0 && input.emailSignups === 0) {
    return { action: "revise", reason: "First-party views arrived without a useful next action. Revise the CTA or explanation." };
  }
  if (input.emailSignups >= 2 || input.leads >= 1) {
    return { action: "repurpose", reason: "The problem is converting on Chef Gringo. Repurpose the same evidenced thesis on another owned format." };
  }
  if (input.pageViews >= 12 && (input.clicks + input.emailSignups) === 0) {
    return { action: "stop", reason: "Repeated first-party views are not helping. Stop promoting this package until the brief is revised." };
  }
  return { action: "continue", reason: "First-party events do not justify stopping. Continue iterating the draft." };
}
