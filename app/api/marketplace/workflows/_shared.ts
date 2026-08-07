import { getD1Binding } from "../../../../db/index.ts";
import { getWorkflowBundle } from "../../../../db/knowledge-core-repository.ts";
import {
  authorizeMarketplaceRequest,
  marketplaceAuthorizationResponse,
} from "../../../lib/marketplace-permissions.ts";

export function workflowIdentifier(value: string) {
  return /^\d+$/.test(value) ? Number(value) : value;
}

export async function authorizedWorkflow(request: Request, id: string) {
  const editor = authorizeMarketplaceRequest(request);
  if (!editor) return { response: marketplaceAuthorizationResponse(request) };
  const db = getD1Binding();
  const bundle = await getWorkflowBundle(db, workflowIdentifier(id));
  if (!bundle) return { response: Response.json({ error: "Workflow not found." }, { status: 404 }) };
  return { editor, db, bundle };
}

export function safeWorkflowError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected workflow error.";
  if (/unique/i.test(message)) return Response.json({ error: "A workflow record with that unique value already exists." }, { status: 409 });
  if (/constraint|foreign key/i.test(message)) return Response.json({ error: "The requested workflow change violates a data-integrity rule." }, { status: 409 });
  return Response.json({ error: "The workflow change could not be completed." }, { status: 500 });
}
