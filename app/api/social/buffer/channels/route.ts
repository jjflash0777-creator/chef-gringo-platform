import { requireGrowthAdministrator, growthError } from "../../../growth/_shared.ts";
import { listBufferChannels } from "../../../../lib/buffer-api.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const channels = await listBufferChannels();
    return Response.json({ channels });
  } catch (error) {
    return growthError(error);
  }
}
