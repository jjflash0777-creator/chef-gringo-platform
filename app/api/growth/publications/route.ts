import { recordManualSocialPublication } from "../../../../db/social-growth-repository.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../../../growth/social/index.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.mode && body.mode !== "manual") {
      return Response.json({ error: "Step 2 only records manual publications. Chef Gringo does not post to the platform." }, { status: 400 });
    }
    if (!String(body.slug ?? "").trim()) {
      return Response.json({ error: "A publication slug is required so the publication id stays deterministic." }, { status: 400 });
    }
    const recorded = await recordManualSocialPublication(growthDb(), {
      slug: String(body.slug),
      packageId: String(body.packageId ?? ""),
      variantId: String(body.variantId ?? ""),
      channel: typeof body.channel === "string" ? body.channel : undefined,
      platformPostUrl: String(body.platformPostUrl ?? ""),
      platformPostId: typeof body.platformPostId === "string" ? body.platformPostId : null,
      publishedAt: String(body.publishedAt ?? ""),
      actorEmail: administrator.email,
      destinationUrlId: typeof body.destinationUrlId === "string" ? body.destinationUrlId : null,
    });
    return Response.json({
      ...recorded,
      publishingEnabled: SOCIAL_PUBLISH_AVAILABLE,
    }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
