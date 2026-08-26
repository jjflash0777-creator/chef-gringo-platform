import { RESEARCH_LIMITS } from "../../lib/research/limits.ts";
import { buildGenericBoundedQueries, compactResearchQueryTerms } from "../../lib/research/plan.ts";
import type { CulinaryDomain } from "../../lib/research/source-policy.ts";
import {
  CREDIBLE_PRIMARY_CLASSES,
  DISALLOWED_SOURCE_CLASSES,
  ESPECIALLY_AUTHORITATIVE_CLASSES,
  EVIDENCE_POLICY,
  type EvidenceAuthorityClass,
  type EvidencePolicyClass,
  preferredPrimarySourcesForDomain,
} from "./evidence-policy.ts";
import {
  buildResearchPlan,
  type ClaimSufficiencyAssessment,
  type EvidenceGapRadarItem,
  type EvidenceResearchPlan,
  type EvidenceSnapshot,
} from "./evidence-intelligence.ts";
import {
  buildEvidenceGapFeedback,
  buildGapAwareQueries,
  type EvidenceGapFeedback,
} from "./evidence-gap-research.ts";

export const RESEARCH_RISK_CLASSES = ["low", "elevated", "safety_sensitive"] as const;
export type ResearchRiskClass = typeof RESEARCH_RISK_CLASSES[number];

export type ExecutableResearchPlan = EvidenceResearchPlan & {
  claimClass: EvidencePolicyClass;
  riskClass: ResearchRiskClass;
  preferredSourceClasses: readonly EvidenceAuthorityClass[];
  maximumQueries: number;
  maximumCandidateDocuments: number;
  maximumRuntimeMs: number;
  domainPreferences: string[];
  evidenceDomain: CulinaryDomain;
  queries: string[];
  evidenceGap: EvidenceGapFeedback;
};

function riskClassFor(policyClass: EvidencePolicyClass): ResearchRiskClass {
  if (policyClass === "safety_sensitive") return "safety_sensitive";
  if (policyClass === "broad_technical") return "elevated";
  return "low";
}

export function inferEvidenceDomain(text: string): CulinaryDomain {
  if (/\b(safety|osha|carbon monoxide|allergen|foodborne|therapeutic|iddsi)\b/i.test(text)) {
    return /iddsi|therapeutic|nutrition/.test(text.toLowerCase()) ? "nutrition_therapeutic_diets" : "food_safety_public_health";
  }
  if (/\b(generator|electrical|headroom|equipment|manual|licensing|code)\b/i.test(text)) return "equipment";
  return "culinary_technique";
}

export function preferredSourceClassesFor(policyClass: EvidencePolicyClass): readonly EvidenceAuthorityClass[] {
  if (policyClass === "safety_sensitive") return ESPECIALLY_AUTHORITATIVE_CLASSES;
  return CREDIBLE_PRIMARY_CLASSES;
}

export function buildBoundedResearchQueries(input: {
  claimOrQuestion: string;
  policyClass: EvidencePolicyClass;
  maximumQueries?: number;
  gap?: EvidenceGapFeedback;
}) {
  const limit = input.maximumQueries ?? RESEARCH_LIMITS.maximumQueries;
  if (input.gap) {
    return buildGapAwareQueries({
      claimOrQuestion: input.claimOrQuestion,
      policyClass: input.policyClass,
      gap: input.gap,
      maximumQueries: limit,
    });
  }
  const terms = compactResearchQueryTerms(input.claimOrQuestion);
  if (!terms) return [];
  const specialized = input.policyClass === "safety_sensitive"
    ? [
      `${terms} site:.gov`,
      `${terms} regulatory guidance`,
      `${terms} code standard`,
    ]
    : input.policyClass === "broad_technical"
      ? [
        `${terms} manufacturer technical documentation`,
        `${terms} independent manufacturer manual`,
        `${terms} site:.gov`,
      ]
      : buildGenericBoundedQueries(input.claimOrQuestion);
  return [...new Set(specialized)].slice(0, limit);
}

export function expandExecutableResearchPlan(input: {
  evidencePlan: EvidenceResearchPlan;
  policyClass: EvidencePolicyClass;
  evidenceDomain?: CulinaryDomain | null;
  assessment?: ClaimSufficiencyAssessment | null;
  attached?: EvidenceSnapshot[];
}): ExecutableResearchPlan {
  const evidenceDomain = input.evidenceDomain ?? inferEvidenceDomain(input.evidencePlan.claimOrQuestion);
  const policy = EVIDENCE_POLICY[input.policyClass];
  const evidenceGap = buildEvidenceGapFeedback({
    assessment: input.assessment,
    attached: input.attached,
    policyClass: input.policyClass,
  });
  const usableGap = input.assessment
    ? evidenceGap
    : synthesizeGapFromPolicy(input.policyClass, input.evidencePlan, evidenceGap);
  const queries = buildBoundedResearchQueries({
    claimOrQuestion: input.evidencePlan.claimOrQuestion,
    policyClass: input.policyClass,
    maximumQueries: RESEARCH_LIMITS.maximumQueries,
    gap: usableGap,
  });
  return {
    ...input.evidencePlan,
    independentSourcesDesired: Math.max(input.evidencePlan.independentSourcesDesired, policy.minIndependentAccepted),
    disallowedSourceClasses: [...new Set([...input.evidencePlan.disallowedSourceClasses, ...DISALLOWED_SOURCE_CLASSES])],
    claimClass: input.policyClass,
    riskClass: riskClassFor(input.policyClass),
    preferredSourceClasses: usableGap.preferredNextSourceClasses.length
      ? usableGap.preferredNextSourceClasses
      : preferredSourceClassesFor(input.policyClass),
    maximumQueries: RESEARCH_LIMITS.maximumQueries,
    maximumCandidateDocuments: RESEARCH_LIMITS.maximumCandidates,
    maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
    domainPreferences: preferredPrimarySourcesForDomain(evidenceDomain),
    evidenceDomain,
    queries,
    evidenceGap: usableGap,
    stopCondition: usableGap.stopCondition || input.evidencePlan.stopCondition,
  };
}

function synthesizeGapFromPolicy(
  policyClass: EvidencePolicyClass,
  evidencePlan: EvidenceResearchPlan,
  base: EvidenceGapFeedback,
): EvidenceGapFeedback {
  if (policyClass === "safety_sensitive") {
    return {
      ...base,
      unresolvedPolicyGap: "insufficient_authority",
      strongerAuthorityRequired: true,
      stillMissingDimensions: ["stronger_authority"],
      preferredNextSourceClasses: [...ESPECIALLY_AUTHORITATIVE_CLASSES],
      stopCondition: evidencePlan.stopCondition,
    };
  }
  if (policyClass === "broad_technical") {
    return {
      ...base,
      unresolvedPolicyGap: "needs_independent_corroboration",
      remainingIndependentSourceCount: Math.max(evidencePlan.independentSourcesDesired, 2),
      strongerAuthorityRequired: true,
      stillMissingDimensions: ["independent_publisher", "stronger_authority"],
      preferredNextSourceClasses: ["manufacturer_technical", "equipment_manual", "industry_organization", "government_regulatory", "code_standard"],
      stopCondition: evidencePlan.stopCondition,
    };
  }
  return { ...base, stopCondition: evidencePlan.stopCondition };
}

export function buildExecutableResearchPlan(input: {
  claimOrQuestion: string;
  policyClass: EvidencePolicyClass;
  reason: string;
  independentSourcesDesired?: number;
  evidenceDomain?: CulinaryDomain | null;
  requiredAuthorityClass?: EvidenceAuthorityClass | "especially_authoritative";
  assessment?: ClaimSufficiencyAssessment | null;
  attached?: EvidenceSnapshot[];
}): ExecutableResearchPlan {
  const policy = EVIDENCE_POLICY[input.policyClass];
  return expandExecutableResearchPlan({
    evidencePlan: buildResearchPlan({
      claimOrQuestion: input.claimOrQuestion,
      policyClass: input.policyClass,
      evidenceDomain: input.evidenceDomain,
      independentSourcesDesired: input.independentSourcesDesired ?? policy.minIndependentAccepted,
      requiredAuthorityClass: input.requiredAuthorityClass,
      reason: input.reason,
    }),
    policyClass: input.policyClass,
    evidenceDomain: input.evidenceDomain,
    assessment: input.assessment,
    attached: input.attached,
  });
}

export function executablePlanFromClaimAssessment(
  assessment: ClaimSufficiencyAssessment,
  attached: EvidenceSnapshot[] = [],
): ExecutableResearchPlan | null {
  if (!assessment.researchPlan) return null;
  return expandExecutableResearchPlan({
    evidencePlan: assessment.researchPlan,
    policyClass: assessment.policyClass,
    evidenceDomain: inferEvidenceDomain(assessment.claimText),
    assessment,
    attached,
  });
}

export function executablePlanFromRadarItem(
  item: EvidenceGapRadarItem,
  policyClass: EvidencePolicyClass,
  attached: EvidenceSnapshot[] = [],
): ExecutableResearchPlan | null {
  if (!item.researchPlan) return null;
  return expandExecutableResearchPlan({
    evidencePlan: item.researchPlan,
    policyClass,
    evidenceDomain: inferEvidenceDomain(item.label),
    attached,
  });
}
