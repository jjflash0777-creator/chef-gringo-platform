import { CONFIDENCE_RUBRIC, SOURCE_TYPES } from "../../../../../lib/knowledge-core.ts";
import {
  createAndLinkSource,
  getWorkflowBundle,
  type SourceLinkInput,
} from "../../../../../../db/knowledge-core-repository.ts";
import { authorizedWorkflow, safeWorkflowError } from "../../_shared.ts";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const authorized = await authorizedWorkflow(request, id);
    if ("response" in authorized) return authorized.response;
    const source = await request.json() as SourceLinkInput;
    if (!source.title?.trim() || !source.claimText?.trim() || !SOURCE_TYPES.includes(source.sourceType) || !(source.confidenceLevel in CONFIDENCE_RUBRIC)) {
      return Response.json({ error: "Source title, type, claim, and valid confidence are required." }, { status: 400 });
    }
    if (source.verificationStatus === "verified" && (!source.verifiedByUserId || !source.verifiedAt)) {
      return Response.json({ error: "Verified sources require a verifier and verification date." }, { status: 400 });
    }
    if (source.workflowStepId && !authorized.bundle.steps.some((step) => step.id === source.workflowStepId)) {
      return Response.json({ error: "The selected step does not belong to this workflow." }, { status: 400 });
    }
    await createAndLinkSource(authorized.db, authorized.bundle.workflow.id, source, authorized.editor.email);
    return Response.json(await getWorkflowBundle(authorized.db, authorized.bundle.workflow.id), { status: 201 });
  } catch (error) {
    return safeWorkflowError(error);
  }
}
