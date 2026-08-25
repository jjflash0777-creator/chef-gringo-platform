import { submitResearchCandidatesForReview } from "../../../../../../db/social-research-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const candidateIds = Array.isArray(body.candidateIds) ? body.candidateIds.filter((item): item is string => typeof item === "string") : [];
    const result = await submitResearchCandidatesForReview(growthDb(), {
      runId: decodeURIComponent(id),
      candidateIds,
      actorEmail: administrator.email,
    });
    return Response.json({ ...result, publishingEnabled: false }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
