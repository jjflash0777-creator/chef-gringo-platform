import type { SocialEvidenceRequest } from "../app/growth/social/evidence-requests.ts";
import type { D1DatabaseLike } from "./index.ts";

/**
 * Cycle-free evidence-request listing. Write/intake stays in
 * social-evidence-request-repository so the Growth Queue loader cannot be
 * rewritten onto the Worker entry module.
 */

type RequestRow = {
  id: string;
  packageId: string;
  opportunityId: string | null;
  question: string;
  whyRequired: string;
  preferredSourceType: string | null;
  status: SocialEvidenceRequest["status"];
  createdBy: string;
  candidateDocumentId: string | null;
  resolvedKind: string | null;
  resolvedId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const select = `
  SELECT id, package_id AS packageId, opportunity_id AS opportunityId, question,
         why_required AS whyRequired, preferred_source_type AS preferredSourceType,
         status, created_by AS createdBy, candidate_document_id AS candidateDocumentId,
         resolved_kind AS resolvedKind, resolved_id AS resolvedId, notes,
         created_at AS createdAt, updated_at AS updatedAt
  FROM social_evidence_requests
`;

function hydrate(row: RequestRow): SocialEvidenceRequest {
  return {
    id: row.id,
    packageId: row.packageId,
    opportunityId: row.opportunityId,
    question: row.question,
    whyRequired: row.whyRequired,
    preferredSourceType: row.preferredSourceType as SocialEvidenceRequest["preferredSourceType"],
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    candidateDocumentId: row.candidateDocumentId,
    notes: row.notes,
    resolvedEvidence: row.resolvedKind && row.resolvedId
      ? { kind: row.resolvedKind as NonNullable<SocialEvidenceRequest["resolvedEvidence"]>["kind"], id: row.resolvedId }
      : null,
  };
}

export async function getSocialEvidenceRequest(db: D1DatabaseLike, id: string) {
  const row = await db.prepare(`${select} WHERE id = ?`).bind(id).first<RequestRow>();
  return row ? hydrate(row) : null;
}

export async function listSocialEvidenceRequests(db: D1DatabaseLike, packageId?: string) {
  const statement = packageId
    ? db.prepare(`${select} WHERE package_id = ? ORDER BY created_at ASC`).bind(packageId)
    : db.prepare(`${select} ORDER BY created_at ASC`);
  return (await statement.all<RequestRow>()).results.map(hydrate);
}
