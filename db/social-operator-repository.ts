import { assertActorEmail } from "../app/growth/social/approvals.ts";
import { packageDecompositionFingerprint } from "../app/growth/social/claim-decomposition.ts";
import { parseSocialGrowthId, socialGrowthId } from "../app/growth/social/ids.ts";
import {
  INVESTIGATION_REFINEMENT_VERSION,
  materialInvestigationItems,
  refineInvestigationPlan,
  type InvestigationItem,
  type InvestigationPlanDraft,
} from "../app/growth/social/investigation-refinement.ts";
import {
  AUTONOMY_PERMISSION_MATRIX,
  MAX_OPERATOR_STEPS,
  OPERATOR_VERSION,
  assertOperatorActionAllowed,
  buildOperatorSummary,
  classifyOperatorState,
  contradictionReviewTaskCopy,
  corpusReviewTaskCopy,
  investigationReviewTaskCopy,
  isClaimsFromInvestigationAuthorization,
  isEvidenceResearchContinuation,
  isInvestigationReviewAcknowledgment,
  isOperatorAction,
  primaryOperatorAction,
  type OperatorAction,
  type OperatorSnapshotInput,
  type OperatorState,
  type OperatorTransitionStep,
} from "../app/growth/social/operator-state.ts";
import {
  OPERATOR_RESEARCH_BUDGET,
  buildResearchWorkset,
  operatorResearchBudgetExhausted,
  remainingOperatorResearchBudget,
} from "../app/growth/social/research-workset.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../app/growth/social/types.ts";
import { candidateQualifiesForCorpusSubmission } from "../app/growth/social/claim-coverage.ts";
import type { D1DatabaseLike } from "./index.ts";
import { getCorpusDocument } from "./corpus-repository.ts";
import { generateClaimProposals, listClaimProposals } from "./social-claim-proposal-repository.ts";
import { createClaimsFromAcknowledgedInvestigationPlan, listInvestigationClaimLinks } from "./social-investigation-claims.ts";
import { buildPackageEvidenceIntelligence } from "./social-evidence-intelligence.ts";
import { getContentOpportunity, getContentPackage, listPackageClaims } from "./social-growth-read.ts";
import { listResearchRuns } from "./social-research-read.ts";
import { runBoundedCandidateDiscovery, submitResearchCandidatesForReview } from "./social-research-repository.ts";

type Persisted<T> = T & { createdAt: string; updatedAt: string };

export type PersistedInvestigationPlan = Persisted<{
  id: string;
  packageId: string;
  packageFingerprint: string;
  version: string;
  state: string;
  generatedAt: string;
  items: InvestigationItem[];
  rawProposalIds: string[];
  dependencies: InvestigationPlanDraft["dependencies"];
}>;

export type PersistedHumanReviewTask = Persisted<{
  id: string;
  packageId: string;
  investigationPlanId: string | null;
  taskKind: string;
  state: string;
  decisionRequired: string;
  whyAutomationStopped: string;
  context: Record<string, unknown>;
  approveConsequence: string;
  rejectConsequence: string;
  actorEmail: string | null;
  decidedAt: string | null;
}>;

export type PersistedOperatorRun = Persisted<{
  id: string;
  packageId: string;
  action: string;
  fromState: string;
  toState: string;
  stoppedReason: string;
  automatic: boolean;
  humanAuthorityRequired: boolean;
  stepCount: number;
  trace: OperatorTransitionStep[];
  actorEmail: string;
}>;

const parseJson = <T>(value: string, fallback: T): T => {
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

function planSelect() {
  return `
    SELECT id, package_id AS packageId, package_fingerprint AS packageFingerprint, version, state,
           generated_at AS generatedAt, items_json AS itemsJson, raw_proposal_ids_json AS rawProposalIdsJson,
           dependencies_json AS dependenciesJson, created_at AS createdAt, updated_at AS updatedAt
    FROM social_investigation_plans
  `;
}

function mapPlan(row: {
  id: string;
  packageId: string;
  packageFingerprint: string;
  version: string;
  state: string;
  generatedAt: string;
  itemsJson: string;
  rawProposalIdsJson: string;
  dependenciesJson: string;
  createdAt: string;
  updatedAt: string;
}): PersistedInvestigationPlan {
  return {
    id: row.id,
    packageId: row.packageId,
    packageFingerprint: row.packageFingerprint,
    version: row.version,
    state: row.state,
    generatedAt: row.generatedAt,
    items: parseJson(row.itemsJson, [] as InvestigationItem[]),
    rawProposalIds: parseJson(row.rawProposalIdsJson, [] as string[]),
    dependencies: parseJson(row.dependenciesJson, [] as InvestigationPlanDraft["dependencies"]),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapTask(row: {
  id: string;
  packageId: string;
  investigationPlanId: string | null;
  taskKind: string;
  state: string;
  decisionRequired: string;
  whyAutomationStopped: string;
  contextJson: string;
  approveConsequence: string;
  rejectConsequence: string;
  actorEmail: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}): PersistedHumanReviewTask {
  return {
    id: row.id,
    packageId: row.packageId,
    investigationPlanId: row.investigationPlanId,
    taskKind: row.taskKind,
    state: row.state,
    decisionRequired: row.decisionRequired,
    whyAutomationStopped: row.whyAutomationStopped,
    context: parseJson(row.contextJson, {} as Record<string, unknown>),
    approveConsequence: row.approveConsequence,
    rejectConsequence: row.rejectConsequence,
    actorEmail: row.actorEmail,
    decidedAt: row.decidedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRun(row: {
  id: string;
  packageId: string;
  action: string;
  fromState: string;
  toState: string;
  stoppedReason: string;
  automatic: number | boolean;
  humanAuthorityRequired: number | boolean;
  stepCount: number;
  traceJson: string;
  actorEmail: string;
  createdAt: string;
  updatedAt: string;
}): PersistedOperatorRun {
  return {
    id: row.id,
    packageId: row.packageId,
    action: row.action,
    fromState: row.fromState,
    toState: row.toState,
    stoppedReason: row.stoppedReason,
    automatic: Boolean(row.automatic),
    humanAuthorityRequired: Boolean(row.humanAuthorityRequired),
    stepCount: row.stepCount,
    trace: parseJson(row.traceJson, [] as OperatorTransitionStep[]),
    actorEmail: row.actorEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listInvestigationPlans(db: D1DatabaseLike, packageId?: string) {
  const statement = packageId
    ? db.prepare(`${planSelect()} WHERE package_id = ? ORDER BY generated_at DESC`).bind(packageId)
    : db.prepare(`${planSelect()} ORDER BY package_id ASC, generated_at DESC`);
  return (await statement.all<Parameters<typeof mapPlan>[0]>()).results.map(mapPlan);
}

export async function listHumanReviewTasks(db: D1DatabaseLike, packageId?: string) {
  const sql = `
    SELECT id, package_id AS packageId, investigation_plan_id AS investigationPlanId, task_kind AS taskKind,
           state, decision_required AS decisionRequired, why_automation_stopped AS whyAutomationStopped,
           context_json AS contextJson, approve_consequence AS approveConsequence, reject_consequence AS rejectConsequence,
           actor_email AS actorEmail, decided_at AS decidedAt, created_at AS createdAt, updated_at AS updatedAt
    FROM social_human_review_tasks
  `;
  const statement = packageId
    ? db.prepare(`${sql} WHERE package_id = ? ORDER BY created_at DESC`).bind(packageId)
    : db.prepare(`${sql} ORDER BY package_id ASC, created_at DESC`);
  return (await statement.all<Parameters<typeof mapTask>[0]>()).results.map(mapTask);
}

export async function listOperatorRuns(db: D1DatabaseLike, packageId?: string) {
  const sql = `
    SELECT id, package_id AS packageId, action, from_state AS fromState, to_state AS toState,
           stopped_reason AS stoppedReason, automatic, human_authority_required AS humanAuthorityRequired,
           step_count AS stepCount, trace_json AS traceJson, actor_email AS actorEmail,
           created_at AS createdAt, updated_at AS updatedAt
    FROM social_operator_runs
  `;
  const statement = packageId
    ? db.prepare(`${sql} WHERE package_id = ? ORDER BY created_at DESC`).bind(packageId)
    : db.prepare(`${sql} ORDER BY package_id ASC, created_at DESC`);
  return (await statement.all<Parameters<typeof mapRun>[0]>()).results.map(mapRun);
}

function planRecordId(packageId: string, fingerprint: string) {
  const packageSlug = parseSocialGrowthId(packageId).slug.slice(0, 40);
  return socialGrowthId("investigation-plan", `${packageSlug}-${fingerprint}`.replace(/-+/g, "-").slice(0, 80));
}

function taskRecordId(packageId: string, kind: string, fingerprint: string) {
  const packageSlug = parseSocialGrowthId(packageId).slug.slice(0, 28);
  return socialGrowthId("human-review-task", `${packageSlug}-${kind.replace(/_/g, "-")}-${fingerprint}`.replace(/-+/g, "-").slice(0, 80));
}

function runRecordId(packageId: string) {
  const packageSlug = parseSocialGrowthId(packageId).slug.slice(0, 24);
  const suffix = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
  return socialGrowthId("operator-run", `${packageSlug}-${suffix}`.replace(/-+/g, "-").slice(0, 80));
}

async function currentFingerprint(db: D1DatabaseLike, packageId: string) {
  const pkg = await getContentPackage(db, packageId);
  if (!pkg) throw new Error("Autonomous Operator requires an existing package.");
  const opportunity = await getContentOpportunity(db, pkg.opportunityId);
  if (!opportunity) throw new Error("Autonomous Operator requires the package parent opportunity.");
  return {
    pkg,
    opportunity,
    fingerprint: packageDecompositionFingerprint({
      packageId: pkg.id,
      packageSlug: pkg.slug,
      thesis: pkg.thesis,
      packageUsefulnessTest: pkg.usefulnessTest,
      problem: opportunity.problem,
      audience: opportunity.audience,
      opportunityUsefulnessTest: opportunity.usefulnessTest,
      commercialPosture: pkg.commercialPosture,
    }),
  };
}

export async function buildOperatorSnapshotInput(db: D1DatabaseLike, packageId: string): Promise<OperatorSnapshotInput & {
  planRecord: PersistedInvestigationPlan | null;
  tasks: PersistedHumanReviewTask[];
  latestRun: PersistedOperatorRun | null;
}> {
  const { pkg, fingerprint } = await currentFingerprint(db, packageId);
  const [proposals, claims, plans, tasks, runs, intelligence] = await Promise.all([
    listClaimProposals(db, packageId),
    listPackageClaims(db, packageId),
    listInvestigationPlans(db, packageId),
    listHumanReviewTasks(db, packageId),
    listOperatorRuns(db, packageId),
    buildPackageEvidenceIntelligence(db, packageId),
  ]);
  const planRecord = plans.find((item) => item.packageFingerprint === fingerprint) ?? null;
  const researchRuns = (await listResearchRuns(db)).filter((item) => item.packageId === packageId);
  const links = await listInvestigationClaimLinks(db, packageId);
  const awaitingCorpusReviewCount = await countAwaitingCorpusReview(db, researchRuns);
  const insufficientClaimCoverageCount = countInsufficientClaimCoverage(researchRuns);
  const workset = buildResearchWorkset({
    claims,
    assessments: intelligence?.claimAssessments ?? [],
    investigationItems: planRecord?.items ?? [],
    links,
    researchRuns,
  });
  const verifiedFactCount = intelligence?.claimAssessments.filter((item) => item.state === "supported").length ?? 0;
  return {
    packageId: pkg.id,
    hasPackage: true,
    proposalCount: proposals.length,
    claimCount: claims.length,
    currentFingerprint: fingerprint,
    plan: planRecord
      ? {
        packageFingerprint: planRecord.packageFingerprint,
        state: planRecord.state,
        items: planRecord.items,
        rawProposalIds: planRecord.rawProposalIds,
      }
      : null,
    openTasks: tasks.filter((item) => item.state === "open").map((item) => ({ kind: item.taskKind, state: item.state })),
    verifiedFactCount,
    unresolvedContradiction: Boolean(
      intelligence?.radar.contradictions.length
      || intelligence?.decisionDna.contradictions.length
      || tasks.some((item) => item.taskKind === "contradiction" && item.state === "open")
    ),
    awaitingCorpusReviewCount,
    insufficientClaimCoverageCount,
    researchRunCount: researchRuns.length,
    researchInProgress: false,
    unresearchedGapCount: workset.due.length,
    contentAuthorized: Boolean(intelligence?.intelligenceAuthorityReady && verifiedFactCount > 0),
    packageApproved: false,
    planRecord,
    tasks,
    latestRun: runs[0] ?? null,
  };
}

export async function loadOperatorView(db: D1DatabaseLike, packageId: string) {
  const snapshot = await buildOperatorSnapshotInput(db, packageId);
  const state = classifyOperatorState(snapshot);
  const summary = buildOperatorSummary({ ...snapshot, state });
  const researchRuns = (await listResearchRuns(db)).filter((item) => item.packageId === packageId);
  const links = await listInvestigationClaimLinks(db, packageId);
  const claims = await listPackageClaims(db, packageId);
  const intelligence = await buildPackageEvidenceIntelligence(db, packageId);
  const workset = buildResearchWorkset({
    claims,
    assessments: intelligence?.claimAssessments ?? [],
    investigationItems: snapshot.planRecord?.items ?? [],
    links,
    researchRuns,
  });
  return {
    version: OPERATOR_VERSION,
    publishingEnabled: SOCIAL_PUBLISH_AVAILABLE,
    packageId,
    state,
    summary,
    primaryAction: primaryOperatorAction(state),
    investigationPlan: snapshot.planRecord,
    humanReviewTasks: snapshot.tasks,
    latestRun: snapshot.latestRun,
    permissionMatrix: AUTONOMY_PERMISSION_MATRIX,
    researchWorkset: workset,
    evidenceReviewQueue: await listEvidenceReviewQueue(db, researchRuns),
    investigationClaimLinks: links,
  };
}

async function persistPlan(db: D1DatabaseLike, draft: InvestigationPlanDraft) {
  const existing = (await listInvestigationPlans(db, draft.packageId))
    .find((item) => item.packageFingerprint === draft.packageFingerprint);
  if (existing) return existing;
  const id = planRecordId(draft.packageId, draft.packageFingerprint);
  const generatedAt = new Date().toISOString();
  await db.prepare(`
    INSERT INTO social_investigation_plans (
      id, package_id, package_fingerprint, version, state, generated_at, items_json, raw_proposal_ids_json, dependencies_json
    ) VALUES (?, ?, ?, ?, 'awaiting_review', ?, ?, ?, ?)
  `).bind(
    id,
    draft.packageId,
    draft.packageFingerprint,
    draft.version,
    generatedAt,
    JSON.stringify(draft.items),
    JSON.stringify(draft.rawProposalIds),
    JSON.stringify(draft.dependencies),
  ).run();
  const created = (await listInvestigationPlans(db, draft.packageId)).find((item) => item.id === id);
  if (!created) throw new Error("Investigation plan could not be loaded after insert.");
  return created;
}

async function persistReviewTask(db: D1DatabaseLike, plan: PersistedInvestigationPlan) {
  const existing = (await listHumanReviewTasks(db, plan.packageId))
    .find((item) => item.taskKind === "investigation_plan" && item.investigationPlanId === plan.id);
  if (existing?.state === "open") return existing;
  const copy = investigationReviewTaskCopy(
    plan.packageId,
    materialInvestigationItems(plan).length,
    materialInvestigationItems(plan).filter((item) => item.safetySensitive).length,
  );
  if (existing) {
    await db.prepare(`
      UPDATE social_human_review_tasks
      SET state = 'open', decision_required = ?, why_automation_stopped = ?, context_json = ?,
          approve_consequence = ?, reject_consequence = ?, actor_email = NULL, decided_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(copy.decisionRequired, copy.whyAutomationStopped, JSON.stringify(copy.context), copy.approveConsequence, copy.rejectConsequence, existing.id).run();
    const updated = (await listHumanReviewTasks(db, plan.packageId)).find((item) => item.id === existing.id);
    if (!updated) throw new Error("Human review task could not be reopened.");
    return updated;
  }
  const id = taskRecordId(plan.packageId, copy.kind, plan.packageFingerprint);
  await db.prepare(`
    INSERT INTO social_human_review_tasks (
      id, package_id, investigation_plan_id, task_kind, state, decision_required, why_automation_stopped,
      context_json, approve_consequence, reject_consequence
    ) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `).bind(
    id,
    plan.packageId,
    plan.id,
    copy.kind,
    copy.decisionRequired,
    copy.whyAutomationStopped,
    JSON.stringify(copy.context),
    copy.approveConsequence,
    copy.rejectConsequence,
  ).run();
  const created = (await listHumanReviewTasks(db, plan.packageId)).find((item) => item.id === id);
  if (!created) throw new Error("Human review task could not be loaded after insert.");
  return created;
}

async function persistNamedReviewTask(db: D1DatabaseLike, input: {
  packageId: string;
  planId: string | null;
  fingerprint: string;
  copy: {
    kind: string;
    decisionRequired: string;
    whyAutomationStopped: string;
    approveConsequence: string;
    rejectConsequence: string;
    context: Record<string, unknown>;
  };
}) {
  const id = taskRecordId(input.packageId, input.copy.kind, input.fingerprint);
  const existing = (await listHumanReviewTasks(db, input.packageId))
    .find((item) => item.id === id || (item.taskKind === input.copy.kind && item.state === "open"));
  if (existing) {
    await db.prepare(`
      UPDATE social_human_review_tasks
      SET state = 'open', decision_required = ?, why_automation_stopped = ?, context_json = ?,
          approve_consequence = ?, reject_consequence = ?, actor_email = NULL, decided_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      input.copy.decisionRequired,
      input.copy.whyAutomationStopped,
      JSON.stringify(input.copy.context),
      input.copy.approveConsequence,
      input.copy.rejectConsequence,
      existing.id,
    ).run();
    const updated = (await listHumanReviewTasks(db, input.packageId)).find((item) => item.id === existing.id);
    if (!updated) throw new Error("Human review task could not be updated.");
    return updated;
  }
  await db.prepare(`
    INSERT INTO social_human_review_tasks (
      id, package_id, investigation_plan_id, task_kind, state, decision_required, why_automation_stopped,
      context_json, approve_consequence, reject_consequence
    ) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.packageId,
    input.planId,
    input.copy.kind,
    input.copy.decisionRequired,
    input.copy.whyAutomationStopped,
    JSON.stringify(input.copy.context),
    input.copy.approveConsequence,
    input.copy.rejectConsequence,
  ).run();
  const created = (await listHumanReviewTasks(db, input.packageId)).find((item) => item.id === id);
  if (!created) throw new Error("Human review task could not be loaded after insert.");
  return created;
}

async function persistRun(db: D1DatabaseLike, input: {
  packageId: string;
  action: string;
  fromState: OperatorState;
  toState: OperatorState;
  stoppedReason: string;
  automatic: boolean;
  humanAuthorityRequired: boolean;
  trace: OperatorTransitionStep[];
  actorEmail: string;
}) {
  const id = runRecordId(input.packageId);
  await db.prepare(`
    INSERT INTO social_operator_runs (
      id, package_id, action, from_state, to_state, stopped_reason, automatic, human_authority_required, step_count, trace_json, actor_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.packageId,
    input.action,
    input.fromState,
    input.toState,
    input.stoppedReason,
    input.automatic ? 1 : 0,
    input.humanAuthorityRequired ? 1 : 0,
    input.trace.length,
    JSON.stringify(input.trace),
    input.actorEmail,
  ).run();
  const runs = await listOperatorRuns(db, input.packageId);
  const created = runs.find((item) => item.id === id);
  if (!created) throw new Error("Operator run could not be loaded after insert.");
  return created;
}

async function refineCurrentPackage(db: D1DatabaseLike, packageId: string) {
  const { pkg, opportunity, fingerprint } = await currentFingerprint(db, packageId);
  const proposals = await listClaimProposals(db, packageId);
  if (!proposals.length) throw new Error("Investigation refinement requires existing claim proposals.");
  const draft = refineInvestigationPlan({
    packageId: pkg.id,
    packageFingerprint: fingerprint,
    packageProblem: opportunity.problem,
    packageAudience: opportunity.audience,
    packageThesis: pkg.thesis,
    packageUsefulnessTest: pkg.usefulnessTest,
    proposals,
  });
  return persistPlan(db, { ...draft, version: INVESTIGATION_REFINEMENT_VERSION });
}

export async function acknowledgeInvestigationPlan(db: D1DatabaseLike, packageId: string, actorEmail: string, decision: "acknowledged" | "rejected") {
  const email = assertActorEmail(actorEmail, "Investigation review");
  const snapshot = await buildOperatorSnapshotInput(db, packageId);
  const plan = snapshot.planRecord;
  if (!plan) throw new Error("Investigation review requires a refined plan.");
  if (snapshot.currentFingerprint && plan.packageFingerprint !== snapshot.currentFingerprint) {
    throw new Error("Investigation review can only acknowledge the current package plan version.");
  }
  const openTask = snapshot.tasks.find((item) => (
    item.taskKind === "investigation_plan"
    && item.state === "open"
    && (item.investigationPlanId === plan.id || !item.investigationPlanId)
  ));
  if (decision === "acknowledged" && plan.state === "acknowledged" && !openTask) {
    return loadOperatorView(db, packageId);
  }
  const decidedAt = new Date().toISOString();
  if (openTask) {
    await db.prepare(`
      UPDATE social_human_review_tasks
      SET state = ?, actor_email = ?, decided_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(decision, email, decidedAt, openTask.id).run();
  } else if (decision === "rejected") {
    throw new Error("There is no open investigation-plan review task.");
  }
  if (decision === "acknowledged" && plan.state !== "acknowledged") {
    await db.prepare(`
      UPDATE social_investigation_plans SET state = 'acknowledged', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(plan.id).run();
  }
  return loadOperatorView(db, packageId);
}

export async function advanceOperator(db: D1DatabaseLike, packageId: string, actorEmail: string, requestedAction = "advance") {
  const email = assertActorEmail(actorEmail, "Autonomous Operator");
  assertSocialGrowthPackage(packageId);
  if (!isOperatorAction(requestedAction) && requestedAction !== "advance") {
    assertOperatorActionAllowed(requestedAction);
    throw new Error("Autonomous Operator does not recognize that action.");
  }
  assertOperatorActionAllowed(requestedAction);
  if (SOCIAL_PUBLISH_AVAILABLE !== false) throw new Error("Autonomous Operator cannot run while publishing is enabled.");

  const action = requestedAction as OperatorAction | "advance";
  const claimsAtStart = (await listPackageClaims(db, packageId)).length;
  if (isInvestigationReviewAcknowledgment(action) || action === "reject_investigation_plan") {
    const from = classifyOperatorState(await buildOperatorSnapshotInput(db, packageId));
    const view = await acknowledgeInvestigationPlan(db, packageId, email, action === "reject_investigation_plan" ? "rejected" : "acknowledged");
    const alreadyDecided = from === view.state;
    const run = await persistRun(db, {
      packageId,
      action: action === "review_investigation_plan" ? "acknowledge_investigation_plan" : action,
      fromState: from,
      toState: view.state,
      stoppedReason: "human_decision",
      automatic: false,
      humanAuthorityRequired: true,
      trace: [{
        id: action,
        fromState: from,
        toState: view.state,
        action,
        automatic: false,
        requiresHumanAuthority: true,
        skipped: alreadyDecided,
        reason: alreadyDecided
          ? "Investigation plan was already acknowledged. Repeated review is idempotent."
          : "Founder recorded an investigation-plan decision. Claims were not created.",
      }],
      actorEmail: email,
    });
    return { ...view, latestRun: run };
  }

  const trace: OperatorTransitionStep[] = [];
  const started = classifyOperatorState(await buildOperatorSnapshotInput(db, packageId));
  const unlockEvidenceChain = isClaimsFromInvestigationAuthorization(action) || isEvidenceResearchContinuation(action);

  if (isClaimsFromInvestigationAuthorization(action)) {
    const created = await createClaimsFromCurrentPlan(db, packageId, started, trace);
    if (!created) {
      const view = await loadOperatorView(db, packageId);
      const run = await persistRun(db, {
        packageId,
        action,
        fromState: started,
        toState: view.state,
        stoppedReason: "human_gate",
        automatic: false,
        humanAuthorityRequired: true,
        trace,
        actorEmail: email,
      });
      return { ...view, latestRun: run, executionTrace: trace, publishingEnabled: SOCIAL_PUBLISH_AVAILABLE };
    }
  }

  while (trace.length < MAX_OPERATOR_STEPS) {
    const snapshot = await buildOperatorSnapshotInput(db, packageId);
    const state = classifyOperatorState(snapshot);
    const primary = primaryOperatorAction(state);
    if (state === "corpus_review_required" || state === "evidence_reassessment" || state === "investigation_review" || state === "claims_needed") {
      trace.push({
        id: "stop_human_gate",
        fromState: state,
        toState: state,
        action: primary.id,
        automatic: false,
        requiresHumanAuthority: primary.requiresHumanAuthority,
        skipped: true,
        reason: primary.requiresHumanAuthority
          ? "Stopped at a human governance gate. Autonomous Operator does not cross it."
          : "This next action requires explicit founder authorization.",
      });
      break;
    }
    if (unlockEvidenceChain && (state === "evidence_gaps" || state === "research_ready" || state === "research_incomplete")) {
      const stop = await runOperatorEvidenceChain(db, packageId, email, state, snapshot, trace);
      if (stop === "continue") continue;
      break;
    }
    if (primary.requiresHumanAuthority || !primary.automatic) {
      trace.push({
        id: "stop_human_gate",
        fromState: state,
        toState: state,
        action: primary.id,
        automatic: false,
        requiresHumanAuthority: primary.requiresHumanAuthority,
        skipped: true,
        reason: primary.requiresHumanAuthority
          ? "Stopped at a human governance gate. Autonomous Operator does not cross it."
          : "This next action is not enabled in the automatic chain.",
      });
      break;
    }
    if (state === "decomposition_needed" || (state === "package_ready" && snapshot.proposalCount === 0) || snapshot.proposalCount === 0) {
      const before = snapshot.proposalCount;
      await generateClaimProposals(db, packageId);
      const after = (await listClaimProposals(db, packageId)).length;
      trace.push({
        id: "generate_claim_proposals",
        fromState: state,
        toState: "refinement_needed",
        action: "generate_claim_proposals",
        automatic: true,
        requiresHumanAuthority: false,
        skipped: after === before && before > 0,
        reason: "Claim Decomposition wrote proposal rows. They are not claims and not evidence.",
      });
      if (after === 0) break;
      continue;
    }
    if (state === "refinement_needed" || !snapshot.plan || snapshot.plan.packageFingerprint !== snapshot.currentFingerprint) {
      const plan = await refineCurrentPackage(db, packageId);
      await persistReviewTask(db, plan);
      trace.push({
        id: "refine_investigation_plan",
        fromState: state,
        toState: "investigation_review",
        action: "refine_investigation_plan",
        automatic: true,
        requiresHumanAuthority: false,
        skipped: false,
        reason: "Investigation Refinement persisted a plan from existing proposals and opened a human review task.",
      });
      continue;
    }
    break;
  }

  if (trace.length >= MAX_OPERATOR_STEPS) {
    trace.push({
      id: "stop_step_bound",
      fromState: classifyOperatorState(await buildOperatorSnapshotInput(db, packageId)),
      toState: classifyOperatorState(await buildOperatorSnapshotInput(db, packageId)),
      action: "advance",
      automatic: true,
      requiresHumanAuthority: false,
      skipped: true,
      reason: `Stopped at the ${MAX_OPERATOR_STEPS}-step orchestration bound.`,
    });
  }

  const view = await loadOperatorView(db, packageId);
  const claimsAfter = (await listPackageClaims(db, packageId)).length;
  if (!isClaimsFromInvestigationAuthorization(action) && claimsAfter > claimsAtStart) {
    throw new Error("Autonomous Operator cannot create claims without investigation authorization.");
  }
  const budgetStop = trace.some((step) => step.id === "research_budget_exhausted");
  const stoppedReason = budgetStop
    ? "research_budget_exhausted"
    : view.state === "corpus_review_required" || view.primaryAction.requiresHumanAuthority
      ? "human_gate"
      : "current_authority_complete";
  const run = await persistRun(db, {
    packageId,
    action: unlockEvidenceChain ? action : "advance",
    fromState: started,
    toState: view.state,
    stoppedReason,
    automatic: !view.primaryAction.requiresHumanAuthority,
    humanAuthorityRequired: view.primaryAction.requiresHumanAuthority,
    trace,
    actorEmail: email,
  });
  return { ...view, latestRun: run, executionTrace: trace, publishingEnabled: SOCIAL_PUBLISH_AVAILABLE };
}

async function createClaimsFromCurrentPlan(
  db: D1DatabaseLike,
  packageId: string,
  fromState: OperatorState,
  trace: OperatorTransitionStep[],
) {
  const snapshot = await buildOperatorSnapshotInput(db, packageId);
  const state = classifyOperatorState(snapshot);
  if (state === "investigation_review") {
    trace.push({
      id: "create_claims_from_investigation",
      fromState: state,
      toState: state,
      action: "create_claims_from_investigation",
      automatic: false,
      requiresHumanAuthority: true,
      skipped: true,
      reason: "Investigation plan has not been acknowledged. Claims were not created.",
    });
    return false;
  }
  const plan = snapshot.planRecord;
  if (!plan || plan.state !== "acknowledged" || plan.packageFingerprint !== snapshot.currentFingerprint) {
    throw new Error("Create claims from investigation requires the current acknowledged InvestigationPlan.");
  }
  const result = await createClaimsFromAcknowledgedInvestigationPlan(db, plan);
  const after = classifyOperatorState(await buildOperatorSnapshotInput(db, packageId));
  trace.push({
    id: "create_claims_from_investigation",
    fromState,
    toState: after,
    action: "create_claims_from_investigation",
    automatic: false,
    requiresHumanAuthority: true,
    skipped: result.created.length === 0 && result.reused.length > 0,
    reason: result.created.length
      ? `Created ${result.created.length} unevidenced claim${result.created.length === 1 ? "" : "s"} from the acknowledged investigation plan. They are not evidence.`
      : result.reused.length
        ? `Reused ${result.reused.length} existing investigation claim${result.reused.length === 1 ? "" : "s"}. No duplicates were written.`
        : "No material investigation items remained to become claims.",
    details: {
      createdClaimIds: result.created.map((item) => item.id),
      reusedClaimIds: result.reused.map((item) => item.id),
      excludedItemKeys: result.excludedItemKeys,
      skippedUnprovenanced: result.skippedUnprovenanced,
    },
  });
  return true;
}

async function runOperatorEvidenceChain(
  db: D1DatabaseLike,
  packageId: string,
  actorEmail: string,
  fromState: OperatorState,
  snapshot: Awaited<ReturnType<typeof buildOperatorSnapshotInput>>,
  trace: OperatorTransitionStep[],
): Promise<"stop" | "continue"> {
  const intelligence = await buildPackageEvidenceIntelligence(db, packageId);
  const claims = await listPackageClaims(db, packageId);
  const links = await listInvestigationClaimLinks(db, packageId);
  const researchRuns = (await listResearchRuns(db)).filter((item) => item.packageId === packageId);
  const workset = buildResearchWorkset({
    claims,
    assessments: intelligence?.claimAssessments ?? [],
    investigationItems: snapshot.planRecord?.items ?? [],
    links,
    researchRuns,
  });
  const unsupported = intelligence?.claimAssessments.filter((item) => item.state !== "supported").length ?? claims.length;
  const supported = intelligence?.claimAssessments.filter((item) => item.state === "supported").length ?? 0;
  trace.push({
    id: "evaluate_evidence_intelligence",
    fromState,
    toState: fromState,
    action: "evaluate_evidence_intelligence",
    automatic: true,
    requiresHumanAuthority: false,
    skipped: false,
    reason: `Evidence Intelligence assessed ${claims.length} claims: ${unsupported} unresolved / ${supported} supported. Zero verified facts until accepted evidence exists.`,
    details: { claimCount: claims.length, unsupported, supported, due: workset.due.map((item) => item.claimId) },
  });
  if (intelligence?.radar.contradictions.length || intelligence?.decisionDna.contradictions.length) {
    const copy = contradictionReviewTaskCopy(
      packageId,
      intelligence.radar.contradictions[0]?.label ?? "package claims",
      "Accepted evidence already records an unresolved contradiction.",
    );
    await persistNamedReviewTask(db, {
      packageId,
      planId: snapshot.planRecord?.id ?? null,
      fingerprint: snapshot.currentFingerprint ?? "current",
      copy,
    });
    trace.push({
      id: "stop_contradiction",
      fromState,
      toState: "evidence_reassessment",
      action: "reassess",
      automatic: false,
      requiresHumanAuthority: true,
      skipped: true,
      reason: "Unresolved contradiction requires human judgment. Operator did not continue research.",
    });
    return "stop";
  }

  const consumed = { claims: 0, queries: 0, urlAttempts: 0, assessedCandidates: 0, runtimeMs: 0 };
  const retrievedUrls: string[] = [];
  const submitted: Array<{ candidateId: string; documentId: string | null; claimId: string | null }> = [];
  let contradiction: { claimText: string; source: string } | null = null;
  const chainStarted = Date.now();

  for (const item of workset.due) {
    const remaining = remainingOperatorResearchBudget({
      ...consumed,
      runtimeMs: consumed.runtimeMs + (Date.now() - chainStarted),
    });
    if (operatorResearchBudgetExhausted(remaining) || remaining.queries < 1) {
      trace.push({
        id: "research_budget_exhausted",
        fromState,
        toState: "research_incomplete",
        action: "run_bounded_live_discovery",
        automatic: true,
        requiresHumanAuthority: false,
        skipped: true,
        reason: `Operator research budget exhausted after ${consumed.claims} claim${consumed.claims === 1 ? "" : "s"} / ${consumed.queries} queries / ${consumed.assessedCandidates} candidates. Lower-level 3/10/5/8s caps remain enforced.`,
        details: { consumed, remaining, budget: OPERATOR_RESEARCH_BUDGET },
      });
      break;
    }
    const run = await runBoundedCandidateDiscovery(db, {
      packageId,
      claimId: item.claimId,
      actorEmail,
      mode: "auto",
      excludeCanonicalUrls: retrievedUrls,
      limitOverrides: {
        maximumQueries: remaining.queries,
        maximumCandidateDocuments: remaining.assessedCandidates,
        maximumRuntimeMs: remaining.runtimeMs,
      },
    });
    consumed.claims += 1;
    consumed.queries += run.queriesExecuted.length;
    consumed.assessedCandidates += run.candidates.filter((candidate) => candidate.retrievalStatus === "ok" || !candidate.retrievalStatus).length;
    consumed.urlAttempts += run.diagnostics?.urlAttemptCount ?? run.candidates.length;
    consumed.runtimeMs += Math.max(0, Date.parse(run.finishedAt) - Date.parse(run.startedAt));
    for (const candidate of run.candidates) {
      if (candidate.canonicalUrl && candidate.retrievalStatus !== "blocked") retrievedUrls.push(candidate.canonicalUrl);
    }
    trace.push({
      id: `run_bounded_live_discovery:${item.claimId}`,
      fromState,
      toState: fromState,
      action: "run_bounded_live_discovery",
      automatic: true,
      requiresHumanAuthority: false,
      skipped: false,
      reason: `Bounded discovery ran for claim ${item.claimId}. ${run.queriesExecuted.length} queries, ${run.candidates.length} candidates. Live candidates are not evidence.`,
      details: {
        claimId: item.claimId,
        queries: run.queriesExecuted,
        candidateCount: run.candidates.length,
        stopReason: run.stopReason,
        limits: {
          queries: Math.min(OPERATOR_RESEARCH_BUDGET.maximumQueries, remaining.queries),
          candidates: Math.min(OPERATOR_RESEARCH_BUDGET.maximumAssessedCandidates, remaining.assessedCandidates),
          runtimeMs: Math.min(OPERATOR_RESEARCH_BUDGET.maximumRuntimeMs, remaining.runtimeMs),
        },
      },
    });
    const submitIds = run.candidates.filter(candidateQualifiesForCorpusSubmission).map((candidate) => candidate.id);
    if (submitIds.length) {
      const submittedRun = await submitResearchCandidatesForReview(db, {
        runId: run.id,
        candidateIds: submitIds,
        actorEmail,
      });
      for (const row of submittedRun.submitted) {
        submitted.push({ candidateId: row.candidateId, documentId: row.documentId, claimId: item.claimId });
      }
    }
    const contradicting = run.candidates.find((candidate) => (
      candidate.relationship === "contradicts" && candidate.authorityAdequate
    ));
    if (contradicting) {
      contradiction = { claimText: item.claimText, source: contradicting.title || contradicting.canonicalUrl };
      break;
    }
  }

  if (contradiction) {
    const copy = contradictionReviewTaskCopy(packageId, contradiction.claimText, contradiction.source);
    await persistNamedReviewTask(db, {
      packageId,
      planId: snapshot.planRecord?.id ?? null,
      fingerprint: snapshot.currentFingerprint ?? "current",
      copy,
    });
    trace.push({
      id: "stop_contradiction",
      fromState,
      toState: "evidence_reassessment",
      action: "reassess",
      automatic: false,
      requiresHumanAuthority: true,
      skipped: true,
      reason: "A policy-adequate discovered source contradicts a claim. Human judgment is required.",
      details: contradiction,
    });
    return "stop";
  }

  if (submitted.length) {
    const labels = workset.items.filter((item) => submitted.some((row) => row.claimId === item.claimId)).map((item) => item.claimText);
    const copy = corpusReviewTaskCopy(packageId, submitted.length, labels);
    await persistNamedReviewTask(db, {
      packageId,
      planId: snapshot.planRecord?.id ?? null,
      fingerprint: snapshot.currentFingerprint ?? "current",
      copy,
    });
    trace.push({
      id: "submit_policy_advancing_candidates_for_review",
      fromState,
      toState: "corpus_review_required",
      action: "submit_policy_advancing_candidates_for_review",
      automatic: true,
      requiresHumanAuthority: false,
      skipped: false,
      reason: `Submitted ${submitted.length} policy-advancing candidate${submitted.length === 1 ? "" : "s"} to corpus review. None were accepted.`,
      details: { submitted },
    });
    return "stop";
  }

  const remainingDue = workset.due.length - consumed.claims;
  if (remainingDue > 0) {
    if (!trace.some((step) => step.id === "research_budget_exhausted")) {
      trace.push({
        id: "research_budget_exhausted",
        fromState,
        toState: "research_incomplete",
        action: "continue_evidence_research",
        automatic: true,
        requiresHumanAuthority: false,
        skipped: true,
        reason: `Operator research budget reached before ${remainingDue} remaining gap${remainingDue === 1 ? "" : "s"} could be researched.`,
        details: { consumed, remainingDue, budget: OPERATOR_RESEARCH_BUDGET },
      });
    }
  }
  return "stop";
}

function countInsufficientClaimCoverage(researchRuns: Awaited<ReturnType<typeof listResearchRuns>>) {
  const urls = new Set<string>();
  for (const run of researchRuns) {
    for (const candidate of run.candidates) {
      if (candidate.submittedDocumentId) continue;
      const coverage = candidate.claimCoverage ?? candidate.extraction?.claimCoverage ?? "";
      if (coverage !== "none" && coverage !== "context_only") continue;
      const authoritative = candidate.authorityAdequate
        || candidate.authorityClass === "government_regulatory"
        || candidate.authorityClass === "code_standard";
      if (!authoritative) continue;
      urls.add(candidate.canonicalUrl);
    }
  }
  return urls.size;
}

async function countAwaitingCorpusReview(
  db: D1DatabaseLike,
  researchRuns: Awaited<ReturnType<typeof listResearchRuns>>,
) {
  let count = 0;
  for (const run of researchRuns) {
    for (const candidate of run.candidates) {
      if (!candidate.submittedDocumentId) continue;
      const document = await getCorpusDocument(db, candidate.submittedDocumentId);
      if (!document || document.ingestionStatus === "awaiting_review") count += 1;
    }
  }
  return count;
}

async function listEvidenceReviewQueue(
  db: D1DatabaseLike,
  researchRuns: Awaited<ReturnType<typeof listResearchRuns>>,
) {
  const queue = [];
  for (const run of researchRuns) {
    for (const candidate of run.candidates) {
      if (!candidate.submittedDocumentId) continue;
      const document = await getCorpusDocument(db, candidate.submittedDocumentId);
      if (document && document.ingestionStatus !== "awaiting_review") continue;
      queue.push({
        candidateId: candidate.id,
        runId: run.id,
        claimId: run.claimId,
        title: candidate.title,
        publisher: candidate.publisher,
        canonicalUrl: candidate.canonicalUrl,
        authorityClass: candidate.authorityClass,
        policyAdvancement: candidate.policyAdvancement,
        relationship: candidate.relationship,
        claimCoverage: candidate.claimCoverage ?? candidate.extraction?.claimCoverage ?? null,
        excerpt: candidate.excerpts[0]?.text ?? "",
        provenance: candidate.provenance,
        retrievalStatus: candidate.retrievalStatus,
        submittedDocumentId: candidate.submittedDocumentId,
        ingestionStatus: document?.ingestionStatus ?? "awaiting_review",
        productionExposure: document?.productionExposure ?? false,
        whyItMatters: candidate.reasonSelected
          ?? `Passed submission gate: coverage ${candidate.claimCoverage ?? candidate.extraction?.claimCoverage ?? "direct"} · authority ${candidate.authorityClass} · ${candidate.policyAdvancement ?? "policy advancement"} · traceable excerpt. Not accepted evidence.`,
      });
    }
  }
  return queue;
}

function assertSocialGrowthPackage(packageId: string) {
  const parsed = parseSocialGrowthId(packageId);
  if (parsed.kind !== "package") throw new Error("Autonomous Operator actions must be package-scoped.");
}
