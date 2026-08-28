import { RESEARCH_LIMITS } from "../../lib/research/limits.ts";
import { assertNoEconomicsRankingFields } from "./commercial.ts";
import type { ClaimSufficiencyAssessment } from "./evidence-intelligence.ts";
import type { InvestigationItem } from "./investigation-refinement.ts";
import {
  evaluateClaimRetryEligibility,
  type ResearchRetryReason,
  type ResearchRunForRetry,
} from "./research-retry-eligibility.ts";
import { computeCurrentResearchStrategyFingerprint } from "./research-strategy-fingerprint.ts";

/**
 * Operator-run research ceiling. Equals one existing per-plan bound so a
 * founder click cannot multiply 3/10/5/8s across every unresolved claim.
 * At most two highest-priority gaps share that single ceiling per click.
 */
export const OPERATOR_RESEARCH_BUDGET = {
  maximumClaims: 2,
  maximumQueries: RESEARCH_LIMITS.maximumQueries,
  maximumUrlAttempts: RESEARCH_LIMITS.maximumUrlAttempts,
  maximumAssessedCandidates: RESEARCH_LIMITS.maximumCandidates,
  maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
} as const;

/**
 * Bounded retry budget uses the same per-click caps as first-pass research.
 * Lifetime retry is capped separately: at most one strategy-change pass per claim
 * per current strategy fingerprint (see research-retry-eligibility.ts).
 */
export const OPERATOR_RETRY_BUDGET = OPERATOR_RESEARCH_BUDGET;

export type ResearchWorksetItem = {
  claimId: string;
  claimText: string;
  investigationItemKey: string | null;
  unresolvedGap: string;
  priority: number;
  safetySensitive: boolean;
  requiredAuthority: string;
  independenceRequirement: string;
  researchPath: string;
  existingAcceptedEvidenceContributes: boolean;
  researchNeeded: boolean;
  alreadyResearched: boolean;
  dueThisPass: boolean;
  retryEligible: boolean;
  retryReason: ResearchRetryReason | null;
  priorStrategyFingerprint: string | null;
  priorStrategyFingerprintLabel: string | null;
  currentStrategyFingerprint: string | null;
  currentStrategyFingerprintLabel: string | null;
};

export type ResearchWorkset = {
  items: ResearchWorksetItem[];
  due: ResearchWorksetItem[];
  firstPassDue: ResearchWorksetItem[];
  retryDue: ResearchWorksetItem[];
  remainingAfterBudget: number;
  currentStrategyFingerprint: string;
  currentStrategyFingerprintLabel: string;
};

const CONFLICTED = new Set(["conflicted"]);
const SATISFIED = new Set(["supported"]);

export function remainingOperatorResearchBudget(consumed: {
  claims: number;
  queries: number;
  urlAttempts: number;
  assessedCandidates: number;
  runtimeMs: number;
}) {
  return {
    claims: Math.max(0, OPERATOR_RESEARCH_BUDGET.maximumClaims - consumed.claims),
    queries: Math.max(0, OPERATOR_RESEARCH_BUDGET.maximumQueries - consumed.queries),
    urlAttempts: Math.max(0, OPERATOR_RESEARCH_BUDGET.maximumUrlAttempts - consumed.urlAttempts),
    assessedCandidates: Math.max(0, OPERATOR_RESEARCH_BUDGET.maximumAssessedCandidates - consumed.assessedCandidates),
    runtimeMs: Math.max(0, OPERATOR_RESEARCH_BUDGET.maximumRuntimeMs - consumed.runtimeMs),
  };
}

export function operatorResearchBudgetExhausted(remaining: ReturnType<typeof remainingOperatorResearchBudget>) {
  return remaining.claims <= 0
    || remaining.queries <= 0
    || remaining.urlAttempts <= 0
    || remaining.assessedCandidates <= 0
    || remaining.runtimeMs <= 0;
}

export function buildResearchWorkset(input: {
  claims: Array<{ id: string; claimText: string; safetySensitive: boolean }>;
  assessments: ClaimSufficiencyAssessment[];
  investigationItems?: InvestigationItem[];
  links?: Array<{ claimId: string; itemKey: string }>;
  researchRuns?: ResearchRunForRetry[];
  currentPackageFingerprint?: string | null;
  providerKind?: string | null;
  currentStrategyFingerprint?: string;
  currentStrategyFingerprintLabel?: string;
}): ResearchWorkset {
  assertNoEconomicsRankingFields(input as unknown as Record<string, unknown>);
  const currentStrategy = input.currentStrategyFingerprint
    ? {
      fingerprint: input.currentStrategyFingerprint,
      fingerprintLabel: input.currentStrategyFingerprintLabel ?? input.currentStrategyFingerprint,
    }
    : computeCurrentResearchStrategyFingerprint({ providerKind: input.providerKind });
  const itemsByKey = new Map((input.investigationItems ?? []).map((item) => [item.itemKey, item]));
  const itemKeyByClaim = new Map((input.links ?? []).map((link) => [link.claimId, link.itemKey]));
  const researchedClaims = new Set(
    (input.researchRuns ?? []).map((run) => run.claimId).filter((id): id is string => Boolean(id)),
  );
  const items: ResearchWorksetItem[] = input.claims.map((claim) => {
    const assessment = input.assessments.find((entry) => entry.claimId === claim.id);
    const itemKey = itemKeyByClaim.get(claim.id) ?? null;
    const investigation = itemKey ? itemsByKey.get(itemKey) : undefined;
    const safetySensitive = Boolean(claim.safetySensitive || investigation?.safetySensitive);
    const state = assessment?.state ?? "unsupported";
    const researchNeeded = !SATISFIED.has(state) && !CONFLICTED.has(state);
    const alreadyResearched = researchedClaims.has(claim.id);
    const independence = investigation?.independenceRequirement
      ?? assessment?.researchPlan?.stopCondition
      ?? "Independent accepted evidence is required before this claim can support guidance.";
    const requiredAuthority = investigation?.recommendedSourceClass
      ?? assessment?.researchPlan?.requiredAuthorityClass
      ?? (safetySensitive ? "especially_authoritative" : "primary_documentation");
    const priority = worksetPriority({
      safetySensitive,
      investigationPriority: investigation?.priority ?? 0,
      kind: investigation?.kind ?? "factual",
      depth: investigation?.depth ?? 0,
    });
    const retry = evaluateClaimRetryEligibility({
      claimId: claim.id,
      researchNeeded,
      alreadyResearched,
      runs: input.researchRuns ?? [],
      currentStrategyFingerprint: currentStrategy.fingerprint,
      currentStrategyFingerprintLabel: currentStrategy.fingerprintLabel,
      currentPackageFingerprint: input.currentPackageFingerprint ?? null,
      providerKind: input.providerKind,
    });
    const firstPassDue = researchNeeded && !alreadyResearched;
    const retryDue = researchNeeded && alreadyResearched && retry.retryEligible;
    return {
      claimId: claim.id,
      claimText: claim.claimText,
      investigationItemKey: itemKey,
      unresolvedGap: assessment?.gaps[0] ?? "No accepted supporting evidence records.",
      priority,
      safetySensitive,
      requiredAuthority,
      independenceRequirement: independence,
      researchPath: assessment?.researchPlan?.preferredPrimarySources.join(", ")
        ?? (safetySensitive
          ? "government/regulatory, applicable codes/standards, recognized professional organizations"
          : "credible primary technical documentation"),
      existingAcceptedEvidenceContributes: (assessment?.acceptedSourceCount ?? 0) > 0,
      researchNeeded,
      alreadyResearched,
      dueThisPass: firstPassDue || retryDue,
      retryEligible: retry.retryEligible,
      retryReason: retry.retryReason,
      priorStrategyFingerprint: retry.priorStrategyFingerprint,
      priorStrategyFingerprintLabel: retry.priorStrategyFingerprintLabel,
      currentStrategyFingerprint: retry.currentStrategyFingerprint,
      currentStrategyFingerprintLabel: retry.currentStrategyFingerprintLabel,
    };
  });
  items.sort((left, right) => {
    if (left.safetySensitive !== right.safetySensitive) return left.safetySensitive ? -1 : 1;
    if (left.priority !== right.priority) return right.priority - left.priority;
    return left.claimId.localeCompare(right.claimId);
  });
  const firstPassDue = items.filter((item) => item.researchNeeded && !item.alreadyResearched);
  const retryDue = items.filter((item) => item.researchNeeded && item.alreadyResearched && item.retryEligible);
  const due = [...firstPassDue, ...retryDue];
  return {
    items,
    due,
    firstPassDue,
    retryDue,
    remainingAfterBudget: Math.max(0, due.length - OPERATOR_RESEARCH_BUDGET.maximumClaims),
    currentStrategyFingerprint: currentStrategy.fingerprint,
    currentStrategyFingerprintLabel: currentStrategy.fingerprintLabel,
  };
}

/** Claims that already received a bounded pass but may justify another under retry policy. */
export function countRetryEligibleGaps(items: ResearchWorksetItem[]) {
  return items.filter((item) => item.researchNeeded && item.alreadyResearched && item.retryEligible).length;
}

function worksetPriority(input: {
  safetySensitive: boolean;
  investigationPriority: number;
  kind: string;
  depth: number;
}) {
  let score = input.investigationPriority;
  if (input.safetySensitive) score += 1000;
  if (input.kind === "safety_boundary") score += 80;
  score -= input.depth * 5;
  return score;
}
