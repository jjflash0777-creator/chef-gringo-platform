/**
 * Authoritative corpus-review / evidence-disposition truth for Autonomous Operator.
 * Historical research candidates and operator-run snapshots are audit only.
 * Current corpus document ingestionStatus wins over submission intent.
 */

import { assertNoEconomicsRankingFields } from "./commercial.ts";

/** Actionable human corpus-review obligation. */
export const CORPUS_PENDING_REVIEW_STATUSES = ["awaiting_review"] as const;

/** Terminal dispositions that clear pending review and cannot satisfy claims. */
export const CORPUS_NON_EVIDENCE_DISPOSITIONS = [
  "rejected",
  "stale",
  "superseded",
  "failed",
] as const;

/** Accepted corpus is attachable evidence only after a separate claim attach. */
export const CORPUS_ACCEPTED_STATUS = "accepted" as const;

export type CorpusDispositionStatus = string;

export type SubmittedCandidateTruth = {
  candidateId: string;
  claimId: string | null;
  submittedDocumentId: string;
  canonicalUrl: string;
  /** Current corpus row status, or null when the document cannot be loaded. */
  ingestionStatus: CorpusDispositionStatus | null;
  /** EI / claim support for the originating claim, when known. */
  claimSupported?: boolean;
};

export type CorpusReviewTruth = {
  pendingReviewCount: number;
  pendingCandidateIds: string[];
  rejectedOrNonEvidenceCount: number;
  acceptedUnattachedCount: number;
  historicalSubmittedCount: number;
  /** Pending reviews that still matter for an unsupported claim. */
  actionablePendingCount: number;
  actionableCandidateIds: string[];
};

/**
 * Truth precedence (newest durable human disposition wins):
 * 1. Current corpus_documents.ingestion_status
 * 2. Never infer pending review solely from research_candidates.submitted_document_id
 * 3. Operator-run summaries / traces are audit snapshots only
 * 4. Missing corpus row → fail closed (not pending)
 */
export function isCorpusPendingHumanReview(ingestionStatus: CorpusDispositionStatus | null | undefined): boolean {
  if (!ingestionStatus) return false;
  return (CORPUS_PENDING_REVIEW_STATUSES as readonly string[]).includes(ingestionStatus);
}

export function isCorpusNonEvidenceDisposition(ingestionStatus: CorpusDispositionStatus | null | undefined): boolean {
  if (!ingestionStatus) return false;
  return (CORPUS_NON_EVIDENCE_DISPOSITIONS as readonly string[]).includes(ingestionStatus);
}

export function isCorpusAccepted(ingestionStatus: CorpusDispositionStatus | null | undefined): boolean {
  return ingestionStatus === CORPUS_ACCEPTED_STATUS;
}

/**
 * A candidate is actionable pending review only when:
 * - corpus status is currently awaiting_review, AND
 * - the originating claim is not already EI-supported (avoid blocking on surplus candidates).
 */
export function candidateIsActionableCorpusReview(row: SubmittedCandidateTruth): boolean {
  if (!isCorpusPendingHumanReview(row.ingestionStatus)) return false;
  if (row.claimSupported === true) return false;
  return true;
}

export function recomputeCorpusReviewTruth(
  rows: SubmittedCandidateTruth[],
  economics?: Record<string, unknown>,
): CorpusReviewTruth {
  if (economics) assertNoEconomicsRankingFields(economics);
  const pending = rows.filter((row) => isCorpusPendingHumanReview(row.ingestionStatus));
  const actionable = pending.filter((row) => candidateIsActionableCorpusReview(row));
  return {
    pendingReviewCount: pending.length,
    pendingCandidateIds: pending.map((row) => row.candidateId),
    rejectedOrNonEvidenceCount: rows.filter((row) => isCorpusNonEvidenceDisposition(row.ingestionStatus)).length,
    acceptedUnattachedCount: rows.filter((row) => isCorpusAccepted(row.ingestionStatus)).length,
    historicalSubmittedCount: rows.length,
    actionablePendingCount: actionable.length,
    actionableCandidateIds: actionable.map((row) => row.candidateId),
  };
}

/**
 * Operator awaiting-review count used by classifyOperatorState.
 * Prefer actionable pending (unsupported claims only). Fail closed on missing docs.
 */
export function awaitingCorpusReviewCountFromTruth(truth: CorpusReviewTruth): number {
  return truth.actionablePendingCount;
}

export function memorySkipReasonForCorpusDisposition(
  ingestionStatus: CorpusDispositionStatus | null | undefined,
): "human_rejected" | null {
  if (ingestionStatus === "rejected" || ingestionStatus === "stale" || ingestionStatus === "superseded") {
    return "human_rejected";
  }
  return null;
}
