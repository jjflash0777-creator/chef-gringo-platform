import { createContentPackage } from "../../../../db/social-growth-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const body = await request.json() as Record<string, unknown>;
    if ("status" in body) return Response.json({ error: "Package status can only change through an approval record." }, { status: 400 });
    const pkg = await createContentPackage(growthDb(), {
      slug: String(body.slug ?? ""),
      opportunityId: String(body.opportunityId ?? ""),
      thesis: String(body.thesis ?? ""),
      usefulnessTest: String(body.usefulnessTest ?? ""),
      commercialPosture: body.commercialPosture as "none" | "informational" | "pending" | "affiliate",
    });
    return Response.json({ package: pkg }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
