import { prepareManualSocialPublication } from "../../../../../db/social-growth-repository.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../../../../growth/social/index.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!String(body.slug ?? "").trim()) {
      return Response.json({ error: "A publication slug is required so the tracked URL stays stable." }, { status: 400 });
    }
    const prepared = await prepareManualSocialPublication(growthDb(), {
      slug: String(body.slug),
      packageId: String(body.packageId ?? ""),
      variantId: String(body.variantId ?? ""),
      channel: typeof body.channel === "string" ? body.channel : undefined,
      actorEmail: administrator.email,
      destinationUrlId: typeof body.destinationUrlId === "string" ? body.destinationUrlId : null,
    });
    return Response.json({
      ...prepared,
      publishingEnabled: SOCIAL_PUBLISH_AVAILABLE,
    }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
