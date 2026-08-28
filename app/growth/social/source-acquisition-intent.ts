/**
 * Generic source-acquisition intent for bounded live research.
 *
 * Derives operational domain anchors and authoritative-source lane priority from
 * claim + package context. No publisher names or investigation-specific patches.
 */

import type { CulinaryDomain } from "../../lib/research/source-policy.ts";
import { compactResearchQueryTerms } from "../../lib/research/plan.ts";
import { assertNoEvidenceEconomics } from "./evidence-policy.ts";
import { extractSubjectAnchors } from "./subject-grounding.ts";
import type { AuthorityPath } from "./evidence-gap-research.ts";

export const SOURCE_ACQUISITION_INTENT_VERSION = "source-acquisition-intent-v1";

export const SOURCE_INTENT_KINDS = [
  "equipment_operations",
  "food_safety",
  "software_operations",
  "compliance_filing",
  "product_comparison",
  "general_technical",
] as const;
export type SourceIntentKind = typeof SOURCE_INTENT_KINDS[number];

const COLON_INTERROGATIVE_PREFIX = /^what\s+(conditions require[^:]*|operator actions[^:]*):\s*/i;
const DECISION_ESCALATION_SHELL = /\b(require|requires|requiring)\s+(this\s+)?(decision|escalation)\b[^:?]*[:?]\s*/i;

/** Generic interrogative / relation shells — low recall value in search queries. */
const QUERY_BOILERPLATE = new Set([
  "what", "which", "how", "when", "where", "conditions", "condition", "require", "requires",
  "requiring", "decision", "decisions", "escalation", "escalated", "escalate", "identify",
  "determine", "verify", "exist", "exists", "existing", "applicable", "applicability",
  "scope", "package", "problem", "this", "they", "them", "their", "can", "could", "should",
  "must", "may", "able", "themselves", "without", "into", "from", "about", "across",
]);

/** Procedure/admin stems — never primary query anchors (mirrors subject-grounding generics). */
const GENERIC_PROCEDURE_STEMS = new Set([
  "operat", "operator", "procedur", "process", "manual", "polici", "policy", "standard",
  "scope", "owner", "proposal", "submitt", "guidanc", "program", "department", "organ",
]);

/** Package-context fillers that add little search recall when claim terms exist. */
const LOW_RECALL_CONTEXT_STEMS = new Set([
  "independent", "identify", "attempt", "attempts", "determine", "recognize", "verify",
  "without", "themselves", "required", "requires", "around", "running", "guide", "using",
]);

const EQUIPMENT_SIGNALS = /\b(refriger|freezer|compressor|hvac|electrical|refrigerant|generator|oven|dishwash|plumb|equipment|manual|manufacturer|technician|disassembly|nameplate|sealed|circuit|voltage|amper|defrost|evaporator)\b/i;
const FOOD_SIGNALS = /\b(temperature|food|hold|prep|discard|fahrenheit|celsius|41|165|pathogen|refrigerat|cooling|storage)\b/i;
const SOFTWARE_SIGNALS = /\b(software|permission|administrative|admin|user|users|scope|api|export|login|credential|saas|application)\b/i;
const COMPLIANCE_SIGNALS = /\b(filing|regulatory|submit|submitted|annual|authority|compliance|deadline)\b/i;
const COMPARISON_SIGNALS = /\b(compare|comparison|versus|capacity|rack|warranty|specification|specifications|metric)\b/i;
const EXTENSION_SIGNALS = /\b(extension|cooperative|agricultural|livestock|crop|farm)\b/i;

function inferEvidenceDomainFromContext(text: string): CulinaryDomain {
  if (/\b(safety|carbon monoxide|allergen|foodborne|therapeutic|iddsi)\b/i.test(text)) {
    return /iddsi|therapeutic|nutrition/.test(text.toLowerCase()) ? "nutrition_therapeutic_diets" : "food_safety_public_health";
  }
  if (/\b(generator|electrical|headroom|equipment|manual|licensing|code|refriger|freezer|hvac|dishwash|oven|plumb)\b/i.test(text)) {
    return "equipment";
  }
  return "culinary_technique";
}

export type SourceAcquisitionIntent = {
  version: typeof SOURCE_ACQUISITION_INTENT_VERSION;
  kind: SourceIntentKind;
  evidenceDomain: CulinaryDomain;
  queryTerms: string;
  materialAnchors: string[];
  includeEducationExtension: boolean;
  laneSequence: AuthorityPath[];
};

function normalizeStem(token: string) {
  let value = token.toLowerCase();
  if (value.length <= 3) return value;
  if (value.endsWith("ies") && value.length > 5) value = `${value.slice(0, -3)}y`;
  else if (value.endsWith("es") && value.length > 5 && !value.endsWith("ss")) value = value.slice(0, -2);
  else if (value.endsWith("s") && !value.endsWith("ss") && value.length > 4) value = value.slice(0, -1);
  if (value.endsWith("ing") && value.length > 6) value = value.slice(0, -3);
  else if (value.endsWith("ed") && value.length > 5) value = value.slice(0, -2);
  return value;
}

function isGenericProcedureStem(stem: string) {
  if (GENERIC_PROCEDURE_STEMS.has(stem)) return true;
  for (const generic of GENERIC_PROCEDURE_STEMS) {
    if (stem.length >= 4 && generic.length >= 4 && (stem.startsWith(generic) || generic.startsWith(stem))) return true;
  }
  return false;
}

function stripClaimBoilerplate(claimText: string) {
  return (claimText ?? "")
    .replace(COLON_INTERROGATIVE_PREFIX, "")
    .replace(DECISION_ESCALATION_SHELL, "")
    .replace(/^(what|which|how|when|where)\s+/i, "")
    .trim();
}

function collectAnchorTokens(input: {
  claimText?: string | null;
  packageProblem?: string | null;
  packageThesis?: string | null;
}) {
  const strippedClaim = stripClaimBoilerplate(input.claimText ?? "");
  const claimAnchors = strippedClaim ? extractSubjectAnchors(strippedClaim) : { specific: [], domains: [], quantities: [] };
  const contextAnchors = extractSubjectAnchors([
    input.packageProblem,
    input.packageThesis,
  ].filter(Boolean).join(" "));
  const tokens: string[] = [];
  const seen = new Set<string>();
  const pushStem = (stem: string) => {
    if (stem.length < 4 || isGenericProcedureStem(stem) || seen.has(stem)) return;
    seen.add(stem);
    tokens.push(stem);
  };
  for (const stem of claimAnchors.specific) pushStem(stem);
  for (const domain of claimAnchors.domains) {
    for (const part of domain.split("_")) pushStem(part);
  }
  for (const quantity of claimAnchors.quantities) {
    const numeric = quantity.match(/\d+(?:\.\d+)?/);
    if (numeric) pushStem(numeric[0]);
  }
  for (const stem of contextAnchors.specific) {
    if (LOW_RECALL_CONTEXT_STEMS.has(stem)) continue;
    pushStem(stem);
  }
  for (const domain of contextAnchors.domains) {
    for (const part of domain.split("_")) {
      if (LOW_RECALL_CONTEXT_STEMS.has(part)) continue;
      pushStem(part);
    }
  }
  for (const quantity of contextAnchors.quantities) {
    const numeric = quantity.match(/\d+(?:\.\d+)?/);
    if (numeric) pushStem(numeric[0]);
  }
  return tokens.sort((left, right) => right.length - left.length || left.localeCompare(right));
}

function materialAnchorTokens(input: {
  claimText: string;
  packageProblem?: string | null;
  packageThesis?: string | null;
}) {
  return collectAnchorTokens(input);
}

function claimFirstQueryTerms(input: {
  claimText: string;
  packageProblem?: string | null;
  packageThesis?: string | null;
  maxTerms: number;
}) {
  const strippedClaim = stripClaimBoilerplate(input.claimText);
  const claimCompact = compactResearchQueryTerms(strippedClaim, input.maxTerms)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !QUERY_BOILERPLATE.has(token));
  const terms: string[] = [];
  const seen = new Set<string>();
  for (const token of claimCompact) {
    const stem = normalizeStem(token);
    if (isGenericProcedureStem(stem)) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    terms.push(token);
  }
  const claimAnchorBudget = Math.min(5, input.maxTerms);
  for (const stem of collectAnchorTokens({ claimText: input.claimText })) {
    if (terms.length >= claimAnchorBudget) break;
    if (seen.has(stem)) continue;
    seen.add(stem);
    terms.push(stem);
  }
  const contextBudget = Math.max(0, input.maxTerms - terms.length);
  if (contextBudget > 0) {
    for (const stem of collectAnchorTokens({
      claimText: "",
      packageProblem: input.packageProblem,
      packageThesis: input.packageThesis,
    })) {
      if (terms.length >= input.maxTerms) break;
      if (seen.has(stem)) continue;
      seen.add(stem);
      terms.push(stem);
    }
  }
  return terms.slice(0, input.maxTerms);
}

export function buildContextualResearchQueryTerms(input: {
  claimText: string;
  packageProblem?: string | null;
  packageThesis?: string | null;
  maxTerms?: number;
  economics?: Record<string, unknown>;
}): string {
  if (input.economics) assertNoEvidenceEconomics(input.economics, "Research query terms");
  const maxTerms = input.maxTerms ?? 8;
  const terms = claimFirstQueryTerms({
    claimText: input.claimText,
    packageProblem: input.packageProblem,
    packageThesis: input.packageThesis,
    maxTerms,
  });
  if (terms.length >= 3) return terms.join(" ");
  const fallback = compactResearchQueryTerms(stripClaimBoilerplate(input.claimText), maxTerms);
  if (fallback) return fallback;
  return compactResearchQueryTerms([
    stripClaimBoilerplate(input.claimText),
    input.packageProblem,
  ].filter(Boolean).join(" "), maxTerms);
}

export function classifySourceIntentKind(input: {
  claimText: string;
  packageProblem?: string | null;
  packageThesis?: string | null;
}): SourceIntentKind {
  const haystack = [
    input.claimText,
    input.packageProblem,
    input.packageThesis,
  ].filter(Boolean).join(" ");
  if (COMPARISON_SIGNALS.test(haystack)) return "product_comparison";
  if (SOFTWARE_SIGNALS.test(haystack) && !EQUIPMENT_SIGNALS.test(haystack)) return "software_operations";
  if (COMPLIANCE_SIGNALS.test(haystack) && !FOOD_SIGNALS.test(haystack) && !EQUIPMENT_SIGNALS.test(haystack)) {
    return "compliance_filing";
  }
  if (FOOD_SIGNALS.test(haystack)) return "food_safety";
  if (EQUIPMENT_SIGNALS.test(haystack)) return "equipment_operations";
  return "general_technical";
}

function laneSequenceForIntent(input: {
  kind: SourceIntentKind;
  policyClass: string;
  gapUnresolved: string;
  strongerAuthorityRequired: boolean;
  includeEducationExtension: boolean;
}): AuthorityPath[] {
  const { kind, gapUnresolved, strongerAuthorityRequired, includeEducationExtension } = input;
  if (gapUnresolved === "conflicted" || gapUnresolved === "needs_independent_corroboration") {
    return ["independent_technical_pdf", "professional_engineering_standards", "government_regulatory"];
  }
  if (gapUnresolved === "insufficient_authority" || strongerAuthorityRequired) {
    const base: AuthorityPath[] = ["government_regulatory", "professional_engineering_standards"];
    const allowEducation = includeEducationExtension
      || kind === "general_technical"
      || kind === "software_operations"
      || kind === "compliance_filing"
      || kind === "product_comparison";
    return allowEducation ? [...base, "education_technical"] : base;
  }
  if (kind === "equipment_operations" || kind === "food_safety") {
    return ["independent_technical_pdf", "government_regulatory", "professional_engineering_standards"];
  }
  if (kind === "software_operations") {
    return ["independent_technical_pdf", "government_regulatory", "professional_engineering_standards"];
  }
  if (kind === "compliance_filing") {
    return ["government_regulatory", "professional_engineering_standards", "independent_technical_pdf"];
  }
  if (kind === "product_comparison") {
    return ["independent_technical_pdf", "professional_engineering_standards", "government_regulatory"];
  }
  return ["independent_technical_pdf", "professional_engineering_standards", "government_regulatory"];
}

export function classifySourceAcquisitionIntent(input: {
  claimText: string;
  packageProblem?: string | null;
  packageThesis?: string | null;
  evidenceDomain?: CulinaryDomain | null;
  policyClass?: string | null;
  gapUnresolved?: string | null;
  strongerAuthorityRequired?: boolean;
  economics?: Record<string, unknown>;
}): SourceAcquisitionIntent {
  if (input.economics) assertNoEvidenceEconomics(input.economics, "Source acquisition intent");
  const claimText = input.claimText ?? "";
  const context = [claimText, input.packageProblem, input.packageThesis].filter(Boolean).join(" ");
  const kind = classifySourceIntentKind(input);
  const evidenceDomain = input.evidenceDomain ?? inferEvidenceDomainFromContext(context);
  const includeEducationExtension = EXTENSION_SIGNALS.test(context);
  const queryTerms = buildContextualResearchQueryTerms({
    claimText,
    packageProblem: input.packageProblem,
    packageThesis: input.packageThesis,
  });
  const materialAnchors = materialAnchorTokens(input);
  return {
    version: SOURCE_ACQUISITION_INTENT_VERSION,
    kind,
    evidenceDomain,
    queryTerms,
    materialAnchors,
    includeEducationExtension,
    laneSequence: laneSequenceForIntent({
      kind,
      policyClass: input.policyClass ?? "broad_technical",
      gapUnresolved: input.gapUnresolved ?? "unsupported",
      strongerAuthorityRequired: Boolean(input.strongerAuthorityRequired),
      includeEducationExtension,
    }),
  };
}

export function queryForAuthorityPath(input: {
  terms: string;
  authorityPath: AuthorityPath;
  minusSites?: string[];
  intentKind: SourceIntentKind;
}): string {
  const minusSites = input.minusSites ?? [];
  const withSites = (query: string) => (minusSites.length ? `${query} ${minusSites.join(" ")}` : query);
  const terms = input.terms.trim();
  if (!terms) return "";
  if (input.authorityPath === "independent_technical_pdf") {
    if (input.intentKind === "equipment_operations" || input.intentKind === "food_safety") {
      return withSites(`${terms} filetype:pdf operator manual OR service manual -site:.edu`);
    }
    if (input.intentKind === "software_operations") {
      return withSites(`${terms} filetype:pdf documentation OR admin guide -site:.edu`);
    }
    return withSites(`${terms} filetype:pdf independent OR operator manual OR service manual -site:.edu`);
  }
  if (input.authorityPath === "professional_engineering_standards") {
    if (input.intentKind === "equipment_operations") {
      return withSites(`${terms} industry standard OR code handbook filetype:pdf`);
    }
    return withSites(`${terms} professional standard OR handbook filetype:pdf`);
  }
  if (input.authorityPath === "government_regulatory") {
    return `${terms} site:.gov filetype:pdf OR site:.gov`;
  }
  if (input.authorityPath === "education_technical") {
    return `${terms} extension site:.edu filetype:pdf`;
  }
  return withSites(terms);
}
