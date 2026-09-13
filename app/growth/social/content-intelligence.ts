/**
 * Evidence-grounded Content Intelligence. Plans and drafts only.
 * Does not accept evidence, approve packages, spend, contact partners, or publish.
 */

import type { SocialEvidenceRef } from "./claims.ts";
import { assertNoEconomicsRankingFields } from "./commercial.ts";
import { assertNoEvidenceEconomics } from "./evidence-policy.ts";
import type {
  ClaimSufficiencyAssessment,
  EvidenceSufficiencyState,
  PackageEvidenceIntelligence,
} from "./evidence-intelligence.ts";
import type { SocialAudience, SocialContentOpportunity, SocialContentPackage } from "./types.ts";
import type { SocialPerformanceEvent } from "./performance.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "./types.ts";
import { draftContentFormats, type ContentDraft } from "./content-drafts.ts";
import { buildGrowthLearningSignal, type GrowthLearningSignal } from "./growth-learning.ts";

export const CONTENT_INTELLIGENCE_VERSION = "content-intelligence-v1";

export const CONTENT_FORMATS = [
  "chefgringo_article",
  "short_form_video",
  "instagram_facebook_post",
  "pinterest_pin",
  "email",
  "comparison_buying_guide",
] as const;
export type ContentFormat = typeof CONTENT_FORMATS[number];

export const CONTENT_CTA_TYPES = [
  "none",
  "read_article",
  "use_tool",
  "join_email",
  "compare_products",
  "request_quote",
  "request_repair",
  "contact_supplier",
  "start_training",
] as const;
export type ContentCtaType = typeof CONTENT_CTA_TYPES[number];

export const COMMERCIAL_ROUTE_TYPES = [
  "no_commercial_cta",
  "internal_tool",
  "affiliate_product",
  "saas_referral",
  "equipment_rfq",
  "repair_service_lead",
  "manufacturer_direct",
  "training_certification",
  "email_capture",
] as const;
export type CommercialRouteType = typeof COMMERCIAL_ROUTE_TYPES[number];

export type VerifiedContentFact = {
  claimId: string;
  claimText: string;
  evidenceRefs: SocialEvidenceRef[];
  sufficiency: EvidenceSufficiencyState;
};

export type ContentIntelligenceBrief = {
  packageId: string;
  opportunityId: string;
  primaryUserProblem: string;
  targetAudience: SocialAudience | string | null;
  searchIntent: string;
  contentThesis: string;
  verifiedFacts: VerifiedContentFact[];
  claimsMustNotMake: Array<{ claimId: string; claimText: string; reason: string }>;
  unresolvedQuestions: string[];
  contradictions: string[];
  recommendedFormat: ContentFormat;
  recommendedCta: ContentCtaType;
  commercialRelevance: string;
  confidence: "ready" | "partial" | "blocked";
  evidenceReadiness: string;
  contentReadiness: string;
  recommendationReadiness: string;
  liveDiscoveryIsNotEvidence: true;
};

export type ContentOpportunityScore = {
  total: number;
  reasons: string[];
  factors: {
    usefulness: number;
    audienceRelevance: number;
    evidenceReadiness: number;
    evergreenValue: number;
    likelyInterest: number;
    differentiation: number;
    commercialUsefulness: number;
    saturation: number;
    firstPartyPerformance: number;
  };
};

export type CommercialRoutePlan = {
  route: CommercialRouteType;
  helpsUserProblem: boolean;
  reason: string;
  cta: ContentCtaType;
  destinationPath: string;
  spending: false;
  partnerOutreach: false;
};

export type ContentFormatPlan = {
  format: ContentFormat;
  channel: string;
  reason: string;
  destinationPath: string;
};

export type ContentAttributionPlan = {
  opportunityId: string;
  packageId: string;
  contentBriefKey: string;
  format: ContentFormat;
  channel: string;
  campaign: string;
  destinationPath: string;
  destinationHref: string | null;
  cta: ContentCtaType;
  commercialRoute: CommercialRouteType;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string | null;
  utmTerm: string | null;
  variantId: string | null;
  requiresSavedVariant: boolean;
};

export type ContentIntelligenceInput = {
  opportunity: SocialContentOpportunity;
  package: SocialContentPackage;
  intelligence: PackageEvidenceIntelligence;
  variants?: Array<{ id: string; channel: string; destinationUrlId?: string | null }>;
  destinations?: Array<{ variantId: string; href: string; path: string }>;
  publications?: Array<{ id: string; channel: string; variantId: string }>;
  liveCandidates?: Array<{
    canonicalUrl?: string;
    relationship?: string;
    submittedDocumentId?: string | null;
    proposedForReview?: boolean;
    ingestionStatus?: string | null;
  }>;
  events?: SocialPerformanceEvent[];
  economics?: Record<string, unknown>;
};

export type ContentIntelligenceWorkspace = {
  version: typeof CONTENT_INTELLIGENCE_VERSION;
  publishingEnabled: false;
  brief: ContentIntelligenceBrief;
  score: ContentOpportunityScore;
  commercialRoute: CommercialRoutePlan;
  formats: ContentFormatPlan[];
  drafts: ContentDraft[];
  attribution: ContentAttributionPlan[];
  learning: GrowthLearningSignal;
  autonomy: {
    mayAnalyzePlanDraft: true;
    mayPublish: false;
    mayAcceptEvidence: false;
    maySpend: false;
    mayContactPartners: false;
  };
};

const SEASONAL = /\b(black friday|cyber monday|holiday|christmas|halloween|memorial day|labor day|prime day)\b/i;
const INTEREST = /\b(how|what|why|size|sizing|choose|compare|vs|versus|guide|checklist|repair|load|headroom)\b/i;
const COMPARE = /\b(choose|compare|vs|versus|buy|buying|which|equipment|product)\b/i;
const REPAIR = /\b(repair|broken|service call|technician|won't start|not heating)\b/i;
const TOOL = /\b(calculate|scale|ratio|tool|workflow|scaler|planner)\b/i;
const SAAS = /\b(software|scheduling|saas|app|platform)\b/i;
const RFQ = /\b(rfq|quote|spec sheet|supplier|manufacturer direct)\b/i;
const TRAIN = /\b(training|certif|course|credential)\b/i;

export function searchIntentFromProblem(problem: string, audience: string | null) {
  const text = problem.trim();
  if (!text) return "unspecified";
  if (COMPARE.test(text)) return "comparison";
  if (/\bhow\b/i.test(text)) return "how_to";
  if (/\bwhy\b|\bwhat\b/i.test(text)) return "explain";
  if (REPAIR.test(text)) return "repair";
  if (audience === "independent_operator") return "operator_guidance";
  return "practical_guidance";
}

export function verifiedFactsFromIntelligence(intelligence: PackageEvidenceIntelligence): VerifiedContentFact[] {
  return intelligence.claimAssessments
    .filter((item) => item.state === "supported")
    .map((item) => ({
      claimId: item.claimId,
      claimText: item.claimText,
      evidenceRefs: item.acceptedSources.map((source) => source.ref),
      sufficiency: item.state,
    }));
}

export function prohibitedClaimsFromIntelligence(intelligence: PackageEvidenceIntelligence) {
  return intelligence.claimAssessments
    .filter((item) => item.state !== "supported")
    .map((item) => ({
      claimId: item.claimId,
      claimText: item.claimText,
      reason: prohibitionReason(item),
    }));
}

function prohibitionReason(item: ClaimSufficiencyAssessment) {
  if (item.state === "conflicted") return "Unresolved contradiction. Recommendation language is blocked.";
  if (item.state === "insufficient_authority") return "Authority class is not sufficient to use this as a content fact.";
  if (item.state === "needs_independent_corroboration") return "Needs independent corroboration before it can be stated as fact.";
  if (item.state === "stale") return "Evidence is stale.";
  if (item.state === "partial") return "Evidence does not yet cover the claim.";
  return "Claim is not supported by accepted corpus evidence.";
}

export function buildContentIntelligenceBrief(input: ContentIntelligenceInput): ContentIntelligenceBrief {
  guardEconomics(input.economics);
  const dna = input.intelligence.decisionDna;
  const facts = verifiedFactsFromIntelligence(input.intelligence);
  const prohibited = prohibitedClaimsFromIntelligence(input.intelligence);
  const liveNote = (input.liveCandidates ?? []).length
    ? "Live discovery candidates are not evidence until corpus review accepts them."
    : "Live discovery candidates are not evidence until corpus review accepts them.";
  void liveNote;
  const contradictions = dna.contradictions;
  const route = planCommercialRoute(input);
  const formats = selectContentFormats(input, route);
  const confidence: ContentIntelligenceBrief["confidence"] = contradictions.length
    ? "blocked"
    : dna.evidenceReadiness === "ready" && dna.recommendationReadiness === "ready"
      ? "ready"
      : dna.evidenceReadiness === "not_ready"
        ? "blocked"
        : "partial";
  return {
    packageId: input.package.id,
    opportunityId: input.opportunity.id,
    primaryUserProblem: input.opportunity.problem,
    targetAudience: input.opportunity.audience,
    searchIntent: searchIntentFromProblem(input.opportunity.problem, input.opportunity.audience),
    contentThesis: input.package.thesis,
    verifiedFacts: facts,
    claimsMustNotMake: [
      ...prohibited,
      ...(input.liveCandidates ?? []).map((candidate, index) => ({
        claimId: `live-candidate:${index}`,
        claimText: candidate.canonicalUrl || "Live discovery candidate",
        reason: "Live discovery candidates are not evidence until corpus review accepts them.",
      })),
    ],
    unresolvedQuestions: dna.unresolvedQuestions,
    contradictions,
    recommendedFormat: formats[0]?.format ?? "chefgringo_article",
    recommendedCta: route.cta,
    commercialRelevance: route.helpsUserProblem
      ? `A ${route.route.replace(/_/g, " ")} can help the reader act on this problem.`
      : "No commercial CTA: a monetized route would not materially help this problem.",
    confidence,
    evidenceReadiness: dna.evidenceReadiness,
    contentReadiness: dna.contentReadiness,
    recommendationReadiness: dna.recommendationReadiness,
    liveDiscoveryIsNotEvidence: true,
  };
}

export function planCommercialRoute(input: ContentIntelligenceInput): CommercialRoutePlan {
  guardEconomics(input.economics);
  const dna = input.intelligence.decisionDna;
  const problem = `${input.opportunity.problem} ${input.opportunity.usefulnessTest} ${input.package.thesis}`;
  const blocked = dna.contradictions.length > 0 || dna.recommendationReadiness !== "ready";
  const none: CommercialRoutePlan = {
    route: "no_commercial_cta",
    helpsUserProblem: false,
    reason: blocked
      ? "No commercial CTA. Recommendation language is blocked until evidence gaps and contradictions are resolved."
      : "No commercial CTA. A paid or partner route would not materially help this user problem.",
    cta: "none",
    destinationPath: "/learn",
    spending: false,
    partnerOutreach: false,
  };
  if (input.opportunity.workflowId && TOOL.test(problem)) {
    return {
      route: "internal_tool",
      helpsUserProblem: true,
      reason: "An internal Chef Gringo tool or workflow can help the reader apply the method without a commercial detour.",
      cta: "use_tool",
      destinationPath: "/tools",
      spending: false,
      partnerOutreach: false,
    };
  }
  if (blocked) return none;
  if (REPAIR.test(problem)) {
    return {
      route: "repair_service_lead",
      helpsUserProblem: true,
      reason: "The user problem is a repair or service failure. A repair request helps more than a product pitch.",
      cta: "request_repair",
      destinationPath: "/services/repair-or-replace",
      spending: false,
      partnerOutreach: false,
    };
  }
  if (TRAIN.test(problem)) {
    return {
      route: "training_certification",
      helpsUserProblem: true,
      reason: "The problem is a training or credential gap.",
      cta: "start_training",
      destinationPath: "/learn",
      spending: false,
      partnerOutreach: false,
    };
  }
  if (input.opportunity.partnerOpportunityId && SAAS.test(problem)) {
    return {
      route: "saas_referral",
      helpsUserProblem: true,
      reason: "The problem is operational software. A referral is only proposed because it maps to that job.",
      cta: "read_article",
      destinationPath: "/partners",
      spending: false,
      partnerOutreach: false,
    };
  }
  if (RFQ.test(problem) && input.package.commercialPosture !== "none") {
    return {
      route: "equipment_rfq",
      helpsUserProblem: true,
      reason: "The reader needs a specified quote, not a generic affiliate click.",
      cta: "request_quote",
      destinationPath: "/marketplace",
      spending: false,
      partnerOutreach: false,
    };
  }
  if (
    input.package.commercialPosture === "affiliate"
    && input.opportunity.productId
    && COMPARE.test(problem)
  ) {
    return {
      route: "affiliate_product",
      helpsUserProblem: true,
      reason: "Verified comparison facts can help the reader choose equipment. Commission is not a ranking input.",
      cta: "compare_products",
      destinationPath: "/marketplace/compare",
      spending: false,
      partnerOutreach: false,
    };
  }
  if (input.opportunity.productId && /manufacturer|direct supplier/i.test(problem)) {
    return {
      route: "manufacturer_direct",
      helpsUserProblem: true,
      reason: "The reader needs the manufacturer or supplier, not a generic storefront.",
      cta: "contact_supplier",
      destinationPath: "/marketplace",
      spending: false,
      partnerOutreach: false,
    };
  }
  if (input.package.commercialPosture === "none" && /\b(learn|remember|understand|name)\b/i.test(problem)) {
    return {
      route: "email_capture",
      helpsUserProblem: true,
      reason: "An email follow-up can continue the lesson. It is not a product CTA.",
      cta: "join_email",
      destinationPath: "/newsletter",
      spending: false,
      partnerOutreach: false,
    };
  }
  return none;
}

export function selectContentFormats(input: ContentIntelligenceInput, route: CommercialRoutePlan): ContentFormatPlan[] {
  const audience = input.opportunity.audience;
  const problem = input.opportunity.problem;
  const intent = searchIntentFromProblem(problem, audience);
  const ready = input.intelligence.decisionDna.contentReadiness === "drafting_allowed";
  const formats: ContentFormatPlan[] = [];
  if (ready) {
    formats.push({
      format: "chefgringo_article",
      channel: "chefgringo.com",
      reason: "A long-form guide can carry caveats and evidence without compressing the claim.",
      destinationPath: "/learn",
    });
  }
  if (audience === "home_cook" || audience === "both") {
    formats.push({
      format: "short_form_video",
      channel: "tiktok",
      reason: "A short video can state one evidenced insight and send the viewer to the article.",
      destinationPath: "/learn",
    });
    formats.push({
      format: "instagram_facebook_post",
      channel: "instagram",
      reason: "A feed post can name the problem and the evidenced takeaway.",
      destinationPath: "/learn",
    });
  }
  if (intent === "how_to" || intent === "practical_guidance" || audience === "home_cook") {
    formats.push({
      format: "pinterest_pin",
      channel: "pinterest",
      reason: "A searchable pin can route the how-to intent to Chef Gringo.",
      destinationPath: "/learn",
    });
  }
  if (audience === "independent_operator" || audience === "both" || route.cta === "join_email") {
    formats.push({
      format: "email",
      channel: "email",
      reason: "Email can deliver the method and caveats without a social caption limit.",
      destinationPath: route.cta === "join_email" ? "/newsletter" : "/learn",
    });
  }
  if (route.route === "affiliate_product" || (route.cta === "compare_products" && intent === "comparison")) {
    formats.push({
      format: "comparison_buying_guide",
      channel: "chefgringo.com",
      reason: "Comparison is commercially appropriate because it maps to the user's choice problem.",
      destinationPath: "/marketplace/compare",
    });
  }
  if (!formats.length) {
    formats.push({
      format: "chefgringo_article",
      channel: "chefgringo.com",
      reason: "Default to an owned article so caveats are not stripped.",
      destinationPath: "/learn",
    });
  }
  return uniqueFormats(formats);
}

function uniqueFormats(formats: ContentFormatPlan[]) {
  const seen = new Set<ContentFormat>();
  const unique: ContentFormatPlan[] = [];
  for (const item of formats) {
    if (seen.has(item.format)) continue;
    seen.add(item.format);
    unique.push(item);
  }
  return unique;
}

export function scoreContentOpportunity(input: ContentIntelligenceInput, route: CommercialRoutePlan): ContentOpportunityScore {
  guardEconomics(input.economics);
  const dna = input.intelligence.decisionDna;
  const usefulness = Math.min(18, Math.round((input.opportunity.usefulnessTest.trim().length + input.opportunity.problem.trim().length) / 12));
  const audienceRelevance = input.opportunity.audience ? 10 : 0;
  const evidenceReadiness = dna.evidenceReadiness === "ready" ? 22 : dna.evidenceReadiness === "partial" ? 10 : 0;
  const evergreenValue = SEASONAL.test(input.opportunity.problem) ? 2 : 10;
  const likelyInterest = INTEREST.test(input.opportunity.problem) ? 10 : 4;
  const differentiation = input.package.commercialPosture === "affiliate" ? 4 : 10;
  const commercialUsefulness = route.helpsUserProblem ? 8 : 6;
  const publications = input.publications?.length ?? 0;
  const variants = input.variants?.length ?? 0;
  const saturation = publications >= 3 ? 2 : variants >= 3 ? 4 : 8;
  const events = input.events ?? [];
  const usefulEvents = events.filter((event) => event.eventType === "email_signup" || event.eventType === "lead" || event.eventType === "page_view" || event.eventType === "content_view");
  const firstPartyPerformance = usefulEvents.length ? Math.min(8, usefulEvents.length) : 0;
  const factors = {
    usefulness,
    audienceRelevance,
    evidenceReadiness,
    evergreenValue,
    likelyInterest,
    differentiation,
    commercialUsefulness,
    saturation,
    firstPartyPerformance,
  };
  const total = Object.values(factors).reduce((sum, value) => sum + value, 0);
  const reasons = [
    `Usefulness and problem clarity ${usefulness}.`,
    `Audience ${input.opportunity.audience || "unspecified"} ${audienceRelevance}.`,
    `Evidence readiness ${dna.evidenceReadiness} ${evidenceReadiness}.`,
    evergreenValue >= 10 ? "Evergreen problem, not a seasonal promotion." : "Seasonal framing reduces evergreen value.",
    `Search/social interest heuristic ${likelyInterest}. No external analytics invented.`,
    input.package.commercialPosture === "affiliate"
      ? "Affiliate posture is available but does not raise evidence authority."
      : "Non-affiliate framing differentiates from generic commission content.",
    route.helpsUserProblem
      ? `Commercial route ${route.route} is scored only because it helps the problem.`
      : "No-commercial CTA selected; usefulness still ranks.",
    publications ? `Existing publications ${publications} reduce novelty.` : "Little existing content on this package.",
    firstPartyPerformance ? "First-party engagement is present; commission is not a scoring input." : "No first-party performance yet.",
  ];
  return { total, reasons, factors };
}

export function planContentAttribution(
  input: ContentIntelligenceInput,
  brief: ContentIntelligenceBrief,
  route: CommercialRoutePlan,
  formats: ContentFormatPlan[],
): ContentAttributionPlan[] {
  return formats.map((format) => {
    const social = format.channel === "facebook" || format.channel === "instagram" || format.channel === "pinterest" || format.channel === "tiktok";
    const variant = social ? (input.variants ?? []).find((item) => item.channel === format.channel) : null;
    const destination = variant ? (input.destinations ?? []).find((item) => item.variantId === variant.id) : null;
    const publication = variant ? (input.publications ?? []).find((item) => item.variantId === variant.id) : null;
    return {
      opportunityId: input.opportunity.id,
      packageId: input.package.id,
      contentBriefKey: brief.packageId,
      format: format.format,
      channel: format.channel,
      campaign: input.package.id,
      destinationPath: format.destinationPath,
      destinationHref: destination?.href ?? null,
      cta: route.cta,
      commercialRoute: route.route,
      utmSource: social ? format.channel : format.channel === "email" ? "email" : "chefgringo",
      utmMedium: social ? "social" : format.channel === "email" ? "email" : "content",
      utmCampaign: input.package.id,
      utmContent: variant?.id ?? null,
      utmTerm: publication?.id ?? null,
      variantId: variant?.id ?? null,
      requiresSavedVariant: social && !variant,
    };
  });
}

export function buildContentIntelligence(input: ContentIntelligenceInput): ContentIntelligenceWorkspace {
  if (SOCIAL_PUBLISH_AVAILABLE !== false) throw new Error("Content Intelligence cannot run while publishing is enabled.");
  guardEconomics(input.economics);
  const commercialRoute = planCommercialRoute(input);
  const brief = buildContentIntelligenceBrief(input);
  const formats = selectContentFormats(input, commercialRoute);
  const score = scoreContentOpportunity(input, commercialRoute);
  const attribution = planContentAttribution(input, brief, commercialRoute, formats);
  const drafts = draftContentFormats({ brief, formats, route: commercialRoute, attribution });
  const learning = buildGrowthLearningSignal({
    opportunityId: input.opportunity.id,
    packageId: input.package.id,
    events: input.events ?? [],
    evidenceReadiness: brief.evidenceReadiness,
    contradictions: brief.contradictions,
    formats: formats.map((item) => item.format),
  });
  return {
    version: CONTENT_INTELLIGENCE_VERSION,
    publishingEnabled: false,
    brief,
    score,
    commercialRoute,
    formats,
    drafts,
    attribution,
    learning,
    autonomy: {
      mayAnalyzePlanDraft: true,
      mayPublish: false,
      mayAcceptEvidence: false,
      maySpend: false,
      mayContactPartners: false,
    },
  };
}

function guardEconomics(economics?: Record<string, unknown>) {
  if (!economics) return;
  assertNoEvidenceEconomics(economics, "Content intelligence");
  assertNoEconomicsRankingFields(economics);
}
