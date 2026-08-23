import { rejectSocialEvidenceRequest } from "../../../../../../db/social-evidence-request-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const rejected = await rejectSocialEvidenceRequest(growthDb(), decodeURIComponent(id), String(body.reason ?? ""));
    return Response.json({ request: rejected });
  } catch (error) {
    return growthError(error);
  }
}
