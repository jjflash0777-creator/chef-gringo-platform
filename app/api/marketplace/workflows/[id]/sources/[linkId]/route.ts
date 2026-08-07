import {
  getWorkflowBundle,
  unlinkWorkflowSource,
} from "../../../../../../../db/knowledge-core-repository.ts";
import { authorizedWorkflow, safeWorkflowError } from "../../../_shared.ts";

export async function DELETE(request: Request, context: { params: Promise<{ id: string; linkId: string }> }) {
  const { id, linkId: rawLinkId } = await context.params;
  const linkId = Number(rawLinkId);
  if (!Number.isInteger(linkId)) return Response.json({ error: "Invalid source link." }, { status: 400 });
  try {
    const authorized = await authorizedWorkflow(request, id);
    if ("response" in authorized) return authorized.response;
    const removed = await unlinkWorkflowSource(authorized.db, authorized.bundle.workflow.id, linkId, authorized.editor.email);
    if (!removed) return Response.json({ error: "Source link not found." }, { status: 404 });
    return Response.json(await getWorkflowBundle(authorized.db, authorized.bundle.workflow.id));
  } catch (error) {
    return safeWorkflowError(error);
  }
}
