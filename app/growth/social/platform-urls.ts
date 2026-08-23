import { assertSocialChannel, type SocialChannel } from "./channels.ts";

export const SOCIAL_PLATFORM_HOSTS = {
  facebook: ["facebook.com", "www.facebook.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  pinterest: ["pinterest.com", "www.pinterest.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
} as const;

const UNSAFE_PROTOCOL = /^(javascript|data|file|blob|ftp|ws|wss):/i;

/**
 * Query keys that are the post identity, not tracking. All other query
 * parameters are ignored for duplicate comparison. Path-based permalinks
 * (Instagram /p/, Pinterest /pin/, TikTok /video/, Facebook /posts/)
 * do not keep query parameters.
 */
const FACEBOOK_IDENTITY_QUERY_KEYS: Record<string, readonly string[]> = {
  "permalink.php": ["story_fbid", "id"],
  "story.php": ["story_fbid", "id"],
  "photo.php": ["fbid", "id"],
  watch: ["v"],
};

export type ParsedPlatformPostUrl = {
  href: string;
  identity: string;
  channel: SocialChannel;
  hostname: string;
};

/**
 * Conservative local validation only. Does not fetch, scrape, or confirm
 * that the post exists on the platform.
 */
export function parsePlatformPostUrl(value: string, channel: SocialChannel | string): ParsedPlatformPostUrl {
  const expected = assertSocialChannel(channel);
  const raw = value.trim();
  if (!raw) throw new Error("A live platform post URL is required.");
  if (raw.length > 2000) throw new Error("Platform post URL is too long.");
  if (raw.startsWith("//") || UNSAFE_PROTOCOL.test(raw)) {
    throw new Error("Platform post URLs cannot use an unsafe protocol.");
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Platform post URL is malformed.");
  }
  if (parsed.username || parsed.password) throw new Error("Platform post URLs cannot include credentials.");
  if (parsed.protocol !== "https:") throw new Error("Platform post URLs must use https.");
  if (parsed.port && parsed.port !== "443") throw new Error("Platform post URLs cannot use a custom port.");
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname.includes(":") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    throw new Error("Platform post URLs cannot use an IP address or malformed host.");
  }
  const allowed = SOCIAL_PLATFORM_HOSTS[expected] as readonly string[];
  if (!allowed.includes(hostname)) {
    const owner = Object.entries(SOCIAL_PLATFORM_HOSTS).find(([, hosts]) => (hosts as readonly string[]).includes(hostname));
    if (owner) throw new Error(`Platform post URL host does not match the ${expected} variant.`);
    throw new Error("Platform post URLs must use the matching Facebook, Instagram, Pinterest, or TikTok host.");
  }
  const identity = canonicalizePlatformPostIdentity(parsed, expected);
  return {
    href: identity,
    identity,
    channel: expected,
    hostname,
  };
}

export function canonicalizePlatformPostUrl(parsed: URL, channel?: SocialChannel | string) {
  return canonicalizePlatformPostIdentity(parsed, channel ? assertSocialChannel(channel) : inferChannelFromHost(parsed.hostname));
}

/**
 * Stable platform-post identity: https, apex host, collapsed path, no fragment.
 * Tracking/query parameters are dropped unless the path is a Facebook
 * query-identity permalink (story.php, permalink.php, photo.php, watch).
 */
export function canonicalizePlatformPostIdentity(parsed: URL, channel: SocialChannel) {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  let path = parsed.pathname.replace(/\/{2,}/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  const canonical = new URL(`https://${host}`);
  canonical.pathname = path || "/";
  for (const key of identityQueryKeys(channel, path)) {
    const value = parsed.searchParams.get(key);
    if (value) canonical.searchParams.set(key, value);
  }
  return canonical.toString();
}

function identityQueryKeys(channel: SocialChannel, path: string) {
  if (channel !== "facebook") return [];
  const leaf = path.toLowerCase().split("/").filter(Boolean).pop() ?? "";
  return FACEBOOK_IDENTITY_QUERY_KEYS[leaf] ?? [];
}

function inferChannelFromHost(hostname: string): SocialChannel {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (host === "facebook.com") return "facebook";
  if (host === "instagram.com") return "instagram";
  if (host === "pinterest.com") return "pinterest";
  if (host === "tiktok.com") return "tiktok";
  throw new Error("Platform post URLs must use the matching Facebook, Instagram, Pinterest, or TikTok host.");
}
