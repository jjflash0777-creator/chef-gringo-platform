import { createContentAsset } from "../../../../db/social-growth-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const asset = await createContentAsset(growthDb(), {
      slug: String(body.slug ?? ""),
      assetType: body.assetType as never,
      altText: String(body.altText ?? ""),
      license: String(body.license ?? ""),
      provenanceNote: String(body.provenanceNote ?? ""),
      uri: typeof body.uri === "string" && body.uri.trim() ? body.uri.trim() : null,
    });
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
