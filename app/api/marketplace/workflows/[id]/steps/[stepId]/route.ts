import { RISK_LEVELS } from "../../../../../../lib/knowledge-core.ts";
import {
  getWorkflowBundle,
  removeWorkflowStep,
  updateWorkflowStep,
  type WorkflowStepInput,
} from "../../../../../../../db/knowledge-core-repository.ts";
import { authorizedWorkflow, safeWorkflowError } from "../../../_shared.ts";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; stepId: string }> }) {
  const { id, stepId: rawStepId } = await context.params;
  const stepId = Number(rawStepId);
  if (!Number.isInteger(stepId)) return Response.json({ error: "Invalid step." }, { status: 400 });
  try {
    const authorized = await authorizedWorkflow(request, id);
    if ("response" in authorized) return authorized.response;
    const step = await request.json() as WorkflowStepInput;
    if (!step.title?.trim() || !RISK_LEVELS.includes(step.riskLevel)) {
      return Response.json({ error: "Step title and a valid risk level are required." }, { status: 400 });
    }
    const updated = await updateWorkflowStep(authorized.db, authorized.bundle.workflow.id, stepId, step, authorized.editor.email);
    if (!updated) return Response.json({ error: "Step not found." }, { status: 404 });
    return Response.json(await getWorkflowBundle(authorized.db, authorized.bundle.workflow.id));
  } catch (error) {
    return safeWorkflowError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string; stepId: string }> }) {
  const { id, stepId: rawStepId } = await context.params;
  const stepId = Number(rawStepId);
  if (!Number.isInteger(stepId)) return Response.json({ error: "Invalid step." }, { status: 400 });
  try {
    const authorized = await authorizedWorkflow(request, id);
    if ("response" in authorized) return authorized.response;
    const removed = await removeWorkflowStep(authorized.db, authorized.bundle.workflow.id, stepId, authorized.editor.email);
    if (!removed) return Response.json({ error: "Step not found." }, { status: 404 });
    return Response.json(await getWorkflowBundle(authorized.db, authorized.bundle.workflow.id));
  } catch (error) {
    return safeWorkflowError(error);
  }
}
