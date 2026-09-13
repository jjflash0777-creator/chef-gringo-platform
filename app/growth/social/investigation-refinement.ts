import { assertNoEconomicsRankingFields } from "./commercial.ts";
import {
  normalizeClaimProposalText,
  type ClaimProposalKind,
  type PersistedClaimProposal,
} from "./claim-decomposition.ts";
import { deriveClaimPolicyClass, type EvidenceAuthorityClass, type EvidencePolicyClass } from "./evidence-policy.ts";

/**
 * Investigation Refinement v1. Consumes raw ClaimProposal records and produces
 * a smaller InvestigationPlan. Does not create claims, accept evidence, or
 * overwrite decomposition history.
 */
export const INVESTIGATION_REFINEMENT_VERSION = "investigation-refinement-v1";
/** Original items are depth 0; one additional expansion layer is depth 1. */
export const MAX_REFINEMENT_DEPTH = 1;
/**
 * Conservative cap on material (non-pruned) investigation items including
 * expansions. Live discovery allows 3 queries / 5 assessed candidates; 8 items
 * is enough for a founder to review without exceeding that research budget.
 */
export const MAX_INVESTIGATION_ITEMS = 8;

export const INVESTIGATION_PLAN_STATES = ["drafted", "awaiting_review", "acknowledged"] as const;
export type InvestigationPlanState = typeof INVESTIGATION_PLAN_STATES[number];

export const INVESTIGATION_ITEM_KINDS = [
  "safety_boundary",
  "diagnostic",
  "decision_rule",
  "unresolved_assumption",
  "factual",
  "context_only",
] as const;
export type InvestigationItemKind = typeof INVESTIGATION_ITEM_KINDS[number];

const AUTHORITY_RANK: Record<string, number> = {
  especially_authoritative: 6,
  government_regulatory: 5,
  code_standard: 4,
  industry_organization: 3,
  manufacturer_technical: 2,
  equipment_manual: 2,
  primary_documentation: 1,
  editorial: 0,
  lead_only: 0,
  unknown: 0,
};

const STOPWORDS = new Set([
  "the", "a", "an", "to", "of", "for", "and", "or", "this", "that", "with", "from",
  "should", "be", "able", "operator", "operators", "they", "them", "their", "can",
  "perform", "themselves", "stated", "using", "guide", "after", "must", "not",
  "treat", "until", "source", "says", "otherwise", "whether", "applicable",
  "evidenced", "threshold",
]);

const BOILERPLATE = [
  /^the operator should be able to\s+/i,
  /^operators must not treat\s+[“"']?/i,
  /\s+as an authorized procedure until an especially authoritative source says otherwise\.?$/i,
  /^whether\s+/i,
  /\s+is an applicable evidenced threshold for:?\s*/i,
];

export type InvestigationItem = {
  itemKey: string;
  depth: number;
  parentItemKey: string | null;
  kind: InvestigationItemKind;
  researchQuestion: string;
  proposedClaim: string;
  whyItMatters: string;
  material: boolean;
  prunedReason: string | null;
  safetySensitive: boolean;
  priority: number;
  recommendedSourceClass: EvidenceAuthorityClass | "especially_authoritative";
  independenceRequirement: string;
  expectedEvidencePolicy: EvidencePolicyClass;
  sourceProposalIds: string[];
  sourceTraces: Array<{ field: string; excerpt: string }>;
  expanded: boolean;
  humanReviewRequiredBeforeClaimCreation: true;
};

export type InvestigationPlanDraft = {
  version: typeof INVESTIGATION_REFINEMENT_VERSION;
  packageId: string;
  packageFingerprint: string;
  rawProposalIds: string[];
  items: InvestigationItem[];
  dependencies: Array<{ fromItemKey: string; toItemKey: string; reason: string }>;
};

export type RefinementInput = {
  packageId: string;
  packageFingerprint: string;
  packageProblem: string;
  packageAudience: string;
  packageThesis: string;
  packageUsefulnessTest: string;
  proposals: Array<Pick<PersistedClaimProposal, "id" | "proposedClaimText" | "claimKind" | "whyItMatters" | "safetySensitive" | "recommendedSourceClass" | "independenceRequirement" | "sourceTrace" | "proposalKey">>;
};

type Authority = EvidenceAuthorityClass | "especially_authoritative";

function strongerAuthority(left: Authority, right: Authority): Authority {
  return (AUTHORITY_RANK[left] ?? 0) >= (AUTHORITY_RANK[right] ?? 0) ? left : right;
}

function stripBoilerplate(text: string) {
  let next = text;
  for (const pattern of BOILERPLATE) next = next.replace(pattern, " ");
  return next.replace(/[\u201c\u201d“"']/g, " ").replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
}

function contentTokens(text: string) {
  return new Set(
    normalizeClaimProposalText(stripBoilerplate(text))
      .split(" ")
      .filter((token) => token.length > 2 && !STOPWORDS.has(token))
      .map((token) => {
        if (token.endsWith("ing") && token.length > 6) return token.slice(0, -3);
        if (token.endsWith("ed") && token.length > 5) return token.slice(0, -2);
        if (token.endsWith("s") && !token.endsWith("ss") && token.length > 4) return token.slice(0, -1);
        return token;
      }),
  );
}

function jaccard(left: Set<string>, right: Set<string>) {
  if (!left.size && !right.size) return 1;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

const DISTINCTIVE_TERM = /\b(ssns?|social security|payroll|invoice|export|reconcil|hold|discard|foodborne|haccp|warranty|capacity|voltage|breaker|capacitor)\b/gi;

function distinctiveSignals(text: string) {
  const numbers = text.match(/\d+(?:\.\d+)?/g) ?? [];
  const terms = [...text.matchAll(DISTINCTIVE_TERM)].map((item) => item[0].toLowerCase().replace(/s$/, ""));
  return [...numbers, ...terms].sort();
}

function hasDistinctMaterialSignal(left: string, right: string) {
  const leftSignals = distinctiveSignals(left);
  const rightSignals = distinctiveSignals(right);
  if (leftSignals.length && rightSignals.length && leftSignals.join("|") !== rightSignals.join("|")) return true;
  return false;
}

function structuralClass(kind: ClaimProposalKind, text: string) {
  if (kind === "safety_boundary") return "safety_boundary";
  if (/\b(technician|professional|qualified|escalat|service company)\b/i.test(text)) return "escalation";
  if (kind === "unresolved_question" || /^whether\b/i.test(text) || unitClass(text)) return "threshold";
  if (/\b(checks?|inspect|observ|operational)\b/i.test(text)) return "operator_checks";
  if (/\b(export|reconcil|payroll|invoice)\b/i.test(text)) return "process";
  if (/\b(hold|discard|food)\b/i.test(text)) return "food_hold";
  if (/\b(capacit|warranty|compare|specification)\b/i.test(text)) return "comparison";
  if (kind === "diagnostic") return "operator_checks";
  return `${kind}:other`;
}

function isContextMetadata(proposal: RefinementInput["proposals"][number], problem: string, audience: string) {
  if (proposal.sourceTrace.field === "audience") return true;
  if (proposal.claimKind === "unresolved_question" && /\bstated audience\b/i.test(proposal.proposedClaimText)) return true;
  if (proposal.sourceTrace.field === "problem" && proposal.claimKind === "factual") {
    const overlap = jaccard(contentTokens(proposal.proposedClaimText), contentTokens(problem));
    if (overlap >= 0.6) return true;
  }
  const audienceNorm = audience ? normalizeClaimProposalText(audience) : "";
  if (audienceNorm && normalizeClaimProposalText(proposal.proposedClaimText).includes(audienceNorm) && /\baudience\b/i.test(proposal.proposedClaimText)) {
    return true;
  }
  return false;
}

function unitClass(text: string): "temperature" | "time" | "pressure" | "electrical" | "percent" | null {
  if (/°\s*[fc]|degrees?\s*[fc]/i.test(text)) return "temperature";
  if (/\b(hours?|hrs?|minutes?|mins?|seconds?)\b/i.test(text)) return "time";
  if (/\bpsi\b/i.test(text)) return "pressure";
  if (/\b(volts?|amps?|vac|vdc)\b/i.test(text)) return "electrical";
  if (/%|percent/i.test(text)) return "percent";
  return null;
}

function thresholdQuestion(unit: ReturnType<typeof unitClass>) {
  if (unit === "temperature") return "What temperature range or threshold is applicable for the scope of this package?";
  if (unit === "time") return "What time limit or duration is applicable for the scope of this package?";
  if (unit === "pressure") return "What pressure range or threshold is applicable for the scope of this package?";
  if (unit === "electrical") return "What electrical limit is applicable for the scope of this package?";
  if (unit === "percent") return "What percentage threshold is applicable for the scope of this package?";
  return "What measured threshold is applicable for the scope of this package?";
}

function ensureQuestion(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim().replace(/[.]+$/, "");
  return trimmed.endsWith("?") ? trimmed : `${trimmed}?`;
}

function normalizeQuestion(kind: InvestigationItemKind, text: string) {
  const stripped = stripBoilerplate(text);
  if (kind === "safety_boundary") {
    return ensureQuestion(`What operator actions are outside authorized scope: ${stripped}`);
  }
  if (kind === "diagnostic") {
    return ensureQuestion(`Which operator-observable checks apply: ${stripped}`);
  }
  if (kind === "decision_rule") {
    return ensureQuestion(`What conditions require this decision or escalation: ${stripped}`);
  }
  return ensureQuestion(stripped);
}

function toItemKind(kind: ClaimProposalKind, contextOnly: boolean): InvestigationItemKind {
  if (contextOnly) return "context_only";
  if (kind === "unresolved_question") return "unresolved_assumption";
  if (kind === "safety_boundary") return "safety_boundary";
  if (kind === "diagnostic") return "diagnostic";
  if (kind === "decision_rule") return "decision_rule";
  return "factual";
}

function expectedPolicy(safetySensitive: boolean, text: string): EvidencePolicyClass {
  return deriveClaimPolicyClass({ safetySensitive, claimText: text });
}

function itemKey(kind: string, text: string) {
  return `${kind}:${normalizeClaimProposalText(text)}`.slice(0, 180);
}

function alreadySpecific(text: string) {
  return Boolean(
    unitClass(text)
    || /\b(export|reconcil|payroll|invoice|discard|hold|ssn|warranty|capacit|nameplate|setpoint)\b/i.test(text),
  );
}

function isBroadOperatorCheck(item: InvestigationItem) {
  if (item.depth >= MAX_REFINEMENT_DEPTH) return false;
  if (item.kind !== "diagnostic" && item.kind !== "decision_rule") return false;
  const text = `${item.researchQuestion} ${item.proposedClaim}`;
  const generic = /\b(checks?|inspect|identify|operational|safe)\b/i.test(text);
  return generic && !alreadySpecific(text);
}

const CHECK_EXPANSIONS = [
  {
    suffix: "observe-without-intervention",
    kind: "diagnostic" as const,
    question: "What can be observed or verified without disassembly or intervention?",
    why: "The usefulness test needs operator-safe checks that do not become repair instructions.",
  },
  {
    suffix: "prescribed-operator-procedure",
    kind: "diagnostic" as const,
    question: "What manufacturer-prescribed or process-owner operator procedures exist for this scope?",
    why: "Exact equipment or process behavior should start from primary technical documentation, not the package thesis.",
  },
  {
    suffix: "qualified-service-boundary",
    kind: "decision_rule" as const,
    question: "What conditions cross from operator action into qualified-service or professional work?",
    why: "Escalation rules must be evidenced independently before the usefulness test can be satisfied.",
  },
];

export function investigationItemPriority(item: {
  material: boolean;
  safetySensitive: boolean;
  kind: InvestigationItemKind;
  sourceTraces: Array<{ field: string }>;
}) {
  if (!item.material) return 0;
  let score = 10;
  if (item.safetySensitive) score += 100;
  if (item.kind === "safety_boundary") score += 80;
  if (item.sourceTraces.some((trace) => trace.field === "usefulness_test")) score += 40;
  if (item.kind === "decision_rule") score += 30;
  if (item.kind === "unresolved_assumption") score += 25;
  if (item.kind === "diagnostic") score += 20;
  if (item.kind === "factual") score += 5;
  return score;
}

function mergeGroup(group: RefinementInput["proposals"]) {
  const kinds = new Set(group.map((item) => toItemKind(item.claimKind, false)));
  const kind: InvestigationItemKind = kinds.has("safety_boundary")
    ? "safety_boundary"
    : kinds.has("decision_rule")
      ? "decision_rule"
      : kinds.has("diagnostic")
        ? "diagnostic"
        : kinds.has("unresolved_assumption")
          ? "unresolved_assumption"
          : "factual";
  const safety = group.some((item) => item.safetySensitive) || kind === "safety_boundary";
  let authority = group.reduce(
    (current, item) => strongerAuthority(current, item.recommendedSourceClass),
    group[0].recommendedSourceClass,
  );
  if (safety && kind === "safety_boundary") {
    authority = strongerAuthority(authority, "especially_authoritative");
  }
  return { kind, safety, authority, group };
}

export function refineInvestigationPlan(input: RefinementInput): InvestigationPlanDraft {
  assertNoEconomicsRankingFields(input as unknown as Record<string, unknown>);
  const active = input.proposals.filter(Boolean);
  const context: RefinementInput["proposals"] = [];
  const material: RefinementInput["proposals"] = [];
  for (const proposal of active) {
    if (isContextMetadata(proposal, input.packageProblem, input.packageAudience)) context.push(proposal);
    else material.push(proposal);
  }

  const assigned = new Set<string>();
  const groups: RefinementInput["proposals"][] = [];
  for (const proposal of material) {
    if (assigned.has(proposal.id)) continue;
    const className = structuralClass(proposal.claimKind, proposal.proposedClaimText);
    const tokens = contentTokens(proposal.proposedClaimText);
    const group = [proposal];
    assigned.add(proposal.id);
    for (const other of material) {
      if (assigned.has(other.id)) continue;
      if (hasDistinctMaterialSignal(proposal.proposedClaimText, other.proposedClaimText)) continue;
      const sameClass = structuralClass(other.claimKind, other.proposedClaimText) === className;
      const similar = className === "escalation"
        || jaccard(tokens, contentTokens(other.proposedClaimText)) >= (className === "safety_boundary" ? 0.3 : 0.4);
      if (sameClass && similar) {
        group.push(other);
        assigned.add(other.id);
      }
    }
    groups.push(group);
  }

  const thresholdGroups = new Map<NonNullable<ReturnType<typeof unitClass>>, RefinementInput["proposals"]>();
  const remainder: RefinementInput["proposals"][] = [];
  for (const group of groups) {
    const combined = group.map((item) => item.proposedClaimText).join(" ");
    const unit = unitClass(combined) ?? (group[0].claimKind === "unresolved_question" ? unitClass(group[0].proposedClaimText) : null);
    if (unit) {
      const existing = thresholdGroups.get(unit) ?? [];
      existing.push(...group);
      thresholdGroups.set(unit, existing);
    } else remainder.push(group);
  }

  const items: InvestigationItem[] = [];
  const dependencies: InvestigationPlanDraft["dependencies"] = [];

  function pushFromGroup(group: RefinementInput["proposals"], kindOverride?: InvestigationItemKind, questionOverride?: string) {
    const merged = mergeGroup(group);
    const kind = kindOverride ?? merged.kind;
    const question = questionOverride ?? normalizeQuestion(kind, group[0].proposedClaimText);
    const draft = {
      depth: 0,
      parentItemKey: null as string | null,
      kind,
      researchQuestion: question,
      proposedClaim: question,
      whyItMatters: group[0].whyItMatters,
      material: kind !== "context_only",
      prunedReason: kind === "context_only" ? "Package or context metadata is not an externally verifiable world claim." : null,
      safetySensitive: merged.safety,
      recommendedSourceClass: merged.authority,
      independenceRequirement: group[0].independenceRequirement,
      expectedEvidencePolicy: expectedPolicy(merged.safety, question),
      sourceProposalIds: group.map((item) => item.id),
      sourceTraces: group.map((item) => item.sourceTrace),
      expanded: false,
      humanReviewRequiredBeforeClaimCreation: true as const,
    };
    const key = itemKey(kind, question);
    items.push({ ...draft, itemKey: key, priority: investigationItemPriority(draft) });
  }

  for (const [unit, group] of thresholdGroups) {
    pushFromGroup(group, "unresolved_assumption", thresholdQuestion(unit));
  }
  for (const group of remainder) pushFromGroup(group);

  for (const proposal of context) {
    const draft = {
      depth: 0,
      parentItemKey: null as string | null,
      kind: "context_only" as const,
      researchQuestion: proposal.proposedClaimText,
      proposedClaim: proposal.proposedClaimText,
      whyItMatters: "Retained as package context. It should not consume research capacity.",
      material: false,
      prunedReason: "Package or context metadata is not an externally verifiable world claim.",
      safetySensitive: false,
      recommendedSourceClass: proposal.recommendedSourceClass,
      independenceRequirement: proposal.independenceRequirement,
      expectedEvidencePolicy: "narrow_factual" as const,
      sourceProposalIds: [proposal.id],
      sourceTraces: [proposal.sourceTrace],
      expanded: false,
      humanReviewRequiredBeforeClaimCreation: true as const,
    };
    items.push({ ...draft, itemKey: itemKey("context_only", proposal.proposedClaimText), priority: 0 });
  }

  const parents = items.filter((item) => item.material && isBroadOperatorCheck(item));
  for (const item of parents) {
    const remaining = MAX_INVESTIGATION_ITEMS - items.filter((entry) => entry.material).length;
    if (remaining <= 0) break;
    item.expanded = true;
    for (const expansion of CHECK_EXPANSIONS.slice(0, remaining)) {
      const childSafety = expansion.kind === "decision_rule" ? item.safetySensitive : false;
      const childAuthority = childSafety
        ? strongerAuthority(item.recommendedSourceClass, "especially_authoritative")
        : expansion.kind === "diagnostic"
          ? (item.recommendedSourceClass === "especially_authoritative" ? "manufacturer_technical" : item.recommendedSourceClass)
          : item.recommendedSourceClass;
      const childDraft = {
        depth: 1,
        parentItemKey: item.itemKey,
        kind: expansion.kind,
        researchQuestion: expansion.question,
        proposedClaim: expansion.question,
        whyItMatters: expansion.why,
        material: true,
        prunedReason: null,
        safetySensitive: childSafety,
        recommendedSourceClass: childAuthority,
        independenceRequirement: item.independenceRequirement,
        expectedEvidencePolicy: expectedPolicy(childSafety, expansion.question),
        sourceProposalIds: item.sourceProposalIds,
        sourceTraces: item.sourceTraces,
        expanded: false,
        humanReviewRequiredBeforeClaimCreation: true as const,
      };
      const childKey = itemKey(expansion.kind, `${item.itemKey}:${expansion.suffix}`);
      items.push({ ...childDraft, itemKey: childKey, priority: investigationItemPriority(childDraft) });
      dependencies.push({
        fromItemKey: item.itemKey,
        toItemKey: childKey,
        reason: "Bounded recursive decomposition of a still-broad usefulness check.",
      });
    }
  }

  items.sort((left, right) => right.priority - left.priority || left.researchQuestion.localeCompare(right.researchQuestion));
  const materialItems = items.filter((item) => item.material);
  if (materialItems.length > MAX_INVESTIGATION_ITEMS) {
    const keep = materialItems.slice(0, MAX_INVESTIGATION_ITEMS);
    const pruned = items.filter((item) => !item.material);
    items.length = 0;
    items.push(...keep, ...pruned);
  }

  return {
    version: INVESTIGATION_REFINEMENT_VERSION,
    packageId: input.packageId,
    packageFingerprint: input.packageFingerprint,
    rawProposalIds: active.map((item) => item.id),
    items,
    dependencies,
  };
}

export function materialInvestigationItems(plan: { items: InvestigationItem[] }) {
  return plan.items.filter((item) => item.material);
}

export function isInvestigationPlanState(value: string): value is InvestigationPlanState {
  return (INVESTIGATION_PLAN_STATES as readonly string[]).includes(value);
}
