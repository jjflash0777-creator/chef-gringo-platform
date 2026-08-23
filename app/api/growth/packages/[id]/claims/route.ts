import { addPackageClaim } from "../../../../../../db/social-growth-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const evidence = body.evidence && typeof body.evidence === "object" ? body.evidence as { kind?: string; id?: string } : {};
    const claim = await addPackageClaim(growthDb(), {
      slug: String(body.slug ?? ""),
      packageId: decodeURIComponent(id),
      claimText: String(body.claimText ?? ""),
      evidence: { kind: evidence.kind as never, id: String(evidence.id ?? "") },
      safetySensitive: body.safetySensitive === true,
    });
    return Response.json({ claim }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
