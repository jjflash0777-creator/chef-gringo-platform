import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResearchStrategyRecord,
  computeCurrentResearchStrategyFingerprint,
} from "../app/growth/social/index.ts";
import {
  advanceOperator,
  loadOperatorView,
} from "../db/social-operator-repository.ts";
import {
  createContentOpportunity,
  createContentPackage,
  listPackageClaims,
} from "../db/social-growth-repository.ts";
import { listResearchRuns } from "../db/social-research-read.ts";
import { runBoundedCandidateDiscovery } from "../db/social-research-repository.ts";
import {
  acquireResearchReservation,
  isResearchReservationConflict,
  listResearchReservations,
  releaseResearchReservation,
} from "../db/social-research-reservations.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const EQUIPMENT = {
  thesis: "An independent operator with a commercial freezer running around 20°F should be able to identify safe operational checks and determine when the problem requires a qualified refrigeration technician, without attempting unsafe electrical or refrigerant repairs.",
  packageUsefulnessTest: "After using this guide, an operator should be able to verify the temperature problem, identify safe checks they can perform themselves, recognize conditions that require professional refrigeration service, and avoid unsafe or unsupported repair attempts.",
  problem: "A commercial freezer is running warm.",
  audience: "independent_operator",
};

/** A second, materially different package: claim proposal ids are content derived. */
const FOOD = {
  thesis: "A café should hold sliced tomatoes below 41°F after prep.",
  packageUsefulnessTest: "Name the hold temperature.",
  problem: "Prep cooks leave sliced tomatoes on the counter.",
  audience: "independent_operator",
};

const CURRENT_STRATEGY = computeCurrentResearchStrategyFingerprint({}).fingerprint;

async function withAdmin(run) {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db };
  process.env.MARKETPLACE_ADMIN_EMAILS = "admin@example.com";
  try {
    await run(db);
  } finally {
    delete globalThis.__CHEF_GRINGO_ENV__;
    delete process.env.MARKETPLACE_ADMIN_EMAILS;
    db.close();
  }
}

/** Package with claims created from an acknowledged investigation plan. */
async function seedPackageWithClaims(db, slug, fields = EQUIPMENT) {
  const opportunity = await createContentOpportunity(db, {
    slug: `${slug}-opportunity`,
    problem: fields.problem,
    audience: fields.audience,
    usefulnessTest: fields.packageUsefulnessTest,
    productId: null,
    workflowId: null,
    partnerOpportunityId: null,
    status: "selected",
  });
  const pkg = await createContentPackage(db, {
    slug,
    opportunityId: opportunity.id,
    thesis: fields.thesis,
    usefulnessTest: fields.packageUsefulnessTest,
    commercialPosture: "none",
  });
  await advanceOperator(db, pkg.id, "admin@example.com", "advance");
  await advanceOperator(db, pkg.id, "admin@example.com", "acknowledge_investigation_plan");
  await advanceOperator(db, pkg.id, "admin@example.com", "create_claims_from_investigation");
  const claims = await listPackageClaims(db, pkg.id);
  await clearResearchRuns(db, pkg.id);
  return { pkg, claims };
}

async function clearResearchRuns(db, packageId) {
  await db.prepare(`
    DELETE FROM social_research_candidates
    WHERE run_id IN (SELECT id FROM social_research_runs WHERE package_id = ?)
  `).bind(packageId).run();
  await db.prepare("DELETE FROM social_research_runs WHERE package_id = ?").bind(packageId).run();
}

async function insertCompletedRun(db, packageId, claimId, plan = {}, runId = null) {
  const id = runId ?? `seeded-${claimId.slice(-10)}-${Math.random().toString(16).slice(2, 8)}`;
  const at = "2026-08-27T12:00:00.000Z";
  await db.prepare(`
    INSERT INTO social_research_runs (
      id, package_id, claim_id, evidence_request_id, actor_email, provider_id, provider_kind,
      status, live_retrieval, stop_reason, plan_json, queries_json, diagnostics_json, started_at, finished_at
    ) VALUES (?, ?, ?, NULL, 'admin@example.com', 'fixture', 'fixture', 'completed', 0, 'budget', ?, '[]', NULL, ?, ?)
  `).bind(id, packageId, claimId, JSON.stringify(plan), at, at).run();
  return id;
}

/** Legacy pre-Source-Acquisition runs: every claim becomes retry eligible. */
async function seedLegacyRuns(db, packageId, claims) {
  for (const claim of claims) await insertCompletedRun(db, packageId, claim.id, {});
}

function newRunsFor(runs) {
  return runs.filter((run) => !run.id.startsWith("seeded-"));
}

function currentStrategyRunsByClaim(runs) {
  const byClaim = new Map();
  for (const run of runs) {
    const fingerprint = run.plan?.researchStrategy?.fingerprint ?? "pre-source-acquisition-v0";
    if (fingerprint !== CURRENT_STRATEGY) continue;
    byClaim.set(run.claimId, [...(byClaim.get(run.claimId) ?? []), run.id]);
  }
  return byClaim;
}

function reservationKeyFor(packageId, claimId, strategyFingerprint = CURRENT_STRATEGY) {
  return { packageId, subjectKind: "claim", subjectId: claimId, strategyFingerprint };
}

test("two simultaneous Continue requests cannot create duplicate current-strategy runs", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await seedPackageWithClaims(db, "concurrency-same-package");
    await seedLegacyRuns(db, pkg.id, claims);
    const before = await loadOperatorView(db, pkg.id);
    assert.equal(before.state, "research_ready");
    assert.ok(before.summary.retryEligibleGapCount >= 2);

    const settled = await Promise.allSettled([
      advanceOperator(db, pkg.id, "admin@example.com", "continue_evidence_research"),
      advanceOperator(db, pkg.id, "admin@example.com", "continue_evidence_research"),
    ]);
    assert.ok(settled.every((entry) => entry.status === "fulfilled"), "overlapping requests must not error");

    const runs = await listResearchRuns(db, pkg.id);
    const byClaim = currentStrategyRunsByClaim(runs);
    for (const [claimId, runIds] of byClaim) {
      assert.equal(runIds.length, 1, `claim ${claimId} must hold one current-strategy run, saw ${runIds.length}`);
    }
    // Each request honours the same per-action ceiling.
    for (const entry of settled) {
      const discoveries = entry.value.executionTrace.filter((step) => step.id.startsWith("run_bounded_live_discovery:"));
      assert.ok(discoveries.length <= 2, "an action may never exceed the two-claim budget");
    }
    assert.equal(newRunsFor(runs).length, byClaim.size);
    assert.deepEqual(await listResearchReservations(db, pkg.id), [], "no lease may outlive the requests");
  });
});

test("the same claim and strategy cannot run twice, and the unique index enforces it", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await seedPackageWithClaims(db, "concurrency-same-claim");
    const claim = claims[0];

    const first = await runBoundedCandidateDiscovery(db, {
      packageId: pkg.id,
      claimId: claim.id,
      actorEmail: "admin@example.com",
      mode: "fixture",
      refuseDuplicateStrategyRun: true,
    });
    assert.equal(first.claimId, claim.id);

    await assert.rejects(
      () => runBoundedCandidateDiscovery(db, {
        packageId: pkg.id,
        claimId: claim.id,
        actorEmail: "admin@example.com",
        mode: "fixture",
        refuseDuplicateStrategyRun: true,
      }),
      (error) => {
        assert.ok(isResearchReservationConflict(error));
        assert.equal(error.reason, "completed_strategy_run");
        assert.equal(error.existingRunId, first.id);
        return true;
      },
    );
    assert.equal((await listResearchRuns(db, pkg.id)).length, 1);
    // The refusal happened after the lease was taken, so this also proves release-on-failure.
    assert.deepEqual(await listResearchReservations(db, pkg.id), []);

    // An in-flight lease refuses a second attempt before any run exists.
    const otherClaim = claims[1];
    const key = reservationKeyFor(pkg.id, otherClaim.id);
    const lease = await acquireResearchReservation(db, { ...key, actorEmail: "admin@example.com" });
    await assert.rejects(
      () => runBoundedCandidateDiscovery(db, {
        packageId: pkg.id,
        claimId: otherClaim.id,
        actorEmail: "admin@example.com",
        mode: "auto",
        refuseDuplicateStrategyRun: true,
      }),
      (error) => {
        assert.ok(isResearchReservationConflict(error));
        assert.equal(error.reason, "in_flight_lease");
        return true;
      },
    );
    assert.equal((await listResearchRuns(db, pkg.id)).length, 1, "a refused request persists no run");
    assert.ok(await releaseResearchReservation(db, { ...key, leaseToken: lease.leaseToken }));

    // The durable invariant does not depend on application ordering.
    await db.prepare(`
      INSERT INTO social_research_reservations (
        id, package_id, subject_kind, subject_id, strategy_fingerprint, lease_token, actor_email, acquired_at, expires_at
      ) VALUES ('sgo:research-reservation:lease-a', ?, 'claim', ?, ?, 'token-a', 'admin@example.com', '2026-08-28T00:00:00.000Z', '2099-01-01T00:00:00.000Z')
    `).bind(pkg.id, otherClaim.id, CURRENT_STRATEGY).run();
    await assert.rejects(() => db.prepare(`
      INSERT INTO social_research_reservations (
        id, package_id, subject_kind, subject_id, strategy_fingerprint, lease_token, actor_email, acquired_at, expires_at
      ) VALUES ('sgo:research-reservation:lease-b', ?, 'claim', ?, ?, 'token-b', 'admin@example.com', '2026-08-28T00:00:00.000Z', '2099-01-01T00:00:00.000Z')
    `).bind(pkg.id, otherClaim.id, CURRENT_STRATEGY).run(), /UNIQUE|constraint/i);
  });
});

test("distinct claims still progress while one claim is reserved", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await seedPackageWithClaims(db, "concurrency-distinct-claims");
    await seedLegacyRuns(db, pkg.id, claims);
    const view = await loadOperatorView(db, pkg.id);
    const reservedClaimId = view.researchWorkset.retryDue[0].claimId;
    const key = reservationKeyFor(pkg.id, reservedClaimId);
    const lease = await acquireResearchReservation(db, { ...key, actorEmail: "other@example.com" });

    const result = await advanceOperator(db, pkg.id, "admin@example.com", "continue_evidence_research");
    const skipped = result.executionTrace.filter((step) => step.id.startsWith("skip_duplicate_research_reservation:"));
    const discoveries = result.executionTrace.filter((step) => step.id.startsWith("run_bounded_live_discovery:"));
    assert.equal(skipped.length, 1);
    assert.equal(skipped[0].details.claimId, reservedClaimId);
    assert.equal(skipped[0].details.conflictReason, "in_flight_lease");
    assert.ok(discoveries.length >= 1, "other claims must still progress");
    assert.ok(discoveries.every((step) => step.details.claimId !== reservedClaimId));

    const runs = await listResearchRuns(db, pkg.id);
    assert.ok(!newRunsFor(runs).some((run) => run.claimId === reservedClaimId));
    for (const runIds of currentStrategyRunsByClaim(runs).values()) assert.equal(runIds.length, 1);
    assert.ok(await releaseResearchReservation(db, { ...key, leaseToken: lease.leaseToken }));
  });
});

test("an abandoned pass recovers: released and expired leases never poison a claim", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await seedPackageWithClaims(db, "concurrency-recovery");
    const claim = claims[0];
    const key = reservationKeyFor(pkg.id, claim.id);

    // Abandoned request that released its lease.
    const released = await acquireResearchReservation(db, { ...key, actorEmail: "admin@example.com" });
    assert.ok(await releaseResearchReservation(db, { ...key, leaseToken: released.leaseToken }));
    const afterRelease = await runBoundedCandidateDiscovery(db, {
      packageId: pkg.id,
      claimId: claim.id,
      actorEmail: "admin@example.com",
      mode: "fixture",
      refuseDuplicateStrategyRun: true,
    });
    assert.equal(afterRelease.claimId, claim.id);

    // Crashed request that never released: the lease expires and is reclaimable.
    const secondClaim = claims[1];
    const secondKey = reservationKeyFor(pkg.id, secondClaim.id);
    const stale = await acquireResearchReservation(db, {
      ...secondKey,
      actorEmail: "crashed@example.com",
      now: new Date(Date.parse("2026-08-28T00:00:00.000Z")),
      leaseMs: 1_000,
    });
    await assert.rejects(
      () => acquireResearchReservation(db, {
        ...secondKey,
        actorEmail: "admin@example.com",
        now: new Date(Date.parse("2026-08-28T00:00:00.500Z")),
      }),
      (error) => isResearchReservationConflict(error) && error.reason === "in_flight_lease",
    );
    const reclaimed = await acquireResearchReservation(db, {
      ...secondKey,
      actorEmail: "admin@example.com",
      now: new Date(Date.parse("2026-08-28T00:00:05.000Z")),
    });
    assert.equal(reclaimed.reclaimedExpiredLease, true);
    assert.notEqual(reclaimed.leaseToken, stale.leaseToken);

    // A late release from the crashed request must not drop the new owner's lease.
    await releaseResearchReservation(db, { ...secondKey, leaseToken: stale.leaseToken });
    const stillHeld = await listResearchReservations(db, pkg.id);
    assert.deepEqual(
      stillHeld.filter((row) => row.subjectId === secondClaim.id).map((row) => row.leaseToken),
      [reclaimed.leaseToken],
    );
    assert.ok(await releaseResearchReservation(db, { ...secondKey, leaseToken: reclaimed.leaseToken }));
    assert.deepEqual((await listResearchReservations(db, pkg.id)).filter((row) => row.subjectId === secondClaim.id), []);
  });
});

test("a different strategy fingerprint may legitimately retry the same claim", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await seedPackageWithClaims(db, "concurrency-strategy-change");
    const claim = claims[0];
    const currentPlan = {
      researchStrategy: buildResearchStrategyRecord({ packageFingerprint: "fp", providerKind: "auto" }),
    };
    await insertCompletedRun(db, pkg.id, claim.id, currentPlan);

    // Same claim, different strategy identity: allowed, and keyed separately.
    const fixtureStrategy = buildResearchStrategyRecord({ packageFingerprint: "fp", providerKind: "fixture" });
    assert.notEqual(fixtureStrategy.fingerprint, CURRENT_STRATEGY);
    const run = await runBoundedCandidateDiscovery(db, {
      packageId: pkg.id,
      claimId: claim.id,
      actorEmail: "admin@example.com",
      mode: "fixture",
      packageFingerprint: "fp",
      refuseDuplicateStrategyRun: true,
    });
    assert.equal(run.plan.researchStrategy.fingerprint, fixtureStrategy.fingerprint);

    const currentKey = reservationKeyFor(pkg.id, claim.id, CURRENT_STRATEGY);
    const otherKey = reservationKeyFor(pkg.id, claim.id, fixtureStrategy.fingerprint);
    const held = await acquireResearchReservation(db, { ...currentKey, actorEmail: "admin@example.com" });
    const concurrent = await acquireResearchReservation(db, { ...otherKey, actorEmail: "admin@example.com" });
    assert.notEqual(held.leaseToken, concurrent.leaseToken);
    assert.ok(await releaseResearchReservation(db, { ...currentKey, leaseToken: held.leaseToken }));
    assert.ok(await releaseResearchReservation(db, { ...otherKey, leaseToken: concurrent.leaseToken }));
  });
});

test("reservations are package scoped: unrelated packages never block each other", async () => {
  await withAdmin(async (db) => {
    // Proposal record ids derive from the first 20 characters of the package
    // slug, so unrelated packages need slugs that differ inside that window.
    const first = await seedPackageWithClaims(db, "guard-equipment-pkg", EQUIPMENT);
    const second = await seedPackageWithClaims(db, "guard-food-pkg", FOOD);
    await seedLegacyRuns(db, first.pkg.id, first.claims);
    await seedLegacyRuns(db, second.pkg.id, second.claims);

    // Hold every lease the first package could want.
    const heldLeases = [];
    for (const claim of first.claims) {
      const key = reservationKeyFor(first.pkg.id, claim.id);
      heldLeases.push({ key, lease: await acquireResearchReservation(db, { ...key, actorEmail: "other@example.com" }) });
    }

    const [firstResult, secondResult] = await Promise.all([
      advanceOperator(db, first.pkg.id, "admin@example.com", "continue_evidence_research"),
      advanceOperator(db, second.pkg.id, "admin@example.com", "continue_evidence_research"),
    ]);
    assert.equal(newRunsFor(await listResearchRuns(db, first.pkg.id)).length, 0);
    assert.equal(firstResult.latestRun.stoppedReason, "concurrent_research_in_flight");
    assert.ok(newRunsFor(await listResearchRuns(db, second.pkg.id)).length >= 1, "the other package still progresses");
    assert.ok(secondResult.executionTrace.some((step) => step.id.startsWith("run_bounded_live_discovery:")));

    for (const { key, lease } of heldLeases) {
      assert.ok(await releaseResearchReservation(db, { ...key, leaseToken: lease.leaseToken }));
    }
  });
});

test("repeated Continue requests remain idempotent once every claim ran under the current strategy", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await seedPackageWithClaims(db, "concurrency-idempotent");
    const view = await loadOperatorView(db, pkg.id);
    const currentPlan = {
      researchStrategy: buildResearchStrategyRecord({
        packageFingerprint: view.investigationPlan?.packageFingerprint ?? "fp",
        providerKind: "auto",
      }),
    };
    for (const claim of claims) await insertCompletedRun(db, pkg.id, claim.id, currentPlan);

    const resolved = await loadOperatorView(db, pkg.id);
    assert.equal(resolved.state, "evidence_unresolved");
    assert.equal(resolved.summary.retryEligibleGapCount, 0);

    const runsBefore = (await listResearchRuns(db, pkg.id)).length;
    const settled = await Promise.all([
      advanceOperator(db, pkg.id, "admin@example.com", "continue_evidence_research"),
      advanceOperator(db, pkg.id, "admin@example.com", "continue_evidence_research"),
    ]);
    for (const result of settled) {
      assert.equal(result.state, "evidence_unresolved");
      assert.equal(result.latestRun.stoppedReason, "no_research_due");
    }
    assert.equal((await listResearchRuns(db, pkg.id)).length, runsBefore);
    assert.deepEqual(await listResearchReservations(db, pkg.id), []);
  });
});
