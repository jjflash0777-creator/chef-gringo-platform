import { getSocialPublicationPerformance } from "../../../../../../db/social-performance-repository.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../../../../../growth/social/index.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const params = new URL(request.url).searchParams;
    const windowName = params.get("window") || "since_publication";
    const asOf = params.get("asOf");
    // Optional asOf is a UTC instant for deterministic admin reporting.
    // The Growth Queue does not send it; the server clock is used instead.
    const report = await getSocialPublicationPerformance(
      growthDb(),
      decodeURIComponent(id),
      windowName,
      asOf && !Number.isNaN(Date.parse(asOf)) ? new Date(asOf).toISOString() : undefined,
    );
    return Response.json({
      report,
      publishingEnabled: SOCIAL_PUBLISH_AVAILABLE,
      platformReachConnected: false,
    });
  } catch (error) {
    const missing = error instanceof Error && /not found/i.test(error.message);
    if (missing) return Response.json({ error: error.message }, { status: 404 });
    return growthError(error);
  }
}
