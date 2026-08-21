import { corpusFingerprint, listCorpusChunks, listCorpusDocuments, publicSearchIndex } from "../../../db/corpus-repository.ts";
import type { D1DatabaseLike } from "../../../db/index.ts";
import { CORPUS_MANIFEST_VERSION } from "./corpus-manifest.ts";
import { publicExposureBlockers, parseClaimScope } from "./exposure-gate.ts";
import { lastImportRun } from "../../../db/corpus-repository.ts";
import type { CorpusTarget } from "./provenance.ts";

export type AuditFinding = { code: string; id?: string; detail: string };

export type AuditReport = {
  ok: boolean;
  target: CorpusTarget | "unset";
  manifestVersion: string;
  fingerprint: string;
  findings: AuditFinding[];
};

export async function auditCorpus(db: D1DatabaseLike, options: { target?: CorpusTarget; manifestVersionExpected?: boolean } = {}): Promise<AuditReport> {
  const findings: AuditFinding[] = [];
  const documents = await listCorpusDocuments(db);
  const publicHits = await publicSearchIndex(db);
  const chunkIds = new Set(publicHits.map((hit) => hit.chunkId));
  if (chunkIds.size !== publicHits.length) findings.push({ code: "duplicate_active_chunks", detail: "Public index contains duplicate chunk ids." });

  for (const document of documents) {
    if ((document.fixture || document.provenanceMethod === "test_fixture") && document.productionExposure) {
      findings.push({ code: "test_fixture_public", id: document.id, detail: "Test fixture is production-exposed." });
    }
    if (document.provenanceMethod === "metadata_only" && document.productionExposure) {
      findings.push({ code: "metadata_only_cited", id: document.id, detail: "Metadata-only source is production-exposed." });
    }
    if (document.ingestionStatus === "accepted" && !document.reviewerEmail) {
      findings.push({ code: "missing_reviewer", id: document.id, detail: "Accepted source lacks reviewer approval." });
    }
    if (document.ingestionStatus === "accepted" && !document.currentVersionId) {
      findings.push({ code: "missing_version", id: document.id, detail: "Accepted source lacks a checksum/version." });
    }
    if (document.productionExposure && document.provenanceMethod !== "repository_practice" && !document.canonicalUrl) {
      findings.push({ code: "missing_canonical", id: document.id, detail: "External-authority citation lacks a canonical source." });
    }
    if (document.productionExposure && document.evidenceDomain === "food_safety_public_health" && document.authorityTier > 2) {
      findings.push({ code: "safety_authority", id: document.id, detail: "Safety claim lacks adequate authority." });
    }
    if (document.productionExposure && document.evidenceDomain === "equipment" && parseClaimScope(document.claimScope).some((tag) => /thermapen|wsb50|sp20|hl200/.test(tag)) && !document.exactModel) {
      findings.push({ code: "exact_model", id: document.id, detail: "Exact equipment claim lacks exact-model evidence." });
    }
    if (document.productionExposure && (document.ingestionStatus === "stale" || document.ingestionStatus === "superseded")) {
      findings.push({ code: "stale_public", id: document.id, detail: "Stale or superseded source is public." });
    }
    if (document.productionExposure) {
      const chunks = document.currentVersionId ? await listCorpusChunks(db, document.currentVersionId) : [];
      for (const blocker of publicExposureBlockers(document, chunks)) {
        findings.push({ code: blocker, id: document.id, detail: blocker });
      }
    }
  }

  for (const hit of publicHits) {
    const parent = documents.find((document) => document.id === hit.sourceId);
    if (!parent || parent.currentVersionId !== hit.sourceVersion) {
      findings.push({ code: "citation_missing_version", id: hit.chunkId, detail: "Citation points to a missing source version or chunk." });
    }
  }

  const last = await lastImportRun(db);
  if (options.manifestVersionExpected && last && last.manifestVersion !== CORPUS_MANIFEST_VERSION) {
    findings.push({ code: "manifest_fingerprint_mismatch", detail: `Import manifest ${last.manifestVersion} != ${CORPUS_MANIFEST_VERSION}.` });
  }

  return {
    ok: findings.length === 0,
    target: options.target ?? "unset",
    manifestVersion: CORPUS_MANIFEST_VERSION,
    fingerprint: await corpusFingerprint(db),
    findings,
  };
}

export function formatAudit(report: AuditReport) {
  const lines = [
    `corpus audit: ${report.ok ? "PASS" : "FAIL"}`,
    `target: ${report.target}`,
    `manifest: ${report.manifestVersion}`,
    `fingerprint: ${report.fingerprint}`,
    ...report.findings.map((finding) => `- ${finding.code}${finding.id ? ` ${finding.id}` : ""}: ${finding.detail}`),
  ];
  return lines.join("\n");
}
