import { attachClaimEvidence } from "../../../../../../../../db/social-growth-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string; claimId: string }> }) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  try {
    const { claimId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const evidence = body.evidence && typeof body.evidence === "object" ? body.evidence as { kind?: string; id?: string } : {};
    const claim = await attachClaimEvidence(growthDb(), {
      claimId: decodeURIComponent(claimId),
      evidence: { kind: evidence.kind as never, id: String(evidence.id ?? "") },
      attachedBy: administrator.email,
    });
    return Response.json({ claim }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
