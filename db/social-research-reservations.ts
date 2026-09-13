/**
 * Durable reservations for bounded research execution.
 *
 * Retry eligibility is a read of persisted runs, so it cannot by itself stop two
 * overlapping requests from selecting the same claim before either has persisted
 * a run. A reservation is taken before execution and released afterwards, so the
 * uniqueness invariant lives in the database rather than in request ordering.
 *
 * D1 exposes no interactive transactions, so acquisition uses only statements
 * that are individually atomic: an insert guarded by a unique index, and a
 * conditional update that can reclaim a lease only once it has expired.
 */

import { assertActorEmail } from "../app/growth/social/approvals.ts";
import { socialGrowthId } from "../app/growth/social/ids.ts";
import { RESEARCH_LIMITS } from "../app/lib/research/limits.ts";
import type { D1DatabaseLike } from "./index.ts";

/**
 * Lease horizon. Twice the bounded run ceiling covers one 8s discovery pass plus
 * persistence, and bounds how long a crashed request can hold a claim.
 */
export const RESEARCH_RESERVATION_LEASE_MS = RESEARCH_LIMITS.maximumRuntimeMs * 2;

export const RESEARCH_RESERVATION_SUBJECT_KINDS = ["claim", "evidence_request", "package"] as const;

export type ResearchReservationSubjectKind = typeof RESEARCH_RESERVATION_SUBJECT_KINDS[number];

export type ResearchReservationKey = {
  packageId: string;
  subjectKind: ResearchReservationSubjectKind;
  subjectId: string;
  strategyFingerprint: string;
};

export type ResearchReservationConflictReason = "in_flight_lease" | "completed_strategy_run";

export type PersistedResearchReservation = ResearchReservationKey & {
  id: string;
  leaseToken: string;
  actorEmail: string;
  acquiredAt: string;
  expiresAt: string;
};

export type ResearchReservationLease = {
  key: ResearchReservationKey;
  leaseToken: string;
  acquiredAt: string;
  expiresAt: string;
  reclaimedExpiredLease: boolean;
};

/** Raised instead of creating a second run for the same subject and strategy. */
export class ResearchReservationConflictError extends Error {
  readonly code = "research_reservation_conflict";
  readonly reason: ResearchReservationConflictReason;
  readonly key: ResearchReservationKey;
  readonly heldByActorEmail: string | null;
  readonly heldUntil: string | null;
  readonly existingRunId: string | null;

  constructor(input: {
    reason: ResearchReservationConflictReason;
    key: ResearchReservationKey;
    heldByActorEmail?: string | null;
    heldUntil?: string | null;
    existingRunId?: string | null;
  }) {
    super(input.reason === "in_flight_lease"
      ? "Bounded research for this claim and strategy is already in flight. The duplicate request did not run research."
      : "Bounded research for this claim already completed under the current strategy. The duplicate request did not run research.");
    this.name = "ResearchReservationConflictError";
    this.reason = input.reason;
    this.key = input.key;
    this.heldByActorEmail = input.heldByActorEmail ?? null;
    this.heldUntil = input.heldUntil ?? null;
    this.existingRunId = input.existingRunId ?? null;
  }
}

export function isResearchReservationConflict(error: unknown): error is ResearchReservationConflictError {
  return error instanceof ResearchReservationConflictError;
}

function assertSubjectKind(value: string): ResearchReservationSubjectKind {
  if (!(RESEARCH_RESERVATION_SUBJECT_KINDS as readonly string[]).includes(value)) {
    throw new Error("Research reservations accept a claim, evidence_request, or package subject.");
  }
  return value as ResearchReservationSubjectKind;
}

function reservationId() {
  return socialGrowthId("research-reservation", `lease-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`);
}

async function readReservation(db: D1DatabaseLike, key: ResearchReservationKey) {
  return db.prepare(`
    SELECT id, package_id AS packageId, subject_kind AS subjectKind, subject_id AS subjectId,
           strategy_fingerprint AS strategyFingerprint, lease_token AS leaseToken,
           actor_email AS actorEmail, acquired_at AS acquiredAt, expires_at AS expiresAt
    FROM social_research_reservations
    WHERE package_id = ? AND subject_kind = ? AND subject_id = ? AND strategy_fingerprint = ?
  `).bind(key.packageId, key.subjectKind, key.subjectId, key.strategyFingerprint)
    .first<PersistedResearchReservation>();
}

/** Ownership is proven by re-reading the row, never by a reported row count. */
async function heldByLease(db: D1DatabaseLike, key: ResearchReservationKey, leaseToken: string) {
  const current = await readReservation(db, key);
  return Boolean(current && current.leaseToken === leaseToken);
}

/**
 * Take the lease for one bounded research execution, or refuse.
 *
 * Refusal is the whole point: the caller that loses the race must not run
 * research for this subject, and must remain free to work on other subjects.
 */
export async function acquireResearchReservation(
  db: D1DatabaseLike,
  input: ResearchReservationKey & { actorEmail: string; now?: Date; leaseMs?: number },
): Promise<ResearchReservationLease> {
  const key: ResearchReservationKey = {
    packageId: input.packageId,
    subjectKind: assertSubjectKind(input.subjectKind),
    subjectId: input.subjectId,
    strategyFingerprint: input.strategyFingerprint,
  };
  const actorEmail = assertActorEmail(input.actorEmail, "Research reservations");
  const now = input.now ?? new Date();
  const acquiredAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + (input.leaseMs ?? RESEARCH_RESERVATION_LEASE_MS)).toISOString();
  const leaseToken = crypto.randomUUID();

  await db.prepare(`
    INSERT INTO social_research_reservations (
      id, package_id, subject_kind, subject_id, strategy_fingerprint,
      lease_token, actor_email, acquired_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (package_id, subject_kind, subject_id, strategy_fingerprint) DO NOTHING
  `).bind(
    reservationId(),
    key.packageId,
    key.subjectKind,
    key.subjectId,
    key.strategyFingerprint,
    leaseToken,
    actorEmail,
    acquiredAt,
    expiresAt,
  ).run();
  if (await heldByLease(db, key, leaseToken)) {
    return { key, leaseToken, acquiredAt, expiresAt, reclaimedExpiredLease: false };
  }

  // A single conditional update: only an already-expired lease can be taken over.
  await db.prepare(`
    UPDATE social_research_reservations
    SET lease_token = ?, actor_email = ?, acquired_at = ?, expires_at = ?, updated_at = ?
    WHERE package_id = ? AND subject_kind = ? AND subject_id = ? AND strategy_fingerprint = ?
      AND expires_at <= ?
  `).bind(
    leaseToken,
    actorEmail,
    acquiredAt,
    expiresAt,
    acquiredAt,
    key.packageId,
    key.subjectKind,
    key.subjectId,
    key.strategyFingerprint,
    acquiredAt,
  ).run();
  if (await heldByLease(db, key, leaseToken)) {
    return { key, leaseToken, acquiredAt, expiresAt, reclaimedExpiredLease: true };
  }

  const holder = await readReservation(db, key);
  throw new ResearchReservationConflictError({
    reason: "in_flight_lease",
    key,
    heldByActorEmail: holder?.actorEmail ?? null,
    heldUntil: holder?.expiresAt ?? null,
  });
}

/**
 * Release only our own lease, so a reclaimed lease is never dropped by its loser.
 * Returns whether this lease is no longer held, which stays true for a late
 * release from a request whose lease was already taken over.
 */
export async function releaseResearchReservation(
  db: D1DatabaseLike,
  input: ResearchReservationKey & { leaseToken: string },
) {
  await db.prepare(`
    DELETE FROM social_research_reservations
    WHERE package_id = ? AND subject_kind = ? AND subject_id = ? AND strategy_fingerprint = ?
      AND lease_token = ?
  `).bind(
    input.packageId,
    input.subjectKind,
    input.subjectId,
    input.strategyFingerprint,
    input.leaseToken,
  ).run();
  return !(await heldByLease(db, input, input.leaseToken));
}

export async function listResearchReservations(db: D1DatabaseLike, packageId?: string) {
  const statement = packageId
    ? db.prepare(`
      SELECT id, package_id AS packageId, subject_kind AS subjectKind, subject_id AS subjectId,
             strategy_fingerprint AS strategyFingerprint, lease_token AS leaseToken,
             actor_email AS actorEmail, acquired_at AS acquiredAt, expires_at AS expiresAt
      FROM social_research_reservations WHERE package_id = ? ORDER BY acquired_at ASC
    `).bind(packageId)
    : db.prepare(`
      SELECT id, package_id AS packageId, subject_kind AS subjectKind, subject_id AS subjectId,
             strategy_fingerprint AS strategyFingerprint, lease_token AS leaseToken,
             actor_email AS actorEmail, acquired_at AS acquiredAt, expires_at AS expiresAt
      FROM social_research_reservations ORDER BY acquired_at ASC
    `);
  const { results } = await statement.all<PersistedResearchReservation>();
  return results ?? [];
}

export function researchReservationExpired(reservation: PersistedResearchReservation, now: Date = new Date()) {
  return reservation.expiresAt <= now.toISOString();
}
