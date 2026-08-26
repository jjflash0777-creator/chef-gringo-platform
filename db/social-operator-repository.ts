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
  investigationReviewTaskCopy,
  isOperatorAction,
  primaryOperatorAction,
  type OperatorAction,
  type OperatorSnapshotInput,
  type OperatorState,
  type OperatorTransitionStep,
} from "../app/growth/social/operator-state.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../app/growth/social/types.ts";
import type { D1DatabaseLike } from "./index.ts";
import { generateClaimProposals, listClaimProposals } from "./social-claim-proposal-repository.ts";
import { buildPackageEvidenceIntelligence } from "./social-evidence-intelligence.ts";
import { getContentOpportunity, getContentPackage, listPackageClaims } from "./social-growth-read.ts";
import { listResearchRuns } from "./social-research-read.ts";

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
  const planRecord = plans.find((item) => item.packageFingerprint === fingerprint) ?? plans[0] ?? null;
  const researchRuns = (await listResearchRuns(db)).filter((item) => item.packageId === packageId);
  const awaitingCorpusReviewCount = researchRuns.reduce((count, run) => (
    count + run.candidates.filter((candidate) => Boolean(candidate.submittedDocumentId)).length
  ), 0);
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
    unresolvedContradiction: Boolean(intelligence?.radar.contradictions.length || intelligence?.decisionDna.contradictions.length),
    awaitingCorpusReviewCount,
    researchRunCount: researchRuns.length,
    researchInProgress: false,
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
  const task = snapshot.tasks.find((item) => item.taskKind === "investigation_plan" && item.state === "open");
  if (!task) throw new Error("There is no open investigation-plan review task.");
  const decidedAt = new Date().toISOString();
  await db.prepare(`
    UPDATE social_human_review_tasks
    SET state = ?, actor_email = ?, decided_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(decision, email, decidedAt, task.id).run();
  if (decision === "acknowledged") {
    await db.prepare(`
      UPDATE social_investigation_plans SET state = 'acknowledged', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(plan.id).run();
  }
  const claims = await listPackageClaims(db, packageId);
  void claims;
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
  if (action === "acknowledge_investigation_plan" || action === "reject_investigation_plan") {
    const from = classifyOperatorState(await buildOperatorSnapshotInput(db, packageId));
    const view = await acknowledgeInvestigationPlan(db, packageId, email, action === "reject_investigation_plan" ? "rejected" : "acknowledged");
    const run = await persistRun(db, {
      packageId,
      action,
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
        skipped: false,
        reason: "Founder recorded an investigation-plan decision. Claims were not created.",
      }],
      actorEmail: email,
    });
    return { ...view, latestRun: run };
  }

  const trace: OperatorTransitionStep[] = [];
  const started = classifyOperatorState(await buildOperatorSnapshotInput(db, packageId));

  while (trace.length < MAX_OPERATOR_STEPS) {
    const snapshot = await buildOperatorSnapshotInput(db, packageId);
    const state = classifyOperatorState(snapshot);
    const primary = primaryOperatorAction(state);
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
          ? "Stopped at a human governance gate. Autonomous Operator v1 does not cross it."
          : "This next action is not enabled in the v1 automatic chain.",
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
  if (claimsAfter > claimsAtStart) {
    throw new Error("Autonomous Operator v1 cannot create claims.");
  }
  const stoppedReason = view.primaryAction.requiresHumanAuthority ? "human_gate" : "current_authority_complete";
  const run = await persistRun(db, {
    packageId,
    action: "advance",
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

function assertSocialGrowthPackage(packageId: string) {
  const parsed = parseSocialGrowthId(packageId);
  if (parsed.kind !== "package") throw new Error("Autonomous Operator actions must be package-scoped.");
}
