import { CONFIDENCE_RUBRIC } from "../../../../lib/knowledge-core.ts";
import {
  getWorkflowBundle,
  getWorkflowContexts,
  updateWorkflow,
  type WorkflowUpdateInput,
} from "../../../../../db/knowledge-core-repository.ts";
import { authorizedWorkflow, safeWorkflowError } from "../_shared.ts";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const authorized = await authorizedWorkflow(request, id);
    if ("response" in authorized) return authorized.response;
    const contexts = await getWorkflowContexts(authorized.db);
    return Response.json({ ...authorized.bundle, contexts, confidenceRubric: CONFIDENCE_RUBRIC });
  } catch {
    return Response.json({ error: "Workflow storage is unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const authorized = await authorizedWorkflow(request, id);
    if ("response" in authorized) return authorized.response;
    const payload = await request.json() as { workflow?: WorkflowUpdateInput; reason?: string };
    if (!payload.workflow || !payload.reason?.trim()) {
      return Response.json({ error: "Workflow changes and a revision reason are required." }, { status: 400 });
    }
    if (payload.workflow.confidenceLevel && !(payload.workflow.confidenceLevel in CONFIDENCE_RUBRIC)) {
      return Response.json({ error: "Invalid confidence level." }, { status: 400 });
    }
    const workflow = await updateWorkflow(authorized.db, authorized.bundle.workflow.id, payload.workflow, authorized.editor.email, payload.reason.trim());
    const bundle = workflow ? await getWorkflowBundle(authorized.db, authorized.bundle.workflow.id) : null;
    return Response.json(bundle);
  } catch (error) {
    return safeWorkflowError(error);
  }
}
