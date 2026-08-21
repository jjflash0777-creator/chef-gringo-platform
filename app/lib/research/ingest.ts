import type { CulinaryDomain } from "./source-policy.ts";
import { CORPUS_PARSER_VERSION, type CorpusChunk, type CorpusDocument, type RetrievalMethod } from "./corpus-types.ts";
import { sha256Hex } from "./checksum.ts";
import { chunkExtractedText, extractReadableContent } from "./chunker.ts";
import { corpusIngestFetchEnabled } from "./flags.ts";
import { fetchGovernedDocument, type GovernedFetch } from "./fetch-document.ts";
import { RESEARCH_LIMITS } from "./limits.ts";
import { validateSourcePayload, validateSourceUrl } from "./url-safety.ts";
import type { D1DatabaseLike } from "../../../db/index.ts";
import {
  allowedTransition,
  clearRejectedVersionText,
  findDocumentByIdempotency,
  findVersionByChecksum,
  getCorpusDocument,
  insertChunks,
  insertCorpusDocument,
  insertIngestionJob,
  insertVersion,
  listCorpusChunks,
  nextVersionNumber,
  updateCorpusDocument,
  writeAudit,
} from "../../../db/corpus-repository.ts";
import { canExposePublicly, publicExposureBlockers } from "./exposure-gate.ts";

const ALLOWED_UPLOAD_TYPES = new Set(["text/plain", "text/markdown", "text/html"]);

export type IngestRequest = {
  id?: string;
  title: string;
  publisher: string;
  evidenceDomain: CulinaryDomain;
  sourceType: string;
  authorityTier: 1 | 2 | 3;
  jurisdiction?: string | null;
  publishedDate?: string | null;
  exactModel?: string | null;
  licensingNotes?: string;
  canonicalUrl?: string | null;
  mimeType: string;
  text?: string;
  actorEmail: string;
  fixture?: boolean;
  fetchImpl?: GovernedFetch;
  provenanceMethod?: RetrievalMethod;
  claimScope?: string[];
  verificationNotes?: string;
  reviewerEmail?: string;
};

export class IngestError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function slugId(title: string) {
  return `corpus:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`;
}

export async function ingestCorpusSource(db: D1DatabaseLike, request: IngestRequest) {
  const jobId = `job:${crypto.randomUUID()}`;
  const mime = request.mimeType.split(";")[0].trim().toLowerCase();
  const uploadLabel = `${mime}:${(request.text ?? "").length}B`;
  let documentId: string | null = null;

  try {
    if (mime === "application/pdf" && !request.text?.trim()) {
      throw new IngestError("unsupported_mime", "PDF requires a human transcription in this stage. Binary PDF parsing is not enabled.");
    }
    if (mime === "application/pdf" && request.text?.startsWith("%PDF")) {
      throw new IngestError("unsupported_mime", "Binary PDF parsing is not enabled. Provide a page-labeled transcription.");
    }
    if (mime === "application/pdf" && request.text && !/\[page\s+\d+\]/i.test(request.text)) {
      throw new IngestError("missing_page_locator", "PDF transcription must include [page N] locators.");
    }
    if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      throw new IngestError("unsupported_mime", "DOCX parser is not installed.");
    }
    if (!ALLOWED_UPLOAD_TYPES.has(mime) && mime !== "application/pdf") {
      throw new IngestError("unsupported_mime", `Unsupported MIME type: ${mime}.`);
    }

    let extracted = request.text ?? "";
    let retrievalMethod: RetrievalMethod = request.provenanceMethod
      ?? (request.fixture ? "test_fixture" : "founder_uploaded_document");
    let retrievedDate: string | null = null;
    let canonicalUrl = request.canonicalUrl?.trim() || null;

    if (canonicalUrl) {
      const urlCheck = validateSourceUrl(canonicalUrl);
      if (!urlCheck.ok || !urlCheck.canonicalUrl) throw new IngestError("unsafe_url", `Source URL rejected: ${urlCheck.issues.join(", ")}.`);
      const safeUrl = urlCheck.canonicalUrl;
      canonicalUrl = safeUrl;
      if (!extracted.trim()) {
        if (!corpusIngestFetchEnabled() && !request.fetchImpl) {
          const id = request.id ?? slugId(request.title);
          const idempotencyKey = await sha256Hex(`url-only|${safeUrl}`);
          const existing = await findDocumentByIdempotency(db, idempotencyKey);
          if (existing) return { document: existing, duplicate: true, jobId };
          const createdAt = new Date().toISOString();
          const document: CorpusDocument = {
            id, canonicalUrl: safeUrl, title: request.title, publisher: request.publisher, evidenceDomain: request.evidenceDomain,
            sourceType: request.sourceType, authorityTier: request.authorityTier, jurisdiction: request.jurisdiction ?? null,
            publishedDate: request.publishedDate ?? null, revisionDate: null, retrievedDate: null, lastValidatedDate: null,
            mimeType: mime, licensingNotes: request.licensingNotes ?? "", ingestionStatus: "submitted", validationStatus: "identified",
            productionExposure: false, supersededBy: null, rejectionReason: "URL recorded but content was not fetched. A URL alone is never accepted evidence.",
            parserVersion: CORPUS_PARSER_VERSION, retrievalMethod: "metadata_only", exactModel: request.exactModel ?? null,
            currentVersionId: null, idempotencyKey, fixture: Boolean(request.fixture), createdAt, updatedAt: createdAt,
            provenanceMethod: "metadata_only", reviewerEmail: null, reviewedAt: null, verificationNotes: "",
            claimScope: JSON.stringify(request.claimScope ?? []), refreshDueAt: null,
          };
          await insertCorpusDocument(db, document);
          await insertIngestionJob(db, { id: jobId, documentId: id, actorEmail: request.actorEmail, method: "https_fetch", status: "submitted", mimeType: mime, byteLength: 0, uploadLabel, errorCode: "not_fetched" });
          await writeAudit(db, "document", id, "identified_url_only", request.actorEmail, { canonicalUrl: safeUrl });
          return { document, duplicate: false, jobId };
        }
        if (!request.fetchImpl) throw new IngestError("fetch_disabled", "Live fetch is not enabled.");
        const fetched = await fetchGovernedDocument(safeUrl, request.fetchImpl);
        if (!fetched.ok || !fetched.text || !fetched.finalUrl) throw new IngestError("fetch_failed", `Fetch rejected: ${fetched.issues.join(", ")}.`);
        extracted = fetched.text;
        retrievalMethod = "live_fetch";
        retrievedDate = new Date().toISOString();
        canonicalUrl = fetched.finalUrl;
      }
    }

    const readable = extractReadableContent({ mimeType: mime, text: extracted });
    if (!readable.text) throw new IngestError("empty_content", "A URL or empty file is not supporting evidence.");
    const payload = validateSourcePayload({ contentType: mime, byteLength: new TextEncoder().encode(readable.text).length });
    if (!payload.ok) throw new IngestError("payload_rejected", `Payload rejected: ${payload.issues.join(", ")}.`);
    if (readable.text.length > RESEARCH_LIMITS.maximumSourceBytes) throw new IngestError("oversized", "Source exceeds the maximum size.");

    const checksum = await sha256Hex(readable.text);
    const idempotencyKey = await sha256Hex(`${canonicalUrl ?? "upload"}|${checksum}`);
    const id = request.id ?? slugId(request.title);
    const existing = await findDocumentByIdempotency(db, idempotencyKey) ?? await getCorpusDocument(db, id);
    if (existing) {
      const version = await findVersionByChecksum(db, existing.id, checksum);
      if (version) {
        await insertIngestionJob(db, { id: jobId, documentId: existing.id, actorEmail: request.actorEmail, method: retrievalMethod, status: existing.ingestionStatus, mimeType: mime, byteLength: version.byteLength, uploadLabel, errorCode: "duplicate" });
        return { document: existing, duplicate: true, jobId };
      }
    }

    const resolvedId = existing?.id ?? id;
    documentId = resolvedId;
    const createdAt = new Date().toISOString();
    if (!existing) {
      await insertCorpusDocument(db, {
        id: resolvedId, canonicalUrl, title: request.title, publisher: request.publisher, evidenceDomain: request.evidenceDomain,
        sourceType: request.sourceType, authorityTier: request.authorityTier, jurisdiction: request.jurisdiction ?? null,
        publishedDate: request.publishedDate ?? null, revisionDate: null, retrievedDate, lastValidatedDate: null,
        mimeType: mime, licensingNotes: request.licensingNotes ?? "", ingestionStatus: "parsed", validationStatus: "relevant",
        productionExposure: false, supersededBy: null, rejectionReason: null, parserVersion: CORPUS_PARSER_VERSION,
        retrievalMethod, exactModel: request.exactModel ?? null, currentVersionId: null, idempotencyKey,
        fixture: Boolean(request.fixture), createdAt, updatedAt: createdAt,
        provenanceMethod: retrievalMethod, reviewerEmail: request.reviewerEmail ?? null, reviewedAt: null,
        verificationNotes: request.verificationNotes ?? "", claimScope: JSON.stringify(request.claimScope ?? []),
        refreshDueAt: null,
      });
    }

    const versionNumber = await nextVersionNumber(db, resolvedId);
    const versionId = `${resolvedId}:v${versionNumber}`;
    const chunks = chunkExtractedText(readable.text).map((chunk, index) => ({
      id: `${versionId}:c${index + 1}`,
      documentId: resolvedId,
      versionId,
      ...chunk,
    } satisfies CorpusChunk));
    await insertVersion(db, {
      id: versionId, documentId: resolvedId, version: versionNumber, checksum, extractedText: readable.text,
      byteLength: new TextEncoder().encode(readable.text).length, contentType: mime, createdAt,
    });
    await insertChunks(db, chunks);
    const document = await updateCorpusDocument(db, resolvedId, {
      ingestionStatus: "awaiting_review",
      validationStatus: "relevant",
      currentVersionId: versionId,
      retrievedDate,
      retrievalMethod,
      parserVersion: CORPUS_PARSER_VERSION,
      idempotencyKey,
      productionExposure: false,
      provenanceMethod: retrievalMethod,
      claimScope: JSON.stringify(request.claimScope ?? []),
      verificationNotes: request.verificationNotes ?? "",
    });
    await insertIngestionJob(db, { id: jobId, documentId: resolvedId, actorEmail: request.actorEmail, method: retrievalMethod, status: "awaiting_review", mimeType: mime, byteLength: new TextEncoder().encode(readable.text).length, uploadLabel, errorCode: null });
    await writeAudit(db, "document", resolvedId, "awaiting_review", request.actorEmail, { versionId, checksum, instructionLike: readable.flags.instructionLike });
    return { document: document!, duplicate: false, jobId, versionId, chunks };
  } catch (error) {
    const code = error instanceof IngestError ? error.code : "failed";
    await insertIngestionJob(db, { id: jobId, documentId, actorEmail: request.actorEmail, method: request.canonicalUrl ? "https_fetch" : "upload", status: "failed", mimeType: mime, byteLength: (request.text ?? "").length, uploadLabel, errorCode: code });
    throw error;
  }
}

export async function reviewCorpusDocument(
  db: D1DatabaseLike,
  id: string,
  action: "accept" | "reject" | "stale" | "supersede" | "expose" | "unexpose",
  actorEmail: string,
  options: { reason?: string; supersededBy?: string; verificationNotes?: string; claimScope?: string[] } = {},
) {
  const document = await getCorpusDocument(db, id);
  if (!document) throw new IngestError("not_found", "Corpus document not found.");

  if (action === "expose" || action === "unexpose") {
    if (document.ingestionStatus !== "accepted") throw new IngestError("illegal_transition", "Only accepted documents can change public exposure.");
    const reviewed = await updateCorpusDocument(db, id, {
      reviewerEmail: actorEmail,
      reviewedAt: new Date().toISOString(),
      verificationNotes: options.verificationNotes ?? document.verificationNotes,
      claimScope: options.claimScope ? JSON.stringify(options.claimScope) : document.claimScope,
    });
    if (action === "unexpose") {
      const hidden = await updateCorpusDocument(db, id, { productionExposure: false });
      await writeAudit(db, "document", id, "unexpose", actorEmail, {});
      return hidden;
    }
    const chunks = reviewed?.currentVersionId ? await listCorpusChunks(db, reviewed.currentVersionId) : [];
    if (!canExposePublicly(reviewed!, chunks)) {
      throw new IngestError("exposure_blocked", `Public exposure blocked: ${publicExposureBlockers(reviewed!, chunks).join(", ")}.`);
    }
    const exposed = await updateCorpusDocument(db, id, { productionExposure: true });
    await writeAudit(db, "document", id, "expose", actorEmail, {});
    return exposed;
  }

  const target = action === "accept" ? "accepted" : action === "reject" ? "rejected" : action === "stale" ? "stale" : "superseded";
  if (!(await allowedTransition(document.ingestionStatus, target))) {
    throw new IngestError("illegal_transition", `Cannot move from ${document.ingestionStatus} to ${target}.`);
  }
  if (action === "accept" && !document.currentVersionId) {
    throw new IngestError("url_only", "A URL alone is never accepted evidence.");
  }
  const reviewedAt = action === "accept" ? new Date().toISOString() : document.reviewedAt;
  const accepted = await updateCorpusDocument(db, id, {
    ingestionStatus: target,
    reviewerEmail: action === "accept" ? actorEmail : document.reviewerEmail,
    reviewedAt,
    verificationNotes: options.verificationNotes ?? document.verificationNotes,
    claimScope: options.claimScope ? JSON.stringify(options.claimScope) : document.claimScope,
    lastValidatedDate: action === "accept" ? reviewedAt : document.lastValidatedDate,
    rejectionReason: action === "reject" || action === "stale" ? options.reason ?? document.rejectionReason : document.rejectionReason,
    supersededBy: action === "supersede" ? options.supersededBy ?? document.supersededBy : document.supersededBy,
    validationStatus: action === "accept" ? "claim_supporting" : action === "reject" ? "rejected" : action === "stale" ? "stale" : document.validationStatus,
    productionExposure: false,
  });
  if (action === "accept") {
    const chunks = accepted?.currentVersionId ? await listCorpusChunks(db, accepted.currentVersionId) : [];
    if (canExposePublicly(accepted!, chunks)) {
      const exposed = await updateCorpusDocument(db, id, { productionExposure: true });
      await writeAudit(db, "document", id, "accepted", actorEmail, { exposed: true });
      return exposed;
    }
  }
  if (action === "reject" && document.currentVersionId) await clearRejectedVersionText(db, document.currentVersionId);
  await writeAudit(db, "document", id, target, actorEmail, { reason: options.reason ?? null, exposed: false });
  return accepted;
}
