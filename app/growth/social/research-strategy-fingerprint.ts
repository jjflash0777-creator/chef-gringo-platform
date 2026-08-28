/**
 * Deterministic research-strategy identity for bounded retry eligibility.
 * Captures acquisition-pipeline material that affects recall; excludes volatile runtime data.
 */

import { RESEARCH_LIMITS } from "../../lib/research/limits.ts";
import { CLAIM_COVERAGE_VERSION } from "./claim-coverage.ts";
import { EVIDENCE_GAP_RESEARCH_VERSION } from "./evidence-gap-research.ts";
import { RESEARCH_MEMORY_VERSION } from "./research-memory.ts";
import { SOURCE_ACQUISITION_INTENT_VERSION } from "./source-acquisition-intent.ts";
import { SUBJECT_GROUNDING_VERSION } from "./subject-grounding.ts";

export const RESEARCH_STRATEGY_SCHEMA_VERSION = "research-strategy-v1";

/** Runs persisted before Source Acquisition / strategy records used this identity. */
export const LEGACY_RESEARCH_STRATEGY_FINGERPRINT = "pre-source-acquisition-v0";

export type ResearchStrategyRecord = {
  schemaVersion: typeof RESEARCH_STRATEGY_SCHEMA_VERSION;
  fingerprint: string;
  fingerprintLabel: string;
  packageFingerprint?: string | null;
  providerKindClass: ProviderKindClass;
};

export type ProviderKindClass = "auto" | "live" | "fixture";

export type ResearchStrategyPlanLike = {
  researchStrategy?: ResearchStrategyRecord | null;
  queryPlans?: unknown[];
  evidenceGap?: { version?: string };
};

function stableKey(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function normalizeProviderKindClass(value?: string | null): ProviderKindClass {
  if (value === "live") return "live";
  if (value === "fixture") return "fixture";
  return "auto";
}

/** Canonical material inputs that affect bounded recall behavior. */
export function buildResearchStrategyMaterial(input?: { providerKind?: string | null }) {
  const providerKindClass = normalizeProviderKindClass(input?.providerKind);
  return {
    schemaVersion: RESEARCH_STRATEGY_SCHEMA_VERSION,
    queryPlannerVersion: EVIDENCE_GAP_RESEARCH_VERSION,
    sourceAcquisitionIntentVersion: SOURCE_ACQUISITION_INTENT_VERSION,
    sourceLanePolicyVersion: SOURCE_ACQUISITION_INTENT_VERSION,
    queryConstructionVersion: "contextual-query-terms-v1",
    packageContextBehavior: "package-context-v1",
    researchMemoryVersion: RESEARCH_MEMORY_VERSION,
    claimCoverageVersion: CLAIM_COVERAGE_VERSION,
    subjectGroundingVersion: SUBJECT_GROUNDING_VERSION,
    providerKindClass,
    limits: `${RESEARCH_LIMITS.maximumQueries}/${RESEARCH_LIMITS.maximumUrlAttempts}/${RESEARCH_LIMITS.maximumCandidates}/${RESEARCH_LIMITS.maximumRuntimeMs}`,
  };
}

export function formatResearchStrategyLabel(material: ReturnType<typeof buildResearchStrategyMaterial>) {
  return [
    material.schemaVersion,
    `planner=${material.queryPlannerVersion}`,
    `intent=${material.sourceAcquisitionIntentVersion}`,
    `lanes=${material.sourceLanePolicyVersion}`,
    `queries=${material.queryConstructionVersion}`,
    `context=${material.packageContextBehavior}`,
    `memory=${material.researchMemoryVersion}`,
    `coverage=${material.claimCoverageVersion}`,
    `grounding=${material.subjectGroundingVersion}`,
    `provider=${material.providerKindClass}`,
    `limits=${material.limits}`,
  ].join("|");
}

export function computeCurrentResearchStrategyFingerprint(input?: { providerKind?: string | null }) {
  const material = buildResearchStrategyMaterial(input);
  const fingerprintLabel = formatResearchStrategyLabel(material);
  return {
    material,
    fingerprintLabel,
    fingerprint: stableKey(fingerprintLabel),
  };
}

export function buildResearchStrategyRecord(input: {
  packageFingerprint?: string | null;
  providerKind?: string | null;
}): ResearchStrategyRecord {
  const current = computeCurrentResearchStrategyFingerprint(input);
  return {
    schemaVersion: RESEARCH_STRATEGY_SCHEMA_VERSION,
    fingerprint: current.fingerprint,
    fingerprintLabel: current.fingerprintLabel,
    packageFingerprint: input.packageFingerprint ?? null,
    providerKindClass: current.material.providerKindClass,
  };
}

/** Resolve durable strategy identity from a persisted plan, never silently treating legacy as current. */
export function resolveResearchStrategyFingerprint(plan: ResearchStrategyPlanLike | null | undefined) {
  const recorded = plan?.researchStrategy?.fingerprint;
  if (recorded) return recorded;
  return LEGACY_RESEARCH_STRATEGY_FINGERPRINT;
}

export function resolveResearchStrategyLabel(plan: ResearchStrategyPlanLike | null | undefined) {
  const recorded = plan?.researchStrategy?.fingerprintLabel;
  if (recorded) return recorded;
  return LEGACY_RESEARCH_STRATEGY_FINGERPRINT;
}

export function resolvePackageFingerprintFromPlan(plan: ResearchStrategyPlanLike | null | undefined) {
  return plan?.researchStrategy?.packageFingerprint ?? null;
}
