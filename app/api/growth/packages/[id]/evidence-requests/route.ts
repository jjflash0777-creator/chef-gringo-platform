import { createSocialEvidenceRequest, listSocialEvidenceRequests } from "../../../../../../db/social-evidence-request-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const requests = await listSocialEvidenceRequests(growthDb(), decodeURIComponent(id));
    return Response.json({ requests });
  } catch (error) {
    return growthError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const created = await createSocialEvidenceRequest(growthDb(), {
      slug: String(body.slug ?? ""),
      packageId: decodeURIComponent(id),
      opportunityId: typeof body.opportunityId === "string" ? body.opportunityId : null,
      question: String(body.question ?? ""),
      whyRequired: String(body.whyRequired ?? ""),
      preferredSourceType: typeof body.preferredSourceType === "string" ? body.preferredSourceType : null,
      createdBy: administrator.email,
    });
    return Response.json({ request: created }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
