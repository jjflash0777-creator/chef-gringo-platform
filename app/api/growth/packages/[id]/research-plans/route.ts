import { buildPackageResearchPlans } from "../../../../../../db/social-research-repository.ts";
import { liveCandidateDiscoveryAvailable, candidateDiscoveryCapability } from "../../../../../growth/social/candidate-discovery-capability.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const payload = await buildPackageResearchPlans(growthDb(), decodeURIComponent(id));
    if (!payload) return Response.json({ error: "Package not found." }, { status: 404 });
    return Response.json({
      plans: payload.plans,
      liveDiscoveryAvailable: liveCandidateDiscoveryAvailable(),
      discoveryCapability: candidateDiscoveryCapability(),
      publishingEnabled: false,
    });
  } catch (error) {
    return growthError(error);
  }
}
