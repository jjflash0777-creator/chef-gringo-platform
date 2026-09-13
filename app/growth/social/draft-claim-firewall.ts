/**
 * Deterministic Draft Claim Firewall. Inspects generated text, not segment.factual flags.
 * Does not publish, accept evidence, spend, or contact partners.
 */

import type { SocialEvidenceRef } from "./claims.ts";
import type {
  CommercialRoutePlan,
  ContentIntelligenceBrief,
  VerifiedContentFact,
} from "./content-intelligence.ts";

export const DRAFT_CLAIM_FIREWALL_VERSION = "draft-claim-firewall-v1";

export const DRAFT_STATEMENT_CLASSES = [
  "factual_claim",
  "recommendation_advice",
  "hypothesis_question",
  "framing_context",
  "cta",
] as const;
export type DraftStatementClass = typeof DRAFT_STATEMENT_CLASSES[number];

export const DRAFT_FIREWALL_STATUSES = ["passed", "blocked", "transformed"] as const;
export type DraftFirewallStatus = typeof DRAFT_FIREWALL_STATUSES[number];

export type DraftStatementTrace = {
  text: string;
  emittedText: string | null;
  classification: DraftStatementClass;
  authorized: boolean;
  claimIds: string[];
  evidenceRefs: SocialEvidenceRef[];
  action: "kept" | "transformed" | "removed";
  reason: string;
};

export type DraftClaimFirewallResult = {
  version: typeof DRAFT_CLAIM_FIREWALL_VERSION;
  status: DraftFirewallStatus;
  factualStatementsAuthorized: number;
  recommendationsAuthorized: number;
  statementsTransformed: number;
  statementsRemoved: number;
  traces: DraftStatementTrace[];
};

const HEDGE = /\b(may|might|could|possibly|perhaps|potentially)\b/gi;
const UNIVERSAL = /\b(always|never|every|everyone|all cases|guaranteed|in every)\b/i;
const NUMBER = /\b\d+(\.\d+)?\s?(%|percent|kwh|kw|watts?|volts?|amps?|dollars?)?\b/i;
const SAFETY = /\b(safe(?:ty|st)?|unsafe|shock|electrocution|fire hazard|injury-free|will not hurt)\b/i;
const SAVINGS = /\b(save[s]?\s?\$|\d+\s?% (?:cheaper|savings)|cheaper than|payback)\b/i;
const PERFORMANCE = /\b(lasts \d+|more (?:powerful|efficient) than|certified|testimonial)\b/i;
const COMPARISON = /\b(better than|worse than|vs\.?|versus)\b/i;
const CAUSAL = /\b(prevents?|eliminates?|ensures?|guarantees?|will never)\b/i;
const METHOD_ADVICE = /\b(should|must|need to|have to|ought|recommended|recommend that|by calculating|by adding|add reasonable|can \w+ more (?:accurately|safely|efficiently) by|operators can)\b/i;
const SIZE_GENERATOR = /\b(size a generator|generator sizing|sizing a generator)\b/i;
const HEADROOM = /\b(headroom|reserve capacity|operating (?:margin|headroom)|oversiz)\b/i;
const STARTUP = /\b(startup loads?|startup demand|startup watt|starting loads?|starting demand|surge)\b/i;
const SAID_PREFIX = /^what can be said from accepted evidence:\s*/i;
const STOP = new Set([
  "the", "and", "for", "that", "with", "from", "this", "their", "they", "are", "was", "were",
  "has", "have", "been", "not", "but", "you", "your", "our", "into", "about", "than", "then",
  "can", "may", "more", "still", "also", "just", "only",
]);

const RESEARCH_FRAMING = [
  /\?$/,
  /\bchef gringo is still verifying\b/i,
  /\bchef gringo has not verified\b/i,
  /\bwhat still needs to be verified\b/i,
  /\bevidence is still incomplete\b/i,
  /\bbefore recommending\b/i,
  /\bbefore treating this as guidance\b/i,
  /\bunresolved:\b/i,
  /\bbefore a (?:capacity range|recommendation) (?:is|can be)\b/i,
];

const FRAMING = [
  /\blive discovery candidates are not evidence\b/i,
  /\bno accepted evidence is available\b/i,
  /\bno purchase or product recommendation is authorized\b/i,
  /\bdo not treat a recommendation as authorized\b/i,
  /\bchef gringo is investigating\b/i,
  /\bthis pin cannot promise\b/i,
  /\bcompare options only against verified facts\b/i,
  /\bdo not invent\b/i,
  /\bfollow the investigation\b/i,
  /\bquestions to investigate\b/i,
  /\bproblem under investigation\b/i,
  /\bwithout recommending\b/i,
  /\bdo not recommend a product\b/i,
  /\bdo not compare products until\b/i,
  /\bunresolved contradiction is on file\b/i,
  /\bchef gringo has not authorized a recommendation\b/i,
  /\bcannot authorize a recommendation\b/i,
  /\bwait for chef gringo to verify\b/i,
  /\bno statistic is stated here\b/i,
  /\bhere is what accepted evidence currently supports\b/i,
];

const CTA = [
  /\bno commercial cta\b/i,
  /\bcontinue with the chef gringo article\b/i,
  /\buse the chef gringo tool\b/i,
  /\bget the next practical step by email\b/i,
  /\bread the chef gringo guide\b/i,
  /\bfollow the investigation on chef gringo\b/i,
  /\brequest a (?:specified )?quote\b/i,
  /\brequest repair\b/i,
  /\bcompare using the verified facts\b/i,
  /\bcompare products\b/i,
  /\bbuy this\b/i,
  /\bshop now\b/i,
  /\baffiliate link\b/i,
  /\bcontact the (?:manufacturer|supplier)\b/i,
  /\bstart the training\b/i,
  /\bgo to the manufacturer\b/i,
];

const COMMERCIAL_CTA = [
  /\bbuy this\b/i,
  /\bshop now\b/i,
  /\baffiliate\b/i,
  /\brequest a (?:specified )?quote\b/i,
  /\brequest repair\b/i,
  /\bcompare using the verified facts\b/i,
  /\bcompare products\b/i,
  /\bcontact the (?:manufacturer|supplier)\b/i,
  /\bstart the training\b/i,
  /\bgo to the manufacturer or supplier\b/i,
  /\/(marketplace|services\/repair|partners)\b/i,
];

const SAFE_NO_COMMERCIAL_CTA = "No commercial CTA. Continue with the Chef Gringo article if you want the caveats.";

export function splitDraftStatements(text: string): string[] {
  const blocks = text.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  const statements: string[] = [];
  for (const block of blocks) {
    const parts = block.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [block];
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) statements.push(trimmed);
    }
  }
  return statements;
}

export function classifyDraftStatement(text: string): DraftStatementClass {
  const trimmed = text.trim();
  if (!trimmed) return "framing_context";
  if (matches(trimmed, CTA)) return "cta";
  if (matches(trimmed, RESEARCH_FRAMING)) return "hypothesis_question";
  if (matches(trimmed, FRAMING)) return "framing_context";
  const asserted = stripHedges(stripSaidPrefix(trimmed));
  if (METHOD_ADVICE.test(asserted) || /^(write|add|use|choose|buy|size|calculate|account for)\b/i.test(asserted)) {
    return "recommendation_advice";
  }
  if (UNIVERSAL.test(asserted) || SAFETY.test(asserted) || SAVINGS.test(asserted) || PERFORMANCE.test(asserted) || NUMBER.test(asserted) || isDeclarativeFact(asserted)) {
    return "factual_claim";
  }
  return "framing_context";
}

export function statementBroadensClaim(statement: string, claimText: string): boolean {
  const rest = stripSaidPrefix(statement);
  if (normalize(rest) === normalize(claimText)) return false;
  const extras = scopeTokens(rest).filter((token) => !normalize(claimText).includes(normalize(token)));
  return extras.length > 0;
}

export function mapStatementToVerifiedFacts(statement: string, facts: VerifiedContentFact[]): VerifiedContentFact[] {
  const rest = stripSaidPrefix(statement);
  return facts.filter((fact) => {
    if (statementBroadensClaim(rest, fact.claimText)) return false;
    if (containsNormalized(rest, fact.claimText) || containsNormalized(fact.claimText, rest)) return true;
    return jaccard(contentWords(rest), contentWords(fact.claimText)) >= 0.45;
  });
}

export function hedgesDoNotAuthorize(text: string) {
  return classifyDraftStatement(text) === "factual_claim" || classifyDraftStatement(text) === "recommendation_advice";
}

export function transformUnsupportedStatement(text: string, classification: DraftStatementClass): { text: string; reason: string } {
  const asserted = stripHedges(text);
  if (NUMBER.test(asserted) && classification !== "hypothesis_question") {
    return {
      text: "Chef Gringo has not verified a numeric rule from accepted evidence, so no statistic is stated here.",
      reason: "Unsupported number/statistic was rewritten as research framing.",
    };
  }
  if (UNIVERSAL.test(asserted)) {
    return {
      text: "Chef Gringo has not verified a universal rule from accepted evidence.",
      reason: "Unsupported universal was rewritten as research framing.",
    };
  }
  if (SAFETY.test(asserted)) {
    return {
      text: "Chef Gringo has not verified a safety conclusion from accepted evidence.",
      reason: "Unsupported safety claim was rewritten as research framing.",
    };
  }
  if (SAVINGS.test(asserted) || PERFORMANCE.test(asserted)) {
    return {
      text: "Chef Gringo has not verified savings or product-performance claims from accepted evidence.",
      reason: "Unsupported savings or performance claim was rewritten as research framing.",
    };
  }
  if (HEADROOM.test(asserted) && classification === "recommendation_advice") {
    return {
      text: "How much reserve capacity is appropriate after running and startup demand are calculated?",
      reason: "Unsupported headroom advice was rewritten as a research question.",
    };
  }
  if (STARTUP.test(asserted) && /\b(require|need|larger|bigger|must)\b/i.test(asserted)) {
    return {
      text: "Chef Gringo is still verifying how startup demand should affect generator sizing before recommending a capacity range.",
      reason: "Unsupported startup-sizing claim was rewritten as research framing.",
    };
  }
  if (SIZE_GENERATOR.test(asserted)) {
    return {
      text: "What still needs to be verified about generator sizing before a capacity range can be recommended?",
      reason: "Unsupported sizing method was rewritten as a research question.",
    };
  }
  if (classification === "recommendation_advice") {
    const topic = asserted.replace(/^(.*?)((?:should|must|need to|have to|can)\s+)/i, "").replace(/[.?]+$/, "").trim();
    return {
      text: `What still needs to be verified before treating this as guidance: ${topic || "the proposed method"}?`,
      reason: "Unsupported recommendation was rewritten as a research question.",
    };
  }
  return {
    text: "Chef Gringo is still verifying this point before stating it as fact.",
    reason: "Unsupported factual statement was rewritten as research framing.",
  };
}

export function asResearchQuestion(text: string): string {
  const trimmed = text.trim().replace(/[.?]+$/, "");
  if (!trimmed) return "What has Chef Gringo not yet verified from accepted evidence?";
  const classified = classifyDraftStatement(`${trimmed}.`);
  if (classified === "hypothesis_question") return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
  if (classified === "factual_claim" || classified === "recommendation_advice") {
    return transformUnsupportedStatement(`${trimmed}.`, classified).text;
  }
  return `What still needs to be verified about this problem: ${trimmed}?`;
}

export function applyDraftClaimFirewall(input: {
  copy: string;
  brief: ContentIntelligenceBrief;
  route: CommercialRoutePlan;
}): { copy: string; claimFirewall: DraftClaimFirewallResult } {
  const traces: DraftStatementTrace[] = [];
  const emitted: string[] = [];
  const seen = new Set<string>();
  for (const statement of splitDraftStatements(input.copy)) {
    const commercial = applyCommercialFirewall(statement, input.route);
    if (commercial) {
      if (commercial.emittedText) pushUnique(emitted, seen, commercial.emittedText);
      traces.push(commercial);
      continue;
    }
    const classification = classifyDraftStatement(statement);
    if (classification === "cta" || classification === "framing_context" || classification === "hypothesis_question") {
      pushUnique(emitted, seen, statement);
      traces.push({
        text: statement,
        emittedText: statement,
        classification,
        authorized: true,
        claimIds: [],
        evidenceRefs: [],
        action: "kept",
        reason: "Non-assertive copy may appear without a verified fact.",
      });
      continue;
    }
    const mapped = mapStatementToVerifiedFacts(statement, input.brief.verifiedFacts);
    const authorized = classification === "factual_claim"
      ? authorizeFact(mapped, input.brief)
      : authorizeRecommendation(mapped, input.brief, input.route);
    if (authorized.ok) {
      pushUnique(emitted, seen, statement);
      traces.push({
        text: statement,
        emittedText: statement,
        classification,
        authorized: true,
        claimIds: mapped.map((item) => item.claimId),
        evidenceRefs: uniqueRefs(mapped.flatMap((item) => item.evidenceRefs)),
        action: "kept",
        reason: authorized.reason,
      });
      continue;
    }
    const transformed = transformUnsupportedStatement(statement, classification);
    const nextClass = classifyDraftStatement(transformed.text);
    if (nextClass === "factual_claim" || nextClass === "recommendation_advice") {
      traces.push({
        text: statement,
        emittedText: null,
        classification,
        authorized: false,
        claimIds: [],
        evidenceRefs: [],
        action: "removed",
        reason: `${authorized.reason} Transformation stayed assertive, so the sentence was removed.`,
      });
      continue;
    }
    pushUnique(emitted, seen, transformed.text);
    traces.push({
      text: statement,
      emittedText: transformed.text,
      classification,
      authorized: false,
      claimIds: [],
      evidenceRefs: [],
      action: "transformed",
      reason: `${authorized.reason} ${transformed.reason}`,
    });
  }

  const copy = emitted.join("\n\n");
  for (const leftover of splitDraftStatements(copy)) {
    const classification = classifyDraftStatement(leftover);
    if (classification !== "factual_claim" && classification !== "recommendation_advice") continue;
    const mapped = mapStatementToVerifiedFacts(leftover, input.brief.verifiedFacts);
    const authorized = classification === "factual_claim"
      ? authorizeFact(mapped, input.brief)
      : authorizeRecommendation(mapped, input.brief, input.route);
    if (!authorized.ok || !mapped.length || mapped.some((item) => !item.evidenceRefs.length)) {
      throw new Error("Draft Claim Firewall refused to emit unauthorized factual or recommendation copy.");
    }
  }

  const factualStatementsAuthorized = traces.filter((item) => item.classification === "factual_claim" && item.authorized && item.action === "kept").length;
  const recommendationsAuthorized = traces.filter((item) => item.classification === "recommendation_advice" && item.authorized && item.action === "kept").length;
  const statementsTransformed = traces.filter((item) => item.action === "transformed").length;
  const statementsRemoved = traces.filter((item) => item.action === "removed").length;
  const recommendationBlocked = input.brief.contradictions.length > 0 || input.brief.recommendationReadiness !== "ready";
  const status: DraftFirewallStatus = recommendationBlocked && recommendationsAuthorized === 0
    ? "blocked"
    : statementsTransformed || statementsRemoved
      ? "transformed"
      : "passed";

  return {
    copy,
    claimFirewall: {
      version: DRAFT_CLAIM_FIREWALL_VERSION,
      status,
      factualStatementsAuthorized,
      recommendationsAuthorized,
      statementsTransformed,
      statementsRemoved,
      traces,
    },
  };
}

export function everyRemainingAssertiveStatementIsAuthorized(copy: string, brief: ContentIntelligenceBrief, route: CommercialRoutePlan) {
  return splitDraftStatements(copy).every((statement) => {
    const classification = classifyDraftStatement(statement);
    if (classification !== "factual_claim" && classification !== "recommendation_advice") return true;
    const mapped = mapStatementToVerifiedFacts(statement, brief.verifiedFacts);
    const authorized = classification === "factual_claim"
      ? authorizeFact(mapped, brief)
      : authorizeRecommendation(mapped, brief, route);
    return authorized.ok && mapped.length > 0 && mapped.every((item) => item.evidenceRefs.length > 0);
  });
}

function authorizeFact(mapped: VerifiedContentFact[], brief: ContentIntelligenceBrief) {
  if (brief.liveDiscoveryIsNotEvidence && mapped.length === 0) {
    return { ok: false, reason: "No accepted verified fact authorizes this statement. Live discovery candidates are not evidence." };
  }
  if (!mapped.length) return { ok: false, reason: "Statement does not map to an accepted verified fact." };
  if (mapped.some((item) => !item.evidenceRefs.length)) {
    return { ok: false, reason: "Mapped fact is missing evidence references." };
  }
  return { ok: true, reason: "Statement stays inside accepted verified facts and carries claim/evidence ids." };
}

function authorizeRecommendation(mapped: VerifiedContentFact[], brief: ContentIntelligenceBrief, route: CommercialRoutePlan) {
  if (brief.contradictions.length) {
    return { ok: false, reason: "A contradiction blocks recommendation language." };
  }
  if (brief.recommendationReadiness !== "ready") {
    return { ok: false, reason: "Recommendation readiness is not ready." };
  }
  const factAuth = authorizeFact(mapped, brief);
  if (!factAuth.ok) return factAuth;
  if (route.route === "no_commercial_cta" && route.cta === "none") {
    return { ok: true, reason: "Non-commercial recommendation restates accepted evidence only." };
  }
  return { ok: true, reason: "Recommendation restates accepted evidence and the route is otherwise authorized." };
}

function applyCommercialFirewall(statement: string, route: CommercialRoutePlan): DraftStatementTrace | null {
  if (route.route !== "no_commercial_cta" && route.cta !== "none") return null;
  if (!matches(statement, COMMERCIAL_CTA)) return null;
  return {
    text: statement,
    emittedText: SAFE_NO_COMMERCIAL_CTA,
    classification: "cta",
    authorized: true,
    claimIds: [],
    evidenceRefs: [],
    action: "transformed",
    reason: "Commercial CTA wording was removed because the route is no commercial CTA.",
  };
}

function isDeclarativeFact(text: string) {
  return /\b(is|are|requires?|cause[sd]?|prevents?|includes?|equals?|means?|accounts? for)\b/i.test(text)
    || NUMBER.test(text);
}

function stripHedges(text: string) {
  return text.replace(HEDGE, " ").replace(/\s+/g, " ").trim();
}

function stripSaidPrefix(text: string) {
  return text.replace(SAID_PREFIX, "").trim();
}

function scopeTokens(text: string): string[] {
  const patterns = [NUMBER, UNIVERSAL, SAFETY, SAVINGS, PERFORMANCE, COMPARISON, CAUSAL];
  const tokens: string[] = [];
  for (const pattern of patterns) {
    const match = text.match(new RegExp(pattern.source, "gi"));
    if (match) tokens.push(...match);
  }
  return tokens;
}

function contentWords(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP.has(word)),
  );
}

function jaccard(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const word of left) if (right.has(word)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9%\s]/g, " ").replace(/\s+/g, " ").trim();
}

function containsNormalized(haystack: string, needle: string) {
  const left = normalize(haystack);
  const right = normalize(needle);
  return Boolean(left && right && left.includes(right));
}

function matches(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function uniqueRefs(refs: SocialEvidenceRef[]): SocialEvidenceRef[] {
  const seen = new Set<string>();
  const unique: SocialEvidenceRef[] = [];
  for (const ref of refs) {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ref);
  }
  return unique;
}

function pushUnique(emitted: string[], seen: Set<string>, text: string) {
  const key = normalize(text);
  if (!key || seen.has(key)) return;
  seen.add(key);
  emitted.push(text);
}
