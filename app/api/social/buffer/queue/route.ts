import { requireGrowthAdministrator, growthError } from "../../../growth/_shared.ts";
import { listBufferChannels, listScheduledBufferPosts } from "../../../../lib/buffer-api.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { response } = requireGrowthAdministrator(request);
  if (response) return response;
  try {
    const channels = await listBufferChannels();
    const channelIds = channels.map((channel) => channel.id);
    const posts = await listScheduledBufferPosts(channelIds);
    const byId = new Map(channels.map((channel) => [channel.id, channel]));
    return Response.json({
      channels,
      scheduled: posts.map((post) => ({
        ...post,
        channel: byId.get(post.channelId) ?? null,
      })),
    });
  } catch (error) {
    return growthError(error);
  }
}
