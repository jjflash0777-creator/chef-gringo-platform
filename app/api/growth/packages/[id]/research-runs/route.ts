import { runBoundedCandidateDiscovery } from "../../../../../../db/social-research-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const run = await runBoundedCandidateDiscovery(growthDb(), {
      slug: typeof body.slug === "string" && body.slug.trim() ? body.slug : undefined,
      packageId: decodeURIComponent(id),
      claimId: typeof body.claimId === "string" ? body.claimId : null,
      evidenceRequestId: typeof body.evidenceRequestId === "string" ? body.evidenceRequestId : null,
      actorEmail: administrator.email,
    });
    return Response.json({ run, liveRetrieval: false, publishingEnabled: false }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
