import { requireGrowthAdministrator, growthError } from "../../../growth/_shared.ts";
import { listBufferChannels, pinterestBoardServiceId } from "../../../../lib/buffer-api.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const channels = await listBufferChannels();
    const pinterest = channels.find((channel) => channel.service.toLowerCase() === "pinterest") ?? null;
    const pinterestBoard = pinterest
      ? await pinterestBoardServiceId(pinterest.id)
          .then((serviceId) => ({ ok: true, serviceId }))
          .catch((error) => ({
            ok: false,
            error: error instanceof Error ? error.message : "Pinterest board resolution failed.",
          }))
      : { ok: false, error: "Pinterest channel is not connected." };

    return Response.json({
      channels: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        service: channel.service,
      })),
      pinterestBoard,
      readOnly: true,
    });
  } catch (error) {
    return growthError(error);
  }
}
