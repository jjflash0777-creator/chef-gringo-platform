import { RISK_LEVELS } from "../../../../../lib/knowledge-core.ts";
import {
  addWorkflowStep,
  getWorkflowBundle,
  reorderWorkflowSteps,
  type WorkflowStepInput,
} from "../../../../../../db/knowledge-core-repository.ts";
import { authorizedWorkflow, safeWorkflowError } from "../../_shared.ts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const authorized = await authorizedWorkflow(request, id);
    if ("response" in authorized) return authorized.response;
    const payload = await request.json() as
      | { action: "add"; step: WorkflowStepInput }
      | { action: "reorder"; orderedStepIds: number[] };
    if (payload.action === "reorder") {
      await reorderWorkflowSteps(authorized.db, authorized.bundle.workflow.id, payload.orderedStepIds, authorized.editor.email);
    } else if (payload.action === "add" && payload.step) {
      if (!payload.step.title?.trim() || !RISK_LEVELS.includes(payload.step.riskLevel)) {
        return Response.json({ error: "Step title and a valid risk level are required." }, { status: 400 });
      }
      await addWorkflowStep(authorized.db, authorized.bundle.workflow.id, payload.step, authorized.editor.email);
    } else {
      return Response.json({ error: "Invalid step action." }, { status: 400 });
    }
    return Response.json(await getWorkflowBundle(authorized.db, authorized.bundle.workflow.id));
  } catch (error) {
    return safeWorkflowError(error);
  }
}
