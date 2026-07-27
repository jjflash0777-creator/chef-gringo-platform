import {
  canTransitionWorkflow,
  evaluateWorkflowQualityGates,
  summarizeChanges,
  type ConfidenceLevel,
  type QualityGateFailure,
  type RiskLevel,
  type SourceType,
  type WorkflowStatus,
} from "../app/lib/knowledge-core.ts";
import type { D1DatabaseLike, D1PreparedStatementLike } from "./index.ts";

export const PILOT_SLUG = "iddsi-level-4-pureed-meals-senior-living";

type WorkflowRow = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  problemStatement: string;
  jobStatement: string;
  intendedOutcome: string;
  nextAction: string;
  affiliateDisclosure: string;
  status: WorkflowStatus;
  confidenceLevel: ConfidenceLevel;
  primaryPersonaId: number | null;
  primaryEnvironmentId: number | null;
  primaryUseCaseId: number | null;
  reviewerUserId: string | null;
  createdByUserId: string;
  lastVerifiedAt: string | null;
  reviewDueAt: string | null;
  publishedAt: string | null;
  revisionNumber: number;
  createdAt: string;
  updatedAt: string;
  personaName?: string | null;
  environmentName?: string | null;
  useCaseName?: string | null;
};

export type WorkflowStepRow = {
  id: number;
  workflowId: number;
  position: number;
  title: string;
  instruction: string;
  purpose: string;
  expectedResult: string;
  measurableCheck: string;
  commonMistake: string;
  correctiveAction: string;
  riskLevel: RiskLevel;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowSourceRow = {
  id: number;
  workflowId: number;
  workflowStepId: number | null;
  sourceId: number;
  claimText: string;
  evidenceSummary: string;
  confidenceLevel: ConfidenceLevel;
  limitations: string;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  sourceTitle: string;
  publisher: string;
  sourceType: SourceType;
  url: string | null;
  publicationDate: string | null;
  accessedAt: string | null;
  verificationStatus: string;
  sourceNotes: string;
};

type EditorialEventRow = {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  actorEmail: string;
  detail: string;
  createdAt: string;
};

export type WorkflowBundle = {
  workflow: WorkflowRow;
  steps: WorkflowStepRow[];
  sources: WorkflowSourceRow[];
  history: EditorialEventRow[];
  qualityGates: QualityGateFailure[];
};

const workflowSelect = `
  SELECT
    w.id, w.slug, w.title, w.summary,
    w.problem_statement AS problemStatement,
    w.job_statement AS jobStatement,
    w.intended_outcome AS intendedOutcome,
    w.next_action AS nextAction,
    w.affiliate_disclosure AS affiliateDisclosure,
    w.status, w.confidence_level AS confidenceLevel,
    w.primary_persona_id AS primaryPersonaId,
    w.primary_environment_id AS primaryEnvironmentId,
    w.primary_use_case_id AS primaryUseCaseId,
    w.reviewer_user_id AS reviewerUserId,
    w.created_by_user_id AS createdByUserId,
    w.last_verified_at AS lastVerifiedAt,
    w.review_due_at AS reviewDueAt,
    w.published_at AS publishedAt,
    w.revision_number AS revisionNumber,
    w.created_at AS createdAt, w.updated_at AS updatedAt,
    p.name AS personaName, e.name AS environmentName, u.name AS useCaseName
  FROM workflows w
  LEFT JOIN customer_personas p ON p.id = w.primary_persona_id
  LEFT JOIN culinary_environments e ON e.id = w.primary_environment_id
  LEFT JOIN use_cases u ON u.id = w.primary_use_case_id
`;

function eventStatement(
  db: D1DatabaseLike,
  workflowId: number,
  action: string,
  actorEmail: string,
  detail: Record<string, unknown>,
) {
  return db.prepare(
    "INSERT INTO editorial_events (entity_type, entity_id, action, actor_email, detail) VALUES ('workflow', ?, ?, ?, ?)"
  ).bind(workflowId, action, actorEmail, JSON.stringify(detail));
}

async function rows<T>(statement: D1PreparedStatementLike) {
  return (await statement.all<T>()).results;
}

export async function getWorkflowBundle(db: D1DatabaseLike, identifier: number | string): Promise<WorkflowBundle | null> {
  const byId = typeof identifier === "number";
  const workflow = await db.prepare(`${workflowSelect} WHERE w.${byId ? "id" : "slug"} = ?`).bind(identifier).first<WorkflowRow>();
  if (!workflow) return null;
  const [steps, sources, history] = await Promise.all([
    rows<WorkflowStepRow>(db.prepare(`
      SELECT id, workflow_id AS workflowId, position, title, instruction, purpose,
        expected_result AS expectedResult, measurable_check AS measurableCheck,
        common_mistake AS commonMistake, corrective_action AS correctiveAction,
        risk_level AS riskLevel, created_at AS createdAt, updated_at AS updatedAt
      FROM workflow_steps WHERE workflow_id = ? ORDER BY position ASC
    `).bind(workflow.id)),
    rows<WorkflowSourceRow>(db.prepare(`
      SELECT ws.id, ws.workflow_id AS workflowId, ws.workflow_step_id AS workflowStepId,
        ws.source_id AS sourceId, ws.claim_text AS claimText,
        ws.evidence_summary AS evidenceSummary, ws.confidence_level AS confidenceLevel,
        ws.limitations, ws.verified_by_user_id AS verifiedByUserId, ws.verified_at AS verifiedAt,
        s.title AS sourceTitle, s.publisher, s.source_type AS sourceType, s.url,
        s.publication_date AS publicationDate, s.accessed_at AS accessedAt,
        s.verification_status AS verificationStatus, s.notes AS sourceNotes
      FROM workflow_sources ws JOIN sources s ON s.id = ws.source_id
      WHERE ws.workflow_id = ? ORDER BY ws.workflow_step_id, ws.id
    `).bind(workflow.id)),
    rows<EditorialEventRow>(db.prepare(`
      SELECT id, entity_type AS entityType, entity_id AS entityId, action,
        actor_email AS actorEmail, detail, created_at AS createdAt
      FROM editorial_events WHERE entity_type = 'workflow' AND entity_id = ?
      ORDER BY id DESC LIMIT 100
    `).bind(workflow.id)),
  ]);
  return {
    workflow,
    steps,
    sources,
    history,
    qualityGates: evaluateWorkflowQualityGates(workflow, steps, sources),
  };
}

export async function getWorkflowContexts(db: D1DatabaseLike) {
  const [personas, environments, useCases] = await Promise.all([
    rows<{ id: number; name: string }>(db.prepare("SELECT id, name FROM customer_personas ORDER BY name")),
    rows<{ id: number; name: string }>(db.prepare("SELECT id, name FROM culinary_environments ORDER BY name")),
    rows<{ id: number; name: string }>(db.prepare("SELECT id, name FROM use_cases ORDER BY name")),
  ]);
  return { personas, environments, useCases };
}

export type WorkflowCreateInput = {
  slug: string;
  title: string;
  summary?: string;
  problemStatement?: string;
  jobStatement?: string;
  intendedOutcome?: string;
  nextAction?: string;
  affiliateDisclosure?: string;
  confidenceLevel?: ConfidenceLevel;
  primaryPersonaId?: number | null;
  primaryEnvironmentId?: number | null;
  primaryUseCaseId?: number | null;
};

export async function createWorkflow(
  db: D1DatabaseLike,
  input: WorkflowCreateInput,
  actorEmail: string,
) {
  const insert = db.prepare(`
    INSERT INTO workflows (
      slug, title, summary, problem_statement, job_statement, intended_outcome,
      next_action, affiliate_disclosure, confidence_level,
      primary_persona_id, primary_environment_id, primary_use_case_id, created_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id, slug, title, status, confidence_level AS confidenceLevel
  `).bind(
    input.slug, input.title, input.summary || "", input.problemStatement || "",
    input.jobStatement || "", input.intendedOutcome || "", input.nextAction || "",
    input.affiliateDisclosure || "No affiliate-linked products are referenced.",
    input.confidenceLevel || "insufficient", input.primaryPersonaId ?? null,
    input.primaryEnvironmentId ?? null, input.primaryUseCaseId ?? null, actorEmail,
  );
  const audit = db.prepare(`
    INSERT INTO editorial_events (entity_type, entity_id, action, actor_email, detail)
    VALUES ('workflow', (SELECT id FROM workflows WHERE slug = ?), 'workflow_created', ?, ?)
  `).bind(input.slug, actorEmail, JSON.stringify({ slug: input.slug, title: input.title, status: "draft" }));
  const result = await db.batch([insert, audit]);
  return result[0]?.results?.[0] || null;
}

export type WorkflowUpdateInput = Partial<{
  title: string;
  slug: string;
  summary: string;
  problemStatement: string;
  jobStatement: string;
  intendedOutcome: string;
  nextAction: string;
  affiliateDisclosure: string;
  confidenceLevel: ConfidenceLevel;
  primaryPersonaId: number | null;
  primaryEnvironmentId: number | null;
  primaryUseCaseId: number | null;
  reviewerUserId: string | null;
  lastVerifiedAt: string | null;
  reviewDueAt: string | null;
}>;

const updateColumnMap: Record<keyof WorkflowUpdateInput, string> = {
  title: "title",
  slug: "slug",
  summary: "summary",
  problemStatement: "problem_statement",
  jobStatement: "job_statement",
  intendedOutcome: "intended_outcome",
  nextAction: "next_action",
  affiliateDisclosure: "affiliate_disclosure",
  confidenceLevel: "confidence_level",
  primaryPersonaId: "primary_persona_id",
  primaryEnvironmentId: "primary_environment_id",
  primaryUseCaseId: "primary_use_case_id",
  reviewerUserId: "reviewer_user_id",
  lastVerifiedAt: "last_verified_at",
  reviewDueAt: "review_due_at",
};

export async function updateWorkflow(
  db: D1DatabaseLike,
  workflowId: number,
  input: WorkflowUpdateInput,
  actorEmail: string,
  reason: string,
) {
  const current = await getWorkflowBundle(db, workflowId);
  if (!current) return null;
  const entries = Object.entries(input).filter(([key]) => key in updateColumnMap) as Array<[keyof WorkflowUpdateInput, unknown]>;
  if (entries.length === 0) return current.workflow;
  const assignments = entries.map(([key]) => `${updateColumnMap[key]} = ?`).join(", ");
  const values = entries.map(([, value]) => value);
  const after = { ...current.workflow, ...input };
  const action = input.lastVerifiedAt && input.lastVerifiedAt !== current.workflow.lastVerifiedAt
    ? "verification_renewed"
    : "workflow_updated";
  const update = db.prepare(`
    UPDATE workflows SET ${assignments}, revision_number = revision_number + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND revision_number = ?
  `).bind(...values, workflowId, current.workflow.revisionNumber);
  const audit = eventStatement(db, workflowId, action, actorEmail, {
    reason,
    previousStatus: current.workflow.status,
    newStatus: current.workflow.status,
    changes: summarizeChanges(current.workflow as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>),
    previousRevision: current.workflow.revisionNumber,
    newRevision: current.workflow.revisionNumber + 1,
  });
  await db.batch([update, audit]);
  return (await getWorkflowBundle(db, workflowId))?.workflow || null;
}

export type WorkflowStepInput = {
  title: string;
  instruction: string;
  purpose: string;
  expectedResult: string;
  measurableCheck: string;
  commonMistake: string;
  correctiveAction: string;
  riskLevel: RiskLevel;
};

export async function addWorkflowStep(
  db: D1DatabaseLike,
  workflowId: number,
  input: WorkflowStepInput,
  actorEmail: string,
) {
  const insert = db.prepare(`
    INSERT INTO workflow_steps (
      workflow_id, position, title, instruction, purpose, expected_result,
      measurable_check, common_mistake, corrective_action, risk_level
    ) VALUES (?, (SELECT COALESCE(MAX(position), 0) + 1 FROM workflow_steps WHERE workflow_id = ?), ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING id, position
  `).bind(workflowId, workflowId, input.title, input.instruction, input.purpose, input.expectedResult, input.measurableCheck, input.commonMistake, input.correctiveAction, input.riskLevel);
  const audit = eventStatement(db, workflowId, "step_added", actorEmail, { title: input.title, riskLevel: input.riskLevel });
  const result = await db.batch([insert, audit]);
  return result[0]?.results?.[0] || null;
}

export async function updateWorkflowStep(
  db: D1DatabaseLike,
  workflowId: number,
  stepId: number,
  input: WorkflowStepInput,
  actorEmail: string,
) {
  const before = await db.prepare("SELECT * FROM workflow_steps WHERE id = ? AND workflow_id = ?").bind(stepId, workflowId).first<Record<string, unknown>>();
  if (!before) return null;
  const update = db.prepare(`
    UPDATE workflow_steps SET title = ?, instruction = ?, purpose = ?, expected_result = ?,
      measurable_check = ?, common_mistake = ?, corrective_action = ?, risk_level = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workflow_id = ?
  `).bind(input.title, input.instruction, input.purpose, input.expectedResult, input.measurableCheck, input.commonMistake, input.correctiveAction, input.riskLevel, stepId, workflowId);
  const audit = eventStatement(db, workflowId, "step_changed", actorEmail, {
    stepId,
    changes: summarizeChanges(before, input as unknown as Record<string, unknown>),
  });
  await db.batch([update, audit]);
  return db.prepare("SELECT * FROM workflow_steps WHERE id = ?").bind(stepId).first();
}

export async function removeWorkflowStep(
  db: D1DatabaseLike,
  workflowId: number,
  stepId: number,
  actorEmail: string,
) {
  const step = await db.prepare("SELECT id, position, title FROM workflow_steps WHERE id = ? AND workflow_id = ?").bind(stepId, workflowId).first<{ id: number; position: number; title: string }>();
  if (!step) return false;
  await db.batch([
    db.prepare("DELETE FROM workflow_sources WHERE workflow_step_id = ?").bind(stepId),
    db.prepare("DELETE FROM workflow_steps WHERE id = ? AND workflow_id = ?").bind(stepId, workflowId),
    db.prepare("UPDATE workflow_steps SET position = position + 1000 WHERE workflow_id = ? AND position > ?").bind(workflowId, step.position),
    db.prepare("UPDATE workflow_steps SET position = position - 1001 WHERE workflow_id = ? AND position > 1000").bind(workflowId),
    eventStatement(db, workflowId, "step_removed", actorEmail, step),
  ]);
  return true;
}

export async function reorderWorkflowSteps(
  db: D1DatabaseLike,
  workflowId: number,
  orderedStepIds: number[],
  actorEmail: string,
) {
  const existing = await rows<{ id: number }>(db.prepare("SELECT id FROM workflow_steps WHERE workflow_id = ? ORDER BY position").bind(workflowId));
  const existingIds = existing.map((row) => row.id);
  if (orderedStepIds.length !== existingIds.length || new Set(orderedStepIds).size !== orderedStepIds.length || orderedStepIds.some((id) => !existingIds.includes(id))) {
    throw new Error("The reordered step list must contain every workflow step exactly once.");
  }
  const statements: D1PreparedStatementLike[] = [
    db.prepare("UPDATE workflow_steps SET position = position + 1000 WHERE workflow_id = ?").bind(workflowId),
    ...orderedStepIds.map((id, index) => db.prepare("UPDATE workflow_steps SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workflow_id = ?").bind(index + 1, id, workflowId)),
    eventStatement(db, workflowId, "step_reordered", actorEmail, { previousOrder: existingIds, newOrder: orderedStepIds }),
  ];
  await db.batch(statements);
}

export type SourceLinkInput = {
  title: string;
  publisher: string;
  sourceType: SourceType;
  url?: string | null;
  publicationDate?: string | null;
  accessedAt?: string | null;
  verificationStatus?: "draft" | "verified";
  notes?: string;
  workflowStepId?: number | null;
  claimText: string;
  evidenceSummary: string;
  confidenceLevel: ConfidenceLevel;
  limitations: string;
  verifiedByUserId?: string | null;
  verifiedAt?: string | null;
};

export async function createAndLinkSource(
  db: D1DatabaseLike,
  workflowId: number,
  input: SourceLinkInput,
  actorEmail: string,
) {
  const sourceInsert = db.prepare(`
    INSERT INTO sources (title, publisher, source_type, url, publication_date, accessed_at, verification_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
  `).bind(input.title, input.publisher, input.sourceType, input.url ?? null, input.publicationDate ?? null, input.accessedAt ?? null, input.verificationStatus || "draft", input.notes || "");
  const linkInsert = db.prepare(`
    INSERT INTO workflow_sources (
      workflow_id, workflow_step_id, source_id, claim_text, evidence_summary,
      confidence_level, limitations, verified_by_user_id, verified_at
    ) VALUES (?, ?, last_insert_rowid(), ?, ?, ?, ?, ?, ?)
    RETURNING id
  `).bind(workflowId, input.workflowStepId ?? null, input.claimText, input.evidenceSummary, input.confidenceLevel, input.limitations, input.verifiedByUserId ?? null, input.verifiedAt ?? null);
  const audit = eventStatement(db, workflowId, "source_linked", actorEmail, {
    title: input.title,
    workflowStepId: input.workflowStepId ?? null,
    claimText: input.claimText,
    verificationStatus: input.verificationStatus || "draft",
  });
  const result = await db.batch([sourceInsert, linkInsert, audit]);
  return result[1]?.results?.[0] || null;
}

export async function unlinkWorkflowSource(
  db: D1DatabaseLike,
  workflowId: number,
  linkId: number,
  actorEmail: string,
) {
  const link = await db.prepare("SELECT id, source_id AS sourceId, workflow_step_id AS workflowStepId, claim_text AS claimText FROM workflow_sources WHERE id = ? AND workflow_id = ?").bind(linkId, workflowId).first<Record<string, unknown>>();
  if (!link) return false;
  await db.batch([
    db.prepare("DELETE FROM workflow_sources WHERE id = ? AND workflow_id = ?").bind(linkId, workflowId),
    eventStatement(db, workflowId, "source_unlinked", actorEmail, link),
  ]);
  return true;
}

export type TransitionResult =
  | { ok: true; workflow: WorkflowRow; qualityGates: QualityGateFailure[] }
  | { ok: false; status: 400 | 404 | 409 | 422; error: string; qualityGates?: QualityGateFailure[] };

export async function transitionWorkflow(
  db: D1DatabaseLike,
  workflowId: number,
  to: WorkflowStatus,
  actorEmail: string,
  reason: string,
): Promise<TransitionResult> {
  const bundle = await getWorkflowBundle(db, workflowId);
  if (!bundle) return { ok: false, status: 404, error: "Workflow not found." };
  const from = bundle.workflow.status;
  if (!canTransitionWorkflow(from, to)) return { ok: false, status: 409, error: `Invalid workflow transition: ${from} → ${to}.` };

  if (to === "published") {
    const attempt = eventStatement(db, workflowId, "publication_attempted", actorEmail, { previousStatus: from, newStatus: to, reason });
    const failures = evaluateWorkflowQualityGates(bundle.workflow, bundle.steps, bundle.sources);
    if (bundle.workflow.reviewerUserId !== actorEmail) {
      failures.push({ code: "reviewer_mismatch", message: "Only the assigned reviewer may approve and publish this workflow." });
    }
    if (failures.length > 0) {
      await db.batch([
        attempt,
        eventStatement(db, workflowId, "publication_blocked", actorEmail, { previousStatus: from, newStatus: from, reason, failures }),
      ]);
      return { ok: false, status: 422, error: "Publication quality gates were not met.", qualityGates: failures };
    }
    await db.batch([
      attempt,
      db.prepare("UPDATE workflows SET status = 'published', published_at = CURRENT_TIMESTAMP, revision_number = revision_number + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(workflowId),
      eventStatement(db, workflowId, "published", actorEmail, { previousStatus: from, newStatus: to, reason }),
    ]);
  } else {
    const action = to === "in_review" ? "submitted_for_review" : "returned_to_draft";
    await db.batch([
      db.prepare("UPDATE workflows SET status = ?, published_at = NULL, revision_number = revision_number + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(to, workflowId),
      eventStatement(db, workflowId, action, actorEmail, { previousStatus: from, newStatus: to, reason }),
    ]);
  }
  const updated = await getWorkflowBundle(db, workflowId);
  return { ok: true, workflow: updated!.workflow, qualityGates: updated!.qualityGates };
}
