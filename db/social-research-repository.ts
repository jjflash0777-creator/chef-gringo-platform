import { ingestCorpusSource } from "../app/lib/research/ingest.ts";
import type { CulinaryDomain } from "../app/lib/research/source-policy.ts";
import { assertActorEmail } from "../app/growth/social/approvals.ts";
import {
  executeBoundedCandidateDiscovery,
  type CandidateAssessment,
  type ResearchRunResult,
} from "../app/growth/social/candidate-discovery.ts";
import { normalizeSocialSlug, socialGrowthId } from "../app/growth/social/ids.ts";
import {
  buildExecutableResearchPlan,
  executablePlanFromClaimAssessment,
  type ExecutableResearchPlan,
} from "../app/growth/social/research-planner.ts";
import type { D1DatabaseLike } from "./index.ts";
import { buildPackageEvidenceIntelligence, loadEvidenceSnapshot } from "./social-evidence-intelligence.ts";
import { getContentPackage, getPackageClaim, listPackageClaims } from "./social-growth-repository.ts";
import { getSocialEvidenceRequest, submitEvidenceRequestCandidate } from "./social-evidence-request-repository.ts";

export type PersistedResearchCandidate = CandidateAssessment & {
  id: string;
  runId: string;
  submittedDocumentId: string | null;
  discoveredAt: string;
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
  liveRetrieval: false;
  stopReason: string;
  plan: ExecutableResearchPlan;
  queriesExecuted: string[];
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
  relationship: CandidateAssessment["relationship"];
  scopeLimitations: string;
  authorityClass: string;
  authorityAdequate: number | boolean;
  freshness: CandidateAssessment["freshness"];
  rankScore: number;
  reasonSelected: string | null;
  reasonExcluded: string | null;
  proposedForReview: number | boolean;
  retrievedChecksum: string;
  publishedDate: string | null;
  query: string;
  submittedDocumentId: string | null;
  discoveredAt: string;
};

const runSelect = `
  SELECT id, package_id AS packageId, claim_id AS claimId, evidence_request_id AS evidenceRequestId,
         actor_email AS actorEmail, provider_id AS providerId, provider_kind AS providerKind,
         status, live_retrieval AS liveRetrieval, stop_reason AS stopReason,
         plan_json AS planJson, queries_json AS queriesJson, started_at AS startedAt,
         finished_at AS finishedAt, created_at AS createdAt, updated_at AS updatedAt
  FROM social_research_runs
`;

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
    excerpts: JSON.parse(row.excerptsJson) as CandidateAssessment["excerpts"],
    relationship: row.relationship,
    scopeLimitations: row.scopeLimitations,
    authorityClass: row.authorityClass as CandidateAssessment["authorityClass"],
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
    liveRetrieval: false,
    stopReason: row.stopReason,
    plan: JSON.parse(row.planJson) as ExecutableResearchPlan,
    queriesExecuted: JSON.parse(row.queriesJson) as string[],
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
           query, submitted_document_id AS submittedDocumentId, discovered_at AS discoveredAt
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

export async function buildPackageResearchPlans(db: D1DatabaseLike, packageId: string) {
  const intelligence = await buildPackageEvidenceIntelligence(db, packageId);
  if (!intelligence) return null;
  const plans: Array<{ claimId: string | null; evidenceRequestId: string | null; plan: ExecutableResearchPlan }> = [];
  for (const assessment of intelligence.claimAssessments) {
    const plan = executablePlanFromClaimAssessment(assessment);
    if (!plan) continue;
    plans.push({ claimId: assessment.claimId, evidenceRequestId: null, plan });
  }
  for (const item of intelligence.radar.unresolvedEvidenceRequests) {
    if (!item.researchPlan) continue;
    const request = await getSocialEvidenceRequest(db, item.id);
    const policyClass = request?.preferredSourceType === "government_regulatory" || request?.preferredSourceType === "electrical_code_standard"
      ? "safety_sensitive"
      : "broad_technical";
    plans.push({
      claimId: null,
      evidenceRequestId: item.id,
      plan: buildExecutableResearchPlan({
        claimOrQuestion: item.researchPlan.claimOrQuestion,
        policyClass,
        reason: item.researchPlan.reason,
        independentSourcesDesired: item.researchPlan.independentSourcesDesired,
      }),
    });
  }
  return { intelligence, plans };
}

async function persistRun(db: D1DatabaseLike, input: {
  slug: string;
  packageId: string;
  claimId: string | null;
  evidenceRequestId: string | null;
  actorEmail: string;
  result: ResearchRunResult;
}) {
  const id = socialGrowthId("research-run", input.slug);
  const actorEmail = assertActorEmail(input.actorEmail, "Research runs");
  await db.prepare(`
    INSERT INTO social_research_runs (
      id, package_id, claim_id, evidence_request_id, actor_email, provider_id, provider_kind,
      status, live_retrieval, stop_reason, plan_json, queries_json, started_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', 0, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.packageId,
    input.claimId,
    input.evidenceRequestId,
    actorEmail,
    input.result.providerId,
    input.result.providerKind,
    input.result.stopReason,
    JSON.stringify(input.result.plan),
    JSON.stringify(input.result.queriesExecuted),
    input.result.startedAt,
    input.result.finishedAt,
  ).run();
  let index = 0;
  for (const candidate of input.result.candidates) {
    index += 1;
    const candidateId = socialGrowthId("research-candidate", `${input.slug}-c${index}`);
    await db.prepare(`
      INSERT INTO social_research_candidates (
        id, run_id, canonical_url, title, publisher, source_class, provenance, independence_cluster,
        excerpts_json, relationship, scope_limitations, authority_class, authority_adequate, freshness,
        rank_score, reason_selected, reason_excluded, proposed_for_review, retrieved_checksum,
        published_date, query, submitted_document_id, discovered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
    `).bind(
      candidateId,
      id,
      candidate.canonicalUrl,
      candidate.title,
      candidate.publisher,
      candidate.sourceClass,
      candidate.provenance,
      candidate.independenceCluster,
      JSON.stringify(candidate.excerpts),
      candidate.relationship,
      candidate.scopeLimitations,
      candidate.authorityClass,
      candidate.authorityAdequate ? 1 : 0,
      candidate.freshness,
      candidate.rankScore,
      candidate.reasonSelected,
      candidate.reasonExcluded,
      candidate.proposedForReview ? 1 : 0,
      candidate.retrievedChecksum,
      candidate.publishedDate,
      candidate.query,
      input.result.finishedAt,
    ).run();
  }
  const persisted = await getResearchRun(db, id);
  if (!persisted) throw new Error("Research run could not be loaded after insert.");
  return persisted;
}

export async function runBoundedCandidateDiscovery(
  db: D1DatabaseLike,
  input: {
    slug?: string;
    packageId: string;
    claimId?: string | null;
    evidenceRequestId?: string | null;
    actorEmail: string;
  },
) {
  const pkg = await getContentPackage(db, input.packageId);
  if (!pkg) throw new Error("Research runs must belong to an existing package.");
  const slug = input.slug?.trim()
    ? normalizeSocialSlug(input.slug)
    : normalizeSocialSlug(`run-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`);
  let claim = input.claimId ? await getPackageClaim(db, input.claimId) : null;
  if (input.claimId && !claim) throw new Error("Research runs must target an existing claim.");
  if (claim && claim.packageId !== pkg.id) throw new Error("Claim does not belong to this package.");
  const request = input.evidenceRequestId ? await getSocialEvidenceRequest(db, input.evidenceRequestId) : null;
  if (input.evidenceRequestId && !request) throw new Error("Evidence request not found.");
  if (!claim) {
    const claims = await listPackageClaims(db, pkg.id);
    claim = claims[0] ?? null;
  }
  const intelligence = await buildPackageEvidenceIntelligence(db, pkg.id);
  const assessment = claim ? intelligence?.claimAssessments.find((item) => item.claimId === claim!.id) : null;
  const plan = assessment
    ? executablePlanFromClaimAssessment(assessment) ?? buildExecutableResearchPlan({
      claimOrQuestion: claim!.claimText,
      policyClass: assessment.policyClass,
      reason: assessment.gaps[0] ?? "Evidence Intelligence identified a remaining gap.",
      independentSourcesDesired: Math.max(2, assessment.independentSourceCount + 1),
    })
    : buildExecutableResearchPlan({
      claimOrQuestion: request?.question ?? pkg.thesis,
      policyClass: request?.preferredSourceType === "government_regulatory" ? "safety_sensitive" : "broad_technical",
      reason: request?.whyRequired ?? "No claim assessment was available; bounded discovery still requires a plan.",
    });
  const attached = [];
  if (claim) {
    for (const ref of claim.evidenceRefs?.length ? claim.evidenceRefs : [claim.evidence]) {
      attached.push(await loadEvidenceSnapshot(db, ref));
    }
  }
  const result = await executeBoundedCandidateDiscovery({
    plan,
    claim: claim
      ? { id: claim.id, claimText: claim.claimText, safetySensitive: claim.safetySensitive, policyClass: assessment?.policyClass }
      : { id: request?.id ?? pkg.id, claimText: plan.claimOrQuestion, safetySensitive: plan.claimClass === "safety_sensitive", policyClass: plan.claimClass },
    attached,
  });
  return persistRun(db, {
    slug,
    packageId: pkg.id,
    claimId: claim?.id ?? null,
    evidenceRequestId: request?.id ?? null,
    actorEmail: input.actorEmail,
    result,
  });
}

export async function submitResearchCandidatesForReview(
  db: D1DatabaseLike,
  input: {
    runId: string;
    candidateIds: string[];
    actorEmail: string;
  },
) {
  const run = await getResearchRun(db, input.runId);
  if (!run) throw new Error("Research run not found.");
  const actorEmail = assertActorEmail(input.actorEmail, "Research candidate submission");
  const selected = run.candidates.filter((candidate) => input.candidateIds.includes(candidate.id));
  if (!selected.length) throw new Error("Select at least one discovered candidate to submit for corpus review.");
  const submitted = [];
  for (const candidate of selected) {
    if (candidate.submittedDocumentId) {
      submitted.push({ candidateId: candidate.id, documentId: candidate.submittedDocumentId, ingestionStatus: "awaiting_review" });
      continue;
    }
    const excerpt = candidate.excerpts[0]?.text;
    if (!excerpt) throw new Error("A candidate without a traceable excerpt cannot be submitted as corpus content.");
    const ingested = await ingestCorpusSource(db, {
      title: candidate.title,
      publisher: candidate.publisher,
      evidenceDomain: run.plan.evidenceDomain as CulinaryDomain,
      sourceType: candidate.sourceClass,
      authorityTier: candidate.authorityClass === "government_regulatory" || candidate.authorityClass === "code_standard" ? 1 : 2,
      canonicalUrl: candidate.canonicalUrl,
      mimeType: "text/plain",
      text: excerpt,
      actorEmail,
      fixture: candidate.provenance === "test_fixture",
      provenanceMethod: candidate.provenance === "test_fixture" ? "test_fixture" : "founder_uploaded_document",
      verificationNotes: `Submitted from research run ${run.id}. Not accepted evidence.`,
      claimScope: ["growth_research_candidate", run.claimId ?? run.packageId],
    });
    if (ingested.document.ingestionStatus === "accepted") {
      throw new Error("Candidate discovery cannot accept corpus evidence.");
    }
    await db.prepare(`
      UPDATE social_research_candidates SET submitted_document_id = ? WHERE id = ?
    `).bind(ingested.document.id, candidate.id).run();
    if (run.evidenceRequestId && ingested.document.id) {
      await submitEvidenceRequestCandidate(db, {
        requestId: run.evidenceRequestId,
        actorEmail,
        existingDocumentId: ingested.document.id,
        notes: `Linked from research candidate ${candidate.id}.`,
      });
    }
    submitted.push({
      candidateId: candidate.id,
      documentId: ingested.document.id,
      ingestionStatus: ingested.document.ingestionStatus,
      productionExposure: ingested.document.productionExposure,
    });
  }
  const updated = await getResearchRun(db, run.id);
  return { run: updated, submitted };
}

export function listSocialResearchWriteMethods() {
  return ["runBoundedCandidateDiscovery", "submitResearchCandidatesForReview"] as const;
}
