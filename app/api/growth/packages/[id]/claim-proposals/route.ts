import { generateClaimProposals } from "../../../../../../db/social-claim-proposal-repository.ts";
import { socialPublishingAvailable } from "../../../../../growth/social/publishing-capability.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const generated = await generateClaimProposals(growthDb(), decodeURIComponent(id));
    return Response.json({ ...generated, publishingEnabled: socialPublishingAvailable() }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
