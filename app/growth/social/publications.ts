import { assertActorEmail } from "./approvals.ts";
import { SOCIAL_UTM_MEDIUM, assertSocialChannel, type SocialChannel } from "./channels.ts";
import { socialGrowthId } from "./ids.ts";
import { parsePlatformPostUrl } from "./platform-urls.ts";
import { mintSocialDestinationUrl } from "./utm.ts";
import type { SocialPublication } from "./types.ts";

export const SOCIAL_PUBLICATION_MODE = "manual" as const;
export const SOCIAL_PUBLICATION_STATUSES = ["reserved", "recorded"] as const;
export type SocialPublicationStatus = typeof SOCIAL_PUBLICATION_STATUSES[number];

/**
 * Publication ID lifecycle:
 * 1. The administrator chooses a kebab slug before posting.
 * 2. The publication id is always sgo:publication:{slug} — never random,
 *    never minted from Date.now(), and unchanged by previewing the same slug.
 * 3. Prepare/reserve persists that id and the publication-specific tracked URL
 *    (utm_term=publicationId) so the human can copy it before posting.
 * 4. Completing the same slug writes the external permalink onto that row.
 * 5. A different slug is a different publication (intentional reshare).
 */
export function socialPublicationId(slug: string) {
  return socialGrowthId("publication", slug);
}

export type SocialPublicationAttribution = {
  packageId: string;
  variantId: string;
  publicationId: string;
  destinationUrlId: string;
  trackedHref: string;
  utmSource: SocialChannel;
  utmMedium: typeof SOCIAL_UTM_MEDIUM;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
};

export function assertManualPublicationMode(value: unknown) {
  if (value !== undefined && value !== null && value !== SOCIAL_PUBLICATION_MODE) {
    throw new Error("Step 2 only records manual publications. Chef Gringo does not post to the platform.");
  }
  return SOCIAL_PUBLICATION_MODE;
}

export function assertPublishedAt(value: string) {
  const text = value.trim();
  if (!text || Number.isNaN(Date.parse(text))) throw new Error("A valid published timestamp is required.");
  return new Date(text).toISOString();
}

export function normalizePlatformPostId(value: string | null | undefined) {
  if (value === undefined || value === null) return null;
  const text = value.trim();
  if (!text) return null;
  if (text.length > 200) throw new Error("Platform post id is too long.");
  return text;
}

export function mintPublicationTrackedUrl(input: {
  pathOrUrl: string;
  channel: SocialChannel | string;
  packageId: string;
  variantId: string;
  publicationId: string;
}) {
  return mintSocialDestinationUrl(input);
}

export function socialPublicationAttribution(input: {
  packageId: string;
  variantId: string;
  publicationId: string;
  destinationUrlId: string;
  trackedHref: string;
  channel: SocialChannel | string;
}): SocialPublicationAttribution {
  const channel = assertSocialChannel(input.channel);
  return {
    packageId: input.packageId,
    variantId: input.variantId,
    publicationId: input.publicationId,
    destinationUrlId: input.destinationUrlId,
    trackedHref: input.trackedHref,
    utmSource: channel,
    utmMedium: SOCIAL_UTM_MEDIUM,
    utmCampaign: input.packageId,
    utmContent: input.variantId,
    utmTerm: input.publicationId,
  };
}

export function createReservedPublicationDraft(input: {
  slug: string;
  packageId: string;
  variantId: string;
  channel: SocialChannel | string;
  destinationUrlId: string;
  trackedHref: string;
  actorEmail: string;
  reservedAt?: string;
}): Omit<SocialPublication, "id"> & { slug: string } {
  const channel = assertSocialChannel(input.channel);
  return {
    slug: input.slug,
    packageId: input.packageId,
    variantId: input.variantId,
    channel,
    mode: assertManualPublicationMode(SOCIAL_PUBLICATION_MODE),
    status: "reserved",
    platformPostId: null,
    platformPostUrl: null,
    destinationUrlId: input.destinationUrlId,
    trackedHref: input.trackedHref,
    publishedAt: null,
    recordedAt: input.reservedAt ?? new Date().toISOString(),
    actorEmail: assertActorEmail(input.actorEmail, "Publication records"),
  };
}

export function createManualPublicationDraft(input: {
  slug: string;
  packageId: string;
  variantId: string;
  channel: SocialChannel | string;
  platformPostUrl: string;
  platformPostId?: string | null;
  publishedAt: string;
  actorEmail: string;
  destinationUrlId: string;
  trackedHref: string;
  recordedAt?: string;
}): Omit<SocialPublication, "id"> & { slug: string } {
  const channel = assertSocialChannel(input.channel);
  const parsed = parsePlatformPostUrl(input.platformPostUrl, channel);
  return {
    slug: input.slug,
    packageId: input.packageId,
    variantId: input.variantId,
    channel,
    mode: assertManualPublicationMode(SOCIAL_PUBLICATION_MODE),
    status: "recorded",
    platformPostId: normalizePlatformPostId(input.platformPostId),
    platformPostUrl: parsed.identity,
    destinationUrlId: input.destinationUrlId,
    trackedHref: input.trackedHref,
    publishedAt: assertPublishedAt(input.publishedAt),
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    actorEmail: assertActorEmail(input.actorEmail, "Publication records"),
  };
}
