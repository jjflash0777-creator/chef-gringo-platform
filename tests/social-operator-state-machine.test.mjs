import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  buildResearchMemory,
  candidateQualifiesForCorpusSubmission,
  classifyOperatorState,
  evaluateClaimCoverage,
  evaluateMemorySkip,
  recomputeCorpusReviewTruth,
} from "../app/growth/social/index.ts";
import { ingestCorpusSource, reviewCorpusDocument } from "../app/lib/research/ingest.ts";
import { getCorpusDocument } from "../db/corpus-repository.ts";
import {
  advanceOperator,
  listHumanReviewTasks,
  loadOperatorView,
  recomputeOperatorEvidenceState,
} from "../db/social-operator-repository.ts";
import {
  createContentOpportunity,
  createContentPackage,
  listPackageClaims,
  loadSocialGrowthQueue,
  updateContentPackage,
} from "../db/social-growth-repository.ts";
import { createClaimsFromAcknowledgedInvestigationPlan } from "../db/social-investigation-claims.ts";
import { listResearchRuns } from "../db/social-research-read.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const FREEZER = {
  thesis: "An independent operator with a commercial freezer running around 20°F should be able to identify safe operational checks and determine when the problem requires a qualified refrigeration technician, without attempting unsafe electrical or refrigerant repairs.",
  packageUsefulnessTest: "After using this guide, an operator should be able to verify the temperature problem, identify safe checks they can perform themselves, recognize conditions that require professional refrigeration service, and avoid unsafe or unsupported repair attempts.",
  problem: "A commercial freezer is running warm.",
  audience: "independent_operator",
};

const OTHER = {
  thesis: "A café should hold sliced tomatoes below 41°F after prep.",
  packageUsefulnessTest: "Name the hold temperature.",
  problem: "Prep cooks leave sliced tomatoes on the counter.",
  audience: "independent_operator",
};

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

async function prepareAcknowledged(db, slug, fields) {
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
  const acknowledged = await advanceOperator(db, pkg.id, "admin@example.com", "acknowledge_investigation_plan");
  assert.equal(acknowledged.state, "claims_needed");
  return { opportunity, pkg, view: acknowledged };
}

async function prepareWithClaims(db, slug, fields) {
  const seeded = await prepareAcknowledged(db, slug, fields);
  const view = await loadOperatorView(db, seeded.pkg.id);
  assert.ok(view.investigationPlan);
  await createClaimsFromAcknowledgedInvestigationPlan(db, view.investigationPlan);
  const claims = await listPackageClaims(db, seeded.pkg.id);
  assert.ok(claims.length >= 1);
  return { ...seeded, claims };
}

async function seedSubmittedCandidate(db, {
  packageId,
  claimId,
  url,
  title,
  publisher,
  excerpt,
  relationship = "supports",
  authorityClass = "government_regulatory",
}) {
  const ingested = await ingestCorpusSource(db, {
    title,
    publisher,
    evidenceDomain: "equipment",
    sourceType: "government_regulatory",
    authorityTier: 1,
    canonicalUrl: url,
    mimeType: "text/plain",
    text: excerpt,
    actorEmail: "admin@example.com",
    fixture: true,
    provenanceMethod: "test_fixture",
    verificationNotes: "Test corpus submission. Not accepted evidence.",
    claimScope: ["growth_research_candidate", claimId],
  });
  assert.equal(ingested.document.ingestionStatus, "awaiting_review");
  const now = new Date().toISOString();
  const runId = `sgo:research-run:test-${Math.random().toString(16).slice(2, 10)}`;
  const candidateId = `sgo:research-candidate:test-${Math.random().toString(16).slice(2, 10)}`;
  await db.prepare(`
    INSERT INTO social_research_runs (
      id, package_id, claim_id, evidence_request_id, actor_email, provider_id, provider_kind, status,
      live_retrieval, stop_reason, plan_json, queries_json, diagnostics_json, started_at, finished_at
    ) VALUES (?, ?, ?, NULL, 'admin@example.com', 'fixture', 'fixture', 'completed', 0, 'budget', '{}', '[]', NULL, ?, ?)
  `).bind(runId, packageId, claimId, now, now).run();
  await db.prepare(`
    INSERT INTO social_research_candidates (
      id, run_id, canonical_url, title, publisher, source_class, provenance, independence_cluster,
      excerpts_json, relationship, scope_limitations, authority_class, authority_adequate, freshness,
      rank_score, reason_selected, reason_excluded, proposed_for_review, retrieved_checksum, published_date,
      query, submitted_document_id, discovered_at, result_url, retrieval_status, excerpt_locator, extraction_json
    ) VALUES (?, ?, ?, ?, ?, 'government_regulatory', 'test_fixture', ?, ?, ?, '', ?, 1, 'unknown',
      10, 'test candidate', NULL, 1, 'checksum', NULL, 'test query', ?, ?, ?, 'ok', NULL, ?)
  `).bind(
    candidateId,
    runId,
    url,
    title,
    publisher,
    publisher.toLowerCase().replace(/\s+/g, "-"),
    JSON.stringify([{ text: excerpt, locator: "p1" }]),
    relationship,
    authorityClass,
    ingested.document.id,
    now,
    url,
    JSON.stringify({
      claimCoverage: relationship === "supports" ? "direct" : "context_only",
      topicalRelevance: "relevant",
      policyAdvancement: "advances_authority",
    }),
  ).run();
  return { documentId: ingested.document.id, runId, candidateId, url };
}

test("truth precedence: corpus disposition wins over submission intent", () => {
  const truth = recomputeCorpusReviewTruth([
    {
      candidateId: "c1",
      claimId: "claim-a",
      submittedDocumentId: "doc-1",
      canonicalUrl: "https://example.gov/a",
      ingestionStatus: "rejected",
      claimSupported: false,
    },
    {
      candidateId: "c2",
      claimId: "claim-a",
      submittedDocumentId: "doc-2",
      canonicalUrl: "https://example.gov/b",
      ingestionStatus: null,
      claimSupported: false,
    },
    {
      candidateId: "c3",
      claimId: "claim-a",
      submittedDocumentId: "doc-3",
      canonicalUrl: "https://example.gov/c",
      ingestionStatus: "awaiting_review",
      claimSupported: false,
    },
  ]);
  assert.equal(truth.pendingReviewCount, 1);
  assert.equal(truth.actionablePendingCount, 1);
  assert.equal(truth.rejectedOrNonEvidenceCount, 1);
  assert.equal(truth.historicalSubmittedCount, 3);
  assert.deepEqual(truth.actionableCandidateIds, ["c3"]);
});

test("supported claim demotes surplus awaiting candidates to non-blocking history", () => {
  const truth = recomputeCorpusReviewTruth([
    {
      candidateId: "c1",
      claimId: "claim-a",
      submittedDocumentId: "doc-1",
      canonicalUrl: "https://example.gov/a",
      ingestionStatus: "awaiting_review",
      claimSupported: true,
    },
  ]);
  assert.equal(truth.pendingReviewCount, 1);
  assert.equal(truth.actionablePendingCount, 0);
  assert.equal(classifyOperatorState({
    packageId: "sgo:package:x",
    hasPackage: true,
    proposalCount: 1,
    claimCount: 1,
    currentFingerprint: "fp",
    plan: { packageFingerprint: "fp", state: "acknowledged", items: [], rawProposalIds: [] },
    openTasks: [],
    verifiedFactCount: 1,
    unresolvedContradiction: false,
    awaitingCorpusReviewCount: truth.actionablePendingCount,
    researchRunCount: 1,
    researchInProgress: false,
    unresearchedGapCount: 0,
    contentAuthorized: false,
    packageApproved: false,
  }), "content_blocked");
});

test("Scenario A — rejected corpus candidate clears CORPUS_REVIEW_REQUIRED", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await prepareWithClaims(db, "op-sm-reject", FREEZER);
    assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
    const seeded = await seedSubmittedCandidate(db, {
      packageId: pkg.id,
      claimId: claims[0].id,
      url: "https://docs.example.gov/generic-safety",
      title: "Generic personnel safety language",
      publisher: "Example Regulatory Agency",
      excerpt: "Personnel take immediate actions to prevent or correct unsafe situations.",
      relationship: "relevant",
    });
    const pending = await recomputeOperatorEvidenceState(db, pkg.id);
    assert.equal(pending.state, "corpus_review_required");
    assert.equal(pending.summary.awaitingCorpusReviewCount, 1);
    assert.ok(pending.evidenceReviewQueue.some((item) => item.candidateId === seeded.candidateId));
    assert.ok((await listHumanReviewTasks(db, pkg.id)).some((item) => item.taskKind === "corpus_candidates" && item.state === "open"));

    await reviewCorpusDocument(db, seeded.documentId, "reject", "admin@example.com", {
      reason: "Insufficient claim coverage — generic safety language.",
    });
    const afterReject = await loadOperatorView(db, pkg.id);
    const queue = await loadSocialGrowthQueue(db);
    const fromQueue = queue.operatorByPackage[pkg.id];
    assert.equal(afterReject.state, fromQueue.state);
    assert.notEqual(afterReject.state, "corpus_review_required");
    assert.equal(afterReject.summary.awaitingCorpusReviewCount, 0);
    assert.ok(afterReject.summary.rejectedCorpusCandidateCount >= 1);
    assert.equal(afterReject.evidenceReviewQueue.length, 0);
    assert.ok(afterReject.evidenceReviewHistory.some((item) => item.candidateId === seeded.candidateId && item.ingestionStatus === "rejected"));
    assert.ok(["research_incomplete", "research_ready", "evidence_gaps"].includes(afterReject.state));
    assert.equal(afterReject.primaryAction.id, "continue_evidence_research");
    assert.equal(afterReject.summary.verifiedFactCount, 0);
    assert.equal((await listHumanReviewTasks(db, pkg.id)).filter((item) => item.taskKind === "corpus_candidates" && item.state === "open").length, 0);
    assert.equal((await getCorpusDocument(db, seeded.documentId)).ingestionStatus, "rejected");
    assert.equal(afterReject.publishingEnabled, false);
  });
});

test("Scenario B — accept does not auto-attach; clears pending review; claim stays unsupported until attach", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await prepareWithClaims(db, "op-sm-accept", FREEZER);
    const seeded = await seedSubmittedCandidate(db, {
      packageId: pkg.id,
      claimId: claims[0].id,
      url: "https://www.osha.gov/publications/qualified-service-fixture",
      title: "Qualified service requirement",
      publisher: "Occupational Safety and Health Administration",
      excerpt: "Specified electrical and refrigerant servicing must be performed by qualified authorized personnel.",
      relationship: "supports",
    });
    assert.equal((await loadOperatorView(db, pkg.id)).state, "corpus_review_required");
    await reviewCorpusDocument(db, seeded.documentId, "accept", "admin@example.com", {
      verificationNotes: "Accepted into corpus. Attach remains a separate human gate.",
      claimScope: ["growth_research_candidate"],
    });
    const after = await loadOperatorView(db, pkg.id);
    assert.notEqual(after.state, "corpus_review_required");
    assert.equal(after.summary.awaitingCorpusReviewCount, 0);
    assert.equal(after.summary.verifiedFactCount, 0);
    assert.ok(after.evidenceReviewHistory.some((item) => item.ingestionStatus === "accepted"));
    assert.equal(after.primaryAction.id, "continue_evidence_research");
    assert.equal(after.publishingEnabled, false);
  });
});

test("Scenario C/E — stale disposition clears pending; continue research remains available", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await prepareWithClaims(db, "op-sm-stale", FREEZER);
    const seeded = await seedSubmittedCandidate(db, {
      packageId: pkg.id,
      claimId: claims[0].id,
      url: "https://example.gov/stale-doc",
      title: "Stale regulatory note",
      publisher: "Example Agency",
      excerpt: "Qualified refrigeration technicians must perform refrigerant circuit repairs.",
      relationship: "supports",
    });
    await reviewCorpusDocument(db, seeded.documentId, "accept", "admin@example.com", {
      verificationNotes: "Temporarily accepted then superseded.",
    });
    await reviewCorpusDocument(db, seeded.documentId, "stale", "admin@example.com", { reason: "Superseded edition." });
    const after = await loadOperatorView(db, pkg.id);
    assert.notEqual(after.state, "corpus_review_required");
    assert.equal(after.summary.awaitingCorpusReviewCount, 0);
    assert.ok(after.summary.rejectedCorpusCandidateCount >= 1);
    assert.equal(after.primaryAction.id, "continue_evidence_research");
  });
});

test("Scenario D — unaccepted contradict submission and live contradiction task defer to corpus review", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await prepareWithClaims(db, "op-sm-contradict", FREEZER);
    await seedSubmittedCandidate(db, {
      packageId: pkg.id,
      claimId: claims[0].id,
      url: "https://example.gov/contradiction",
      title: "Contradicting note",
      publisher: "Example Agency",
      excerpt: "Untrained operators may freely perform electrical and refrigerant repairs.",
      relationship: "contradicts",
    });
    // Open contradiction task the way operator research would after live discovery.
    await db.prepare(`
      INSERT INTO social_human_review_tasks (
        id, package_id, investigation_plan_id, task_kind, state, decision_required, why_automation_stopped,
        context_json, approve_consequence, reject_consequence
      ) VALUES (?, ?, NULL, 'contradiction', 'open', 'Resolve contradiction', 'Contradiction stop', '{}', 'Review', 'Remain blocked')
    `).bind(`sgo:human-review:${pkg.id}:contradiction`, pkg.id).run();
    const view = await loadOperatorView(db, pkg.id);
    assert.equal(view.state, "corpus_review_required");
    assert.equal(view.primaryAction.id, "review_evidence");
    assert.equal(view.summary.awaitingCorpusReviewCount, 1);
    assert.equal(view.publishingEnabled, false);
  });
});

test("Scenario D2 — live discovery contradiction without pending corpus review opens reassessment", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await prepareWithClaims(db, "op-sm-live-contradict", FREEZER);
    await db.prepare(`
      INSERT INTO social_human_review_tasks (
        id, package_id, investigation_plan_id, task_kind, state, decision_required, why_automation_stopped,
        context_json, approve_consequence, reject_consequence
      ) VALUES (?, ?, NULL, 'contradiction', 'open', 'Resolve contradiction', 'Contradiction stop', '{}', 'Review', 'Remain blocked')
    `).bind(`sgo:human-review:${pkg.id}:contradiction`, pkg.id).run();
    const view = await loadOperatorView(db, pkg.id);
    assert.equal(view.state, "evidence_reassessment");
    assert.equal(view.primaryAction.id, "reassess");
    assert.equal(view.summary.awaitingCorpusReviewCount, 0);
    assert.equal(view.publishingEnabled, false);
  });
});

test("Scenario F — package fingerprint change does not keep stale-plan claims as current claimCount", async () => {
  await withAdmin(async (db) => {
    const { pkg } = await prepareWithClaims(db, "op-sm-fingerprint", FREEZER);
    const before = await loadOperatorView(db, pkg.id);
    assert.ok(before.summary.claimCount >= 1);
    await updateContentPackage(db, pkg.id, {
      thesis: `${FREEZER.thesis} Material package revision that changes the investigation fingerprint.`,
    });
    const after = await loadOperatorView(db, pkg.id);
    assert.equal(after.state, "refinement_needed");
    assert.equal(after.publishingEnabled, false);
  });
});

test("Scenario G — another package pending review does not contaminate freezer state", async () => {
  await withAdmin(async (db) => {
    const freezer = await prepareWithClaims(db, "commercial-freezer-running-warm", FREEZER);
    const other = await prepareWithClaims(db, "op-sm-other-pkg", OTHER);
    const otherClaims = other.claims;
    await seedSubmittedCandidate(db, {
      packageId: other.pkg.id,
      claimId: otherClaims[0].id,
      url: "https://example.gov/other-package-only",
      title: "Other package candidate",
      publisher: "Other Agency",
      excerpt: "Hold sliced tomatoes at or below 41°F.",
      relationship: "supports",
    });
    const freezerView = await loadOperatorView(db, freezer.pkg.id);
    const otherView = await loadOperatorView(db, other.pkg.id);
    assert.equal(otherView.state, "corpus_review_required");
    assert.notEqual(freezerView.state, "corpus_review_required");
    assert.equal(freezerView.summary.awaitingCorpusReviewCount, 0);
    assert.equal(freezerView.packageId, freezer.pkg.id);
    assert.equal(otherView.packageId, other.pkg.id);
  });
});

test("Scenario H — claim-coverage false positive cannot qualify for corpus submission", () => {
  const coverage = evaluateClaimCoverage({
    claimText: "What operator actions are outside authorized scope: attempting unsafe electrical or refrigerant repairs?",
    passage: "Personnel take immediate actions to prevent or correct unsafe situations.",
    safetySensitive: true,
  });
  assert.ok(coverage.state === "none" || coverage.state === "context_only");
  assert.equal(candidateQualifiesForCorpusSubmission({
    retrievalStatus: "ok",
    excerpts: [{ text: "Personnel take immediate actions to prevent or correct unsafe situations." }],
    claimCoverage: coverage.state,
    authorityAdequate: true,
    relationship: "supports",
    policyAdvancement: "advances_authority",
    proposedForReview: true,
  }), false);
});

test("Live freezer fixture — rejected CPUC-style row is historical only", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await prepareWithClaims(db, "commercial-freezer-running-warm-cpuc", FREEZER);
    const seeded = await seedSubmittedCandidate(db, {
      packageId: pkg.id,
      claimId: claims[0].id,
      url: "https://docs.cpuc.ca.gov/PublishedDocs/Published/G000/M123/K456/generic-safety.pdf",
      title: "California utility personnel safety excerpt",
      publisher: "California Public Utilities Commission",
      excerpt: "Personnel take immediate actions to prevent or correct unsafe situations.",
      relationship: "relevant",
    });
    assert.equal((await loadOperatorView(db, pkg.id)).state, "corpus_review_required");
    await reviewCorpusDocument(db, seeded.documentId, "reject", "admin@example.com", {
      reason: "Insufficient claim coverage.",
    });
    const view = await loadOperatorView(db, pkg.id);
    const queue = await loadSocialGrowthQueue(db);
    assert.equal(queue.operatorByPackage[pkg.id].state, view.state);
    assert.notEqual(view.state, "corpus_review_required");
    assert.equal(view.summary.awaitingCorpusReviewCount, 0);
    assert.ok(view.summary.rejectedCorpusCandidateCount >= 1);
    assert.equal(view.evidenceReviewQueue.length, 0);
    assert.ok(view.evidenceReviewHistory.some((item) => item.ingestionStatus === "rejected" && /cpuc\.ca\.gov/i.test(item.canonicalUrl)));
    assert.equal(view.summary.verifiedFactCount, 0);
    assert.equal(view.primaryAction.id, "continue_evidence_research");
    assert.equal(view.publishingEnabled, false);
    assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  });
});

test("multiple candidates: reject one leaves the other pending", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await prepareWithClaims(db, "op-sm-multi", FREEZER);
    const first = await seedSubmittedCandidate(db, {
      packageId: pkg.id,
      claimId: claims[0].id,
      url: "https://example.gov/multi-1",
      title: "Candidate one",
      publisher: "Agency One",
      excerpt: "Qualified personnel must perform refrigerant repairs.",
    });
    const second = await seedSubmittedCandidate(db, {
      packageId: pkg.id,
      claimId: claims[0].id,
      url: "https://example.gov/multi-2",
      title: "Candidate two",
      publisher: "Agency Two",
      excerpt: "Electrical servicing requires authorized technicians.",
    });
    await reviewCorpusDocument(db, first.documentId, "reject", "admin@example.com", { reason: "reject one" });
    const view = await loadOperatorView(db, pkg.id);
    assert.equal(view.state, "corpus_review_required");
    assert.equal(view.summary.awaitingCorpusReviewCount, 1);
    assert.equal(view.evidenceReviewQueue.length, 1);
    assert.equal(view.evidenceReviewQueue[0].candidateId, second.candidateId);
    await reviewCorpusDocument(db, second.documentId, "reject", "admin@example.com", { reason: "reject two" });
    const cleared = await loadOperatorView(db, pkg.id);
    assert.notEqual(cleared.state, "corpus_review_required");
    assert.equal(cleared.summary.awaitingCorpusReviewCount, 0);
  });
});

test("human corpus rejection feeds research memory as human_rejected for same claim/gap", () => {
  const memory = buildResearchMemory({
    packageId: "sgo:package:freezer",
    claimId: "claim-1",
    policyGap: "operator scope boundary",
    runs: [{
      packageId: "sgo:package:freezer",
      claimId: "claim-1",
      plan: { evidenceGap: { unresolvedPolicyGap: "operator scope boundary" } },
      finishedAt: new Date().toISOString(),
      candidates: [{
        canonicalUrl: "https://docs.cpuc.ca.gov/PublishedDocs/generic.pdf",
        independenceCluster: "cpuc.ca.gov",
        relationship: "relevant",
        retrievalStatus: "ok",
        authorityAdequate: true,
        authorityClass: "government_regulatory",
        policyAdvancement: "advances_authority",
        claimCoverage: "context_only",
        corpusIngestionStatus: "rejected",
        discoveredAt: new Date().toISOString(),
      }],
    }],
  });
  const skip = evaluateMemorySkip({ url: "https://docs.cpuc.ca.gov/PublishedDocs/generic.pdf", memory });
  assert.equal(skip.skip, true);
  assert.equal(skip.skipReason, "human_rejected");
  const otherClaim = buildResearchMemory({
    packageId: "sgo:package:freezer",
    claimId: "claim-2",
    policyGap: "temperature threshold",
    runs: [],
  });
  assert.equal(evaluateMemorySkip({
    url: "https://docs.cpuc.ca.gov/PublishedDocs/generic.pdf",
    memory: otherClaim,
  }).skip, false);
});

test("reload/session resumption reconstructs from durable records", async () => {
  await withAdmin(async (db) => {
    const { pkg, claims } = await prepareWithClaims(db, "op-sm-reload", FREEZER);
    const seeded = await seedSubmittedCandidate(db, {
      packageId: pkg.id,
      claimId: claims[0].id,
      url: "https://example.gov/reload",
      title: "Reload candidate",
      publisher: "Agency",
      excerpt: "Qualified technicians must service refrigerant circuits.",
    });
    await reviewCorpusDocument(db, seeded.documentId, "reject", "admin@example.com", { reason: "coverage" });
    const first = await loadOperatorView(db, pkg.id);
    const second = await recomputeOperatorEvidenceState(db, pkg.id);
    const queue = await loadSocialGrowthQueue(db);
    assert.equal(first.state, second.state);
    assert.equal(queue.operatorByPackage[pkg.id].state, first.state);
    assert.equal(first.summary.awaitingCorpusReviewCount, second.summary.awaitingCorpusReviewCount);
  });
});

test("commercial fields and publishing stay isolated", async () => {
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  assert.throws(() => classifyOperatorState({
    packageId: "sgo:package:x",
    hasPackage: true,
    proposalCount: 1,
    claimCount: 1,
    currentFingerprint: "fp",
    plan: { packageFingerprint: "fp", state: "acknowledged", items: [], rawProposalIds: [] },
    openTasks: [],
    verifiedFactCount: 0,
    unresolvedContradiction: false,
    awaitingCorpusReviewCount: 0,
    researchRunCount: 0,
    researchInProgress: false,
    contentAuthorized: false,
    packageApproved: false,
    payoutCents: 120,
  }));
  await withAdmin(async (db) => {
    const { pkg } = await prepareWithClaims(db, "op-sm-commerce", FREEZER);
    const view = await loadOperatorView(db, pkg.id);
    assert.equal(view.publishingEnabled, false);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "publish"), /publish|authority/i);
    await assert.rejects(() => advanceOperator(db, pkg.id, "admin@example.com", "accept_corpus_evidence"), /human authority/i);
  });
});

test("production truth/resolver modules contain no case-specific California/CPUC/freezer rules", async () => {
  const files = [
    "app/growth/social/operator-evidence-truth.ts",
    "app/growth/social/operator-state.ts",
    "app/growth/social/claim-coverage.ts",
    "db/social-operator-repository.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bCalifornia\b|\bCPUC\b|\bOSHA\b|\bAnthropic\b|\bfreezer\b|\bSiemens\b|\bGenerac\b/i);
  }
});

test("research runs remain package-scoped after rejection", async () => {
  await withAdmin(async (db) => {
    const left = await prepareWithClaims(db, "op-sm-left", FREEZER);
    const right = await prepareAcknowledged(db, "op-sm-right", OTHER);
    const leftClaims = left.claims;
    const seeded = await seedSubmittedCandidate(db, {
      packageId: left.pkg.id,
      claimId: leftClaims[0].id,
      url: "https://example.gov/left-only",
      title: "Left only",
      publisher: "Agency",
      excerpt: "Qualified technicians required.",
    });
    await reviewCorpusDocument(db, seeded.documentId, "reject", "admin@example.com", { reason: "x" });
    assert.equal((await listResearchRuns(db)).filter((run) => run.packageId === right.pkg.id).length, 0);
    assert.equal((await loadOperatorView(db, right.pkg.id)).state, "claims_needed");
  });
});
