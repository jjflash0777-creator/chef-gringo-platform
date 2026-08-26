import { buildContentIntelligence, type ContentIntelligenceWorkspace } from "../app/growth/social/content-intelligence.ts";
import type { SocialPerformanceEvent } from "../app/growth/social/performance.ts";
import { SOCIAL_PUBLISH_AVAILABLE } from "../app/growth/social/types.ts";
import type { D1DatabaseLike } from "./index.ts";
import { buildPackageEvidenceIntelligence } from "./social-evidence-intelligence.ts";
import { getContentOpportunity, getContentPackage, listChannelVariants } from "./social-growth-read.ts";
import { listResearchRuns } from "./social-research-read.ts";

/**
 * Assemble Content Intelligence from existing Growth and first-party tables.
 * Cycle-free: does not import social-growth-repository.
 * Does not persist drafts, accept evidence, or publish.
 */
export async function buildPackageContentIntelligence(
  db: D1DatabaseLike,
  packageId: string,
): Promise<ContentIntelligenceWorkspace | null> {
  if (SOCIAL_PUBLISH_AVAILABLE !== false) throw new Error("Content Intelligence cannot run while publishing is enabled.");
  const pkg = await getContentPackage(db, packageId);
  if (!pkg) return null;
  const opportunity = await getContentOpportunity(db, pkg.opportunityId);
  if (!opportunity) return null;
  const intelligence = await buildPackageEvidenceIntelligence(db, packageId);
  if (!intelligence) return null;
  const variants = await listChannelVariants(db, packageId);
  const destinations = await listPackageDestinations(db, packageId);
  const publications = await listPackagePublications(db, packageId);
  const liveCandidates = await listLiveCandidates(db, packageId);
  const events = await listPackageCommercialEvents(db, packageId);
  return buildContentIntelligence({
    opportunity,
    package: pkg,
    intelligence,
    variants,
    destinations,
    publications,
    liveCandidates,
    events,
  });
}

async function listPackageDestinations(db: D1DatabaseLike, packageId: string) {
  const rows = (await db.prepare(`
    SELECT variant_id AS variantId, href, path
    FROM social_destination_urls
    WHERE package_id = ?
    ORDER BY channel ASC
  `).bind(packageId).all<{ variantId: string; href: string; path: string }>()).results;
  return rows;
}

async function listPackagePublications(db: D1DatabaseLike, packageId: string) {
  const rows = (await db.prepare(`
    SELECT id, channel, variant_id AS variantId
    FROM social_publications
    WHERE package_id = ?
    ORDER BY recorded_at DESC
  `).bind(packageId).all<{ id: string; channel: string; variantId: string }>()).results;
  return rows;
}

async function listLiveCandidates(db: D1DatabaseLike, packageId: string) {
  const runs = await listResearchRuns(db, packageId);
  return runs.flatMap((run) => run.candidates.map((candidate) => ({
    canonicalUrl: candidate.canonicalUrl,
    relationship: candidate.relationship,
    submittedDocumentId: candidate.submittedDocumentId,
    proposedForReview: candidate.proposedForReview,
    ingestionStatus: candidate.submittedDocumentId ? "awaiting_review" : null,
  })));
}

async function listPackageCommercialEvents(db: D1DatabaseLike, packageId: string): Promise<SocialPerformanceEvent[]> {
  const rows = (await db.prepare(`
    SELECT id, event_type AS eventType, occurred_at AS occurredAt, campaign_id AS campaignId,
           content_id AS contentId, anonymous_session_id AS anonymousSessionId,
           monetary_amount_cents AS monetaryAmountCents, commission_amount_cents AS commissionAmountCents,
           channel, metadata
    FROM commercial_events
    WHERE campaign_id = ?
       OR json_extract(metadata, '$.attribution.campaignId') = ?
    ORDER BY occurred_at ASC
  `).bind(packageId, packageId).all<SocialPerformanceEvent & { metadata: string; channel?: string | null }>()).results;
  return rows.map((row) => ({
    ...row,
    metadata: parseMetadata(row.metadata),
  }));
}

function parseMetadata(value: string) {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}
