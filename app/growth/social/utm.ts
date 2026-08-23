import { assertSocialGrowthId } from "./ids.ts";
import {
  assertSocialChannel,
  CHEF_GRINGO_CANONICAL_ORIGIN,
  CHEF_GRINGO_OWNED_HOSTS,
  SOCIAL_UTM_MEDIUM,
  type SocialChannel,
} from "./channels.ts";

const RESERVED_UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

export type MintSocialDestinationInput = {
  pathOrUrl: string;
  channel: SocialChannel | string;
  packageId: string;
  variantId: string;
  /** When set, utm_term is reserved and written to this publication id. */
  publicationId?: string;
};

export type MintedSocialDestination = {
  href: string;
  origin: typeof CHEF_GRINGO_CANONICAL_ORIGIN;
  pathname: string;
  channel: SocialChannel;
  packageId: string;
  variantId: string;
  publicationId: string | null;
  utmSource: SocialChannel;
  utmMedium: typeof SOCIAL_UTM_MEDIUM;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string | null;
  preservedParams: Record<string, string>;
  replacedUtmKeys: string[];
};

/**
 * Conflicting UTM rule (deterministic):
 * Reserved keys utm_source, utm_medium, utm_campaign, and utm_content are
 * always written to the social contract. Existing values for those four keys
 * are replaced, never duplicated. utm_term is reserved only when a
 * publicationId is supplied; otherwise it is preserved in original order.
 *
 * This module does not call canonicalizeUrl and does not change research
 * URL normalization. Research still strips UTMs; social minting keeps them.
 */
export function mintSocialDestinationUrl(input: MintSocialDestinationInput): MintedSocialDestination {
  const channel = assertSocialChannel(input.channel);
  assertSocialGrowthId("package", input.packageId);
  assertSocialGrowthId("variant", input.variantId);
  if (input.publicationId) assertSocialGrowthId("publication", input.publicationId);
  const reserved = input.publicationId
    ? [...RESERVED_UTM_KEYS, "utm_term"]
    : [...RESERVED_UTM_KEYS];
  const parsed = parseChefGringoDestination(input.pathOrUrl);
  const preserved = new URLSearchParams();
  const replacedUtmKeys: string[] = [];
  for (const [key, value] of parsed.searchParams.entries()) {
    if (reserved.includes(key.toLowerCase())) {
      replacedUtmKeys.push(key.toLowerCase());
      continue;
    }
    preserved.append(key, value);
  }
  const minted = new URL(CHEF_GRINGO_CANONICAL_ORIGIN);
  minted.pathname = parsed.pathname;
  for (const [key, value] of preserved.entries()) minted.searchParams.append(key, value);
  minted.searchParams.set("utm_source", channel);
  minted.searchParams.set("utm_medium", SOCIAL_UTM_MEDIUM);
  minted.searchParams.set("utm_campaign", input.packageId);
  minted.searchParams.set("utm_content", input.variantId);
  if (input.publicationId) minted.searchParams.set("utm_term", input.publicationId);
  const preservedParams = Object.fromEntries(preserved.entries());
  return {
    href: minted.toString(),
    origin: CHEF_GRINGO_CANONICAL_ORIGIN,
    pathname: minted.pathname,
    channel,
    packageId: input.packageId,
    variantId: input.variantId,
    publicationId: input.publicationId ?? null,
    utmSource: channel,
    utmMedium: SOCIAL_UTM_MEDIUM,
    utmCampaign: input.packageId,
    utmContent: input.variantId,
    utmTerm: input.publicationId ?? null,
    preservedParams,
    replacedUtmKeys: [...new Set(replacedUtmKeys)],
  };
}

export function parseChefGringoDestination(pathOrUrl: string) {
  const raw = pathOrUrl.trim();
  if (!raw) throw new Error("A Chef Gringo destination path or URL is required.");
  if (raw.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(raw) === false && !raw.startsWith("/")) {
    throw new Error("Social destinations must be a Chef Gringo path or an https Chef Gringo URL.");
  }
  if (/^(javascript|data|file|blob|ftp|ws|wss):/i.test(raw)) {
    throw new Error("Social destinations cannot use an unsafe protocol.");
  }
  if (raw.startsWith("/")) {
    if (raw.startsWith("//") || raw.includes("\\")) {
      throw new Error("Social destinations cannot use protocol-relative or escaped paths.");
    }
    const constructed = new URL(raw, CHEF_GRINGO_CANONICAL_ORIGIN);
    return normalizeOwnedUrl(constructed);
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Social destination URL is malformed.");
  }
  return normalizeOwnedUrl(parsed);
}

function normalizeOwnedUrl(parsed: URL) {
  if (parsed.username || parsed.password) throw new Error("Social destinations cannot include credentials.");
  if (parsed.protocol !== "https:") throw new Error("Social destinations must use https.");
  const host = parsed.hostname.toLowerCase();
  if (!CHEF_GRINGO_OWNED_HOSTS.has(host)) {
    throw new Error("Social destinations must be Chef Gringo-owned URLs. Affiliate or merchant URLs cannot be minted as landing pages.");
  }
  let path = parsed.pathname.replace(/\/{2,}/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  const copy = new URL(CHEF_GRINGO_CANONICAL_ORIGIN);
  copy.pathname = path || "/";
  copy.search = parsed.search;
  return copy;
}

export { RESERVED_UTM_KEYS };
