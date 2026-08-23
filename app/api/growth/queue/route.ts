import { loadSocialGrowthQueue } from "../../../../db/social-growth-repository.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../../../growth/social/index.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../_shared.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const queue = await loadSocialGrowthQueue(growthDb());
    return Response.json({ ...queue, publishingEnabled: SOCIAL_PUBLISH_AVAILABLE });
  } catch (error) {
    return growthError(error);
  }
}
