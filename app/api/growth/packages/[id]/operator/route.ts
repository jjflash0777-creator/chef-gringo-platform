import { advanceOperator, loadOperatorView } from "../../../../../../db/social-operator-repository.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../../../../../growth/social/types.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const view = await loadOperatorView(growthDb(), decodeURIComponent(id));
    return Response.json({ ...view, publishingEnabled: SOCIAL_PUBLISH_AVAILABLE });
  } catch (error) {
    return growthError(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = typeof body.action === "string" && body.action.trim() ? body.action.trim() : "advance";
    const result = await advanceOperator(growthDb(), decodeURIComponent(id), administrator.email, action);
    return Response.json({ ...result, publishingEnabled: SOCIAL_PUBLISH_AVAILABLE }, { status: 200 });
  } catch (error) {
    return growthError(error);
  }
}
