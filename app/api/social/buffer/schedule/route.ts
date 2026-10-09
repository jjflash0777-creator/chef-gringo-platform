import { requireGrowthAdministrator, growthError } from "../../../growth/_shared.ts";
import { listBufferChannels, createBufferScheduledPost, pinterestBoardServiceId } from "../../../../lib/buffer-api.ts";
import { SOCIAL_CHANNELS, type SocialChannel } from "../../../../growth/social/channels.ts";
import { mintSocialDestinationUrl } from "../../../../growth/social/utm.ts";
import { socialGrowthId } from "../../../../growth/social/ids.ts";

export const dynamic = "force-dynamic";

type ChannelCopy = Partial<Record<SocialChannel, string>>;

function normalizeSlug(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!text) throw new Error("A campaign slug is required.");
  return text.slice(0, 80);
}

function parseDueAt(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || Number.isNaN(Date.parse(text))) throw new Error("A valid future dueAt timestamp is required.");
  const date = new Date(text);
  if (date.getTime() <= Date.now() + 60_000) throw new Error("dueAt must be at least one minute in the future.");
  return date.toISOString();
}

function assertPublicChefGringoMediaUrl(value: unknown) {
  const url = new URL(String(value ?? ""));
  if (url.protocol !== "https:") throw new Error("mediaUrl must use https.");
  if (!["chefgringo.com", "www.chefgringo.com"].includes(url.hostname.toLowerCase())) {
    throw new Error("mediaUrl must be hosted on chefgringo.com so Buffer has a stable public asset.");
  }
  return url.toString();
}

function requestedChannels(value: unknown): SocialChannel[] {
  if (!Array.isArray(value) || value.length === 0) return [...SOCIAL_CHANNELS];
  const values = value.map(String);
  const invalid = values.filter((item) => !(SOCIAL_CHANNELS as readonly string[]).includes(item));
  if (invalid.length) throw new Error(`Unsupported social channels: ${invalid.join(", ")}`);
  return [...new Set(values)] as SocialChannel[];
}

export async function POST(request: Request) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const slug = normalizeSlug(body.campaignSlug);
    const dueAt = parseDueAt(body.dueAt);
    const mediaUrl = assertPublicChefGringoMediaUrl(body.mediaUrl);
    const destinationPath = String(body.destinationPath ?? "").trim();
    const copies = (body.copy && typeof body.copy === "object" ? body.copy : {}) as ChannelCopy;
    const fallbackCopy = String(body.text ?? "").trim();
    const channelsWanted = requestedChannels(body.channels);
    const title = String(body.title ?? "Chef Gringo").trim();

    if (!destinationPath) throw new Error("destinationPath is required.");
    if (!fallbackCopy && channelsWanted.some((channel) => !String(copies[channel] ?? "").trim())) {
      throw new Error("Provide text or platform-specific copy for every requested channel.");
    }

    const available = await listBufferChannels();
    const byService = new Map(available.map((item) => [item.service.toLowerCase(), item]));
    const missing = channelsWanted.filter((channel) => !byService.has(channel));
    if (missing.length) throw new Error(`Buffer channels are not connected: ${missing.join(", ")}`);

    const packageId = socialGrowthId("package", slug);
    const scheduled: Array<{
      channel: SocialChannel;
      bufferPostId: string;
      dueAt: string | null;
      trackedHref: string;
    }> = [];

    for (const channel of channelsWanted) {
      const bufferChannel = byService.get(channel)!;
      const variantId = socialGrowthId("variant", `${slug}-${channel}`);
      const tracked = mintSocialDestinationUrl({
        pathOrUrl: destinationPath,
        channel,
        packageId,
        variantId,
      });
      const baseCopy = String(copies[channel] ?? fallbackCopy).trim();
      const text = channel === "instagram"
        ? `${baseCopy}\n\n${tracked.href}`
        : `${baseCopy}\n\n${tracked.href}`;

      let metadata: Record<string, unknown> | undefined;
      if (channel === "instagram") {
        metadata = { instagram: { type: "post", shouldShareToFeed: true } };
      } else if (channel === "pinterest") {
        const boardServiceId = await pinterestBoardServiceId(bufferChannel.id);
        metadata = {
          pinterest: {
            boardServiceId,
            title: title.slice(0, 100),
            url: tracked.href,
          },
        };
      }

      const post = await createBufferScheduledPost({
        channelId: bufferChannel.id,
        text,
        dueAt,
        mediaUrl,
        metadata,
      });

      scheduled.push({
        channel,
        bufferPostId: post.id,
        dueAt: post.dueAt,
        trackedHref: tracked.href,
      });
    }

    return Response.json({
      ok: true,
      actor: administrator.email,
      campaignSlug: slug,
      mediaUrl,
      destinationPath,
      scheduled,
    }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
