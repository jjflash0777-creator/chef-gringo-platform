import { mintSocialDestinationUrl } from "../../../growth/social/index.ts";
import { growthError, requireGrowthAdministrator } from "../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const destination = mintSocialDestinationUrl({
      pathOrUrl: String(body.pathOrUrl ?? ""),
      channel: String(body.channel ?? ""),
      packageId: String(body.packageId ?? ""),
      variantId: String(body.variantId ?? ""),
      publicationId: typeof body.publicationId === "string" && body.publicationId.trim() ? body.publicationId.trim() : undefined,
    });
    return Response.json({ destination, publishingEnabled: false });
  } catch (error) {
    return growthError(error);
  }
}
