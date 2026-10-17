import { growthError, requireGrowthAdministrator } from "../../_shared.ts";
import { getChefGringoAiConfig } from "../../../../lib/ai/chefGringoRuntime.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;

  try {
    const config = getChefGringoAiConfig();
    return Response.json({
      configured: Boolean(config),
      source: config?.source ?? null,
      model: config?.model ?? null,
      baseUrlHost: config ? new URL(config.baseUrl).host : null,
      hasApiKey: Boolean(config?.apiKey),
    });
  } catch (error) {
    return growthError(error);
  }
}
