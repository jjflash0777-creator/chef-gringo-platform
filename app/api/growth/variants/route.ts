import { createChannelVariant } from "../../../../db/social-growth-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const created = await createChannelVariant(growthDb(), {
      slug: String(body.slug ?? ""),
      packageId: String(body.packageId ?? ""),
      channel: body.channel as never,
      copy: String(body.copy ?? ""),
      assetIds: Array.isArray(body.assetIds) ? body.assetIds.filter((item): item is string => typeof item === "string") : [],
      destinationPath: String(body.destinationPath ?? ""),
    });
    return Response.json(created, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
