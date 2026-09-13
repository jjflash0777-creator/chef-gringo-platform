import { authorizeMarketplaceRequest, marketplaceAuthorizationResponse } from "../../lib/marketplace-permissions.ts";
import { getD1Binding } from "../../../db/index.ts";

export function requireGrowthAdministrator(request: Request) {
  const administrator = authorizeMarketplaceRequest(request);
  if (!administrator) return { administrator: null, response: marketplaceAuthorizationResponse(request) };
  return { administrator, response: null };
}

export function growthError(error: unknown) {
  const unavailable = error instanceof Error && /binding.*unavailable/i.test(error.message);
  return Response.json(
    { error: unavailable ? "Social Growth persistence is not configured." : error instanceof Error ? error.message : "The Social Growth request failed." },
    { status: unavailable ? 503 : 400 },
  );
}

export function growthDb() {
  return getD1Binding();
}

export function rejectBulkApproval(body: unknown) {
  if (Array.isArray(body)) return Response.json({ error: "Bulk approval is not allowed." }, { status: 400 });
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (Array.isArray(record.approvals) || Array.isArray(record.subjectIds) || record.approveAll === true) {
      return Response.json({ error: "Bulk approval is not allowed." }, { status: 400 });
    }
  }
  return null;
}
