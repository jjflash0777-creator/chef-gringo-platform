import type { D1DatabaseLike } from "./index.ts";
import type { CorpusChunk, CorpusDocument, CorpusHit, CorpusVersion, IngestionStatus } from "../app/lib/research/corpus-types.ts";

function nowIso() {
  return new Date().toISOString();
}

async function first<T>(db: D1DatabaseLike, query: string, ...binds: unknown[]) {
  return db.prepare(query).bind(...binds).first<T>();
}

async function all<T>(db: D1DatabaseLike, query: string, ...binds: unknown[]) {
  return (await db.prepare(query).bind(...binds).all<T>()).results;
}

const documentSelect = `SELECT id, canonical_url AS canonicalUrl, title, publisher,
  evidence_domain AS evidenceDomain, source_type AS sourceType, authority_tier AS authorityTier,
  jurisdiction, published_date AS publishedDate, revision_date AS revisionDate,
  retrieved_date AS retrievedDate, last_validated_date AS lastValidatedDate, mime_type AS mimeType,
  licensing_notes AS licensingNotes, ingestion_status AS ingestionStatus, validation_status AS validationStatus,
  production_exposure AS productionExposure, superseded_by AS supersededBy, rejection_reason AS rejectionReason,
  parser_version AS parserVersion, retrieval_method AS retrievalMethod, exact_model AS exactModel,
  current_version_id AS currentVersionId, idempotency_key AS idempotencyKey, fixture,
  created_at AS createdAt, updated_at AS updatedAt FROM corpus_documents`;

function asBool(value: unknown) {
  return value === 1 || value === true;
}

function mapDocument(row: CorpusDocument & { productionExposure?: unknown; fixture?: unknown; authorityTier?: unknown }): CorpusDocument {
  return {
    ...row,
    productionExposure: asBool(row.productionExposure),
    fixture: asBool(row.fixture),
    authorityTier: Number(row.authorityTier) as CorpusDocument["authorityTier"],
  };
}

export async function writeAudit(db: D1DatabaseLike, entityType: string, entityId: string, action: string, actorEmail: string, detail: Record<string, unknown> = {}) {
  await db.prepare("INSERT INTO corpus_audit_events (entity_type, entity_id, action, actor_email, detail) VALUES (?, ?, ?, ?, ?)").bind(entityType, entityId, action, actorEmail, JSON.stringify(detail)).run();
}

export async function getCorpusDocument(db: D1DatabaseLike, id: string) {
  const row = await first<CorpusDocument>(db, `${documentSelect} WHERE id = ?`, id);
  return row ? mapDocument(row) : null;
}

export async function listCorpusDocuments(db: D1DatabaseLike) {
  const rows = await all<CorpusDocument>(db, `${documentSelect} ORDER BY updated_at DESC`);
  return rows.map(mapDocument);
}

export async function getCorpusVersion(db: D1DatabaseLike, id: string) {
  return first<CorpusVersion>(db, "SELECT id, document_id AS documentId, version, checksum, extracted_text AS extractedText, byte_length AS byteLength, content_type AS contentType, created_at AS createdAt FROM corpus_document_versions WHERE id = ?", id);
}

export async function listCorpusChunks(db: D1DatabaseLike, versionId: string) {
  return all<CorpusChunk>(db, "SELECT id, document_id AS documentId, version_id AS versionId, ordinal, heading, locator, excerpt, token_estimate AS tokenEstimate FROM corpus_chunks WHERE version_id = ? ORDER BY ordinal ASC", versionId);
}

export async function findDocumentByIdempotency(db: D1DatabaseLike, key: string) {
  const row = await first<CorpusDocument>(db, `${documentSelect} WHERE idempotency_key = ?`, key);
  return row ? mapDocument(row) : null;
}

export async function insertCorpusDocument(db: D1DatabaseLike, document: CorpusDocument) {
  await db.prepare(`INSERT INTO corpus_documents (
    id, canonical_url, title, publisher, evidence_domain, source_type, authority_tier, jurisdiction,
    published_date, revision_date, retrieved_date, last_validated_date, mime_type, licensing_notes,
    ingestion_status, validation_status, production_exposure, superseded_by, rejection_reason,
    parser_version, retrieval_method, exact_model, current_version_id, idempotency_key, fixture, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    document.id, document.canonicalUrl, document.title, document.publisher, document.evidenceDomain, document.sourceType,
    document.authorityTier, document.jurisdiction, document.publishedDate, document.revisionDate, document.retrievedDate,
    document.lastValidatedDate, document.mimeType, document.licensingNotes, document.ingestionStatus, document.validationStatus,
    document.productionExposure ? 1 : 0, document.supersededBy, document.rejectionReason, document.parserVersion,
    document.retrievalMethod, document.exactModel, document.currentVersionId, document.idempotencyKey, document.fixture ? 1 : 0,
    document.createdAt, document.updatedAt,
  ).run();
}

export async function updateCorpusDocument(db: D1DatabaseLike, id: string, patch: Partial<CorpusDocument>) {
  const current = await getCorpusDocument(db, id);
  if (!current) throw new Error("Corpus document not found.");
  const next = { ...current, ...patch, updatedAt: nowIso() };
  await db.prepare(`UPDATE corpus_documents SET canonical_url=?, title=?, publisher=?, evidence_domain=?, source_type=?,
    authority_tier=?, jurisdiction=?, published_date=?, revision_date=?, retrieved_date=?, last_validated_date=?,
    mime_type=?, licensing_notes=?, ingestion_status=?, validation_status=?, production_exposure=?, superseded_by=?,
    rejection_reason=?, parser_version=?, retrieval_method=?, exact_model=?, current_version_id=?, idempotency_key=?, updated_at=? WHERE id=?`).bind(
    next.canonicalUrl, next.title, next.publisher, next.evidenceDomain, next.sourceType, next.authorityTier, next.jurisdiction,
    next.publishedDate, next.revisionDate, next.retrievedDate, next.lastValidatedDate, next.mimeType, next.licensingNotes,
    next.ingestionStatus, next.validationStatus, next.productionExposure ? 1 : 0, next.supersededBy, next.rejectionReason,
    next.parserVersion, next.retrievalMethod, next.exactModel, next.currentVersionId, next.idempotencyKey, next.updatedAt, id,
  ).run();
  return getCorpusDocument(db, id);
}

export async function insertVersion(db: D1DatabaseLike, version: CorpusVersion) {
  await db.prepare("INSERT INTO corpus_document_versions (id, document_id, version, checksum, extracted_text, byte_length, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(
    version.id, version.documentId, version.version, version.checksum, version.extractedText, version.byteLength, version.contentType, version.createdAt,
  ).run();
}

export async function findVersionByChecksum(db: D1DatabaseLike, documentId: string, checksum: string) {
  return first<CorpusVersion>(db, "SELECT id, document_id AS documentId, version, checksum, extracted_text AS extractedText, byte_length AS byteLength, content_type AS contentType, created_at AS createdAt FROM corpus_document_versions WHERE document_id = ? AND checksum = ?", documentId, checksum);
}

export async function nextVersionNumber(db: D1DatabaseLike, documentId: string) {
  const row = await first<{ maxVersion: number | null }>(db, "SELECT max(version) AS maxVersion FROM corpus_document_versions WHERE document_id = ?", documentId);
  return (row?.maxVersion ?? 0) + 1;
}

export async function insertChunks(db: D1DatabaseLike, chunks: CorpusChunk[]) {
  for (const chunk of chunks) {
    await db.prepare("INSERT INTO corpus_chunks (id, document_id, version_id, ordinal, heading, locator, excerpt, token_estimate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(
      chunk.id, chunk.documentId, chunk.versionId, chunk.ordinal, chunk.heading, chunk.locator, chunk.excerpt, chunk.tokenEstimate,
    ).run();
  }
}

export async function insertIngestionJob(db: D1DatabaseLike, job: { id: string; documentId: string | null; actorEmail: string; method: string; status: string; mimeType: string | null; byteLength: number; uploadLabel: string | null; errorCode: string | null }) {
  await db.prepare("INSERT INTO corpus_ingestion_jobs (id, document_id, actor_email, method, status, mime_type, byte_length, upload_label, error_code, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
    job.id, job.documentId, job.actorEmail, job.method, job.status, job.mimeType, job.byteLength, job.uploadLabel, job.errorCode, job.status === "failed" || job.status === "awaiting_review" || job.status === "accepted" ? nowIso() : null,
  ).run();
}

export async function insertResearchJob(db: D1DatabaseLike, job: { id: string; queryHash: string; evidenceDomain: string | null; capability: string; sourceCount: number; cacheHit: boolean; durationMs: number; errorCode: string | null }) {
  await db.prepare("INSERT INTO corpus_research_jobs (id, query_hash, evidence_domain, capability, source_count, cache_hit, duration_ms, error_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(
    job.id, job.queryHash, job.evidenceDomain, job.capability, job.sourceCount, job.cacheHit ? 1 : 0, job.durationMs, job.errorCode,
  ).run();
}

export async function insertResearchJobEvidence(db: D1DatabaseLike, jobId: string, hits: CorpusHit[]) {
  for (const hit of hits) {
    await db.prepare("INSERT INTO corpus_research_job_evidence (job_id, document_id, version_id, chunk_id, score) VALUES (?, ?, ?, ?, ?)").bind(jobId, hit.sourceId, hit.sourceVersion, hit.chunkId, hit.score).run();
  }
}

export async function insertCitation(db: D1DatabaseLike, input: { documentId: string; versionId: string; chunkId: string; claimText: string }) {
  await db.prepare("INSERT OR IGNORE INTO corpus_citations (document_id, version_id, chunk_id, claim_text) VALUES (?, ?, ?, ?)").bind(input.documentId, input.versionId, input.chunkId, input.claimText).run();
}

export async function publicSearchIndex(db: D1DatabaseLike) {
  const rows = await all<CorpusHit & { productionExposure: unknown; fixture: unknown }>(db, `
    SELECT d.id AS sourceId, d.current_version_id AS sourceVersion, c.id AS chunkId, d.title, d.publisher,
      d.authority_tier AS authorityTier, d.canonical_url AS canonicalUrl, c.excerpt, c.heading, c.locator,
      d.last_validated_date AS lastValidatedAt, d.production_exposure AS productionExposure,
      d.evidence_domain AS domain, d.jurisdiction, d.published_date AS publishedDate, d.fixture,
      d.ingestion_status AS ingestionStatus
    FROM corpus_chunks c
    INNER JOIN corpus_documents d ON d.id = c.document_id AND d.current_version_id = c.version_id
    WHERE d.ingestion_status = 'accepted' AND d.production_exposure = 1
  `);
  return rows.map((row) => ({
    ...row,
    authorityTier: Number(row.authorityTier) as CorpusHit["authorityTier"],
    productionExposure: asBool(row.productionExposure),
    fixture: asBool(row.fixture),
    score: 0,
  }));
}

export async function getCache(db: D1DatabaseLike, cacheKey: string) {
  const row = await first<{ payloadJson: string; expiresAt: string }>(db, "SELECT payload_json AS payloadJson, expires_at AS expiresAt FROM corpus_retrieval_cache WHERE cache_key = ?", cacheKey);
  if (!row) return null;
  if (row.expiresAt < nowIso()) {
    await db.prepare("DELETE FROM corpus_retrieval_cache WHERE cache_key = ?").bind(cacheKey).run();
    return null;
  }
  return JSON.parse(row.payloadJson) as CorpusHit[];
}

export async function setCache(db: D1DatabaseLike, cacheKey: string, corpusVersion: string, hits: CorpusHit[], ttlMs: number) {
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  await db.prepare("INSERT OR REPLACE INTO corpus_retrieval_cache (cache_key, corpus_version, payload_json, expires_at) VALUES (?, ?, ?, ?)").bind(cacheKey, corpusVersion, JSON.stringify(hits), expiresAt).run();
}

export async function corpusFingerprint(db: D1DatabaseLike) {
  const row = await first<{ stamp: string | null }>(db, "SELECT max(updated_at) AS stamp FROM corpus_documents WHERE ingestion_status = 'accepted'");
  return row?.stamp ?? "empty";
}

export async function purgeExpiredCache(db: D1DatabaseLike) {
  await db.prepare("DELETE FROM corpus_retrieval_cache WHERE expires_at < ?").bind(nowIso()).run();
}

export async function purgeOldIngestionJobs(db: D1DatabaseLike, olderThanIso: string) {
  await db.prepare("DELETE FROM corpus_ingestion_jobs WHERE created_at < ?").bind(olderThanIso).run();
}

export async function clearRejectedVersionText(db: D1DatabaseLike, versionId: string) {
  await db.prepare("UPDATE corpus_document_versions SET extracted_text = NULL WHERE id = ?").bind(versionId).run();
}

export async function allowedTransition(from: IngestionStatus, to: IngestionStatus) {
  const allowed: Record<IngestionStatus, IngestionStatus[]> = {
    submitted: ["fetching", "parsed", "failed", "rejected"],
    fetching: ["parsed", "failed", "rejected"],
    parsed: ["awaiting_review", "failed", "rejected"],
    awaiting_review: ["accepted", "rejected", "failed"],
    accepted: ["stale", "superseded", "rejected"],
    rejected: [],
    stale: ["superseded", "rejected"],
    superseded: [],
    failed: ["submitted"],
  };
  return allowed[from].includes(to);
}
