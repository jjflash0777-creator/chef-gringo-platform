import { generateClaimProposals } from "../../../../../../db/social-claim-proposal-repository.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../../../../../growth/social/types.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const generated = await generateClaimProposals(growthDb(), decodeURIComponent(id));
    return Response.json({ ...generated, publishingEnabled: SOCIAL_PUBLISH_AVAILABLE }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
