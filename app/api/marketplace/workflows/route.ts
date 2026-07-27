import { CONFIDENCE_RUBRIC } from "../../../lib/knowledge-core.ts";
import {
  authorizeMarketplaceRequest,
  marketplaceAuthorizationResponse,
} from "../../../lib/marketplace-permissions.ts";
import { getD1Binding } from "../../../../db/index.ts";
import {
  createWorkflow,
  type WorkflowCreateInput,
} from "../../../../db/knowledge-core-repository.ts";

export async function POST(request: Request) {
  const editor = authorizeMarketplaceRequest(request);
  if (!editor) return marketplaceAuthorizationResponse(request);
  try {
    const input = await request.json() as WorkflowCreateInput;
    if (!input.title?.trim() || !input.slug?.trim()) {
      return Response.json({ error: "Workflow title and slug are required." }, { status: 400 });
    }
    if (input.confidenceLevel && !(input.confidenceLevel in CONFIDENCE_RUBRIC)) {
      return Response.json({ error: "Invalid confidence level." }, { status: 400 });
    }
    const workflow = await createWorkflow(getD1Binding(), input, editor.email);
    return Response.json({ workflow }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && /unique/i.test(error.message)
      ? "A workflow with that slug already exists."
      : "The workflow could not be created.";
    return Response.json({ error: message }, { status: 409 });
  }
}
