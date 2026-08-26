import { setClaimProposalStatus } from "../../../../../../../db/social-claim-proposal-repository.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../../../../../../growth/social/types.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; proposalId: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id, proposalId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const proposal = await setClaimProposalStatus(growthDb(), decodeURIComponent(proposalId), String(body.status ?? ""));
    if (proposal.packageId !== decodeURIComponent(id)) {
      throw new Error("Claim proposal does not belong to this package.");
    }
    return Response.json({ proposal, publishingEnabled: SOCIAL_PUBLISH_AVAILABLE });
  } catch (error) {
    return growthError(error);
  }
}
