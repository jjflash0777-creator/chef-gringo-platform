import { updateContentOpportunity } from "../../../../../db/social-growth-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../_shared.ts";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const opportunity = await updateContentOpportunity(growthDb(), decodeURIComponent(id), {
      problem: typeof body.problem === "string" ? body.problem : undefined,
      audience: typeof body.audience === "string" ? body.audience as never : undefined,
      usefulnessTest: typeof body.usefulnessTest === "string" ? body.usefulnessTest : undefined,
      productId: body.productId === null || typeof body.productId === "string" ? body.productId as string | null : undefined,
      workflowId: body.workflowId === null || typeof body.workflowId === "number" || typeof body.workflowId === "string"
        ? (body.workflowId === null || body.workflowId === "" ? null : Number(body.workflowId))
        : undefined,
      partnerOpportunityId: body.partnerOpportunityId === null || typeof body.partnerOpportunityId === "string"
        ? (body.partnerOpportunityId ? String(body.partnerOpportunityId) : null)
        : undefined,
      status: typeof body.status === "string" ? body.status as never : undefined,
    });
    return Response.json({ opportunity });
  } catch (error) {
    return growthError(error);
  }
}
