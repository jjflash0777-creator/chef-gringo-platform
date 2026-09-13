/**
 * Deterministic claim-coverage / entailment layer.
 *
 * Authority, topical relevance, claim coverage, and policy advancement are
 * separate dimensions. A trustworthy source is not evidence for a proposition
 * merely because its text shares adjacent vocabulary.
 *
 * No LLM. Requirements are derived from the claim's structure, not from a
 * domain dictionary. Generic stopwords and syntactic normalization only.
 */

import {
  activatedConceptGroups,
  splitResearchPassages,
  supportGroupThreshold,
} from "../../lib/research/passage-match.ts";
import { assertNoEvidenceEconomics } from "./evidence-policy.ts";
import {
  evaluateSubjectGrounding,
  parseSubjectGroundingState,
  relationStructureMatches,
  subjectGroundingAllowsContradiction,
  subjectGroundingIsSufficientForDirect,
  type SubjectGroundingAssessment,
  type SubjectGroundingState,
} from "./subject-grounding.ts";

export const CLAIM_COVERAGE_VERSION = "claim-coverage-v2";

export const CLAIM_COVERAGE_STATES = ["direct", "partial", "context_only", "none", "contradicts"] as const;
export type ClaimCoverageState = typeof CLAIM_COVERAGE_STATES[number];

export const TOPICAL_RELEVANCE_STATES = ["relevant", "partial", "irrelevant"] as const;
export type TopicalRelevanceState = typeof TOPICAL_RELEVANCE_STATES[number];

export const CLAIM_RELATION_FAMILIES = [
  "prohibition",
  "permission",
  "requirement",
  "causation",
  "comparison",
  "threshold",
  "safety_boundary",
  "diagnostic",
] as const;
export type ClaimRelationFamily = typeof CLAIM_RELATION_FAMILIES[number];

export type ClaimCoverageRequirement = {
  id: string;
  kind: "actor" | "activity" | "subject" | "concept_group" | "quantity";
  tokens: string[];
  alternatives: boolean;
};

export type ClaimCoverageAssessment = {
  version: typeof CLAIM_COVERAGE_VERSION;
  state: ClaimCoverageState;
  topicalRelevance: TopicalRelevanceState;
  subjectGrounding: SubjectGroundingState;
  subjectGroundingReason: string;
  relationMatched: boolean;
  relationFamilies: ClaimRelationFamily[];
  quantityMatched: boolean | null;
  coveredRequirementIds: string[];
  missingRequirementIds: string[];
  requirements: ClaimCoverageRequirement[];
  reason: string;
  subjectGroundingAssessment?: SubjectGroundingAssessment;
};

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "for", "from", "with", "without",
  "that", "this", "these", "those", "should", "would", "could", "must", "may",
  "be", "is", "are", "was", "were", "been", "being", "under", "above", "not",
  "as", "by", "at", "in", "on", "it", "its", "than", "then", "also", "any",
  "all", "both", "into", "over", "after", "before", "about", "between", "through",
  "can", "will", "do", "does", "did", "have", "has", "had", "if", "when", "where",
  "which", "who", "whom", "what", "how", "why", "their", "them", "they", "our",
  "whether", "able", "itself", "themselves",
]);

/**
 * Generic high-frequency words that appear in many regulatory/policy texts.
 * Matching these alone never establishes a material concept group.
 */
const WEAK_GENERIC_TOKENS = new Set([
  "action", "actions", "situation", "situations", "personnel", "person", "people",
  "prevent", "prevents", "preventing", "correct", "corrects", "correcting",
  "immediate", "immediately", "system", "systems", "general", "including",
  "using", "used", "make", "makes", "making", "take", "takes", "taking", "taken",
  "such", "other", "based", "related", "regarding", "information", "document",
  "section", "page", "following", "within", "among", "onto", "via", "per",
  "etc", "specified", "certain", "appropriate", "possible",
  "available", "current", "existing", "given", "same", "different", "various",
  "work", "working", "conditions", "condition", "behavior", "behaviors",
]);

const RELATION_CUE_TOKENS = new Set([
  "outside", "unauthorized", "authorized", "authorization", "prohibited",
  "forbidden", "permitted", "permission", "required", "requirement", "unsafe",
  "safety", "qualified", "licensed", "scope", "boundary", "boundaries",
]);

const UNIT_FAMILIES: Array<{ family: string; tokens: readonly string[] }> = [
  { family: "temperature", tokens: ["f", "c", "°f", "°c", "fahrenheit", "celsius"] },
  { family: "time", tokens: ["hour", "hours", "hr", "hrs", "minute", "minutes", "min", "mins", "second", "seconds", "day", "days"] },
  { family: "percent", tokens: ["%", "percent", "percentage"] },
  { family: "electrical", tokens: ["volt", "volts", "v", "amp", "amps", "a", "watt", "watts", "w", "kw", "kva"] },
  { family: "pressure", tokens: ["psi"] },
];

const PROHIBITION_RE = /\b(must not|shall not|do not|don't|cannot|can not|may not|must never|shall never|not (?:be )?(?:permitted|allowed|authorized)|prohibited|forbidden|outside(?: of)?(?: the)? authorized|unauthorized|never)\b/i;
const PERMISSION_RE = /\b(may|permitted|allowed|authorized to)\b/i;
const REQUIREMENT_RE = /\b(must|required|shall|need(?:s)? to|should be|should|sized?)\b/i;
const CAUSATION_RE = /\b(because|causes?|caused|leads to|resulting|due to)\b/i;
const COMPARISON_RE = /\b(greater than|less than|compared|versus|vs\.?|higher|lower|more than|fewer than)\b/i;
const DIAGNOSTIC_RE = /\b(check|inspect|observe|verify|measure|confirm)\b/i;
const SAFETY_BOUNDARY_RE = /\b(unsafe|safety[- ]sensitive|qualified|licensed|professional (?:service|technician|personnel))\b/i;
const THRESHOLD_RE = /\b(below|above|at least|at most|minimum|maximum|no more than|no less than|range)\b/i;

const OPPOSITE_PERMISSION_RE = /\b(may|permitted|allowed|authorized to)\b/i;
const OPPOSITE_PROHIBITION_RE = /\b(must not|shall not|do not|cannot|may not|never|prohibited|forbidden|not (?:be )?(?:permitted|allowed|authorized))\b/i;
const OPPOSITE_OPTIONAL_RE = /\b(not required|optional|need not|no need to)\b/i;

export function isClaimCoverageState(value: string): value is ClaimCoverageState {
  return (CLAIM_COVERAGE_STATES as readonly string[]).includes(value);
}

/**
 * SUPPORTS requires direct coverage. Evidence Intelligence does not permit
 * partial evidence to satisfy a proposition, including safety-sensitive claims.
 * High authority cannot compensate.
 */
export function claimCoverageIsSufficientForSupport(
  state: ClaimCoverageState | null | undefined,
  safetySensitive?: boolean,
  subjectGrounding?: SubjectGroundingState | null,
  claimText?: string | null,
) {
  if (safetySensitive && state === "partial") return false;
  if (state !== "direct") return false;
  return subjectGroundingIsSufficientForDirect(subjectGrounding, safetySensitive, claimText);
}

export function claimCoverageAllowsPolicyAdvancement(
  state: ClaimCoverageState | null | undefined,
  relationship?: string,
  subjectGrounding?: SubjectGroundingState | null,
  claimText?: string | null,
) {
  if (state === "contradicts" || relationship === "contradicts" || relationship === "mixed") {
    if (subjectGrounding === "mismatch" || subjectGrounding === "weak") return false;
    if (subjectGrounding == null || subjectGrounding === "unknown") {
      return state === "contradicts" || relationship === "contradicts" || relationship === "mixed";
    }
    return subjectGroundingAllowsContradiction(subjectGrounding);
  }
  if (state !== "direct") return false;
  return subjectGroundingIsSufficientForDirect(subjectGrounding, false, claimText);
}

export function inferClaimCoverageFromRelationship(relationship: string): ClaimCoverageState {
  if (relationship === "supports") return "direct";
  if (relationship === "contradicts" || relationship === "mixed") return "contradicts";
  if (relationship === "relevant") return "context_only";
  return "none";
}

export function resolveCandidateClaimCoverage(input: {
  candidate: {
    relationship: string;
    claimCoverage?: string | null;
    subjectGrounding?: string | null;
    extraction?: { claimCoverage?: string | null; subjectGrounding?: string | null } | null;
    excerpts: Array<{ text?: string }>;
    title?: string | null;
  };
  claimText?: string | null;
  safetySensitive?: boolean;
  policyClass?: string | null;
}): { claimCoverage: ClaimCoverageState; subjectGrounding: SubjectGroundingState } {
  const explicitCoverage = isClaimCoverageState(input.candidate.claimCoverage ?? "")
    ? input.candidate.claimCoverage as ClaimCoverageState
    : null;
  const explicitSubject = parseSubjectGroundingState(
    input.candidate.subjectGrounding ?? input.candidate.extraction?.subjectGrounding,
  );
  const passage = input.candidate.excerpts[0]?.text?.trim() ?? "";
  if (input.claimText && passage.length >= 24) {
    const assessed = evaluateClaimCoverage({
      claimText: input.claimText,
      passage,
      documentTitle: input.candidate.title,
      safetySensitive: input.safetySensitive,
      policyClass: input.policyClass,
    });
    return {
      claimCoverage: explicitCoverage ?? assessed.state,
      subjectGrounding: explicitSubject ?? assessed.subjectGrounding,
    };
  }
  return {
    claimCoverage: explicitCoverage ?? inferClaimCoverageFromRelationship(input.candidate.relationship),
    subjectGrounding: explicitSubject ?? "unknown",
  };
}

export function candidateIndependenceStatus(input: {
  policyAdvancement?: string | null;
}): "independent" | "already_counted" | "none" {
  if (input.policyAdvancement === "already_counted") return "already_counted";
  if (
    input.policyAdvancement === "advances_independence"
    || input.policyAdvancement === "advances_authority"
    || input.policyAdvancement === "resolves_contradiction"
  ) {
    return "independent";
  }
  if (input.policyAdvancement === "relevant_no_policy_gain" || input.policyAdvancement === "insufficient_authority") {
    return "independent";
  }
  return "none";
}

export function candidateQualifiesForCorpusSubmission(candidate: {
  submittedDocumentId?: string | null;
  excerpts: Array<{ text?: string }>;
  retrievalStatus?: string | null;
  proposedForReview?: boolean;
  policyAdvancement?: string | null;
  relationship?: string;
  authorityAdequate?: boolean;
  claimCoverage?: string | null;
  subjectGrounding?: string | null;
  claimText?: string | null;
}) {
  if (candidate.submittedDocumentId) return false;
  if (!candidate.excerpts[0]?.text?.trim()) return false;
  if (candidate.retrievalStatus && candidate.retrievalStatus !== "ok") return false;
  const raw = candidate.claimCoverage ?? "";
  const coverage: ClaimCoverageState = isClaimCoverageState(raw)
    ? raw
    : inferClaimCoverageFromRelationship(candidate.relationship ?? "irrelevant");
  const subject = parseSubjectGroundingState(candidate.subjectGrounding);
  if (coverage === "contradicts") {
    return candidate.policyAdvancement === "resolves_contradiction"
      && subjectGroundingAllowsContradiction(subject);
  }
  if (!claimCoverageIsSufficientForSupport(coverage, false, subject, candidate.claimText)) return false;
  if (!candidate.authorityAdequate) return false;
  if (candidate.proposedForReview) return true;
  return candidate.policyAdvancement === "advances_authority"
    || candidate.policyAdvancement === "advances_independence";
}

export function decomposeClaimCoverageRequirements(claimText: string): {
  requirements: ClaimCoverageRequirement[];
  relationFamilies: ClaimRelationFamily[];
  quantities: Array<{ value: number; family: string | null; unit: string | null; raw: string }>;
} {
  const quantities = extractQuantities(claimText);
  const relationFamilies = detectRelationFamilies(claimText);
  const groups = activatedConceptGroups(claimText);
  const requirements: ClaimCoverageRequirement[] = [];
  if (groups.length) {
    for (const group of groups) {
      requirements.push({
        id: `concept:${group.id}`,
        kind: "concept_group",
        tokens: [...group.tokens],
        alternatives: true,
      });
    }
  } else {
    requirements.push(...deriveStructuralRequirements(claimText));
  }
  if (quantities.length) {
    requirements.push({
      id: "quantity",
      kind: "quantity",
      tokens: quantities.map((item) => item.raw),
      alternatives: false,
    });
  }
  return { requirements, relationFamilies, quantities };
}

export function evaluateClaimCoverage(input: {
  claimText: string;
  passage: string | null | undefined;
  documentTitle?: string | null;
  packageProblem?: string | null;
  packageThesis?: string | null;
  safetySensitive?: boolean;
  policyClass?: string | null;
  economics?: Record<string, unknown>;
}): ClaimCoverageAssessment {
  if (input.economics) assertNoEvidenceEconomics(input.economics, "Claim coverage");
  const claimText = input.claimText ?? "";
  const passage = (input.passage ?? "").trim();
  const safetySensitive = Boolean(input.safetySensitive || input.policyClass === "safety_sensitive");
  const decomposed = decomposeClaimCoverageRequirements(claimText);
  const subject = evaluateSubjectGrounding({
    claimText,
    passage,
    documentTitle: input.documentTitle,
    packageProblem: input.packageProblem,
    packageThesis: input.packageThesis,
    safetySensitive,
    economics: input.economics,
  });
  const empty: ClaimCoverageAssessment = {
    version: CLAIM_COVERAGE_VERSION,
    state: "none",
    topicalRelevance: "irrelevant",
    subjectGrounding: subject.state,
    subjectGroundingReason: subject.reason,
    relationFamilies: decomposed.relationFamilies,
    relationMatched: decomposed.relationFamilies.length === 0,
    quantityMatched: decomposed.quantities.length ? false : null,
    coveredRequirementIds: [],
    missingRequirementIds: decomposed.requirements.map((item) => item.id),
    requirements: decomposed.requirements,
    reason: "No usable traceable passage.",
    subjectGroundingAssessment: subject,
  };
  if (passage.length < 24) return empty;

  const passageTokens = tokenize(passage);
  const passageStems = new Set([...passageTokens].map(normalizeToken));
  const covered: string[] = [];
  const missing: string[] = [];
  let quantityMatched: boolean | null = decomposed.quantities.length ? false : null;

  for (const requirement of decomposed.requirements) {
    if (requirement.kind === "quantity") {
      quantityMatched = quantitiesCovered(decomposed.quantities, passage);
      if (quantityMatched) covered.push(requirement.id);
      else missing.push(requirement.id);
      continue;
    }
    const hit = requirement.tokens.some((token) => passageHasToken(passage, passageTokens, passageStems, token));
    if (hit) covered.push(requirement.id);
    else missing.push(requirement.id);
  }

  const relationMatched = relationFamiliesCovered(decomposed.relationFamilies, passage)
    || relationStructureMatches(claimText, passage);
  const conceptRequirements = decomposed.requirements.filter((item) => item.kind !== "quantity");
  const coveredConcepts = conceptRequirements.filter((item) => covered.includes(item.id)).length;
  const contradicted = passageContradictsClaim(decomposed.relationFamilies, passage)
    && coveredConcepts >= 1
    && subjectGroundingAllowsContradiction(subject.state);

  let state: ClaimCoverageState = "none";
  if (contradicted) {
    state = "contradicts";
  } else if (conceptRequirements.length === 0) {
    state = relationMatched && quantityMatched !== false ? "direct" : (weakOverlap(claimText, passage) ? "context_only" : "none");
  } else if (groupsFullyCovered(claimText, conceptRequirements, coveredConcepts) && relationMatched && quantityMatched !== false) {
    state = "direct";
  } else if (coveredConcepts >= partialThreshold(claimText, conceptRequirements.length)) {
    state = "partial";
  } else if (coveredConcepts >= 1 || weakOverlap(claimText, passage) || relationCueOverlap(claimText, passage)) {
    state = "context_only";
  } else {
    state = "none";
  }

  state = applySubjectGroundingCap(state, subject.state, safetySensitive, relationMatched, claimText);

  const topicalRelevance: TopicalRelevanceState = state === "none" && coveredConcepts === 0 && !weakOverlap(claimText, passage)
    ? "irrelevant"
    : subject.state === "mismatch"
      ? "partial"
      : groupsFullyCovered(claimText, conceptRequirements, coveredConcepts) ? "relevant" : "partial";

  return {
    version: CLAIM_COVERAGE_VERSION,
    state,
    topicalRelevance,
    subjectGrounding: subject.state,
    subjectGroundingReason: subject.reason,
    relationFamilies: decomposed.relationFamilies,
    relationMatched,
    quantityMatched,
    coveredRequirementIds: covered,
    missingRequirementIds: missing,
    requirements: decomposed.requirements,
    reason: reasonFor(state, relationMatched, quantityMatched, covered, missing, safetySensitive, subject),
    subjectGroundingAssessment: subject,
  };
}

const COVERAGE_RANK: Record<ClaimCoverageState, number> = {
  contradicts: 5,
  direct: 4,
  partial: 3,
  context_only: 2,
  none: 1,
};

export function selectCoveringPassage(input: {
  retrievedText: string;
  claimText: string;
  documentTitle?: string | null;
  packageProblem?: string | null;
  packageThesis?: string | null;
  safetySensitive?: boolean;
  policyClass?: string | null;
}) {
  const text = input.retrievedText ?? "";
  const parts = splitResearchPassages(text);
  const windows: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    windows.push(parts[index]);
    if (parts[index + 1]) windows.push(`${parts[index]} ${parts[index + 1]}`);
  }
  if (!windows.length && text.trim()) windows.push(text.trim());
  let best: {
    excerpt: { text: string; start: number; end: number; locator?: string | null } | null;
    coverage: ClaimCoverageAssessment;
  } = {
    excerpt: null,
    coverage: evaluateClaimCoverage({
      claimText: input.claimText,
      passage: "",
      documentTitle: input.documentTitle,
      packageProblem: input.packageProblem,
      packageThesis: input.packageThesis,
      safetySensitive: input.safetySensitive,
      policyClass: input.policyClass,
    }),
  };
  for (const window of windows) {
    if (window.length < 24) continue;
    const start = text.indexOf(window);
    if (start < 0) continue;
    const coverage = evaluateClaimCoverage({
      claimText: input.claimText,
      passage: window,
      documentTitle: input.documentTitle,
      packageProblem: input.packageProblem,
      packageThesis: input.packageThesis,
      safetySensitive: input.safetySensitive,
      policyClass: input.policyClass,
    });
    const betterState = COVERAGE_RANK[coverage.state] > COVERAGE_RANK[best.coverage.state];
    const sameStateShorter = Boolean(best.excerpt) && coverage.state === best.coverage.state && window.length < (best.excerpt?.text.length ?? Infinity);
    const betterSubject = coverage.state === best.coverage.state
      && subjectRank(coverage.subjectGrounding) > subjectRank(best.coverage.subjectGrounding);
    if (coverage.state === "none" && !best.excerpt) continue;
    if (!best.excerpt || betterState || betterSubject || (sameStateShorter && COVERAGE_RANK[coverage.state] >= COVERAGE_RANK.partial)) {
      const before = text.slice(0, start);
      const page = before.match(/\[page\s+(\d+)\][^\[]*$/i);
      best = {
        excerpt: { text: window, start, end: start + window.length, locator: page ? `page:${page[1]}` : null },
        coverage,
      };
    }
  }
  return best;
}

function subjectRank(state: SubjectGroundingState) {
  if (state === "strong") return 4;
  if (state === "partial") return 3;
  if (state === "weak") return 2;
  if (state === "unknown") return 1;
  return 0;
}

function applySubjectGroundingCap(
  state: ClaimCoverageState,
  subject: SubjectGroundingState,
  safetySensitive: boolean,
  relationMatched: boolean,
  claimText?: string,
): ClaimCoverageState {
  if (state === "contradicts") {
    return subjectGroundingAllowsContradiction(subject) ? "contradicts" : "context_only";
  }
  if (subject === "mismatch") {
    return relationMatched || state === "partial" || state === "context_only" ? "context_only" : "none";
  }
  if (state === "direct" && !subjectGroundingIsSufficientForDirect(subject, safetySensitive, claimText)) {
    return subject === "weak" || subject === "unknown" ? "context_only" : "partial";
  }
  if (state === "partial" && (subject === "weak" || subject === "unknown")) return "context_only";
  return state;
}

function groupsFullyCovered(claimText: string, conceptRequirements: ClaimCoverageRequirement[], coveredConcepts: number) {
  const activated = activatedConceptGroups(claimText);
  if (activated.length) return coveredConcepts >= supportGroupThreshold(activated.length);
  return conceptRequirements.length > 0 && coveredConcepts === conceptRequirements.length;
}

function partialThreshold(claimText: string, conceptCount: number) {
  const activated = activatedConceptGroups(claimText);
  if (activated.length) return 1;
  return Math.max(1, Math.ceil(conceptCount / 2));
}

function reasonFor(
  state: ClaimCoverageState,
  relationMatched: boolean,
  quantityMatched: boolean | null,
  covered: string[],
  missing: string[],
  safetySensitive: boolean,
  subject: SubjectGroundingAssessment,
) {
  if (state === "direct") {
    return subject.state === "strong"
      ? "Passage covers material concepts, governing relation, and operational subject."
      : "Passage covers concepts and relation with partial subject grounding.";
  }
  if (state === "contradicts") return "Passage addresses the same subject while expressing a conflicting relation.";
  if (state === "partial") {
    if (subject.state === "mismatch" || subject.state === "weak") {
      return `Relation or concept overlap without adequate subject grounding. ${subject.reason}`;
    }
    return safetySensitive
      ? "Partial concept overlap. Safety-sensitive propositions require direct coverage; authority cannot compensate."
      : `Partial concept overlap (${covered.length} covered, ${missing.length} missing). Not sufficient to support the proposition.`;
  }
  if (state === "context_only") {
    if (subject.state === "mismatch") return subject.reason;
    return relationMatched
      ? "Adjacent vocabulary or relation match without covering the specific proposition or operational subject."
      : "Shared generic or relation-cue wording without the claim's governing relation or material concepts.";
  }
  if (quantityMatched === false) return "Numerical claim is missing the relevant quantity, unit, or range in the traceable passage.";
  if (subject.state === "mismatch") return subject.reason;
  return "Passage does not cover the proposition.";
}

function deriveStructuralRequirements(claimText: string): ClaimCoverageRequirement[] {
  const requirements: ClaimCoverageRequirement[] = [];
  const actor = detectActorToken(claimText);
  const orGroups = detectOrGroups(claimText);
  const used = new Set<string>();
  if (actor) {
    used.add(normalizeToken(actor));
    requirements.push({ id: "actor", kind: "actor", tokens: morphologicalVariants(actor), alternatives: true });
  }
  for (const [index, group] of orGroups.entries()) {
    for (const token of group) used.add(normalizeToken(token));
    requirements.push({
      id: `subject:${index + 1}`,
      kind: "subject",
      tokens: group.flatMap(morphologicalVariants),
      alternatives: true,
    });
  }
  const leftover = contentTokens(claimText).filter((token) => {
    if (WEAK_GENERIC_TOKENS.has(token) || RELATION_CUE_TOKENS.has(token)) return false;
    if (used.has(normalizeToken(token))) return false;
    return token.length >= 4;
  });
  if (leftover.length) {
    requirements.push({
      id: "activity",
      kind: "activity",
      tokens: leftover.flatMap(morphologicalVariants),
      alternatives: true,
    });
  }
  return requirements;
}

function detectActorToken(claimText: string) {
  const question = claimText.match(/\b(?:what|which)\s+([a-z]+)\s+actions?\b/i);
  if (question?.[1] && !STOPWORDS.has(question[1].toLowerCase())) return question[1].toLowerCase();
  const modal = claimText.match(/\b([a-z]{4,})\s+(?:must|may|should|shall|cannot|can)\b/i);
  if (modal?.[1] && !STOPWORDS.has(modal[1].toLowerCase()) && !WEAK_GENERIC_TOKENS.has(modal[1].toLowerCase())) {
    return modal[1].toLowerCase();
  }
  return null;
}

function detectOrGroups(claimText: string) {
  const groups: string[][] = [];
  const matches = claimText.toLowerCase().matchAll(/\b([a-z]{4,})\s+or\s+([a-z]{4,})\b/g);
  for (const match of matches) {
    const left = match[1];
    const right = match[2];
    if (STOPWORDS.has(left) || STOPWORDS.has(right) || WEAK_GENERIC_TOKENS.has(left) || WEAK_GENERIC_TOKENS.has(right)) continue;
    groups.push([left, right]);
  }
  return groups;
}

function detectRelationFamilies(claimText: string): ClaimRelationFamily[] {
  const families: ClaimRelationFamily[] = [];
  if (PROHIBITION_RE.test(claimText) || /\boutside\b/i.test(claimText)) families.push("prohibition");
  if (PERMISSION_RE.test(claimText) && !families.includes("prohibition")) families.push("permission");
  if (REQUIREMENT_RE.test(claimText)) families.push("requirement");
  if (CAUSATION_RE.test(claimText)) families.push("causation");
  if (COMPARISON_RE.test(claimText)) families.push("comparison");
  if (THRESHOLD_RE.test(claimText) || extractQuantities(claimText).length) families.push("threshold");
  if (SAFETY_BOUNDARY_RE.test(claimText) || /\boutside authorized\b/i.test(claimText)) families.push("safety_boundary");
  if (DIAGNOSTIC_RE.test(claimText)) families.push("diagnostic");
  return families;
}

function relationFamiliesCovered(families: ClaimRelationFamily[], passage: string) {
  if (!families.length) return true;
  return families.some((family) => familyPresent(family, passage));
}

function familyPresent(family: ClaimRelationFamily, passage: string) {
  if (family === "prohibition") return PROHIBITION_RE.test(passage) || /\bonly\b.{0,40}\b(qualified|licensed|authorized|professional)\b/i.test(passage);
  if (family === "permission") return PERMISSION_RE.test(passage);
  if (family === "requirement") return REQUIREMENT_RE.test(passage);
  if (family === "causation") return CAUSATION_RE.test(passage);
  if (family === "comparison") return COMPARISON_RE.test(passage);
  if (family === "threshold") return THRESHOLD_RE.test(passage) || extractQuantities(passage).length > 0;
  if (family === "safety_boundary") {
    return SAFETY_BOUNDARY_RE.test(passage) && (PROHIBITION_RE.test(passage) || REQUIREMENT_RE.test(passage));
  }
  if (family === "diagnostic") return DIAGNOSTIC_RE.test(passage);
  return false;
}

function passageContradictsClaim(families: ClaimRelationFamily[], passage: string) {
  if (families.includes("prohibition") && OPPOSITE_PERMISSION_RE.test(passage) && !PROHIBITION_RE.test(passage)) return true;
  if (families.includes("requirement") && OPPOSITE_OPTIONAL_RE.test(passage)) return true;
  if (families.includes("permission") && OPPOSITE_PROHIBITION_RE.test(passage)) return true;
  return false;
}

function extractQuantities(text: string) {
  const found: Array<{ value: number; family: string | null; unit: string | null; raw: string }> = [];
  const pattern = /(\d+(?:\.\d+)?)(?:\s*(°\s*[fc]|%|percent|hours?|hrs?|minutes?|mins?|seconds?|days?|volts?|amps?|psi|kw|kva|watts?|fahrenheit|celsius))?/gi;
  for (const match of text.matchAll(pattern)) {
    const value = Number(match[1]);
    if (!Number.isFinite(value)) continue;
    const unit = (match[2] ?? "").trim().toLowerCase().replace(/\s+/g, "") || nearbyUnit(text, match.index ?? 0);
    const family = unitFamily(unit);
    found.push({ value, family, unit: unit || null, raw: match[0].trim() });
  }
  return found;
}

function nearbyUnit(text: string, index: number) {
  const window = text.slice(index, index + 24).toLowerCase();
  const match = window.match(/°\s*[fc]|fahrenheit|celsius|(?:\d+\s*(?:%|percent|hours?|hrs?|minutes?|mins?|seconds?|days?|volts?|amps?|watts?|psi|kw))/);
  return match?.[0]?.replace(/\s+/g, "") ?? "";
}

function unitFamily(unit: string) {
  const normalized = unit.replace("°", "").toLowerCase();
  for (const entry of UNIT_FAMILIES) {
    if (entry.tokens.some((token) => token === normalized || token === `°${normalized}`)) return entry.family;
  }
  return null;
}

function quantitiesCovered(
  required: Array<{ value: number; family: string | null; unit: string | null; raw: string }>,
  passage: string,
) {
  const found = extractQuantities(passage);
  return required.every((need) => found.some((item) => item.value === need.value && unitsCompatible(need, item)));
}

function unitsCompatible(
  required: { family: string | null; unit: string | null },
  found: { family: string | null; unit: string | null },
) {
  if (required.unit && found.unit) {
    const left = normalizeUnitToken(required.unit);
    const right = normalizeUnitToken(found.unit);
    if (left && right) return left === right;
  }
  if (!required.family) return true;
  return required.family === found.family;
}

function normalizeUnitToken(unit: string) {
  const value = unit.toLowerCase().replace("°", "");
  if (value === "f" || value === "fahrenheit") return "f";
  if (value === "c" || value === "celsius") return "c";
  if (value === "%" || value === "percent" || value === "percentage") return "percent";
  if (value.startsWith("hour") || value === "hr" || value === "hrs") return "hour";
  if (value.startsWith("min")) return "minute";
  return value;
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !STOPWORDS.has(token)),
  );
}

function contentTokens(text: string) {
  return [...tokenize(text)].filter((token) => !WEAK_GENERIC_TOKENS.has(token));
}

function normalizeToken(token: string) {
  let value = token.toLowerCase();
  if (value.length <= 3) return value;
  if (value.endsWith("ies") && value.length > 5) value = `${value.slice(0, -3)}y`;
  else if (value.endsWith("es") && value.length > 5 && !value.endsWith("ss")) value = value.slice(0, -2);
  else if (value.endsWith("s") && !value.endsWith("ss") && value.length > 4) value = value.slice(0, -1);
  if (value.endsWith("ing") && value.length > 6) value = value.slice(0, -3);
  else if (value.endsWith("ed") && value.length > 5) value = value.slice(0, -2);
  return value;
}

function morphologicalVariants(token: string) {
  const base = token.toLowerCase();
  const stem = normalizeToken(base);
  return [...new Set([base, stem, `${stem}s`, `${stem}ing`, `${stem}ed`])];
}

function passageHasToken(passage: string, tokens: Set<string>, stems: Set<string>, token: string) {
  const lower = token.toLowerCase();
  if (tokens.has(lower)) return true;
  const stem = normalizeToken(lower);
  if (stems.has(stem)) return true;
  if (lower.length >= 4) {
    for (const candidate of tokens) {
      if (candidate.length >= 4 && (candidate.startsWith(lower) || lower.startsWith(candidate))) return true;
    }
  }
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(lower)}(?:$|[^a-z0-9])`, "i").test(passage);
}

function weakOverlap(claimText: string, passage: string) {
  const claim = [...tokenize(claimText)].filter((token) => token.length >= 4);
  const hay = tokenize(passage);
  return claim.filter((token) => hay.has(token)).length >= 1;
}

function relationCueOverlap(claimText: string, passage: string) {
  const hay = tokenize(passage);
  return [...tokenize(claimText)].some((token) => RELATION_CUE_TOKENS.has(token) && hay.has(token));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
