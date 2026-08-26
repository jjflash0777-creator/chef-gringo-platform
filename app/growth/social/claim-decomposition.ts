import { assertNoEconomicsRankingFields } from "./commercial.ts";
import type { EvidenceAuthorityClass } from "./evidence-policy.ts";

/**
 * Claim Decomposition v1. Deterministic Package → atomic claim *proposals*.
 * Proposals are not claims, not evidence, and confer no approval or CI authority.
 * The Package thesis is a hypothesis/goal, never a supported fact.
 */
export const CLAIM_DECOMPOSITION_VERSION = "claim-decomposition-v1";

export const CLAIM_PROPOSAL_STATUSES = ["proposed", "selected", "discarded"] as const;
export type ClaimProposalStatus = typeof CLAIM_PROPOSAL_STATUSES[number];

export const CLAIM_PROPOSAL_KINDS = [
  "factual",
  "diagnostic",
  "safety_boundary",
  "decision_rule",
  "unresolved_question",
] as const;
export type ClaimProposalKind = typeof CLAIM_PROPOSAL_KINDS[number];

export type ClaimProposalSourceField = "thesis" | "usefulness_test" | "problem" | "audience";

export type ClaimProposalSourceTrace = {
  field: ClaimProposalSourceField;
  excerpt: string;
};

export type ClaimProposalDraft = {
  proposalKey: string;
  proposedSlug: string;
  proposedClaimText: string;
  claimKind: ClaimProposalKind;
  whyItMatters: string;
  safetySensitive: boolean;
  recommendedSourceClass: EvidenceAuthorityClass | "especially_authoritative";
  authorityRequirement: string;
  independenceRequirement: string;
  sourceTrace: ClaimProposalSourceTrace;
  thesisIsNotEvidence: true;
};

export type ClaimDecompositionInput = {
  packageId: string;
  packageSlug: string;
  thesis: string;
  packageUsefulnessTest: string;
  problem: string;
  audience: string;
  opportunityUsefulnessTest?: string;
  commercialPosture?: string;
};

export type PersistedClaimProposal = ClaimProposalDraft & {
  id: string;
  packageId: string;
  generationId: string;
  packageFingerprint: string;
  status: ClaimProposalStatus;
  createdClaimId: string | null;
};

const KIND_ORDER: Record<ClaimProposalKind, number> = {
  safety_boundary: 0,
  diagnostic: 1,
  decision_rule: 2,
  factual: 3,
  unresolved_question: 4,
};

const SAFETY_SIGNALS: Array<{ id: string; pattern: RegExp; authority: EvidenceAuthorityClass | "especially_authoritative" }> = [
  { id: "electrical", pattern: /\b(electrical|electric shock|live wire|wiring work|voltage|breaker panel|capacitor)\b/i, authority: "especially_authoritative" },
  { id: "refrigerant", pattern: /\b(refrigerant|freon|recover(?:y|ing) (?:the )?charge)\b/i, authority: "especially_authoritative" },
  { id: "food_safety", pattern: /\b(food safety|foodborne|haccp|time[\s/-]*temperature|danger zone|hold(?:ing)? temperature)\b/i, authority: "government_regulatory" },
  { id: "fire", pattern: /\b(fire hazard|flammable|combustion|open flame)\b/i, authority: "especially_authoritative" },
  { id: "gas", pattern: /\b(natural gas|propane|carbon monoxide|gas leak|gas appliance)\b/i, authority: "especially_authoritative" },
  { id: "pressure", pattern: /\b(pressure vessel|overpressure|\b\d+\s*psi\b|pressurized)\b/i, authority: "especially_authoritative" },
  { id: "chemical", pattern: /\b(toxic|poison(?:ous)?|corrosive|hazardous chemical)\b/i, authority: "especially_authoritative" },
  { id: "regulatory", pattern: /\b(osha|regulatory|building code|electrical code|licensed technician|ssns?|social security|\bpii\b)\b/i, authority: "government_regulatory" },
];

const REPAIR_INSTRUCTION = /\b(rewire|recharg(?:e|ing)|add refrigerant|bypass (?:the )?safet|replace the (?:compressor|capacitor|board)|diy repair|how to repair)\b/i;
const EQUIPMENT_BEHAVIOR = /\b(setpoint|defrost cycle|nameplate|model[- ]specific|this equipment|equipment manual|operating specification)\b/i;
const DIAGNOSTIC_VERB = /\b(verify|identify|observe|check|inspect|measure|export|reconcile|confirm|read(?:ing)?)\b/i;
const ESCALATION = /\b(qualified|licensed|professional|technician|service company|escalat)/i;
const DECISION_VERB = /\b(should be able to|determine when|before submitting|discard|do not|must not|recognize conditions)\b/i;
const THRESHOLD_PATTERN = "(\\d+(?:\\.\\d+)?)\\s*(?:°\\s*[fc]|degrees?\\s*[fc]|psi|psig|volts?|vac|vdc|amps?|hours?|hrs?|minutes?|mins?|seconds?|%|percent)\\b";

function thresholdMatches(text: string) {
  return [...text.matchAll(new RegExp(THRESHOLD_PATTERN, "gi"))];
}

function hasThreshold(text: string) {
  return thresholdMatches(text).length > 0;
}

function fingerprintMaterial(input: ClaimDecompositionInput) {
  return stableKey([
    input.packageId,
    input.thesis,
    input.packageUsefulnessTest,
    input.problem,
    input.audience,
    input.opportunityUsefulnessTest ?? "",
  ].join("\n"));
}

export function packageDecompositionFingerprint(input: ClaimDecompositionInput) {
  return fingerprintMaterial(input);
}

export function normalizeClaimProposalText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function claimProposalKey(kind: ClaimProposalKind, claimText: string) {
  return `${kind}:${normalizeClaimProposalText(claimText)}`;
}

function stableKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function excerptOf(value: string, limit = 180) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= limit ? compact : `${compact.slice(0, limit - 1).trim()}…`;
}

function detectedSafetySignals(text: string) {
  return SAFETY_SIGNALS.filter((item) => item.pattern.test(text));
}

function strongestAuthority(signals: ReturnType<typeof detectedSafetySignals>): EvidenceAuthorityClass | "especially_authoritative" {
  if (signals.some((item) => item.authority === "especially_authoritative")) return "especially_authoritative";
  if (signals.some((item) => item.authority === "government_regulatory")) return "government_regulatory";
  if (signals.some((item) => item.authority === "code_standard")) return "code_standard";
  return "primary_documentation";
}

const ABILITY_VERB = /\b(verify|identify|observe|check|inspect|measure|export|reconcile|confirm|name|produce|keep|recognize|determine|avoid|discard|hold|submit|perform|read)\b/i;

function splitAbilityItems(rest: string) {
  const items = rest
    .split(/\s*,\s*(?:and\s+)?|\s+and\s+/i)
    .map((item) => item.replace(/[.]+$/, "").trim())
    .filter(Boolean);
  if (items.length <= 1) return items;
  if (items.every((item) => ABILITY_VERB.test(item))) return items;
  return [rest.replace(/[.]+$/, "").trim()];
}

function splitCompoundClauses(text: string) {
  const clauses: string[] = [];
  const thereforeParts = text.split(/\s*(?:\band therefore\b|\btherefore\b|,?\s*\band then\b)\s*/i);
  for (const part of thereforeParts) {
    for (const sentence of part.split(/(?<=[.!?])\s+|\s*;\s+/)) {
      const andParts = sentence.split(/\s*,\s*and\s+/i);
      const independent = andParts.length > 1 && andParts.every((item) => ABILITY_VERB.test(item) || /\b(should|must|discard|hold|cause)\b/i.test(item))
        ? andParts
        : [sentence];
      for (const chunk of independent) {
        const trimmed = chunk.replace(/\s+/g, " ").trim().replace(/^[,.\s]+|[,.\s]+$/g, "");
        if (trimmed) clauses.push(trimmed);
      }
    }
  }
  return clauses.filter((item) => item.length > 12);
}

function looksLikeRepairInstruction(text: string) {
  return REPAIR_INSTRUCTION.test(text);
}

function proposedSlug(kind: ClaimProposalKind, text: string, key: string) {
  const fromText = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 52);
  const suffix = stableKey(key).slice(0, 8);
  const base = fromText && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fromText)
    ? fromText
    : kind.replace(/_/g, "-");
  return `${base}-${suffix}`.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function authorityCopy(recommended: EvidenceAuthorityClass | "especially_authoritative", safetySensitive: boolean) {
  if (recommended === "especially_authoritative" || safetySensitive) {
    return "Especially authoritative source required: government/regulatory, applicable code/standard, or recognized professional authority. Manufacturer copy alone is not sufficient.";
  }
  if (recommended === "government_regulatory") {
    return "Begin with government/regulatory primary sources for this threshold or obligation.";
  }
  if (recommended === "manufacturer_technical" || recommended === "equipment_manual") {
    return "Begin with manufacturer technical documentation or the applicable equipment manual.";
  }
  if (recommended === "industry_organization") {
    return "Begin with a recognized technical or professional organization, plus independent corroboration.";
  }
  return "Begin with an accepted primary documentation source. Editorial and lead-only material are not sufficient.";
}

function independenceCopy(recommended: EvidenceAuthorityClass | "especially_authoritative", safetySensitive: boolean, kind: ClaimProposalKind) {
  if (safetySensitive || recommended === "especially_authoritative") {
    return "One especially authoritative accepted source covering the safety/regulatory proposition; manufacturer-only material cannot corroborate itself.";
  }
  if (kind === "decision_rule" || recommended === "industry_organization") {
    return "Two independent credible sources, or one especially authoritative source that covers the full rule.";
  }
  return "One accepted independent primary source is the starting sufficiency target.";
}

function whyItMatters(kind: ClaimProposalKind, usefulness: string) {
  const useful = excerptOf(usefulness || "the package usefulness test");
  if (kind === "safety_boundary") return `The usefulness test cannot be satisfied if the operator is steered into unsafe action. This boundary must be evidenced independently of the package thesis. Usefulness test: ${useful}`;
  if (kind === "diagnostic") return `The usefulness test depends on an operator-observable check that Evidence Intelligence can evaluate on its own. Usefulness test: ${useful}`;
  if (kind === "decision_rule") return `The usefulness test is a decision outcome. This rule must be evidenced before the package can claim the operator can act on it. Usefulness test: ${useful}`;
  if (kind === "unresolved_question") return `An assumption or numerical threshold is embedded in the package text. It is a research question, not a fact, until existing evidence supports it. Usefulness test: ${useful}`;
  return `This proposition is independently testable and is required to make the usefulness test evaluable. Usefulness test: ${useful}`;
}

function recommendSourceClass(input: {
  text: string;
  kind: ClaimProposalKind;
  signals: ReturnType<typeof detectedSafetySignals>;
}): EvidenceAuthorityClass | "especially_authoritative" {
  if (input.signals.length) return strongestAuthority(input.signals);
  if (input.kind === "safety_boundary") return "especially_authoritative";
  if (hasThreshold(input.text) && /\b(food|temperature|hold|discard)\b/i.test(input.text)) return "government_regulatory";
  if (EQUIPMENT_BEHAVIOR.test(input.text)) return "manufacturer_technical";
  if (input.kind === "decision_rule" || input.kind === "diagnostic") return "industry_organization";
  return "primary_documentation";
}

function toDraft(input: {
  text: string;
  kind: ClaimProposalKind;
  field: ClaimProposalSourceField;
  excerpt: string;
  usefulness: string;
}): ClaimProposalDraft {
  const text = input.text.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
  const localSignals = detectedSafetySignals(text);
  const safetySensitive = input.kind === "safety_boundary" || localSignals.length > 0;
  const recommended = recommendSourceClass({ text, kind: input.kind, signals: localSignals });
  const key = claimProposalKey(input.kind, text);
  return {
    proposalKey: key,
    proposedSlug: proposedSlug(input.kind, text, key),
    proposedClaimText: text.endsWith("?") ? text : `${text}.`,
    claimKind: input.kind,
    whyItMatters: whyItMatters(input.kind, input.usefulness),
    safetySensitive,
    recommendedSourceClass: recommended,
    authorityRequirement: authorityCopy(recommended, safetySensitive),
    independenceRequirement: independenceCopy(recommended, safetySensitive, input.kind),
    sourceTrace: { field: input.field, excerpt: excerptOf(input.excerpt) },
    thesisIsNotEvidence: true,
  };
}

function classifyClause(clause: string): ClaimProposalKind {
  if (looksLikeRepairInstruction(clause) || /^without\b/i.test(clause) || /\b(avoid|do not|must not|unsafe)\b/i.test(clause)) {
    return "safety_boundary";
  }
  if (hasThreshold(clause)) return "unresolved_question";
  if (ESCALATION.test(clause) || DECISION_VERB.test(clause)) return "decision_rule";
  if (DIAGNOSTIC_VERB.test(clause)) return "diagnostic";
  return "factual";
}

function rewriteThresholdAsResearch(clause: string) {
  const matches = thresholdMatches(clause);
  if (!matches.length) return clause;
  const values = matches.map((item) => item[0].replace(/\s+/g, " "));
  return `Whether ${values.join(" and ")} is an applicable evidenced threshold for: ${clause.replace(new RegExp(THRESHOLD_PATTERN, "gi"), "this measured value").replace(/\s+/g, " ").trim()}`;
}

function rewriteRepairAsBoundary(clause: string) {
  const action = clause.replace(/^without\s+/i, "").replace(/[.]+$/g, "").replace(/\s+/g, " ").trim();
  return `Operators must not treat “${action}” as an authorized procedure until an especially authoritative source says otherwise`;
}

function pushClause(
  drafts: ClaimProposalDraft[],
  raw: string,
  field: ClaimProposalSourceField,
  excerpt: string,
  usefulness: string,
) {
  const clause = raw.replace(/\s+/g, " ").trim();
  if (clause.length < 12) return;
  let kind = classifyClause(clause);
  let claimText = clause;
  if (kind === "unresolved_question" || hasThreshold(clause)) {
    kind = "unresolved_question";
    claimText = rewriteThresholdAsResearch(clause);
  } else if (looksLikeRepairInstruction(clause) || /^without\b/i.test(clause)) {
    kind = "safety_boundary";
    claimText = rewriteRepairAsBoundary(clause);
  }
  drafts.push(toDraft({
    text: claimText,
    kind,
    field,
    excerpt,
    usefulness,
  }));
}

function collectFromField(
  field: ClaimProposalSourceField,
  text: string,
  usefulness: string,
  drafts: ClaimProposalDraft[],
) {
  if (!text.trim()) return;
  const withoutParts = text.split(/,?\s*\bwithout\b/i);
  const main = withoutParts[0] ?? "";
  for (const extra of withoutParts.slice(1)) {
    pushClause(drafts, `without ${extra}`, field, text, usefulness);
  }
  const able = main.match(/\bshould be able to\b/i);
  if (able && able.index !== undefined) {
    const prefix = main.slice(0, able.index).trim();
    if (prefix.length > 24 && (hasThreshold(prefix) || ABILITY_VERB.test(prefix) || DIAGNOSTIC_VERB.test(prefix))) {
      pushClause(drafts, prefix, field, text, usefulness);
    }
    const rest = main.slice(able.index + able[0].length).replace(/[.]+$/, "").trim();
    for (const item of splitAbilityItems(rest)) {
      pushClause(drafts, `The operator should be able to ${item}`, field, text, usefulness);
    }
    return;
  }
  const clauses = splitCompoundClauses(main);
  for (const clause of (clauses.length ? clauses : [main])) {
    pushClause(drafts, clause, field, text, usefulness);
  }
}

export function decomposePackageToClaimProposals(input: ClaimDecompositionInput): ClaimProposalDraft[] {
  assertNoEconomicsRankingFields(input as unknown as Record<string, unknown>);
  const thesis = input.thesis.trim();
  const usefulness = input.packageUsefulnessTest.trim() || input.opportunityUsefulnessTest?.trim() || "";
  const problem = input.problem.trim();
  const drafts: ClaimProposalDraft[] = [];

  collectFromField("thesis", thesis, usefulness, drafts);
  collectFromField("usefulness_test", usefulness, usefulness, drafts);
  if (problem && normalizeClaimProposalText(problem) !== normalizeClaimProposalText(thesis)) {
    collectFromField("problem", problem, usefulness, drafts);
  }
  if (input.audience.trim()) {
    drafts.push(toDraft({
      text: `The stated audience (${input.audience.trim()}) is the operator this usefulness test is scoped to`,
      kind: "unresolved_question",
      field: "audience",
      excerpt: input.audience,
      usefulness,
    }));
  }

  const seen = new Set<string>();
  const unique: ClaimProposalDraft[] = [];
  for (const draft of drafts) {
    if (seen.has(draft.proposalKey)) continue;
    seen.add(draft.proposalKey);
    unique.push(draft);
  }
  unique.sort((left, right) => KIND_ORDER[left.claimKind] - KIND_ORDER[right.claimKind] || left.proposedClaimText.localeCompare(right.proposedClaimText));
  void input.commercialPosture;
  return unique;
}

export function isClaimProposalStatus(value: string): value is ClaimProposalStatus {
  return (CLAIM_PROPOSAL_STATUSES as readonly string[]).includes(value);
}

export function isClaimProposalKind(value: string): value is ClaimProposalKind {
  return (CLAIM_PROPOSAL_KINDS as readonly string[]).includes(value);
}

export function claimHasAttachedEvidence(claim: {
  evidence?: { id?: string } | null;
  evidenceRefs?: Array<{ id?: string }>;
}) {
  if (claim.evidenceRefs?.some((ref) => Boolean(ref.id?.trim()))) return true;
  return Boolean(claim.evidence?.id?.trim());
}
