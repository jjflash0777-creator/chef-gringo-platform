import { growthError, requireGrowthAdministrator } from "../../_shared.ts";
import { generateGrowthFactoryPackage } from "../../../../growth/factory.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { response, administrator } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const destinationPath = String(body.destinationPath ?? "").trim();
    const imageUrl = String(body.imageUrl ?? "").trim();
    const title = String(body.title ?? "").trim();

    if (!destinationPath) return Response.json({ error: "destinationPath is required." }, { status: 400 });
    if (!imageUrl) return Response.json({ error: "imageUrl is required." }, { status: 400 });

    const pkg = await generateGrowthFactoryPackage({ title, destinationPath, imageUrl });
    return Response.json({ ok: true, actor: administrator.email, package: pkg });
  } catch (error) {
    return growthError(error);
  }
}
