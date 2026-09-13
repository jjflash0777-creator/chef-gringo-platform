import { resolveSocialEvidenceRequest } from "../../../../../../db/social-evidence-request-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const resolved = await resolveSocialEvidenceRequest(growthDb(), decodeURIComponent(id));
    return Response.json({ request: resolved });
  } catch (error) {
    return growthError(error);
  }
}
