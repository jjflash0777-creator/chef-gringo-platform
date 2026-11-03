import { loadSocialGrowthQueue } from "../../../../db/social-growth-repository.ts";
import { socialPublishingAvailable } from "../../../growth/social/publishing-capability.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../_shared.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const queue = await loadSocialGrowthQueue(growthDb());
    return Response.json({ ...queue, publishingEnabled: socialPublishingAvailable() });
  } catch (error) {
    return growthError(error);
  }
}
