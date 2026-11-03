import {
  getChannelVariant,
  getContentAsset,
  prepareApiSocialPublication,
  recordBufferScheduledPublication,
} from "../../../../../db/social-growth-repository.ts";
import {
  bufferPublishingConfigured,
  createBufferScheduledPost,
  findScheduledBufferPostByTrackedHref,
  listBufferChannels,
  listScheduledBufferPosts,
  pinterestBoardServiceId,
} from "../../../../lib/buffer-api.ts";
import { CHEF_GRINGO_CANONICAL_ORIGIN, type SocialChannel } from "../../../../growth/social/channels.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../_shared.ts";

export const dynamic = "force-dynamic";

function parseDueAt(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || Number.isNaN(Date.parse(text))) throw new Error("A valid future dueAt timestamp is required.");
  const date = new Date(text);
  if (date.getTime() <= Date.now() + 60_000) throw new Error("dueAt must be at least one minute in the future.");
  return date.toISOString();
}

function absoluteOwnedMediaUrl(uri: string) {
  const url = uri.startsWith("/") ? new URL(uri, CHEF_GRINGO_CANONICAL_ORIGIN) : new URL(uri);
  if (url.protocol !== "https:" || !["chefgringo.com", "www.chefgringo.com"].includes(url.hostname.toLowerCase())) {
    throw new Error("Social media assets must be stable HTTPS Chef Gringo production URLs.");
  }
  return url.toString();
}

function mediaForChannel(channel: SocialChannel, urls: string[]) {
  if (channel === "instagram" || channel === "facebook") return urls.slice(0, 10);
  return urls.slice(0, 1);
}

async function verifyMedia(urls: string[]) {
  for (const url of urls) {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) {
      throw new Error(`Production media is not reachable as an image: ${url}`);
    }
  }
}

export async function POST(request: Request) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  if (!bufferPublishingConfigured()) {
    return Response.json({ error: "Buffer publishing is not configured.", publishingEnabled: false }, { status: 503 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const packageId = String(body.packageId ?? "").trim();
    const variantId = String(body.variantId ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    const dueAt = parseDueAt(body.dueAt);
    if (!packageId || !variantId || !slug) throw new Error("packageId, variantId, and slug are required.");

    const db = growthDb();
    const reservation = await prepareApiSocialPublication(db, {
      slug,
      packageId,
      variantId,
      actorEmail: administrator.email,
    });
    const variant = await getChannelVariant(db, variantId);
    if (!variant) throw new Error("Approved channel variant could not be loaded.");

    const assets = [];
    for (const assetId of variant.assetIds) {
      const asset = await getContentAsset(db, assetId);
      if (!asset?.uri) throw new Error("Every scheduled asset must have a durable production URI.");
      assets.push(absoluteOwnedMediaUrl(asset.uri));
    }
    if (!assets.length) throw new Error("The approved variant has no production image assets.");
    const mediaUrls = mediaForChannel(variant.channel, assets);
    await verifyMedia(mediaUrls);

    const channels = await listBufferChannels();
    const bufferChannel = channels.find((item) => item.service.toLowerCase() === variant.channel);
    if (!bufferChannel) throw new Error(`Buffer channel is not connected: ${variant.channel}`);

    const trackedHref = reservation.attribution.trackedHref;
    const existing = await findScheduledBufferPostByTrackedHref({
      channelId: bufferChannel.id,
      trackedHref,
    });
    if (existing) {
      const ledger = await recordBufferScheduledPublication(db, {
        packageId,
        variantId,
        channel: variant.channel,
        bufferChannelId: bufferChannel.id,
        bufferPostId: existing.id,
        dueAt: existing.dueAt,
        status: "scheduled",
        queuedAt: new Date().toISOString(),
        actorEmail: administrator.email,
      });
      return Response.json({ ok: true, confirmed: true, alreadyExisted: true, post: existing, ledger }, { status: 200 });
    }

    let metadata: Record<string, unknown> | undefined;
    if (variant.channel === "facebook") metadata = { facebook: { type: "post" } };
    if (variant.channel === "instagram") metadata = { instagram: { type: "post", shouldShareToFeed: true } };
    if (variant.channel === "pinterest") {
      metadata = {
        pinterest: {
          boardServiceId: await pinterestBoardServiceId(bufferChannel.id),
          title: String(body.title ?? "Chef Gringo").slice(0, 100),
          url: trackedHref,
        },
      };
    }

    const text = `${variant.copy.trim()}\n\n${trackedHref}`;
    try {
      await createBufferScheduledPost({
        channelId: bufferChannel.id,
        text,
        dueAt,
        mediaUrls,
        metadata,
      });
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const recovered = await findScheduledBufferPostByTrackedHref({
        channelId: bufferChannel.id,
        trackedHref,
      }).catch(() => null);
      if (!recovered) throw error;
    }

    const queue = await listScheduledBufferPosts([bufferChannel.id]);
    const confirmed = queue.find((post) => post.text?.includes(trackedHref));
    if (!confirmed) {
      return Response.json({
        ok: false,
        confirmed: false,
        outcomeUncertain: true,
        error: "Buffer did not confirm the scheduled post in the queue. Inspect Buffer before retrying.",
      }, { status: 502 });
    }

    const ledger = await recordBufferScheduledPublication(db, {
      packageId,
      variantId,
      channel: variant.channel,
      bufferChannelId: bufferChannel.id,
      bufferPostId: confirmed.id,
      dueAt: confirmed.dueAt,
      status: "scheduled",
      queuedAt: new Date().toISOString(),
      actorEmail: administrator.email,
    });

    return Response.json({
      ok: true,
      confirmed: true,
      channel: variant.channel,
      bufferPostId: confirmed.id,
      dueAt: confirmed.dueAt,
      mediaUrls,
      trackedHref,
      ledger,
    }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
