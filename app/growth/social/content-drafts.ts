/**
 * Channel drafts from an evidence-grounded brief.
 * The Draft Claim Firewall inspects generated text before anything is returned.
 * Does not save variants, accept evidence, or publish.
 */

import type { SocialEvidenceRef } from "./claims.ts";
import type {
  CommercialRoutePlan,
  ContentAttributionPlan,
  ContentFormatPlan,
  ContentIntelligenceBrief,
} from "./content-intelligence.ts";
import {
  applyDraftClaimFirewall,
  asResearchQuestion,
  classifyDraftStatement,
  mapStatementToVerifiedFacts,
  type DraftClaimFirewallResult,
  type DraftStatementTrace,
} from "./draft-claim-firewall.ts";

export type DraftSegment = {
  role: string;
  text: string;
  claimIds: string[];
  evidenceRefs: SocialEvidenceRef[];
  factual: boolean;
};

export type ContentDraft = {
  format: ContentFormatPlan["format"];
  channel: string;
  destinationPath: string;
  cta: string;
  copy: string;
  segments: DraftSegment[];
  recommendationBlocked: boolean;
  statementTrace: DraftStatementTrace[];
  claimFirewall: DraftClaimFirewallResult;
};

const FABRICATION = /\b(\d+\s?%|\$\d|\d+\s?kwh|certified|testimonial|customers say|save \$?\d)\b/i;

export function draftContentFormats(input: {
  brief: ContentIntelligenceBrief;
  formats: ContentFormatPlan[];
  route: CommercialRoutePlan;
  attribution: ContentAttributionPlan[];
}): ContentDraft[] {
  return input.formats.map((format) => {
    const attribution = input.attribution.find((item) => item.format === format.format);
    return draftOne({ brief: input.brief, format, route: input.route, destinationPath: attribution?.destinationPath ?? format.destinationPath });
  });
}

export function everyFactualSegmentIsTraced(draft: ContentDraft, allowedClaimIds: Set<string>) {
  return draft.segments.filter((segment) => segment.factual).every((segment) => (
    segment.claimIds.length > 0
    && segment.claimIds.every((id) => allowedClaimIds.has(id))
    && segment.evidenceRefs.length > 0
  ));
}

function draftOne(input: {
  brief: ContentIntelligenceBrief;
  format: ContentFormatPlan;
  route: CommercialRoutePlan;
  destinationPath: string;
}): ContentDraft {
  const blocked = input.brief.contradictions.length > 0 || input.brief.recommendationReadiness !== "ready";
  const facts = input.brief.verifiedFacts;
  const allowed = new Set(facts.map((item) => item.claimId));
  const rawSegments = segmentsFor(input.format.format, input.brief, input.route, blocked);
  const rawCopy = rawSegments.map((item) => item.text).join("\n\n");
  const fired = applyDraftClaimFirewall({ copy: rawCopy, brief: input.brief, route: input.route });
  const segments = segmentsFromFirewall(fired.claimFirewall.traces);
  assertNoFabrication(fired.copy, facts.map((item) => item.claimText).join(" "));
  assertNoProhibitedClaims(fired.copy, input.brief);
  assertFactualTrace(segments, allowed);
  return {
    format: input.format.format,
    channel: input.format.channel,
    destinationPath: input.destinationPath,
    cta: input.route.cta,
    copy: fired.copy,
    segments,
    recommendationBlocked: blocked,
    statementTrace: fired.claimFirewall.traces,
    claimFirewall: fired.claimFirewall,
  };
}

function segmentsFor(
  format: ContentFormatPlan["format"],
  brief: ContentIntelligenceBrief,
  route: CommercialRoutePlan,
  blocked: boolean,
): DraftSegment[] {
  if (blocked && !brief.verifiedFacts.length) return investigationSegments(format, brief, route);
  const fact = brief.verifiedFacts[0];
  const extra = brief.verifiedFacts.slice(1);
  const caveats = [
    ...brief.unresolvedQuestions.map((item) => `Unresolved: ${item}`),
    brief.contradictions.length ? "An unresolved contradiction is on file. Do not treat a recommendation as authorized." : "",
    "Live discovery candidates are not evidence until corpus review accepts them.",
  ].filter(Boolean).join(" ");
  const cta = ctaCopy(route, brief);
  const problem = problemSegment(brief);
  const thesis = thesisSegment(brief);
  const proof = fact
    ? segment("proof", fact.claimText, [fact.claimId], fact.evidenceRefs, true)
    : segment("proof", "No accepted evidence is available to state a fact yet.", [], [], false);
  const moreFacts = extra.map((item) => segment("explanation", item.claimText, [item.claimId], item.evidenceRefs, true));
  const caveat = segment("caveat", caveats, [], [], false);
  const recommendation = blocked
    ? segment("recommendation", "No purchase or product recommendation is authorized from the current evidence.", [], [], false)
    : fact
      ? segment("recommendation", `What can be said from accepted evidence: ${fact.claimText}`, [fact.claimId], fact.evidenceRefs, true)
      : segment("recommendation", "Do not recommend a product until a claim is supported by accepted evidence.", [], [], false);
  const takeaway = fact
    ? segment("takeaway", fact.claimText, [fact.claimId], fact.evidenceRefs, true)
    : segment("takeaway", "No accepted evidence is available for an actionable takeaway yet.", [], [], false);
  const ctaSegment = segment("cta", cta, [], [], false);

  if (format === "short_form_video") {
    return [
      segment("hook", blocked ? asResearchQuestion(brief.primaryUserProblem) : hookFrom(brief.primaryUserProblem), [], [], false),
      problem,
      takeaway,
      proof,
      caveat,
      ctaSegment,
    ];
  }
  if (format === "instagram_facebook_post") {
    return [hookSegment(brief, blocked), problem, proof, caveat, ctaSegment];
  }
  if (format === "pinterest_pin") {
    return [
      segment("title", pinTitle(brief.primaryUserProblem), [], [], false),
      segment("benefit", pinBenefit(brief), fact ? [fact.claimId] : [], fact?.evidenceRefs ?? [], Boolean(fact)),
      ctaSegment,
    ];
  }
  if (format === "email") {
    return [problem, ...optional(thesis), proof, ...moreFacts, caveat, recommendation, ctaSegment];
  }
  if (format === "comparison_buying_guide") {
    return [
      problem,
      segment("method", "Compare options only against verified facts. Do not invent prices, savings, or certifications.", [], [], false),
      proof,
      ...moreFacts,
      caveat,
      recommendation,
      ctaSegment,
    ];
  }
  return [problem, ...optional(thesis), proof, ...moreFacts, caveat, recommendation, ctaSegment];
}

function investigationSegments(
  format: ContentFormatPlan["format"],
  brief: ContentIntelligenceBrief,
  route: CommercialRoutePlan,
): DraftSegment[] {
  const question = asResearchQuestion(brief.primaryUserProblem);
  const gaps = brief.unresolvedQuestions.length
    ? brief.unresolvedQuestions.map((item) => item.endsWith("?") ? item : `Unresolved: ${item}`).join(" ")
    : "What evidence is still missing before a recommendation is authorized?";
  const framing = segment(
    "problem",
    "Chef Gringo is investigating this problem without recommending a product or method yet.",
    [],
    [],
    false,
  );
  const ask = segment("question", question, [], [], false);
  const proof = segment("proof", "No accepted evidence is available to state a fact yet. Live discovery candidates are not evidence until corpus review accepts them.", [], [], false);
  const checklist = segment(
    "method",
    "Questions to investigate: What has been verified from accepted corpus evidence? What remains unresolved? What would corpus review need to accept before guidance is authorized?",
    [],
    [],
    false,
  );
  const caveat = segment(
    "caveat",
    `${gaps} ${brief.contradictions.length ? "An unresolved contradiction is on file. Do not treat a recommendation as authorized." : ""} Follow the investigation on Chef Gringo.`.replace(/\s+/g, " ").trim(),
    [],
    [],
    false,
  );
  const recommendation = segment("recommendation", "No purchase or product recommendation is authorized from the current evidence.", [], [], false);
  const cta = segment("cta", ctaCopy(route, brief), [], [], false);
  if (format === "short_form_video") {
    return [segment("hook", question, [], [], false), framing, proof, checklist, caveat, recommendation, cta];
  }
  if (format === "instagram_facebook_post") {
    return [segment("hook", question, [], [], false), framing, proof, caveat, recommendation, cta];
  }
  if (format === "pinterest_pin") {
    return [
      segment("title", pinTitle(question), [], [], false),
      segment("benefit", "Evidence is still incomplete, so this pin cannot promise a result.", [], [], false),
      cta,
    ];
  }
  return [framing, ask, proof, checklist, caveat, recommendation, cta];
}

function problemSegment(brief: ContentIntelligenceBrief): DraftSegment {
  const classification = classifyDraftStatement(brief.primaryUserProblem);
  if (classification === "factual_claim" || classification === "recommendation_advice") {
    return segment("problem", asResearchQuestion(brief.primaryUserProblem), [], [], false);
  }
  return segment("problem", `Problem: ${brief.primaryUserProblem}`, [], [], false);
}

function thesisSegment(brief: ContentIntelligenceBrief): DraftSegment | null {
  const thesis = brief.contentThesis.trim();
  if (!thesis) return null;
  const classification = classifyDraftStatement(thesis);
  if (classification === "framing_context" || classification === "hypothesis_question") {
    return segment("explanation", thesis, [], [], false);
  }
  const mapped = mapStatementToVerifiedFacts(thesis, brief.verifiedFacts);
  if (mapped.length && (classification === "factual_claim" || classification === "recommendation_advice")) {
    return segment("explanation", thesis, mapped.map((item) => item.claimId), mapped.flatMap((item) => item.evidenceRefs), classification === "factual_claim");
  }
  return null;
}

function hookFrom(problem: string) {
  const trimmed = problem.replace(/\.$/, "");
  return `${trimmed}? Here is what accepted evidence currently supports.`;
}

function hookSegment(brief: ContentIntelligenceBrief, blocked: boolean): DraftSegment {
  if (blocked) return segment("hook", asResearchQuestion(brief.primaryUserProblem), [], [], false);
  return segment("hook", hookFrom(brief.primaryUserProblem), [], [], false);
}

function pinTitle(problem: string) {
  const compact = problem.replace(/[.?]/g, "").trim();
  return compact.length > 70 ? `${compact.slice(0, 67).trim()}…` : compact;
}

function pinBenefit(brief: ContentIntelligenceBrief) {
  const fact = brief.verifiedFacts[0];
  if (fact) return fact.claimText;
  return "Evidence is still incomplete, so this pin cannot promise a result.";
}

function ctaCopy(route: CommercialRoutePlan, brief: ContentIntelligenceBrief) {
  if (route.cta === "none" || !route.helpsUserProblem) return "No commercial CTA. Continue with the Chef Gringo article if you want the caveats.";
  if (brief.recommendationReadiness !== "ready" || brief.contradictions.length) {
    return "No commercial CTA. Continue with the Chef Gringo article if you want the caveats.";
  }
  if (route.cta === "use_tool") return `Use the Chef Gringo tool next (${route.destinationPath}).`;
  if (route.cta === "join_email") return "Get the next practical step by email. This is not a product offer.";
  if (route.cta === "compare_products") return `Compare using the verified facts on Chef Gringo (${route.destinationPath}).`;
  if (route.cta === "request_repair") return `If the equipment already failed, request repair/replace help (${route.destinationPath}).`;
  if (route.cta === "request_quote") return `Request a specified quote (${route.destinationPath}).`;
  if (route.cta === "contact_supplier") return `Go to the manufacturer or supplier path (${route.destinationPath}).`;
  if (route.cta === "start_training") return `Continue with the training path (${route.destinationPath}).`;
  return `Read the Chef Gringo guide (${route.destinationPath}).`;
}

function segmentsFromFirewall(traces: DraftStatementTrace[]): DraftSegment[] {
  return traces.flatMap((trace) => {
    if (!trace.emittedText) return [];
    const classification = classifyDraftStatement(trace.emittedText);
    return [segment(
      classification,
      trace.emittedText,
      trace.claimIds,
      trace.evidenceRefs,
      classification === "factual_claim",
    )];
  });
}

function segment(
  role: string,
  text: string,
  claimIds: string[],
  evidenceRefs: SocialEvidenceRef[],
  factual: boolean,
): DraftSegment {
  return { role, text, claimIds, evidenceRefs, factual };
}

function optional(value: DraftSegment | null): DraftSegment[] {
  return value ? [value] : [];
}

function assertNoFabrication(copy: string, allowedSourceText: string) {
  const match = copy.match(FABRICATION);
  if (!match) return;
  if (allowedSourceText.toLowerCase().includes(match[0].toLowerCase())) return;
  throw new Error("Content drafts cannot invent testimonials, statistics, prices, savings, or certifications.");
}

function assertNoProhibitedClaims(copy: string, brief: ContentIntelligenceBrief) {
  for (const item of brief.claimsMustNotMake) {
    if (!item.claimText.trim() || item.claimId.startsWith("live-candidate:")) continue;
    if (copy.includes(item.claimText)) {
      throw new Error("A draft cannot state a claim that accepted evidence does not support.");
    }
  }
}

function assertFactualTrace(segments: DraftSegment[], allowedClaimIds: Set<string>) {
  for (const item of segments) {
    if (!item.factual) continue;
    if (!item.claimIds.length || !item.evidenceRefs.length) {
      throw new Error("Every factual draft statement must trace to an accepted claim and evidence id.");
    }
    if (item.claimIds.some((id) => !allowedClaimIds.has(id))) {
      throw new Error("A draft fact referenced a claim that is not accepted evidence.");
    }
  }
}
