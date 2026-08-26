import { ingestCorpusSource } from "../app/lib/research/ingest.ts";
import type { CulinaryDomain } from "../app/lib/research/source-policy.ts";
import { assertActorEmail } from "../app/growth/social/approvals.ts";
import { executeBoundedCandidateDiscovery, type ResearchRunResult } from "../app/growth/social/candidate-discovery.ts";
import { assertLiveDiscoveryConfigured } from "../app/growth/social/candidate-discovery-capability.ts";
import { fixtureCandidateProvider } from "../app/lib/research/fixture-candidate-provider.ts";
import { createLiveCandidateProvider } from "../app/lib/research/live-candidate-provider.ts";
import { normalizeSocialSlug, socialGrowthId } from "../app/growth/social/ids.ts";
import {
  buildExecutableResearchPlan,
  executablePlanFromClaimAssessment,
  type ExecutableResearchPlan,
} from "../app/growth/social/research-planner.ts";
import type { D1DatabaseLike } from "./index.ts";
import { buildPackageEvidenceIntelligence, loadEvidenceSnapshot } from "./social-evidence-intelligence.ts";
import { getContentPackage, getPackageClaim, listPackageClaims } from "./social-growth-read.ts";
import { getResearchRun } from "./social-research-read.ts";
import { getSocialEvidenceRequest, submitEvidenceRequestCandidate } from "./social-evidence-request-repository.ts";

export type { PersistedResearchCandidate, PersistedResearchRun } from "./social-research-read.ts";
export { getResearchRun, listResearchCandidates, listResearchRuns } from "./social-research-read.ts";

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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.packageId,
    input.claimId,
    input.evidenceRequestId,
    actorEmail,
    input.result.providerId,
    input.result.providerKind,
    input.result.liveRetrieval ? 1 : 0,
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
        published_date, query, submitted_document_id, discovered_at, result_url, retrieval_status, excerpt_locator
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
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
      candidate.resultUrl ?? candidate.canonicalUrl,
      candidate.retrievalStatus ?? "ok",
      candidate.excerpts[0]?.locator ?? null,
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
    mode?: "auto" | "live" | "fixture";
  },
) {
  const mode = input.mode ?? "auto";
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
  let provider;
  if (mode === "live") {
    assertLiveDiscoveryConfigured();
    provider = createLiveCandidateProvider();
  } else if (mode === "fixture") {
    provider = fixtureCandidateProvider;
  }
  const result = await executeBoundedCandidateDiscovery({
    plan,
    claim: claim
      ? { id: claim.id, claimText: claim.claimText, safetySensitive: claim.safetySensitive, policyClass: assessment?.policyClass }
      : { id: request?.id ?? pkg.id, claimText: plan.claimOrQuestion, safetySensitive: plan.claimClass === "safety_sensitive", policyClass: plan.claimClass },
    attached,
    provider,
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
