import { buildPackageEvidenceIntelligence } from "../../../../../../db/social-evidence-intelligence.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const intelligence = await buildPackageEvidenceIntelligence(growthDb(), decodeURIComponent(id));
    if (!intelligence) return Response.json({ error: "Package not found." }, { status: 404 });
    return Response.json({ intelligence, publishingEnabled: false });
  } catch (error) {
    return growthError(error);
  }
}
