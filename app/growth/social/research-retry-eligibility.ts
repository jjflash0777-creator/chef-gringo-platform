/**
 * Claim-scoped retry eligibility. One changed claim must not rerun every claim.
 * Strategy change permits a new bounded search plan; ResearchMemory still governs exact URLs.
 */

import {
  computeCurrentResearchStrategyFingerprint,
  resolvePackageFingerprintFromPlan,
  resolveResearchStrategyFingerprint,
  type ResearchStrategyPlanLike,
} from "./research-strategy-fingerprint.ts";

export const RESEARCH_RETRY_REASONS = [
  "strategy_changed",
  "new_package_context",
] as const;

export type ResearchRetryReason = typeof RESEARCH_RETRY_REASONS[number];

export type ResearchRunForRetry = {
  claimId: string | null;
  status: string;
  finishedAt?: string | null;
  plan?: ResearchStrategyPlanLike | null;
};

export type ClaimRetryEligibility = {
  retryEligible: boolean;
  retryReason: ResearchRetryReason | null;
  priorStrategyFingerprint: string | null;
  priorStrategyFingerprintLabel: string | null;
  currentStrategyFingerprint: string;
  currentStrategyFingerprintLabel: string;
};

function completedRunsForClaim(runs: ResearchRunForRetry[], claimId: string) {
  return runs
    .filter((run) => run.claimId === claimId && run.status === "completed")
    .sort((left, right) => Date.parse(right.finishedAt ?? "") - Date.parse(left.finishedAt ?? ""));
}

function hasCompletedRunMatching(
  runs: ResearchRunForRetry[],
  claimId: string,
  match: (plan: ResearchStrategyPlanLike | null | undefined) => boolean,
) {
  return completedRunsForClaim(runs, claimId).some((run) => match(run.plan));
}

export function evaluateClaimRetryEligibility(input: {
  claimId: string;
  researchNeeded: boolean;
  alreadyResearched: boolean;
  runs: ResearchRunForRetry[];
  currentStrategyFingerprint?: string;
  currentStrategyFingerprintLabel?: string;
  currentPackageFingerprint?: string | null;
  providerKind?: string | null;
}): ClaimRetryEligibility {
  const current = input.currentStrategyFingerprint
    ? {
      fingerprint: input.currentStrategyFingerprint,
      fingerprintLabel: input.currentStrategyFingerprintLabel ?? input.currentStrategyFingerprint,
    }
    : computeCurrentResearchStrategyFingerprint({ providerKind: input.providerKind });

  const ineligible = (priorFingerprint: string | null, priorLabel: string | null): ClaimRetryEligibility => ({
    retryEligible: false,
    retryReason: null,
    priorStrategyFingerprint: priorFingerprint,
    priorStrategyFingerprintLabel: priorLabel,
    currentStrategyFingerprint: current.fingerprint,
    currentStrategyFingerprintLabel: current.fingerprintLabel,
  });

  if (!input.researchNeeded || !input.alreadyResearched) {
    return ineligible(null, null);
  }

  const claimRuns = completedRunsForClaim(input.runs, input.claimId);
  if (!claimRuns.length) {
    return ineligible(null, null);
  }

  const latestRun = claimRuns[0];
  const priorStrategyFingerprint = resolveResearchStrategyFingerprint(latestRun.plan);
  const priorStrategyFingerprintLabel = latestRun.plan?.researchStrategy?.fingerprintLabel ?? priorStrategyFingerprint;
  const priorPackageFingerprint = resolvePackageFingerprintFromPlan(latestRun.plan);

  const hasCompletedUnderCurrentStrategy = hasCompletedRunMatching(
    input.runs,
    input.claimId,
    (plan) => resolveResearchStrategyFingerprint(plan) === current.fingerprint,
  );

  if (
    priorStrategyFingerprint !== current.fingerprint
    && !hasCompletedUnderCurrentStrategy
  ) {
    return {
      retryEligible: true,
      retryReason: "strategy_changed",
      priorStrategyFingerprint,
      priorStrategyFingerprintLabel,
      currentStrategyFingerprint: current.fingerprint,
      currentStrategyFingerprintLabel: current.fingerprintLabel,
    };
  }

  if (
    input.currentPackageFingerprint
    && priorPackageFingerprint
    && priorPackageFingerprint !== input.currentPackageFingerprint
    && !hasCompletedRunMatching(
      input.runs,
      input.claimId,
      (plan) => (
        resolvePackageFingerprintFromPlan(plan) === input.currentPackageFingerprint
        && resolveResearchStrategyFingerprint(plan) === current.fingerprint
      ),
    )
  ) {
    return {
      retryEligible: true,
      retryReason: "new_package_context",
      priorStrategyFingerprint,
      priorStrategyFingerprintLabel,
      currentStrategyFingerprint: current.fingerprint,
      currentStrategyFingerprintLabel: current.fingerprintLabel,
    };
  }

  return ineligible(priorStrategyFingerprint, priorStrategyFingerprintLabel);
}

export function evaluateClaimRetryEligibilityIdempotent(
  input: Parameters<typeof evaluateClaimRetryEligibility>[0],
) {
  const first = evaluateClaimRetryEligibility(input);
  const second = evaluateClaimRetryEligibility(input);
  return { first, second, idempotent: JSON.stringify(first) === JSON.stringify(second) };
}
