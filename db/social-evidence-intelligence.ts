import {
  assessClaimSufficiency,
  assessEvidenceRequestGap,
  buildDecisionDna,
  buildEvidenceGapRadar,
  independenceCluster,
  recordIsAcceptedSupport,
  type EvidenceSnapshot,
  type PackageEvidenceIntelligence,
} from "../app/growth/social/evidence-intelligence.ts";
import { EVIDENCE_POLICY } from "../app/growth/social/evidence-policy.ts";
import { publicationIsAuthorized } from "../app/growth/social/approvals.ts";
import type { SocialEvidenceRef } from "../app/growth/social/claims.ts";
import type { D1DatabaseLike } from "./index.ts";
import { getCorpusDocument } from "./corpus-repository.ts";
import {
  evaluatePackageApprovalGate,
  getContentOpportunity,
  getContentPackage,
  listChannelVariants,
  listPackageClaims,
  listSocialApprovals,
} from "./social-growth-read.ts";
import { listSocialEvidenceRequests } from "./social-evidence-request-read.ts";

async function first<T>(db: D1DatabaseLike, query: string, ...binds: unknown[]) {
  return db.prepare(query).bind(...binds).first<T>();
}

export async function loadEvidenceSnapshot(db: D1DatabaseLike, ref: SocialEvidenceRef): Promise<EvidenceSnapshot> {
  if (ref.kind === "corpus_document") {
    const document = await getCorpusDocument(db, ref.id);
    if (!document) return { ref, exists: false };
    return {
      ref,
      exists: true,
      title: document.title,
      publisher: document.publisher,
      canonicalUrl: document.canonicalUrl,
      sourceType: document.sourceType,
      provenanceMethod: document.provenanceMethod,
      authorityTier: document.authorityTier,
      evidenceDomain: document.evidenceDomain,
      ingestionStatus: document.ingestionStatus,
      validationStatus: document.validationStatus,
      productionExposure: document.productionExposure,
      publishedDate: document.publishedDate,
      lastValidatedDate: document.lastValidatedDate,
      refreshDueAt: document.refreshDueAt,
      underlyingDocumentId: document.id,
    };
  }
  if (ref.kind === "corpus_citation") {
    const row = await first<{ documentId: string }>(db, "SELECT document_id AS documentId FROM corpus_citations WHERE id = ?", Number(ref.id));
    if (!row) return { ref, exists: false };
    const parent = await loadEvidenceSnapshot(db, { kind: "corpus_document", id: row.documentId });
    return { ...parent, ref, underlyingDocumentId: row.documentId };
  }
  if (ref.kind === "knowledge_source") {
    const row = await first<{
      title: string;
      publisher: string;
      sourceType: string;
      url: string | null;
      verificationStatus: string;
      publicationDate: string | null;
    }>(
      db,
      `SELECT title, publisher, source_type AS sourceType, url, verification_status AS verificationStatus, publication_date AS publicationDate
       FROM sources WHERE id = ?`,
      Number(ref.id),
    );
    if (!row) return { ref, exists: false };
    return {
      ref,
      exists: true,
      title: row.title,
      publisher: row.publisher || row.title,
      canonicalUrl: row.url,
      sourceType: row.sourceType,
      verificationStatus: row.verificationStatus,
      publishedDate: row.publicationDate,
    };
  }
  const row = await first<{
    title: string;
    publisher: string;
    sourceType: string;
    url: string | null;
    verificationStatus: string;
    publicationDate: string | null;
  }>(
    db,
    `SELECT sources.title, sources.publisher, sources.source_type AS sourceType, sources.url,
            sources.verification_status AS verificationStatus, sources.publication_date AS publicationDate
     FROM workflow_sources JOIN sources ON sources.id = workflow_sources.source_id
     WHERE workflow_sources.id = ?`,
    Number(ref.id),
  );
  if (!row) return { ref, exists: false };
  return {
    ref,
    exists: true,
    title: row.title,
    publisher: row.publisher || row.title,
    canonicalUrl: row.url,
    sourceType: row.sourceType,
    verificationStatus: row.verificationStatus,
    publishedDate: row.publicationDate,
  };
}

export async function buildPackageEvidenceIntelligence(db: D1DatabaseLike, packageId: string): Promise<PackageEvidenceIntelligence | null> {
  const pkg = await getContentPackage(db, packageId);
  if (!pkg) return null;
  const opportunity = await getContentOpportunity(db, pkg.opportunityId);
  const claims = await listPackageClaims(db, packageId);
  const requests = (await listSocialEvidenceRequests(db, packageId)).filter((item) => item.status !== "resolved");
  const variants = await listChannelVariants(db, packageId);
  const approvals = await listSocialApprovals(db);
  const claimAssessments = [];
  for (const claim of claims) {
    const refs = (claim.evidenceRefs?.length ? claim.evidenceRefs : [claim.evidence]).filter((ref) => ref?.id?.trim());
    const records = [];
    for (const ref of refs) records.push(await loadEvidenceSnapshot(db, ref));
    claimAssessments.push(assessClaimSufficiency({ claim, records }));
  }
  const acceptedClusters = [];
  for (const assessment of claimAssessments) {
    for (const source of assessment.acceptedSources) {
      const snapshot = await loadEvidenceSnapshot(db, source.ref);
      if (recordIsAcceptedSupport(snapshot)) acceptedClusters.push(independenceCluster(snapshot));
    }
  }
  const requestItems = [];
  for (const request of requests) {
    const candidate = request.candidateDocumentId
      ? await loadEvidenceSnapshot(db, { kind: "corpus_document", id: request.candidateDocumentId })
      : request.resolvedEvidence
        ? await loadEvidenceSnapshot(db, request.resolvedEvidence)
        : null;
    requestItems.push(assessEvidenceRequestGap({
      request,
      candidate,
      packageAcceptedClusters: acceptedClusters,
    }));
  }
  const radar = buildEvidenceGapRadar({ claimAssessments, requestItems });
  const historical = await evaluatePackageApprovalGate(db, packageId);
  const publicationAuthorized = variants.some((variant) => publicationIsAuthorized({
    subjectKind: "variant",
    subjectId: variant.id,
    approvals,
    packageStatus: pkg.status,
  })) || publicationIsAuthorized({
    subjectKind: "package",
    subjectId: pkg.id,
    approvals,
    packageStatus: pkg.status,
  });
  const decisionDna = buildDecisionDna({
    packageId,
    problem: opportunity?.problem ?? "",
    audience: opportunity?.audience ?? null,
    thesis: pkg.thesis,
    commercialPosture: pkg.commercialPosture,
    claims,
    claimAssessments,
    unresolvedQuestions: requests.map((item) => item.question),
    publicationAuthorized,
    historicalCanApprove: historical.canApprove,
  });
  return {
    packageId,
    policyVersion: EVIDENCE_POLICY.version,
    historicalApprovalGateSeparate: true,
    historicalCanApprove: historical.canApprove,
    intelligenceAuthorityReady: decisionDna.intelligenceAuthority === "ready",
    autonomyReadiness: decisionDna.autonomyReadiness,
    claimAssessments,
    radar,
    decisionDna,
  };
}
