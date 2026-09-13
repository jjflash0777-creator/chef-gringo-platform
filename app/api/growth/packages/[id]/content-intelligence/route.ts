import { SOCIAL_PUBLISH_AVAILABLE } from "../../../../../../app/growth/social/types.ts";
import { buildPackageContentIntelligence } from "../../../../../../db/social-content-intelligence.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

async function respond(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response, administrator } = requireGrowthAdministrator(request);
  if (response) return response;
  void administrator;
  try {
    const { id } = await context.params;
    const contentIntelligence = await buildPackageContentIntelligence(growthDb(), decodeURIComponent(id));
    if (!contentIntelligence) return Response.json({ error: "Package not found." }, { status: 404 });
    return Response.json({
      contentIntelligence,
      publishingEnabled: SOCIAL_PUBLISH_AVAILABLE,
    });
  } catch (error) {
    return growthError(error);
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return respond(request, context);
}
