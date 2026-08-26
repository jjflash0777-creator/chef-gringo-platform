import type { LiveRetrievalDiagnostics } from "../app/lib/research/live-retrieval-diagnostics.ts";
import type { CandidateExtractionDiagnostics } from "../app/lib/research/extraction-diagnostics.ts";
import type { ExecutableResearchPlan } from "../app/growth/social/research-planner.ts";
import type { D1DatabaseLike } from "./index.ts";

/**
 * Read-only research-run listing. Kept free of Growth Queue persistence and
 * live search providers so Worker chunk cycles cannot undefine listResearchRuns.
 */

export type PersistedResearchCandidate = {
  id: string;
  runId: string;
  canonicalUrl: string;
  title: string;
  publisher: string;
  sourceClass: string;
  provenance: string;
  independenceCluster: string;
  excerpts: Array<{ text: string; start: number; end: number; locator?: string | null }>;
  relationship: "supports" | "contradicts" | "mixed" | "irrelevant";
  scopeLimitations: string;
  authorityClass: string;
  authorityAdequate: boolean;
  freshness: "current" | "stale" | "unknown";
  rankScore: number;
  reasonSelected: string | null;
  reasonExcluded: string | null;
  proposedForReview: boolean;
  retrievedChecksum: string;
  publishedDate: string | null;
  query: string;
  submittedDocumentId: string | null;
  discoveredAt: string;
  resultUrl?: string | null;
  retrievalStatus?: "ok" | "blocked" | "timeout" | "oversized" | "unextractable" | "failed";
  excerptLocator?: string | null;
  extraction?: CandidateExtractionDiagnostics | null;
};

export type PersistedResearchRun = {
  id: string;
  packageId: string;
  claimId: string | null;
  evidenceRequestId: string | null;
  actorEmail: string;
  providerId: string;
  providerKind: "fixture" | "live";
  status: "completed" | "blocked" | "failed";
  liveRetrieval: boolean;
  stopReason: string;
  plan: ExecutableResearchPlan;
  queriesExecuted: string[];
  diagnostics: LiveRetrievalDiagnostics | null;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
  updatedAt: string;
  candidates: PersistedResearchCandidate[];
};

type RunRow = {
  id: string;
  packageId: string;
  claimId: string | null;
  evidenceRequestId: string | null;
  actorEmail: string;
  providerId: string;
  providerKind: "fixture" | "live";
  status: PersistedResearchRun["status"];
  liveRetrieval: number | boolean;
  stopReason: string;
  planJson: string;
  queriesJson: string;
  diagnosticsJson: string | null;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
  updatedAt: string;
};

type CandidateRow = {
  id: string;
  runId: string;
  canonicalUrl: string;
  title: string;
  publisher: string;
  sourceClass: string;
  provenance: string;
  independenceCluster: string;
  excerptsJson: string;
  relationship: PersistedResearchCandidate["relationship"];
  scopeLimitations: string;
  authorityClass: string;
  authorityAdequate: number | boolean;
  freshness: PersistedResearchCandidate["freshness"];
  rankScore: number;
  reasonSelected: string | null;
  reasonExcluded: string | null;
  proposedForReview: number | boolean;
  retrievedChecksum: string;
  publishedDate: string | null;
  query: string;
  submittedDocumentId: string | null;
  discoveredAt: string;
  resultUrl: string | null;
  retrievalStatus: string | null;
  excerptLocator: string | null;
  extractionJson: string | null;
};

const runSelect = `
  SELECT id, package_id AS packageId, claim_id AS claimId, evidence_request_id AS evidenceRequestId,
         actor_email AS actorEmail, provider_id AS providerId, provider_kind AS providerKind,
         status, live_retrieval AS liveRetrieval, stop_reason AS stopReason,
         plan_json AS planJson, queries_json AS queriesJson, diagnostics_json AS diagnosticsJson,
         started_at AS startedAt,
         finished_at AS finishedAt, created_at AS createdAt, updated_at AS updatedAt
  FROM social_research_runs
`;

function parseExtraction(value: string | null | undefined): CandidateExtractionDiagnostics | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as CandidateExtractionDiagnostics;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function parseDiagnostics(value: string | null | undefined): LiveRetrievalDiagnostics | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as LiveRetrievalDiagnostics;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function hydrateCandidate(row: CandidateRow): PersistedResearchCandidate {
  return {
    id: row.id,
    runId: row.runId,
    canonicalUrl: row.canonicalUrl,
    title: row.title,
    publisher: row.publisher,
    sourceClass: row.sourceClass,
    provenance: row.provenance,
    independenceCluster: row.independenceCluster,
    excerpts: JSON.parse(row.excerptsJson) as PersistedResearchCandidate["excerpts"],
    relationship: row.relationship,
    scopeLimitations: row.scopeLimitations,
    authorityClass: row.authorityClass,
    authorityAdequate: Boolean(row.authorityAdequate),
    freshness: row.freshness,
    rankScore: row.rankScore,
    reasonSelected: row.reasonSelected,
    reasonExcluded: row.reasonExcluded,
    proposedForReview: Boolean(row.proposedForReview),
    retrievedChecksum: row.retrievedChecksum,
    publishedDate: row.publishedDate,
    query: row.query,
    submittedDocumentId: row.submittedDocumentId,
    discoveredAt: row.discoveredAt,
    resultUrl: row.resultUrl,
    retrievalStatus: (row.retrievalStatus ?? "ok") as PersistedResearchCandidate["retrievalStatus"],
    excerptLocator: row.excerptLocator,
    extraction: parseExtraction(row.extractionJson),
  };
}

function hydrateRun(row: RunRow, candidates: PersistedResearchCandidate[]): PersistedResearchRun {
  return {
    id: row.id,
    packageId: row.packageId,
    claimId: row.claimId,
    evidenceRequestId: row.evidenceRequestId,
    actorEmail: row.actorEmail,
    providerId: row.providerId,
    providerKind: row.providerKind,
    status: row.status,
    liveRetrieval: Boolean(row.liveRetrieval),
    stopReason: row.stopReason,
    plan: JSON.parse(row.planJson) as ExecutableResearchPlan,
    queriesExecuted: JSON.parse(row.queriesJson) as string[],
    diagnostics: parseDiagnostics(row.diagnosticsJson),
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    candidates,
  };
}

export async function listResearchCandidates(db: D1DatabaseLike, runId: string) {
  const rows = (await db.prepare(`
    SELECT id, run_id AS runId, canonical_url AS canonicalUrl, title, publisher,
           source_class AS sourceClass, provenance, independence_cluster AS independenceCluster,
           excerpts_json AS excerptsJson, relationship, scope_limitations AS scopeLimitations,
           authority_class AS authorityClass, authority_adequate AS authorityAdequate,
           freshness, rank_score AS rankScore, reason_selected AS reasonSelected,
           reason_excluded AS reasonExcluded, proposed_for_review AS proposedForReview,
           retrieved_checksum AS retrievedChecksum, published_date AS publishedDate,
           query, submitted_document_id AS submittedDocumentId, discovered_at AS discoveredAt,
           result_url AS resultUrl, retrieval_status AS retrievalStatus, excerpt_locator AS excerptLocator,
           extraction_json AS extractionJson
    FROM social_research_candidates WHERE run_id = ? ORDER BY rank_score DESC, canonical_url ASC
  `).bind(runId).all<CandidateRow>()).results;
  return rows.map(hydrateCandidate);
}

export async function getResearchRun(db: D1DatabaseLike, id: string) {
  const row = await db.prepare(`${runSelect} WHERE id = ?`).bind(id).first<RunRow>();
  if (!row) return null;
  return hydrateRun(row, await listResearchCandidates(db, row.id));
}

export async function listResearchRuns(db: D1DatabaseLike, packageId?: string) {
  const statement = packageId
    ? db.prepare(`${runSelect} WHERE package_id = ? ORDER BY created_at DESC`).bind(packageId)
    : db.prepare(`${runSelect} ORDER BY created_at DESC`);
  const rows = (await statement.all<RunRow>()).results;
  const runs = [];
  for (const row of rows) runs.push(hydrateRun(row, await listResearchCandidates(db, row.id)));
  return runs;
}
