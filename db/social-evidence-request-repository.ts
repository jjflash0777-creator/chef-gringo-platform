import {
  assertResolvedEvidenceRef,
  candidateStatusFromCorpus,
  createEvidenceRequestDraft,
  requestMayResolveFromCorpus,
  type SocialEvidenceRequest,
} from "../app/growth/social/index.ts";
import { ingestCorpusSource } from "../app/lib/research/ingest.ts";
import type { CulinaryDomain } from "../app/lib/research/source-policy.ts";
import type { D1DatabaseLike } from "./index.ts";
import { getCorpusDocument } from "./corpus-repository.ts";
import { getContentPackage, resolveSocialEvidence } from "./social-growth-repository.ts";

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

export async function createSocialEvidenceRequest(
  db: D1DatabaseLike,
  input: {
    slug: string;
    packageId: string;
    opportunityId?: string | null;
    question: string;
    whyRequired: string;
    preferredSourceType?: string | null;
    createdBy: string;
  },
) {
  const pkg = await getContentPackage(db, input.packageId);
  if (!pkg) throw new Error("Evidence requests must belong to an existing package.");
  const draft = createEvidenceRequestDraft({
    ...input,
    opportunityId: input.opportunityId ?? pkg.opportunityId,
  });
  await db.prepare(`
    INSERT INTO social_evidence_requests (
      id, package_id, opportunity_id, question, why_required, preferred_source_type,
      status, created_by, candidate_document_id, resolved_kind, resolved_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    draft.id,
    draft.packageId,
    draft.opportunityId,
    draft.question,
    draft.whyRequired,
    draft.preferredSourceType,
    draft.status,
    draft.createdBy,
    null,
    null,
    null,
    null,
  ).run();
  const created = await getSocialEvidenceRequest(db, draft.id);
  if (!created) throw new Error("Evidence request could not be loaded after insert.");
  return created;
}

export async function submitEvidenceRequestCandidate(
  db: D1DatabaseLike,
  input: {
    requestId: string;
    actorEmail: string;
    existingDocumentId?: string | null;
    title?: string;
    publisher?: string;
    canonicalUrl?: string | null;
    excerpt?: string;
    notes?: string;
    provenanceMethod?: string;
    evidenceDomain?: string;
    sourceType?: string;
    authorityTier?: number;
  },
) {
  const request = await getSocialEvidenceRequest(db, input.requestId);
  if (!request) throw new Error("Evidence request not found.");
  if (request.status === "resolved") throw new Error("A resolved evidence request cannot take a new candidate.");

  let documentId = input.existingDocumentId?.trim() || "";
  if (documentId) {
    const existing = await getCorpusDocument(db, documentId);
    if (!existing) throw new Error("Candidate must reference an existing corpus document.");
  } else {
    const ingested = await ingestCorpusSource(db, {
      title: String(input.title ?? ""),
      publisher: String(input.publisher ?? ""),
      evidenceDomain: (input.evidenceDomain ?? "equipment") as CulinaryDomain,
      sourceType: String(input.sourceType ?? "professional_practice"),
      authorityTier: (Number(input.authorityTier) || 2) as 1 | 2 | 3,
      canonicalUrl: input.canonicalUrl ?? null,
      mimeType: "text/plain",
      text: input.excerpt,
      actorEmail: input.actorEmail,
      provenanceMethod: input.provenanceMethod as never,
      verificationNotes: input.notes,
      claimScope: ["growth_evidence_candidate"],
    });
    documentId = ingested.document.id;
  }

  const document = await getCorpusDocument(db, documentId);
  if (!document) throw new Error("Candidate corpus document was not found after intake.");
  const status = candidateStatusFromCorpus(document.ingestionStatus);
  await db.prepare(`
    UPDATE social_evidence_requests
    SET candidate_document_id = ?, status = ?, notes = ?, resolved_kind = NULL, resolved_id = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(document.id, status, input.notes?.trim() || request.notes, request.id).run();
  const updated = await getSocialEvidenceRequest(db, request.id);
  if (!updated) throw new Error("Evidence request could not be loaded after candidate intake.");
  return { request: updated, document };
}

export async function resolveSocialEvidenceRequest(db: D1DatabaseLike, requestId: string) {
  const request = await getSocialEvidenceRequest(db, requestId);
  if (!request) throw new Error("Evidence request not found.");
  if (!request.candidateDocumentId) throw new Error("An evidence request cannot resolve without a corpus candidate.");
  const document = await getCorpusDocument(db, request.candidateDocumentId);
  if (!document) throw new Error("The candidate corpus document no longer exists.");
  if (document.ingestionStatus === "rejected") throw new Error("Rejected corpus documents cannot resolve a Growth evidence request.");
  if (!requestMayResolveFromCorpus(document.ingestionStatus)) {
    throw new Error("Only existing authorized corpus review can resolve an evidence request. Candidate remains unverified.");
  }
  const resolved = assertResolvedEvidenceRef({ kind: "corpus_document", id: document.id });
  const referenced = await resolveSocialEvidence(db, resolved);
  if (!referenced.exists) throw new Error("Resolved evidence must already exist in Chef Gringo.");
  await db.prepare(`
    UPDATE social_evidence_requests
    SET status = 'resolved', resolved_kind = ?, resolved_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(resolved.kind, resolved.id, request.id).run();
  const updated = await getSocialEvidenceRequest(db, request.id);
  if (!updated) throw new Error("Evidence request could not be loaded after resolve.");
  return updated;
}

export async function rejectSocialEvidenceRequest(db: D1DatabaseLike, requestId: string, reason: string) {
  const request = await getSocialEvidenceRequest(db, requestId);
  if (!request) throw new Error("Evidence request not found.");
  if (!reason.trim()) throw new Error("Rejecting an evidence request requires a reason.");
  await db.prepare(`
    UPDATE social_evidence_requests
    SET status = 'rejected', notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(reason.trim(), request.id).run();
  const updated = await getSocialEvidenceRequest(db, request.id);
  if (!updated) throw new Error("Evidence request could not be loaded after reject.");
  return updated;
}
