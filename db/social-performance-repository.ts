import {
  aggregateSocialPerformance,
  isSocialPerformanceWindow,
  type SocialPerformanceEvent,
  type SocialPerformanceWindow,
} from "../app/growth/social/index.ts";
import type { D1DatabaseLike } from "./index.ts";
import { getSocialPublication } from "./social-growth-repository.ts";

/**
 * Live first-party reporting. Reads commercial_events only.
 * Does not write events, snapshots, or production D1 by itself.
 */
export async function getSocialPublicationPerformance(
  db: D1DatabaseLike,
  publicationId: string,
  windowName: string,
  now?: string,
) {
  if (!isSocialPerformanceWindow(windowName)) throw new Error("Performance window must be since_publication, first_24h, first_7d, or first_30d.");
  const publication = await getSocialPublication(db, publicationId);
  if (!publication) throw new Error("Publication record not found.");
  if (publication.status !== "recorded" || !publication.publishedAt) {
    throw new Error("Performance is available after a publication is recorded with a published timestamp.");
  }
  const events = await listCandidateCommercialEvents(db, publication.id, publication.packageId, publication.variantId);
  return aggregateSocialPerformance({
    publication,
    events,
    window: windowName as SocialPerformanceWindow,
    now,
  });
}

async function listCandidateCommercialEvents(
  db: D1DatabaseLike,
  publicationId: string,
  packageId: string,
  variantId: string,
): Promise<SocialPerformanceEvent[]> {
  const rows = (await db.prepare(`
    SELECT id, event_type AS eventType, occurred_at AS occurredAt, campaign_id AS campaignId,
           content_id AS contentId, anonymous_session_id AS anonymousSessionId,
           monetary_amount_cents AS monetaryAmountCents, commission_amount_cents AS commissionAmountCents,
           metadata
    FROM commercial_events
    WHERE json_extract(metadata, '$.attribution.term') = ?
       OR json_extract(metadata, '$.attribution.content') = ?
       OR json_extract(metadata, '$.attribution.campaignId') = ?
       OR content_id = ?
       OR campaign_id = ?
  `).bind(publicationId, variantId, packageId, variantId, packageId)
    .all<SocialPerformanceEvent & { metadata: string }>()).results;
  return rows.map((row) => ({
    ...row,
    metadata: parseMetadata(row.metadata),
  }));
}

function parseMetadata(value: string) {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}
