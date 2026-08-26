import {
  assertSocialEvidenceRef,
  claimMaySupportApproval,
  type ReferencedEvidenceState,
  type SocialEvidenceRef,
} from "../app/growth/social/claims.ts";
import type { SocialChannel } from "../app/growth/social/channels.ts";
import type {
  SocialApproval,
  SocialContentOpportunity,
  SocialContentPackage,
} from "../app/growth/social/types.ts";
import type { D1DatabaseLike, D1PreparedStatementLike } from "./index.ts";

/**
 * Cycle-free Growth persistence reads. Live search, evidence-request writes,
 * and Evidence Intelligence must not import social-growth-repository, or Vite
 * rewrites the queue's dynamic imports onto the Worker entry module.
 */

type Persisted<T> = T & { createdAt: string; updatedAt: string };

async function first<T>(statement: D1PreparedStatementLike) {
  return statement.first<T>();
}

const parseJson = <T>(value: string, fallback: T): T => {
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export async function resolveSocialEvidence(db: D1DatabaseLike, ref: SocialEvidenceRef): Promise<ReferencedEvidenceState> {
  assertSocialEvidenceRef(ref);
  if (ref.kind === "knowledge_source") {
    const row = await first<{ verificationStatus: string }>(
      db.prepare("SELECT verification_status AS verificationStatus FROM sources WHERE id = ?").bind(Number(ref.id)),
    );
    return row ? { exists: true, verificationStatus: row.verificationStatus } : { exists: false };
  }
  if (ref.kind === "workflow_source") {
    const row = await first<{ verificationStatus: string }>(
      db.prepare(`
        SELECT sources.verification_status AS verificationStatus
        FROM workflow_sources
        JOIN sources ON sources.id = workflow_sources.source_id
        WHERE workflow_sources.id = ?
      `).bind(Number(ref.id)),
    );
    return row ? { exists: true, verificationStatus: row.verificationStatus } : { exists: false };
  }
  if (ref.kind === "corpus_document") {
    const row = await first<{ ingestionStatus: string; productionExposure: number | boolean }>(
      db.prepare("SELECT ingestion_status AS ingestionStatus, production_exposure AS productionExposure FROM corpus_documents WHERE id = ?").bind(ref.id),
    );
    return row
      ? { exists: true, ingestionStatus: row.ingestionStatus, productionExposure: Boolean(row.productionExposure) }
      : { exists: false };
  }
  const row = await first<{ documentId: string }>(
    db.prepare("SELECT document_id AS documentId FROM corpus_citations WHERE id = ?").bind(Number(ref.id)),
  );
  if (!row) return { exists: false };
  return resolveSocialEvidence(db, { kind: "corpus_document", id: row.documentId });
}

export async function getContentOpportunity(db: D1DatabaseLike, id: string) {
  const row = await first<Persisted<SocialContentOpportunity>>(
    db.prepare(`
      SELECT id, slug, problem, audience, usefulness_test AS usefulnessTest, product_id AS productId,
             workflow_id AS workflowId, partner_opportunity_id AS partnerOpportunityId, status,
             created_at AS createdAt, updated_at AS updatedAt
      FROM social_content_opportunities WHERE id = ?
    `).bind(id),
  );
  return row ?? null;
}

export async function getContentPackage(db: D1DatabaseLike, id: string) {
  const row = await first<Persisted<SocialContentPackage>>(
    db.prepare(`
      SELECT id, slug, opportunity_id AS opportunityId, thesis, usefulness_test AS usefulnessTest,
             commercial_posture AS commercialPosture, status, created_at AS createdAt, updated_at AS updatedAt
      FROM social_content_packages WHERE id = ?
    `).bind(id),
  );
  return row ?? null;
}

export async function listClaimEvidence(db: D1DatabaseLike, claimId: string): Promise<SocialEvidenceRef[]> {
  const rows = (await db.prepare(`
    SELECT evidence_kind AS kind, evidence_id AS id FROM social_claim_evidence WHERE claim_id = ? ORDER BY attached_at ASC, id ASC
  `).bind(claimId).all<{ kind: SocialEvidenceRef["kind"]; id: string }>()).results;
  const unique: SocialEvidenceRef[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.kind}:${row.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ kind: row.kind, id: row.id });
  }
  return unique;
}

export async function getPackageClaim(db: D1DatabaseLike, id: string) {
  const row = await first<{
    id: string;
    packageId: string;
    claimText: string;
    evidenceKind: SocialEvidenceRef["kind"];
    evidenceId: string;
    safetySensitive: number | boolean;
    createdAt: string;
    updatedAt: string;
  }>(
    db.prepare(`
      SELECT id, package_id AS packageId, claim_text AS claimText, evidence_kind AS evidenceKind,
             evidence_id AS evidenceId, safety_sensitive AS safetySensitive,
             created_at AS createdAt, updated_at AS updatedAt
      FROM social_package_claims WHERE id = ?
    `).bind(id),
  );
  if (!row) return null;
  const evidenceRefs = await listClaimEvidence(db, row.id);
  const evidence = evidenceRefs[0] ?? { kind: row.evidenceKind, id: row.evidenceId };
  return {
    ...row,
    safetySensitive: Boolean(row.safetySensitive),
    evidence,
    evidenceRefs: evidenceRefs.length ? evidenceRefs : [evidence],
  };
}

export async function listPackageClaims(db: D1DatabaseLike, packageId: string) {
  const rows = (await db.prepare(`
    SELECT id FROM social_package_claims WHERE package_id = ? ORDER BY created_at ASC
  `).bind(packageId).all<{ id: string }>()).results;
  const claims = [];
  for (const row of rows) {
    const claim = await getPackageClaim(db, row.id);
    if (claim) claims.push(claim);
  }
  return claims;
}

export async function listChannelVariants(db: D1DatabaseLike, packageId?: string) {
  const statement = packageId
    ? db.prepare(`
        SELECT id, package_id AS packageId, channel, copy, asset_ids AS assetIds,
               destination_url_id AS destinationUrlId, created_at AS createdAt, updated_at AS updatedAt
        FROM social_channel_variants WHERE package_id = ? ORDER BY channel ASC
      `).bind(packageId)
    : db.prepare(`
        SELECT id, package_id AS packageId, channel, copy, asset_ids AS assetIds,
               destination_url_id AS destinationUrlId, created_at AS createdAt, updated_at AS updatedAt
        FROM social_channel_variants ORDER BY package_id ASC, channel ASC
      `);
  const rows = (await statement.all<{
    id: string;
    packageId: string;
    channel: SocialChannel;
    copy: string;
    assetIds: string;
    destinationUrlId: string | null;
    createdAt: string;
    updatedAt: string;
  }>()).results;
  return rows.map((row) => ({ ...row, assetIds: parseJson<string[]>(row.assetIds, []) }));
}

export async function listSocialApprovals(db: D1DatabaseLike, subjectId?: string) {
  const statement = subjectId
    ? db.prepare(`
        SELECT id, subject_kind AS subjectKind, subject_id AS subjectId, decision, actor_email AS actorEmail,
               reason, occurred_at AS occurredAt, created_at AS createdAt
        FROM social_approvals WHERE subject_id = ? ORDER BY occurred_at DESC
      `).bind(subjectId)
    : db.prepare(`
        SELECT id, subject_kind AS subjectKind, subject_id AS subjectId, decision, actor_email AS actorEmail,
               reason, occurred_at AS occurredAt, created_at AS createdAt
        FROM social_approvals ORDER BY occurred_at DESC
      `);
  return (await statement.all<SocialApproval & { createdAt: string }>()).results;
}

export async function evaluatePackageApprovalGate(db: D1DatabaseLike, packageId: string) {
  const claims = await listPackageClaims(db, packageId);
  const blockers: string[] = [];
  if (!claims.length) blockers.push("A package cannot be approved without at least one evidenced claim.");
  const claimStates = [];
  for (const claim of claims) {
    const referenced = await resolveSocialEvidence(db, claim.evidence);
    const approvable = claimMaySupportApproval({ safetySensitive: claim.safetySensitive, referenced });
    if (!approvable) {
      blockers.push(claim.safetySensitive
        ? `Safety-sensitive claim “${claim.claimText}” lacks verified or accepted public evidence.`
        : `Claim “${claim.claimText}” is missing its referenced evidence.`);
    }
    claimStates.push({ claim, referenced, approvable });
  }
  return { blockers, claims: claimStates, canApprove: blockers.length === 0 };
}
