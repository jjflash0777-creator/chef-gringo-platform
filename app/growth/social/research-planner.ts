import { RESEARCH_LIMITS } from "../../lib/research/limits.ts";
import { buildGenericBoundedQueries } from "../../lib/research/plan.ts";
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
} from "./evidence-intelligence.ts";

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
}) {
  const limit = input.maximumQueries ?? RESEARCH_LIMITS.maximumQueries;
  const trimmed = input.claimOrQuestion.replace(/\bresearch this:?\s*/i, "").trim().slice(0, 120);
  if (!trimmed) return [];
  const specialized = input.policyClass === "safety_sensitive"
    ? [
      `"${trimmed}" site:.gov`,
      `"${trimmed}" regulatory guidance`,
      `"${trimmed}" code standard`,
    ]
    : input.policyClass === "broad_technical"
      ? [
        `"${trimmed}" manufacturer technical documentation`,
        `"${trimmed}" independent manufacturer manual`,
        `"${trimmed}" site:.gov`,
      ]
      : buildGenericBoundedQueries(trimmed);
  return [...new Set(specialized)].slice(0, limit);
}

export function expandExecutableResearchPlan(input: {
  evidencePlan: EvidenceResearchPlan;
  policyClass: EvidencePolicyClass;
  evidenceDomain?: CulinaryDomain | null;
}): ExecutableResearchPlan {
  const evidenceDomain = input.evidenceDomain ?? inferEvidenceDomain(input.evidencePlan.claimOrQuestion);
  const policy = EVIDENCE_POLICY[input.policyClass];
  const queries = buildBoundedResearchQueries({
    claimOrQuestion: input.evidencePlan.claimOrQuestion,
    policyClass: input.policyClass,
    maximumQueries: RESEARCH_LIMITS.maximumQueries,
  });
  return {
    ...input.evidencePlan,
    independentSourcesDesired: Math.max(input.evidencePlan.independentSourcesDesired, policy.minIndependentAccepted),
    disallowedSourceClasses: [...new Set([...input.evidencePlan.disallowedSourceClasses, ...DISALLOWED_SOURCE_CLASSES])],
    claimClass: input.policyClass,
    riskClass: riskClassFor(input.policyClass),
    preferredSourceClasses: preferredSourceClassesFor(input.policyClass),
    maximumQueries: RESEARCH_LIMITS.maximumQueries,
    maximumCandidateDocuments: RESEARCH_LIMITS.maximumCandidates,
    maximumRuntimeMs: RESEARCH_LIMITS.maximumRuntimeMs,
    domainPreferences: preferredPrimarySourcesForDomain(evidenceDomain),
    evidenceDomain,
    queries,
  };
}

export function buildExecutableResearchPlan(input: {
  claimOrQuestion: string;
  policyClass: EvidencePolicyClass;
  reason: string;
  independentSourcesDesired?: number;
  evidenceDomain?: CulinaryDomain | null;
  requiredAuthorityClass?: EvidenceAuthorityClass | "especially_authoritative";
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
  });
}

export function executablePlanFromClaimAssessment(assessment: ClaimSufficiencyAssessment): ExecutableResearchPlan | null {
  if (!assessment.researchPlan) return null;
  return expandExecutableResearchPlan({
    evidencePlan: assessment.researchPlan,
    policyClass: assessment.policyClass,
    evidenceDomain: inferEvidenceDomain(assessment.claimText),
  });
}

export function executablePlanFromRadarItem(item: EvidenceGapRadarItem, policyClass: EvidencePolicyClass): ExecutableResearchPlan | null {
  if (!item.researchPlan) return null;
  return expandExecutableResearchPlan({
    evidencePlan: item.researchPlan,
    policyClass,
    evidenceDomain: inferEvidenceDomain(item.label),
  });
}
