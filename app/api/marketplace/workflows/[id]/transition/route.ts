import { WORKFLOW_STATUSES, type WorkflowStatus } from "../../../../../lib/knowledge-core.ts";
import {
  getWorkflowBundle,
  transitionWorkflow,
} from "../../../../../../db/knowledge-core-repository.ts";
import { authorizedWorkflow, safeWorkflowError } from "../../_shared.ts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const authorized = await authorizedWorkflow(request, id);
    if ("response" in authorized) return authorized.response;
    const payload = await request.json() as { to?: WorkflowStatus; reason?: string };
    if (!payload.to || !WORKFLOW_STATUSES.includes(payload.to) || !payload.reason?.trim()) {
      return Response.json({ error: "A valid target status and decision reason are required." }, { status: 400 });
    }
    const result = await transitionWorkflow(authorized.db, authorized.bundle.workflow.id, payload.to, authorized.editor.email, payload.reason.trim());
    if (!result.ok) return Response.json({ error: result.error, qualityGates: result.qualityGates }, { status: result.status });
    return Response.json(await getWorkflowBundle(authorized.db, authorized.bundle.workflow.id));
  } catch (error) {
    return safeWorkflowError(error);
  }
}
