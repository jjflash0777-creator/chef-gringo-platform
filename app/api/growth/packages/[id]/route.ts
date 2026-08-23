import { updateContentPackage } from "../../../../../db/social-growth-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../_shared.ts";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    if ("status" in body) return Response.json({ error: "Package status can only change through an approval record." }, { status: 400 });
    const pkg = await updateContentPackage(growthDb(), decodeURIComponent(id), {
      thesis: typeof body.thesis === "string" ? body.thesis : undefined,
      usefulnessTest: typeof body.usefulnessTest === "string" ? body.usefulnessTest : undefined,
      commercialPosture: typeof body.commercialPosture === "string" ? body.commercialPosture as never : undefined,
    });
    return Response.json({ package: pkg });
  } catch (error) {
    return growthError(error);
  }
}
