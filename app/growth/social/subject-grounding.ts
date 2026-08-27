/**
 * Deterministic subject/domain grounding layer.
 *
 * Separates relation match from subject match. A passage expressing the same
 * abstract relation (escalation, verification, requirement) about a different
 * operational subject cannot establish direct proposition support.
 *
 * No LLM. No domain-specific production dictionaries. Anchors are derived
 * structurally from claim, package context, title, and passage text.
 */

import { assertNoEvidenceEconomics } from "./evidence-policy.ts";

export const SUBJECT_GROUNDING_VERSION = "subject-grounding-v1";

export const SUBJECT_GROUNDING_STATES = ["strong", "partial", "weak", "mismatch", "unknown"] as const;
export type SubjectGroundingState = typeof SUBJECT_GROUNDING_STATES[number];

export type SubjectAnchorSet = {
  specific: string[];
  actors: string[];
  quantities: string[];
  domains: string[];
};

export type SubjectGroundingAssessment = {
  version: typeof SUBJECT_GROUNDING_VERSION;
  state: SubjectGroundingState;
  claimAnchors: SubjectAnchorSet;
  passageAnchors: SubjectAnchorSet;
  overlapCount: number;
  divergenceScore: number;
  relationOverlapOnly: boolean;
  reason: string;
};

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "for", "from", "with", "without",
  "that", "this", "these", "those", "should", "would", "could", "must", "may",
  "be", "is", "are", "was", "were", "been", "being", "under", "above", "not",
  "as", "by", "at", "in", "on", "it", "its", "than", "then", "also", "any",
  "all", "both", "into", "over", "after", "before", "about", "between", "through",
  "can", "will", "do", "does", "did", "have", "has", "had", "if", "when", "where",
  "which", "who", "whom", "what", "how", "why", "their", "them", "they", "our",
  "whether", "able", "itself", "themselves", "during", "while", "such", "each",
]);

/** Relation vocabulary — useful for proposition structure, not subject grounding. */
export const RELATION_VOCABULARY = new Set([
  "action", "actions", "condition", "conditions", "decision", "decisions",
  "escalation", "escalate", "escalated", "escalating", "verify", "verifies",
  "verified", "verifying", "determine", "determines", "determined", "determining",
  "require", "requires", "required", "requiring", "requirement", "requirements",
  "must", "shall", "should", "may", "permitted", "authorized", "prohibited",
  "unsafe", "safe", "safety", "issue", "issues", "unresolved", "problem", "problems",
  "process", "processes", "procedure", "procedures", "policy", "policies",
  "rule", "rules", "compliance", "compliant", "report", "reporting", "reported",
  "approve", "approval", "approvals", "review", "reviewed", "reviewing",
  "correct", "prevent", "immediate", "immediately", "appropriate", "following",
  "general", "specific", "related", "regarding", "including", "within",
]);

/** Weak generics — never establish subject grounding alone. */
const WEAK_SUBJECT_TOKENS = new Set([
  ...RELATION_VOCABULARY,
  "personnel", "person", "people", "employee", "employees", "staff", "worker", "workers",
  "situation", "situations", "system", "systems", "work", "working", "service", "services",
  "operation", "operations", "activity", "activities", "task", "tasks", "step", "steps",
  "document", "documents", "section", "page", "information", "data", "note", "notes",
  "guidance", "standard", "standards", "practice", "practices", "program", "programs",
  "management", "control", "controls", "level", "levels", "type", "types", "form", "forms",
  "state", "status", "result", "results", "case", "cases", "event", "events",
  "department", "departments", "office", "offices", "unit", "units", "team", "teams",
  "organization", "organizational", "institution", "institutional", "agency", "agencies",
  "internal", "external", "public", "private", "official", "officials", "general",
]);

/** Role-specific actors — not automatically equivalent across domains. */
const ACTOR_TOKENS = new Set([
  "operator", "operators", "technician", "technicians", "engineer", "engineers",
  "manager", "managers", "supervisor", "supervisors", "employee", "employees",
  "personnel", "worker", "workers", "staff", "chef", "cooks", "cook", "prep",
  "user", "users", "administrator", "administrators", "admin", "developer", "developers",
  "investigator", "investigators", "inspector", "inspectors", "auditor", "auditors",
  "principal", "director", "head", "superintendent", "officer", "official",
  "buyer", "buyers", "purchaser", "vendor", "merchant", "seller", "customer",
  "founder", "partner", "owner", "owners", "contractor", "contractors",
]);

/** Measurement / quantity token patterns retained for quantity grounding. */
const QUANTITY_PATTERN = /(\d+(?:\.\d+)?)\s*(?:°\s*[fc]|fahrenheit|celsius|°f|°c|%|percent|hours?|hrs?|minutes?|mins?|volts?|amps?|psi|kw|kva|watts?)?/gi;

export function isSubjectGroundingState(value: string): value is SubjectGroundingState {
  return (SUBJECT_GROUNDING_STATES as readonly string[]).includes(value);
}

export function parseSubjectGroundingState(value: string | null | undefined): SubjectGroundingState | null {
  return isSubjectGroundingState(value ?? "") ? value as SubjectGroundingState : null;
}

export function subjectGroundingIsSufficientForDirect(
  state: SubjectGroundingState | null | undefined,
  safetySensitive?: boolean,
): boolean {
  if (state === "mismatch" || state === "unknown") return false;
  if (safetySensitive) return state === "strong";
  return state === "strong" || state === "partial";
}

export function subjectGroundingAllowsContradiction(
  state: SubjectGroundingState | null | undefined,
): boolean {
  return state === "strong" || state === "partial";
}

export function subjectGroundingAllowsPolicyAdvancement(
  state: SubjectGroundingState | null | undefined,
): boolean {
  return state === "strong" || state === "partial";
}

export function relationStructureMatches(claimText: string, passage: string): boolean {
  const ultraGeneric = new Set([
    "unsafe", "safe", "safety", "action", "actions", "prevent", "correct", "immediate",
    "issue", "issues", "general", "appropriate", "related", "specific", "following",
  ]);
  const claimRelation = relationTokens(claimText);
  const passageRelation = relationTokens(passage);
  const matchedStems = new Set<string>();
  let structuralMatches = 0;
  for (const claimToken of claimRelation) {
    const claimStem = normalizeStem(claimToken);
    for (const passageToken of passageRelation) {
      const passageStem = normalizeStem(passageToken);
      if (!stemsCompatible(claimStem, passageStem)) continue;
      matchedStems.add(claimStem);
      if (!ultraGeneric.has(claimToken) && !ultraGeneric.has(claimStem)) structuralMatches += 1;
    }
  }
  const requirementCue = (text: string) => /\b(require[ds]?|requiring|must|shall)\b/i.test(text);
  if (requirementCue(claimText) && requirementCue(passage)) structuralMatches += 1;
  return (matchedStems.size >= 2 && structuralMatches >= 1)
    || (matchedStems.size >= 1 && structuralMatches >= 2);
}

export function extractSubjectAnchors(text: string): SubjectAnchorSet {
  const normalized = (text ?? "").toLowerCase();
  const tokens = normalized
    .split(/[^a-z0-9]+/)
    .map((token) => token.replace(/[^a-z0-9]+/g, ""))
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
  const stems = tokens.map(normalizeStem);
  const specific = new Set<string>();
  const actors = new Set<string>();
  const quantities = new Set<string>();
  const domains = new Set<string>();

  for (const token of tokens) {
    const stem = normalizeStem(token);
    if (ACTOR_TOKENS.has(token) || ACTOR_TOKENS.has(stem)) {
      actors.add(stem);
      continue;
    }
    if (WEAK_SUBJECT_TOKENS.has(token) || WEAK_SUBJECT_TOKENS.has(stem)) continue;
    if (RELATION_VOCABULARY.has(token) || RELATION_VOCABULARY.has(stem)) continue;
    if (token.length >= 4) specific.add(stem);
  }

  for (const match of normalized.matchAll(QUANTITY_PATTERN)) {
    quantities.add(match[0].trim().replace(/\s+/g, " "));
  }

  // Bigram subject phrases from claim-like structures (noun + noun).
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const left = tokens[index];
    const right = tokens[index + 1];
    if (WEAK_SUBJECT_TOKENS.has(left) || WEAK_SUBJECT_TOKENS.has(right)) continue;
    if (RELATION_VOCABULARY.has(left) || RELATION_VOCABULARY.has(right)) continue;
    if (left.length >= 4 && right.length >= 4) {
      domains.add(`${normalizeStem(left)}_${normalizeStem(right)}`);
    }
  }

  // Title-style compound tokens (camelCase split not needed; hyphenated handled by split).
  for (const phrase of extractTitlePhrases(text)) {
    const parts = phrase
      .split(/\s+/)
      .map((part) => part.replace(/[^a-z0-9]+/g, ""))
      .filter((part) => part.length >= 4 && !STOPWORDS.has(part) && !WEAK_SUBJECT_TOKENS.has(part));
    for (const part of parts) specific.add(normalizeStem(part));
  }

  void stems;
  return {
    specific: [...specific],
    actors: [...actors],
    quantities: [...quantities],
    domains: [...domains],
  };
}

export function mergeSubjectAnchors(...sets: SubjectAnchorSet[]): SubjectAnchorSet {
  const specific = new Set<string>();
  const actors = new Set<string>();
  const quantities = new Set<string>();
  const domains = new Set<string>();
  for (const set of sets) {
    for (const item of set.specific) specific.add(item);
    for (const item of set.actors) actors.add(item);
    for (const item of set.quantities) quantities.add(item);
    for (const item of set.domains) domains.add(item);
  }
  return {
    specific: [...specific],
    actors: [...actors],
    quantities: [...quantities],
    domains: [...domains],
  };
}

export function evaluateSubjectGrounding(input: {
  claimText: string;
  passage: string | null | undefined;
  documentTitle?: string | null;
  packageProblem?: string | null;
  packageThesis?: string | null;
  safetySensitive?: boolean;
  economics?: Record<string, unknown>;
}): SubjectGroundingAssessment {
  if (input.economics) assertNoEvidenceEconomics(input.economics, "Subject grounding");
  const passage = (input.passage ?? "").trim();
  const claimContext = [input.claimText, input.packageProblem, input.packageThesis].filter(Boolean).join(" ");
  const claimAnchors = mergeSubjectAnchors(
    extractSubjectAnchors(claimContext),
    extractSubjectAnchors(input.claimText),
  );
  const passageAnchors = mergeSubjectAnchors(
    extractSubjectAnchors(passage),
    extractSubjectAnchors(input.documentTitle ?? ""),
  );

  if (passage.length < 24 && !input.documentTitle?.trim()) {
    return emptyAssessment(claimAnchors, passageAnchors, "unknown", "Insufficient passage or title context for subject grounding.");
  }

  const overlap = anchorOverlap(claimAnchors, passageAnchors);
  const overlapCount = overlap.specific.length + overlap.domains.length;
  const claimSpecificCount = claimAnchors.specific.length + claimAnchors.domains.length;
  const passageSpecificCount = passageAnchors.specific.length + passageAnchors.domains.length;
  const relationOnlyClaim = claimSpecificCount === 0 && claimAnchors.actors.length === 0 && claimAnchors.quantities.length === 0;
  const relationOnlyPassage = passageSpecificCount === 0 && passageAnchors.actors.length === 0;

  const divergenceScore = structuralDivergence(claimAnchors, passageAnchors);
  const actorConflict = actorsConflict(claimAnchors.actors, passageAnchors.actors);
  const quantityConflict = quantitiesConflict(claimAnchors.quantities, passageAnchors.quantities);
  const relationOverlapOnly = relationOverlapWithoutSubject(claimContext, passage, claimAnchors, passageAnchors, overlapCount);
  const relationOnlyMismatch = relationOnlySubjectFailure(claimContext, passage, claimAnchors, passageAnchors, overlapCount);

  let state: SubjectGroundingState = "unknown";
  if (quantityConflict) {
    state = "mismatch";
  } else if (divergenceScore >= 2 && overlapCount === 0 && claimSpecificCount >= 1 && passageSpecificCount >= 1) {
    state = "mismatch";
  } else if (actorConflict && overlapCount === 0 && claimSpecificCount >= 1) {
    state = "mismatch";
  } else if ((relationOverlapOnly || relationOnlyMismatch) && overlapCount === 0 && claimSpecificCount >= 1) {
    state = "mismatch";
  } else if (titleIndicatesMismatch(input.documentTitle ?? "", claimAnchors) && overlapCount === 0) {
    state = "mismatch";
  } else if (overlapCount >= Math.max(2, Math.ceil(Math.min(claimSpecificCount, passageSpecificCount) * 0.45)) && claimSpecificCount >= 1) {
    state = "strong";
  } else if (overlapCount >= 1 || overlap.actors.length >= 1) {
    state = "partial";
  } else if (relationOnlyClaim || relationOnlyPassage || weakGenericOverlap(claimContext, passage)) {
    state = "weak";
  } else if (claimSpecificCount >= 1 && passageSpecificCount >= 1 && overlapCount === 0) {
    state = "mismatch";
  } else {
    state = "weak";
  }

  return {
    version: SUBJECT_GROUNDING_VERSION,
    state,
    claimAnchors,
    passageAnchors,
    overlapCount,
    divergenceScore,
    relationOverlapOnly,
    reason: reasonFor(state, overlapCount, divergenceScore, actorConflict, quantityConflict, relationOverlapOnly, input.safetySensitive),
  };
}

function emptyAssessment(
  claimAnchors: SubjectAnchorSet,
  passageAnchors: SubjectAnchorSet,
  state: SubjectGroundingState,
  reason: string,
): SubjectGroundingAssessment {
  return {
    version: SUBJECT_GROUNDING_VERSION,
    state,
    claimAnchors,
    passageAnchors,
    overlapCount: 0,
    divergenceScore: 0,
    relationOverlapOnly: false,
    reason,
  };
}

function anchorOverlap(claim: SubjectAnchorSet, passage: SubjectAnchorSet) {
  const specific = claim.specific.filter((item) => passage.specific.some((other) => stemsCompatible(item, other)));
  const domains = claim.domains.filter((item) => passage.domains.some((other) => stemsCompatible(item, other) || domainOverlap(item, other)));
  const actors = claim.actors.filter((item) => passage.actors.some((other) => stemsCompatible(item, other)));
  return { specific, domains, actors };
}

function structuralDivergence(claim: SubjectAnchorSet, passage: SubjectAnchorSet): number {
  if (!claim.specific.length || !passage.specific.length) return 0;
  const overlap = anchorOverlap(claim, passage);
  if (overlap.specific.length > 0 || overlap.domains.length > 0) return 0;
  return Math.min(claim.specific.length, passage.specific.length);
}

function actorsConflict(claimActors: string[], passageActors: string[]): boolean {
  if (!claimActors.length || !passageActors.length) return false;
  const shared = claimActors.some((left) => passageActors.some((right) => stemsCompatible(left, right)));
  if (shared) return false;
  // Generic personnel/employee overlap is not meaningful actor match.
  const generic = new Set(["personnel", "employee", "staff", "worker", "person", "people"]);
  const claimSpecific = claimActors.filter((item) => !generic.has(item));
  const passageSpecific = passageActors.filter((item) => !generic.has(item));
  return claimSpecific.length >= 1 && passageSpecific.length >= 1;
}

function quantitiesConflict(claimQuantities: string[], passageQuantities: string[]): boolean {
  if (!claimQuantities.length || !passageQuantities.length) return false;
  const claimValues = claimQuantities.map(parseQuantityValue).filter((item): item is number => item !== null);
  const passageValues = passageQuantities.map(parseQuantityValue).filter((item): item is number => item !== null);
  if (!claimValues.length || !passageValues.length) return false;
  const claimUnits = claimQuantities.map(parseQuantityUnit);
  const passageUnits = passageQuantities.map(parseQuantityUnit);
  const valueOverlap = claimValues.some((left) => passageValues.some((right) => left === right));
  if (!valueOverlap) return true;
  const unitOverlap = claimUnits.some((left, index) => {
    const right = passageUnits[index];
    return left && right && left === right;
  });
  return !unitOverlap && claimUnits.some(Boolean) && passageUnits.some(Boolean);
}

function relationOverlapWithoutSubject(
  claimText: string,
  passage: string,
  claimAnchors: SubjectAnchorSet,
  passageAnchors: SubjectAnchorSet,
  overlapCount: number,
): boolean {
  if (overlapCount > 0) return false;
  const claimRelation = [...tokenize(claimText)].filter((token) => RELATION_VOCABULARY.has(token));
  const passageRelation = [...tokenize(passage)].filter((token) => RELATION_VOCABULARY.has(token));
  const relationHits = claimRelation.filter((token) => passageRelation.includes(token)).length;
  const hasSpecificClaim = claimAnchors.specific.length + claimAnchors.domains.length >= 1;
  const hasSpecificPassage = passageAnchors.specific.length + passageAnchors.domains.length >= 1;
  return relationHits >= 2 && hasSpecificClaim && hasSpecificPassage;
}

function relationOnlySubjectFailure(
  claimText: string,
  passage: string,
  claimAnchors: SubjectAnchorSet,
  passageAnchors: SubjectAnchorSet,
  overlapCount: number,
): boolean {
  if (overlapCount > 0) return false;
  const claimSpecific = claimAnchors.specific.length + claimAnchors.domains.length;
  if (claimSpecific < 1) return false;
  const claimRelation = [...tokenize(claimText)].filter((token) => RELATION_VOCABULARY.has(token));
  const passageRelation = [...tokenize(`${passage} ${passageAnchors.specific.join(" ")}`)].filter((token) => RELATION_VOCABULARY.has(token));
  const relationHits = claimRelation.filter((token) => passageRelation.includes(token)).length;
  return relationHits >= 2;
}

function titleIndicatesMismatch(title: string, claimAnchors: SubjectAnchorSet): boolean {
  if (!title.trim() || claimAnchors.specific.length === 0) return false;
  const titleAnchors = extractSubjectAnchors(title);
  const overlap = anchorOverlap(claimAnchors, titleAnchors);
  if (overlap.specific.length > 0 || overlap.domains.length > 0) return false;
  const titleSpecific = titleAnchors.specific.length + titleAnchors.domains.length;
  const claimSpecific = claimAnchors.specific.length + claimAnchors.domains.length;
  return titleSpecific >= 2 && claimSpecific >= 1;
}

function weakGenericOverlap(claimText: string, passage: string): boolean {
  const claim = [...tokenize(claimText)].filter((token) => WEAK_SUBJECT_TOKENS.has(token) || RELATION_VOCABULARY.has(token));
  const hay = tokenize(passage);
  return claim.filter((token) => hay.has(token)).length >= 2;
}

function extractTitlePhrases(text: string) {
  return (text ?? "")
    .split(/[\n\r|:;–—-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);
}

function relationTokens(text: string) {
  const relationStopwords = new Set(STOPWORDS);
  relationStopwords.delete("must");
  relationStopwords.delete("may");
  relationStopwords.delete("shall");
  return [...new Set(
    (text ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !relationStopwords.has(token) && RELATION_VOCABULARY.has(token)),
  )];
}

function tokenize(text: string) {
  return new Set(
    (text ?? "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !STOPWORDS.has(token)),
  );
}

function normalizeStem(token: string) {
  let value = token.toLowerCase();
  if (value.length <= 3) return value;
  if (value.endsWith("ies") && value.length > 5) value = `${value.slice(0, -3)}y`;
  else if (value.endsWith("es") && value.length > 5 && !value.endsWith("ss")) value = value.slice(0, -2);
  else if (value.endsWith("s") && !value.endsWith("ss") && value.length > 4) value = value.slice(0, -1);
  if (value.endsWith("ing") && value.length > 6) value = value.slice(0, -3);
  else if (value.endsWith("ed") && value.length > 5) value = value.slice(0, -2);
  else if (value.endsWith("tion") && value.length > 7) value = value.slice(0, -4);
  return value;
}

function stemsCompatible(left: string, right: string) {
  if (left === right) return true;
  if (left.length >= 4 && right.length >= 4 && (left.startsWith(right) || right.startsWith(left))) return true;
  return false;
}

function domainOverlap(left: string, right: string) {
  const partsLeft = left.split("_").filter(Boolean);
  const partsRight = right.split("_").filter(Boolean);
  return partsLeft.some((part) => partsRight.some((other) => stemsCompatible(part, other)));
}

function parseQuantityValue(raw: string): number | null {
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseQuantityUnit(raw: string): string | null {
  const lower = raw.toLowerCase();
  if (/°\s*f|fahrenheit|\bf\b/.test(lower)) return "f";
  if (/°\s*c|celsius|\bc\b/.test(lower)) return "c";
  if (/%|percent/.test(lower)) return "percent";
  if (/hour|hr/.test(lower)) return "hour";
  if (/min/.test(lower)) return "minute";
  if (/volt|amp|watt|psi|kw/.test(lower)) return "engineering";
  return null;
}

function reasonFor(
  state: SubjectGroundingState,
  overlapCount: number,
  divergenceScore: number,
  actorConflict: boolean,
  quantityConflict: boolean,
  relationOverlapOnly: boolean,
  safetySensitive?: boolean,
) {
  if (state === "strong") return `Subject anchors overlap (${overlapCount} material match${overlapCount === 1 ? "" : "es"}).`;
  if (state === "partial") {
    return safetySensitive
      ? "Partial subject overlap. Safety-sensitive claims require strong subject grounding."
      : "Partial subject overlap; relation may match but operational scope is not fully aligned.";
  }
  if (state === "mismatch") {
    if (quantityConflict) return "Quantity/unit appears in passage but operational subject diverges.";
    if (actorConflict) return "Actor/role context diverges without shared operational subject.";
    if (relationOverlapOnly) return "Relation vocabulary overlaps but operational subject/domain diverges.";
    if (divergenceScore >= 2) return "Specific subject anchors diverge with no material overlap.";
    return "Passage concerns a different operational subject or domain.";
  }
  if (state === "weak") return "Only generic or relation vocabulary overlaps; no material subject grounding.";
  return "Subject grounding could not be established from available context.";
}
