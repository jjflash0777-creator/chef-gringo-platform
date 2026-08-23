import { createContentOpportunity, listContentOpportunities } from "../../../../db/social-growth-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../_shared.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    return Response.json({ opportunities: await listContentOpportunities(growthDb()) });
  } catch (error) {
    return growthError(error);
  }
}

export async function POST(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const opportunity = await createContentOpportunity(growthDb(), {
      slug: String(body.slug ?? ""),
      problem: String(body.problem ?? ""),
      audience: body.audience as "home_cook" | "independent_operator" | "both",
      usefulnessTest: String(body.usefulnessTest ?? ""),
      productId: typeof body.productId === "string" && body.productId.trim() ? body.productId.trim() : null,
      workflowId: typeof body.workflowId === "number" ? body.workflowId : body.workflowId ? Number(body.workflowId) : null,
      partnerOpportunityId: typeof body.partnerOpportunityId === "string" && body.partnerOpportunityId.trim() ? body.partnerOpportunityId.trim() : null,
      status: (body.status as "open" | "selected" | "discarded") || "open",
    });
    return Response.json({ opportunity }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
