"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { describeLiveEmptyReason, type LiveEmptyReason } from "../../lib/research/live-retrieval-diagnostics.ts";
import { RESEARCH_LIMITS } from "../../lib/research/limits.ts";
import {
  applyOpportunityChange,
  clearedPackageDerivedUiState,
  CONTENT_INTELLIGENCE_IDLE_STATUS,
  EMPTY_ASSET_FORM,
  EMPTY_CANDIDATE_FORM,
  EMPTY_CLAIM_FORM,
  EMPTY_EXTRA_EVIDENCE_FORM,
  EMPTY_PACKAGE_FORM,
  EMPTY_PUBLICATION_FORM,
  EMPTY_REQUEST_FORM,
  EMPTY_VARIANT_FORM,
  resolveQueueSelection,
  warnSelectionInvariant,
} from "./queue-selection.ts";

type Opportunity = {
  id: string;
  slug: string;
  problem: string;
  audience: string;
  usefulnessTest: string;
  status: string;
};
type Package = {
  id: string;
  slug: string;
  opportunityId: string;
  thesis: string;
  usefulnessTest: string;
  commercialPosture: string;
  status: string;
};
type Claim = { id: string; packageId: string; claimText: string; safetySensitive: boolean; evidence: { kind: string; id: string }; evidenceRefs?: Array<{ kind: string; id: string }> };
type ClaimProposal = {
  id: string;
  packageId: string;
  proposedSlug: string;
  proposedClaimText: string;
  claimKind: string;
  whyItMatters: string;
  safetySensitive: boolean;
  recommendedSourceClass: string;
  authorityRequirement: string;
  independenceRequirement: string;
  sourceTrace: { field: string; excerpt: string };
  thesisIsNotEvidence: boolean;
  status: string;
  createdClaimId: string | null;
};
type InvestigationItem = {
  itemKey: string;
  depth: number;
  kind: string;
  researchQuestion: string;
  whyItMatters: string;
  material: boolean;
  prunedReason: string | null;
  safetySensitive: boolean;
  priority: number;
  recommendedSourceClass: string;
  sourceProposalIds: string[];
  humanReviewRequiredBeforeClaimCreation: boolean;
};
type InvestigationPlanRecord = {
  id: string;
  packageId: string;
  packageFingerprint: string;
  state: string;
  items: InvestigationItem[];
  rawProposalIds: string[];
  generatedAt?: string;
};
type HumanReviewTaskRecord = {
  id: string;
  packageId: string;
  taskKind: string;
  state: string;
  decisionRequired: string;
  whyAutomationStopped: string;
  approveConsequence: string;
  rejectConsequence: string;
};
type OperatorRunRecord = {
  id: string;
  packageId: string;
  fromState: string;
  toState: string;
  stoppedReason: string;
  stepCount: number;
};
type OperatorView = {
  packageId: string | null;
  state: string;
  summary: {
    headline: string;
    materialQuestionCount: number;
    safetySensitiveCount: number;
    verifiedFactCount: number;
    claimCount?: number;
    awaitingCorpusReviewCount?: number;
    rejectedCorpusCandidateCount?: number;
    historicalSubmittedCandidateCount?: number;
    unresearchedGapCount?: number;
    insufficientClaimCoverageCount?: number;
    researchStatus: string;
    humanAction: string | null;
  };
  primaryAction: { id: string; label: string; automatic: boolean; requiresHumanAuthority: boolean };
  investigationPlan: InvestigationPlanRecord | null;
  humanReviewTasks: HumanReviewTaskRecord[];
  evidenceReviewQueue?: Array<{
    candidateId: string;
    claimId: string | null;
    title: string;
    publisher: string;
    canonicalUrl: string;
    authorityClass: string;
    policyAdvancement?: string | null;
    claimCoverage?: string | null;
    excerpt: string;
    retrievalStatus?: string | null;
    whyItMatters: string;
    submittedDocumentId: string | null;
    ingestionStatus?: string;
  }>;
  evidenceReviewHistory?: Array<{
    candidateId: string;
    claimId: string | null;
    title: string;
    publisher: string;
    canonicalUrl: string;
    authorityClass: string;
    policyAdvancement?: string | null;
    claimCoverage?: string | null;
    excerpt: string;
    retrievalStatus?: string | null;
    whyItMatters: string;
    submittedDocumentId: string | null;
    ingestionStatus?: string;
  }>;
  researchWorkset?: { due: Array<{ claimId: string }>; items: Array<{ claimId: string; dueThisPass: boolean }> };
};
type Variant = { id: string; packageId: string; channel: string; copy: string; destinationUrlId: string | null };
type Destination = { id: string; packageId: string; variantId: string; channel: string; href: string; path: string };
type Asset = { id: string; assetType: string; altText: string; license: string; uri: string | null };
type Approval = { id: string; subjectKind: string; subjectId: string; decision: string; actorEmail: string; reason: string; occurredAt: string };
type Publication = {
  id: string;
  packageId: string;
  variantId: string;
  channel: string;
  mode: string;
  status: string;
  platformPostId: string | null;
  platformPostUrl: string | null;
  destinationUrlId: string;
  trackedHref: string;
  publishedAt: string | null;
  recordedAt: string;
  actorEmail: string;
};
type EvidenceItem = { kind: string; id: string; label: string; verificationStatus?: string | null; ingestionStatus?: string | null };
type EvidenceRequest = {
  id: string;
  packageId: string;
  opportunityId: string | null;
  question: string;
  whyRequired: string;
  preferredSourceType: string | null;
  status: string;
  createdBy: string;
  candidateDocumentId: string | null;
  resolvedEvidence: { kind: string; id: string } | null;
  notes: string | null;
};
type Gate = { canApprove: boolean; blockers: string[] };
type Intelligence = {
  packageId: string;
  policyVersion: string;
  historicalApprovalGateSeparate: boolean;
  historicalCanApprove?: boolean;
  intelligenceAuthorityReady?: boolean;
  autonomyReadiness?: string;
  claimAssessments: Array<{
    claimId: string;
    claimText: string;
    safetySensitive: boolean;
    policyClass: string;
    state: string;
    acceptedSourceCount: number;
    independentSourceCount: number;
    authorityStatus: string;
    acceptedSources: Array<{ ref: { kind: string; id: string }; publisher: string | null; title: string | null; authorityClass: string }>;
    gaps: string[];
    recommendedNextAction: string;
    researchPlan: {
      claimOrQuestion: string;
      requiredAuthorityClass: string;
      independentSourcesDesired: number;
      preferredPrimarySources: string[];
      disallowedSourceClasses: string[];
      stopCondition: string;
      reason: string;
    } | null;
  }>;
  radar: {
    supported: Array<{ id: string; label: string; state: string }>;
    partial: Array<{ id: string; label: string; state: string }>;
    unsupported: Array<{ id: string; label: string; state: string }>;
    unresolvedEvidenceRequests: Array<{ id: string; label: string; state: string; recommendedNextAction: string }>;
    needsIndependentCorroboration: Array<{ id: string; label: string; state: string }>;
    strongerAuthority: Array<{ id: string; label: string; state: string }>;
    contradictions: Array<{ id: string; label: string; state: string }>;
  };
  decisionDna: {
    problem: string;
    audience: string | null;
    thesis: string;
    commercialPosture: string;
    evidenceReadiness: string;
    contentReadiness: string;
    recommendationReadiness: string;
    publicationReadiness: string;
    historicalGate?: string;
    intelligenceAuthority?: string;
    autonomyReadiness?: string;
    assumptions: string[];
    unresolvedQuestions: string[];
    contradictions: string[];
  };
};
type ContentIntelligence = {
  version: string;
  publishingEnabled: false;
  brief: {
    primaryUserProblem: string;
    targetAudience: string | null;
    searchIntent: string;
    contentThesis: string;
    verifiedFacts: Array<{ claimId: string; claimText: string }>;
    claimsMustNotMake: Array<{ claimId: string; claimText: string; reason: string }>;
    unresolvedQuestions: string[];
    contradictions: string[];
    recommendedFormat: string;
    recommendedCta: string;
    commercialRelevance: string;
    confidence: string;
    evidenceReadiness: string;
  };
  score: { total: number; reasons: string[] };
  commercialRoute: { route: string; helpsUserProblem: boolean; reason: string; cta: string; destinationPath: string };
  formats: Array<{ format: string; channel: string; reason: string }>;
  drafts: Array<{
    format: string;
    channel: string;
    copy: string;
    recommendationBlocked: boolean;
    segments: Array<{ role: string; text: string; claimIds: string[]; factual: boolean }>;
    statementTrace: Array<{ text: string; emittedText: string | null; classification: string; authorized: boolean; claimIds: string[]; action: string; reason: string }>;
    claimFirewall: {
      status: "passed" | "blocked" | "transformed";
      factualStatementsAuthorized: number;
      recommendationsAuthorized: number;
      statementsTransformed: number;
      statementsRemoved: number;
      traces: Array<{ text: string; emittedText: string | null; classification: string; authorized: boolean; claimIds: string[]; action: string; reason: string }>;
    };
  }>;
  attribution: Array<{ channel: string; campaign: string; destinationPath: string; cta: string; commercialRoute: string; utmSource: string; utmMedium: string; utmCampaign: string; utmContent: string | null; requiresSavedVariant: boolean }>;
  learning: { recommendedAction: string; reason: string; clicks: number; pageViews: number; emailSignups: number; impressions: number | null; externalAnalyticsInvented: false };
};
type ResearchCandidate = {
  id: string;
  runId: string;
  canonicalUrl: string;
  title: string;
  publisher: string;
  sourceClass: string;
  provenance: string;
  independenceCluster: string;
  excerpts: Array<{ text: string; start: number; end: number; locator?: string | null }>;
  relationship: string;
  scopeLimitations: string;
  authorityClass: string;
  authorityAdequate: boolean;
  freshness: string;
  rankScore: number;
  reasonSelected: string | null;
  reasonExcluded: string | null;
  proposedForReview: boolean;
  submittedDocumentId: string | null;
  retrievalStatus?: string;
  extraction?: {
    contentType: string | null;
    rawBytes: number;
    extractedChars: number;
    extractedBytes: number;
    extractionMethod: string;
    passageMatchCount: number;
    passageMissReason: string | null;
    parserFailureReason?: string | null;
    pdfDetected?: boolean;
    pdfBytes?: number;
    pagesInspected?: number;
    pagesWithMatches?: number;
    publisherIdentityBasis?: string | null;
    registrableDomain?: string | null;
    publisherConflict?: string | null;
    issuer?: string | null;
    documentAuthor?: string | null;
    documentCreator?: string | null;
    documentProducer?: string | null;
    documentSubject?: string | null;
    documentMetadataTitle?: string | null;
    authorTrust?: string | null;
    creatorTrust?: string | null;
    producerTrust?: string | null;
    policyAdvancement?: string | null;
    preRetrievalExcluded?: boolean;
    memoryState?: string | null;
    memorySkipReason?: string | null;
    memoryRetryReason?: string | null;
    queryAuthorityPath?: string | null;
    searchSurface?: string | null;
    claimCoverage?: string | null;
    topicalRelevance?: string | null;
    claimCoverageReason?: string | null;
  } | null;
  policyAdvancement?: string | null;
  claimCoverage?: string | null;
  topicalRelevance?: string | null;
  memoryState?: string | null;
  memorySkipReason?: string | null;
  memoryRetryReason?: string | null;
  queryAuthorityPath?: string | null;
};
type ResearchRun = {
  id: string;
  packageId: string;
  claimId: string | null;
  evidenceRequestId: string | null;
  providerId: string;
  providerKind: string;
  liveRetrieval: boolean;
  stopReason: string;
  plan: {
    claimOrQuestion: string;
    claimClass: string;
    riskClass: string;
    independentSourcesDesired: number;
    maximumQueries: number;
    maximumCandidateDocuments: number;
    stopCondition: string;
    reason: string;
    queries: string[];
    queryPlans?: Array<{ query: string; authorityPath: string }>;
    preferredSourceClasses: string[];
    disallowedSourceClasses: string[];
    researchMemorySummary?: {
      priorRunCount: number;
      attemptedUrlCount: number;
      skippableUrlCount: number;
      policyGap: string;
      editorialDomainsDemoted: string[];
    };
    evidenceGap?: {
      acceptedPublishers: string[];
      acceptedIndependenceClusters: string[];
      excludedPublisherClusters: string[];
      excludedRegistrableDomains: string[];
      remainingIndependentSourceCount: number;
      strongerAuthorityRequired: boolean;
      unresolvedPolicyGap: string;
      alreadySatisfiedDimensions: string[];
      stillMissingDimensions: string[];
      preferredNextSourceClasses: string[];
      stopCondition: string;
    };
  };
  queriesExecuted: string[];
  diagnostics?: {
    rawResultCount: number;
    normalizedHitCount: number;
    urlSafeCount: number;
    deduplicatedCount: number;
    retrievalAttemptedCount: number;
    retrievalSuccessCount: number;
    blockedCount: number;
    timeoutCount: number;
    oversizedCount: number;
    unextractableCount: number;
    failedCount: number;
    assessedCandidateCount: number;
    attemptedCandidateCount?: number;
    urlAttemptCount?: number;
    pdfDetectedCount?: number;
    pdfParsedCount?: number;
    pdfUnextractableCount?: number;
    providerCallCount: number;
    queriesSkippedForRuntime: number;
    queryContinuationReason?: string | null;
    querySkipReasons?: string[];
    preRetrievalExclusionCount?: number;
    alreadyCountedSkippedCount?: number;
    urlAttemptsSaved?: number;
    memorySkippedCount?: number;
    priorUrlsSkipped?: number;
    memoryUrlAttemptsSaved?: number;
    newUrlsAssessed?: number;
    seenBeforeCount?: number;
    queryAuthorityPaths?: Array<{ query: string; authorityPath: string }>;
    emptyReason: string | null;
    exclusions: Array<{ url: string | null; title: string | null; query: string; stage: string; reason: string; retrievalStatus: string | null }>;
  } | null;
  candidates: ResearchCandidate[];
};
type PerformanceReport = {
  publicationId: string;
  channel: string;
  publishedAt: string;
  trackedHref: string;
  attributionState: string;
  window: { window: string; start: string; end: string; futurePublication?: boolean };
  metrics: {
    pageViews: number;
    uniqueSessions: number;
    recommendationViews: number;
    merchantClicks: number;
    affiliateClicks: number;
    emailSignups: number;
    verifiedSales: number;
    verifiedSalesAmountCents: number | null;
  };
  diagnostics: { publicationExactEvents: number; variantOnlyEvents: number; packageOnlyEvents: number; unattributedCandidates: number };
};

type Queue = {
  publishingEnabled: boolean;
  discoveryCapability?: string;
  liveDiscoveryAvailable?: boolean;
  opportunities: Opportunity[];
  packages: Package[];
  claims: Claim[];
    claimProposals?: ClaimProposal[];
  investigationPlans?: InvestigationPlanRecord[];
  humanReviewTasks?: HumanReviewTaskRecord[];
  operatorRuns?: OperatorRunRecord[];
  operatorByPackage?: Record<string, OperatorView>;
  variants: Variant[];
  destinations: Destination[];
  assets: Asset[];
  approvals: Approval[];
  publications: Publication[];
  evidenceRequests: EvidenceRequest[];
  evidenceCatalog: EvidenceItem[];
  packageGates: Record<string, Gate>;
  evidenceIntelligence?: Record<string, Intelligence | null>;
  researchRuns?: ResearchRun[];
  publicationAuthority: Array<{ packageId: string; status: string; hasValidApproval: boolean }>;
  variantRecordAuthority: Array<{ variantId: string; packageId: string; canRecordManualPublication: boolean }>;
};

const emptyOpportunity = { slug: "", problem: "", audience: "home_cook", usefulnessTest: "", status: "open" };
const emptyPackage = EMPTY_PACKAGE_FORM;

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

export function GrowthQueue() {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [status, setStatus] = useState("Loading the Growth Queue…");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [opportunityForm, setOpportunityForm] = useState(emptyOpportunity);
  const [packageForm, setPackageForm] = useState(emptyPackage);
  const [claimForm, setClaimForm] = useState(EMPTY_CLAIM_FORM);
  const [extraEvidenceForm, setExtraEvidenceForm] = useState(EMPTY_EXTRA_EVIDENCE_FORM);
  const [variantForm, setVariantForm] = useState(EMPTY_VARIANT_FORM);
  const [assetForm, setAssetForm] = useState(EMPTY_ASSET_FORM);
  const [preview, setPreview] = useState<string>("");
  const [reason, setReason] = useState("");
  const [approvalSubject, setApprovalSubject] = useState("package");
  const [publicationVariantId, setPublicationVariantId] = useState<string | null>(null);
  const [publicationForm, setPublicationForm] = useState(EMPTY_PUBLICATION_FORM);
  const [performanceWindow, setPerformanceWindow] = useState("since_publication");
  const [performanceById, setPerformanceById] = useState<Record<string, PerformanceReport>>({});
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST_FORM);
  const [candidateForm, setCandidateForm] = useState(EMPTY_CANDIDATE_FORM);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [selectionRunId, setSelectionRunId] = useState<string | null>(null);
  const [contentIntelligence, setContentIntelligence] = useState<ContentIntelligence | null>(null);
  const [contentIntelligencePackageId, setContentIntelligencePackageId] = useState<string | null>(null);
  const [contentIntelligenceStatus, setContentIntelligenceStatus] = useState(CONTENT_INTELLIGENCE_IDLE_STATUS);

  function clearPackageDerivedUiState() {
    const cleared = clearedPackageDerivedUiState();
    setSelectedPackageId(cleared.selectedPackageId);
    setPackageForm(cleared.packageForm);
    setClaimForm(cleared.claimForm);
    setExtraEvidenceForm(cleared.extraEvidenceForm);
    setVariantForm(cleared.variantForm);
    setAssetForm(cleared.assetForm);
    setPreview(cleared.preview);
    setReason(cleared.reason);
    setApprovalSubject(cleared.approvalSubject);
    setPublicationVariantId(cleared.publicationVariantId);
    setPublicationForm(cleared.publicationForm);
    setPerformanceById({});
    setRequestForm(cleared.requestForm);
    setCandidateForm(cleared.candidateForm);
    setSelectedCandidateIds(cleared.selectedCandidateIds);
    setSelectionRunId(cleared.selectionRunId);
    setContentIntelligence(cleared.contentIntelligence);
    setContentIntelligencePackageId(cleared.contentIntelligencePackageId);
    setContentIntelligenceStatus(cleared.contentIntelligenceStatus);
  }

  function applyQueue(next: Queue, keepOpportunityId: string | null, keepPackageId: string | null) {
    setQueue(next);
    const resolved = resolveQueueSelection({
      opportunities: next.opportunities,
      packages: next.packages,
      keepOpportunityId,
      keepPackageId,
    });
    warnSelectionInvariant(resolved.diagnostic);
    setSelectedOpportunityId(resolved.opportunityId);
    const selectedOpportunity = next.opportunities.find((item) => item.id === resolved.opportunityId);
    const selectedPackage = resolved.packageId
      ? next.packages.find((item) => item.id === resolved.packageId) ?? null
      : null;
    if (selectedOpportunity) {
      setOpportunityForm({
        slug: selectedOpportunity.slug,
        problem: selectedOpportunity.problem,
        audience: selectedOpportunity.audience,
        usefulnessTest: selectedOpportunity.usefulnessTest,
        status: selectedOpportunity.status,
      });
    }
    if (selectedPackage && selectedOpportunity && selectedPackage.opportunityId === selectedOpportunity.id) {
      setSelectedPackageId(selectedPackage.id);
      setPackageForm({
        slug: selectedPackage.slug,
        thesis: selectedPackage.thesis,
        usefulnessTest: selectedPackage.usefulnessTest,
        commercialPosture: selectedPackage.commercialPosture,
      });
      setApprovalSubject("package");
      setPublicationVariantId(next.variants.find((item) => item.packageId === selectedPackage.id)?.id ?? null);
    } else {
      clearPackageDerivedUiState();
    }
    setStatus(resolved.clearedMismatchedPackage
      ? `${next.opportunities.length} opportunities · publishing disabled · package selection cleared (did not belong to the selected opportunity)`
      : `${next.opportunities.length} opportunities · publishing disabled`);
  }

  function load(keepOpportunityId = selectedOpportunityId, keepPackageId = selectedPackageId) {
    fetch("/api/growth/queue", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await readJson(response) }))
      .then(({ ok, body }) => {
        if (!ok) {
          setStatus(String(body.error || "The Growth Queue is unavailable."));
          return;
        }
        applyQueue(body as unknown as Queue, keepOpportunityId, keepPackageId);
      });
  }

  useEffect(() => {
    let active = true;
    fetch("/api/growth/queue", { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await readJson(response) }))
      .then(({ ok, body }) => {
        if (!active) return;
        if (!ok) {
          setStatus(String(body.error || "The Growth Queue is unavailable."));
          return;
        }
        applyQueue(body as unknown as Queue, null, null);
      });
    return () => { active = false; };
  }, []);

  const opportunity = queue?.opportunities.find((item) => item.id === selectedOpportunityId) ?? null;
  const packages = useMemo(() => queue?.packages.filter((item) => item.opportunityId === selectedOpportunityId) ?? [], [queue, selectedOpportunityId]);
  const pkg = packages.find((item) => item.id === selectedPackageId) ?? null;
  const claims = queue?.claims.filter((item) => item.packageId === pkg?.id) ?? [];
  const claimProposals = (queue?.claimProposals ?? []).filter((item) => item.packageId === pkg?.id);
  const operator = pkg ? queue?.operatorByPackage?.[pkg.id] ?? null : null;
  const investigationPlan = operator?.investigationPlan ?? (queue?.investigationPlans ?? []).find((item) => item.packageId === pkg?.id) ?? null;
  const humanReviewTasks = (operator?.humanReviewTasks ?? (queue?.humanReviewTasks ?? []).filter((item) => item.packageId === pkg?.id));
  const materialInvestigationItems = (investigationPlan?.items ?? []).filter((item) => item.material);
  const contextInvestigationItems = (investigationPlan?.items ?? []).filter((item) => !item.material);
  const variants = queue?.variants.filter((item) => item.packageId === pkg?.id) ?? [];
  const destinations = queue?.destinations.filter((item) => item.packageId === pkg?.id) ?? [];
  const approvals = queue?.approvals.filter((item) => item.subjectId === pkg?.id || variants.some((variant) => variant.id === item.subjectId)) ?? [];
  const gate = pkg ? queue?.packageGates[pkg.id] : undefined;
  const authority = queue?.publicationAuthority.find((item) => item.packageId === pkg?.id);
  const publicationVariant = variants.find((item) => item.id === publicationVariantId) ?? variants[0] ?? null;
  const publicationDestination = destinations.find((item) => item.variantId === publicationVariant?.id) ?? null;
  const publications = (queue?.publications ?? []).filter((item) => item.packageId === pkg?.id);
  const evidenceRequests = (queue?.evidenceRequests ?? []).filter((item) => item.packageId === pkg?.id);
  const intelligence = pkg ? queue?.evidenceIntelligence?.[pkg.id] ?? null : null;
  const researchRuns = (queue?.researchRuns ?? []).filter((item) => item.packageId === pkg?.id);
  const evidenceReviewQueue = (operator?.evidenceReviewQueue ?? []).map((item) => ({
    ...item,
    claimText: claims.find((claim) => claim.id === item.claimId)?.claimText ?? item.claimId ?? "",
  }));
  const evidenceReviewHistory = (operator?.evidenceReviewHistory ?? []).map((item) => ({
    ...item,
    claimText: claims.find((claim) => claim.id === item.claimId)?.claimText ?? item.claimId ?? "",
  }));
  const latestResearchRun = researchRuns[0] ?? null;

  const selectedPackageIdForIntel = pkg?.id ?? null;
  useEffect(() => {
    if (!selectedPackageIdForIntel) return;
    const packageId = selectedPackageIdForIntel;
    let active = true;
    fetch(`/api/growth/packages/${encodeURIComponent(packageId)}/content-intelligence`, { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await readJson(response) }))
      .then(({ ok, body }) => {
        if (!active) return;
        if (!ok) {
          setContentIntelligence(null);
          setContentIntelligencePackageId(packageId);
          setContentIntelligenceStatus(String(body.error || "Content intelligence is unavailable."));
          return;
        }
        setContentIntelligence(body.contentIntelligence as ContentIntelligence);
        setContentIntelligencePackageId(packageId);
        setContentIntelligenceStatus("Content intelligence is a plan/draft only. It does not publish or accept evidence.");
      });
    return () => { active = false; };
  }, [selectedPackageIdForIntel]);
  const visibleContentIntelligence = pkg && contentIntelligencePackageId === pkg.id ? contentIntelligence : null;
  const discoveryMode = latestResearchRun
    ? (latestResearchRun.liveRetrieval || latestResearchRun.providerKind === "live" ? "live" : "fixture")
    : queue?.discoveryCapability === "live_bounded"
      ? "live"
      : queue?.discoveryCapability === "unavailable"
        ? "unavailable"
        : "fixture";
  const liveConfigured = Boolean(queue?.liveDiscoveryAvailable);
  const reservedPublication = publications.find((item) => (
    item.variantId === publicationVariant?.id
    && item.id === `sgo:publication:${publicationForm.slug.trim().toLowerCase()}`
  )) ?? null;
  const publicationTrackedHref = reservedPublication?.trackedHref ?? "";
  const canRecordManualPublication = Boolean(
    publicationVariant
    && queue?.variantRecordAuthority.find((item) => item.variantId === publicationVariant.id)?.canRecordManualPublication,
  );

  function selectOpportunity(item: Opportunity) {
    setSelectedOpportunityId(item.id);
    setOpportunityForm({
      slug: item.slug,
      problem: item.problem,
      audience: item.audience,
      usefulnessTest: item.usefulnessTest,
      status: item.status,
    });
    const currentPackage = queue?.packages.find((entry) => entry.id === selectedPackageId) ?? null;
    const next = applyOpportunityChange({ nextOpportunityId: item.id, currentPackage });
    if (next.clearPackageDerivedState) {
      clearPackageDerivedUiState();
    }
  }

  function selectPackage(item: Package) {
    if (selectedOpportunityId && item.opportunityId !== selectedOpportunityId) {
      warnSelectionInvariant(`Ignored package ${item.id}; it belongs to ${item.opportunityId}, not ${selectedOpportunityId}.`);
      return;
    }
    setSelectedPackageId(item.id);
    setApprovalSubject("package");
    setPackageForm({
      slug: item.slug,
      thesis: item.thesis,
      usefulnessTest: item.usefulnessTest,
      commercialPosture: item.commercialPosture,
    });
    const firstVariant = queue?.variants.find((entry) => entry.packageId === item.id);
    setPublicationVariantId(firstVariant?.id ?? null);
  }

  const proposedCandidateIds = latestResearchRun?.candidates.filter((item) => item.proposedForReview).map((item) => item.id) ?? [];
  const activeCandidateIds = selectionRunId === latestResearchRun?.id ? selectedCandidateIds : proposedCandidateIds;

  async function submit(path: string, method: string, body: Record<string, unknown>, okMessage: string) {
    const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await readJson(response);
    if (!response.ok) {
      setStatus(String(payload.error || "The Growth Queue change failed."));
      return false;
    }
    setStatus(okMessage);
    await load();
    return true;
  }

  async function createOpportunity(event: FormEvent) {
    event.preventDefault();
    await submit("/api/growth/opportunities", "POST", opportunityForm, "Opportunity saved.");
  }

  async function saveOpportunity(event: FormEvent) {
    event.preventDefault();
    if (!opportunity) return;
    await submit(`/api/growth/opportunities/${encodeURIComponent(opportunity.id)}`, "PATCH", {
      problem: opportunityForm.problem,
      audience: opportunityForm.audience,
      usefulnessTest: opportunityForm.usefulnessTest,
    }, "Opportunity updated.");
  }

  async function setOpportunityStatus(statusValue: string) {
    if (!opportunity) return;
    await submit(`/api/growth/opportunities/${encodeURIComponent(opportunity.id)}`, "PATCH", { status: statusValue }, `Opportunity ${statusValue}.`);
  }

  async function createPackage(event: FormEvent) {
    event.preventDefault();
    if (!opportunity) return;
    await submit("/api/growth/packages", "POST", {
      slug: packageForm.slug,
      thesis: packageForm.thesis,
      usefulnessTest: packageForm.usefulnessTest,
      commercialPosture: packageForm.commercialPosture,
      opportunityId: opportunity.id,
    }, "Package drafted. Manual entry only.");
  }

  async function savePackage(event: FormEvent) {
    event.preventDefault();
    if (!pkg) return;
    await submit(`/api/growth/packages/${encodeURIComponent(pkg.id)}`, "PATCH", {
      thesis: packageForm.thesis,
      usefulnessTest: packageForm.usefulnessTest,
      commercialPosture: packageForm.commercialPosture,
    }, "Package updated. Status unchanged.");
  }

  async function generateClaimProposals(event: FormEvent) {
    event.preventDefault();
    if (!pkg) return;
    await submit(`/api/growth/packages/${encodeURIComponent(pkg.id)}/claim-proposals`, "POST", {}, "Claim proposals generated. They are not claims and not evidence.");
  }

  async function runAutonomousOperator() {
    if (!pkg || !operator) return;
    const primary = operator.primaryAction;
    if (primary.id === "review_investigation_plan") {
      await submit(
        `/api/growth/packages/${encodeURIComponent(pkg.id)}/operator`,
        "POST",
        { action: "acknowledge_investigation_plan" },
        "Investigation plan acknowledged. Claims were not created. Research did not start.",
      );
      return;
    }
    if (primary.id === "create_claims") {
      await submit(
        `/api/growth/packages/${encodeURIComponent(pkg.id)}/operator`,
        "POST",
        { action: "create_claims_from_investigation" },
        "Claims created from the acknowledged investigation plan. Operator ran permitted evidence work and stopped at the next human gate.",
      );
      return;
    }
    if (primary.id === "continue_evidence_research") {
      await submit(
        `/api/growth/packages/${encodeURIComponent(pkg.id)}/operator`,
        "POST",
        { action: "continue_evidence_research" },
        "Operator continued bounded evidence research and stopped at the next human gate.",
      );
      return;
    }
    if (primary.id === "review_evidence") {
      setStatus("Review evidence in the corpus review queue. Autonomous Operator does not accept evidence, approve packages, or publish.");
      return;
    }
    if (!primary.automatic) {
      setStatus(`Next required action: ${primary.label}. Autonomous Operator will not take this human gate automatically.`);
      return;
    }
    await submit(
      `/api/growth/packages/${encodeURIComponent(pkg.id)}/operator`,
      "POST",
      { action: "advance" },
      "Operator advanced through permitted automatic steps and stopped at the next governance gate.",
    );
  }

  async function setClaimProposalReview(proposalId: string, statusValue: string) {
    await submit(`/api/growth/packages/${encodeURIComponent(pkg?.id ?? "")}/claim-proposals/${encodeURIComponent(proposalId)}`, "PATCH", { status: statusValue }, `Proposal ${statusValue}.`);
  }

  async function createSelectedClaims(event: FormEvent) {
    event.preventDefault();
    if (!pkg) return;
    await submit(`/api/growth/packages/${encodeURIComponent(pkg.id)}/claim-proposals/create-claims`, "POST", {}, "Selected proposals created as unevidenced claims. Attach evidence separately.");
  }

  async function addClaim(event: FormEvent) {
    event.preventDefault();
    if (!pkg) return;
    await submit(`/api/growth/packages/${encodeURIComponent(pkg.id)}/claims`, "POST", {
      slug: claimForm.slug,
      claimText: claimForm.claimText,
      safetySensitive: claimForm.safetySensitive,
      evidence: { kind: claimForm.evidenceKind, id: claimForm.evidenceId },
    }, "Claim attached to existing evidence.");
  }

  async function attachExtraEvidence(event: FormEvent) {
    event.preventDefault();
    if (!pkg || !extraEvidenceForm.claimId) return;
    await submit(`/api/growth/packages/${encodeURIComponent(pkg.id)}/claims/${encodeURIComponent(extraEvidenceForm.claimId)}/evidence`, "POST", {
      evidence: { kind: extraEvidenceForm.evidenceKind, id: extraEvidenceForm.evidenceId },
    }, "Additional existing evidence attached. Duplicate refs are stored once.");
  }

  async function discoverCandidates(event: FormEvent) {
    event.preventDefault();
    if (!pkg) return;
    const gap = intelligence?.claimAssessments.find((item) => item.researchPlan) ?? intelligence?.claimAssessments[0];
    await submit(`/api/growth/packages/${encodeURIComponent(pkg.id)}/research-runs`, "POST", {
      claimId: gap?.claimId ?? claims[0]?.id ?? "",
      mode: liveConfigured ? "live" : "fixture",
    }, liveConfigured
      ? "Bounded live discovery ran. Candidates are not accepted evidence."
      : "Candidates discovered from the bounded fixture provider. None are accepted evidence.");
  }

  async function submitSelectedCandidates(event: FormEvent) {
    event.preventDefault();
    if (!latestResearchRun) return;
    await submit(`/api/growth/research-runs/${encodeURIComponent(latestResearchRun.id)}/submit`, "POST", {
      candidateIds: activeCandidateIds,
    }, "Selected candidates entered corpus review. Chef Gringo did not accept them.");
  }

  async function generateContentDrafts(event: FormEvent) {
    event.preventDefault();
    if (!pkg) return;
    const response = await fetch(`/api/growth/packages/${encodeURIComponent(pkg.id)}/content-intelligence`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = await readJson(response);
    if (!response.ok) {
      setContentIntelligenceStatus(String(payload.error || "Draft generation failed."));
      return;
    }
    setContentIntelligence(payload.contentIntelligence as ContentIntelligence);
    setContentIntelligencePackageId(pkg.id);
    setContentIntelligenceStatus("Drafts generated for review. They are not saved variants and do not publish.");
  }

  async function createEvidenceRequest(event: FormEvent) {
    event.preventDefault();
    if (!pkg) return;
    await submit(`/api/growth/packages/${encodeURIComponent(pkg.id)}/evidence-requests`, "POST", {
      slug: requestForm.slug,
      opportunityId: opportunity?.id ?? null,
      question: requestForm.question,
      whyRequired: requestForm.whyRequired,
      preferredSourceType: requestForm.preferredSourceType || null,
    }, "Evidence request created. It is not evidence and does not open the approval gate.");
  }

  async function submitCandidate(event: FormEvent) {
    event.preventDefault();
    if (!candidateForm.requestId) return;
    await submit(`/api/growth/evidence-requests/${encodeURIComponent(candidateForm.requestId)}/candidates`, "POST", {
      title: candidateForm.title,
      publisher: candidateForm.publisher,
      canonicalUrl: candidateForm.canonicalUrl || null,
      excerpt: candidateForm.excerpt,
      notes: candidateForm.notes,
      provenanceMethod: candidateForm.provenanceMethod,
      evidenceDomain: "equipment",
    }, "Candidate entered the existing corpus inbox. Growth did not verify or expose it.");
  }

  async function resolveRequest(id: string) {
    await submit(`/api/growth/evidence-requests/${encodeURIComponent(id)}/resolve`, "POST", {}, "Request resolved to an existing accepted corpus document.");
  }

  async function rejectRequest(id: string) {
    await submit(`/api/growth/evidence-requests/${encodeURIComponent(id)}/reject`, "POST", { reason: "Administrator rejected this evidence request." }, "Evidence request rejected. It cannot satisfy a claim.");
  }

  async function addAsset(event: FormEvent) {
    event.preventDefault();
    await submit("/api/growth/assets", "POST", { ...assetForm, uri: assetForm.uri || null }, "Asset metadata saved. No file uploaded.");
  }

  async function previewDestination() {
    if (!pkg) return;
    const variantId = `sgo:variant:${variantForm.slug || "preview-draft"}`;
    const response = await fetch("/api/growth/destination-preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pathOrUrl: variantForm.destinationPath,
        channel: variantForm.channel,
        packageId: pkg.id,
        variantId,
      }),
    });
    const body = await readJson(response);
    const destination = body.destination as { href?: string } | undefined;
    setPreview(response.ok && destination?.href ? destination.href : String(body.error || "Preview failed."));
  }

  async function addVariant(event: FormEvent) {
    event.preventDefault();
    if (!pkg) return;
    await submit("/api/growth/variants", "POST", {
      slug: variantForm.slug,
      packageId: pkg.id,
      channel: variantForm.channel,
      copy: variantForm.copy,
      destinationPath: variantForm.destinationPath,
      assetIds: variantForm.assetId ? [variantForm.assetId] : [],
    }, "Channel variant stored. Not published.");
  }

  async function decide(decision: "approved" | "rejected") {
    if (!pkg) return;
    const subjectKind = approvalSubject === "package" ? "package" : "variant";
    const subjectId = approvalSubject === "package" ? pkg.id : approvalSubject;
    await submit("/api/growth/approvals", "POST", {
      subjectKind,
      subjectId,
      decision,
      reason,
    }, decision === "approved" ? "Approval recorded. Publishing remains disabled." : "Rejection recorded.");
    setReason("");
  }

  async function copyText(label: string, value: string) {
    if (!value) {
      setStatus(`${label} is not available yet.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`Copied ${label}.`);
    } catch {
      setStatus(`${label}: ${value}`);
    }
  }

  async function prepareTrackedUrl() {
    if (!pkg || !publicationVariant || !publicationDestination) return;
    await submit("/api/growth/publications/prepare", "POST", {
      slug: publicationForm.slug,
      packageId: pkg.id,
      variantId: publicationVariant.id,
      channel: publicationVariant.channel,
      destinationUrlId: publicationDestination.id,
    }, "Publication reserved. Copy the publication-specific tracked URL, then post it yourself.");
  }

  async function recordManualPost(event: FormEvent) {
    event.preventDefault();
    if (!pkg || !publicationVariant || !publicationDestination) return;
    await submit("/api/growth/publications", "POST", {
      slug: publicationForm.slug,
      packageId: pkg.id,
      variantId: publicationVariant.id,
      channel: publicationVariant.channel,
      platformPostUrl: publicationForm.platformPostUrl,
      platformPostId: publicationForm.platformPostId || null,
      publishedAt: publicationForm.publishedAt,
      destinationUrlId: publicationDestination.id,
    }, "Manual publication recorded. Chef Gringo did not post to the platform.");
  }

  async function loadFirstPartyPerformance(windowName = performanceWindow, pubs = publications) {
    const recorded = pubs.filter((item) => item.status === "recorded" && item.publishedAt);
    const entries = await Promise.all(recorded.map(async (item) => {
      const response = await fetch(`/api/growth/publications/${encodeURIComponent(item.id)}/performance?window=${encodeURIComponent(windowName)}`, { cache: "no-store" });
      const body = await readJson(response);
      return [item.id, response.ok ? body.report as PerformanceReport : null] as const;
    }));
    const next: Record<string, PerformanceReport> = {};
    for (const [id, report] of entries) {
      if (report) next[id] = report;
    }
    setPerformanceById(next);
    setStatus(recorded.length ? `Loaded first-party performance for ${recorded.length} recorded publication(s).` : "No recorded publications to report.");
  }

  return (
    <div className="admin-workspace growth-queue">
      <aside className="admin-sidebar">
        <p className="eyebrow">Founder-only</p>
        <h1>Growth Queue</h1>
        <p className="growth-queue-banner" role="status">NO PUBLISHING ENABLED</p>
        <nav aria-label="Opportunities">
          {(queue?.opportunities ?? []).map((item) => (
            <button className={item.id === selectedOpportunityId ? "active" : ""} type="button" key={item.id} onClick={() => selectOpportunity(item)}>
              {item.slug}<span>{item.id === selectedOpportunityId ? "Opportunity: active" : item.status}</span>
            </button>
          ))}
        </nav>
        <p className="admin-note">Manual drafts only. A later drafting adapter may fill fields; it cannot approve or publish. Commercial posture is not a ranker. Package status is not publishing authority.</p>
        <Link className="admin-workflow-link" href="/admin/marketplace">Marketplace admin →</Link>
        <Link className="admin-workflow-link" href="/admin/marketplace/research">Corpus / evidence →</Link>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Social Growth Operator · Step 3</p>
            <h2>Prepare useful packages. Record a manual post. Read first-party results only.</h2>
          </div>
          <span className="admin-record-count">{status}</span>
        </header>

        <section className="admin-panel" aria-labelledby="opportunity-title">
          <div className="admin-panel-heading"><h3 id="opportunity-title">Opportunity</h3><span>Create / edit / select / discard</span></div>
          <form className="product-form" onSubmit={opportunity ? saveOpportunity : createOpportunity}>
            <label>Slug<input required value={opportunityForm.slug} disabled={Boolean(opportunity)} onChange={(event) => setOpportunityForm({ ...opportunityForm, slug: event.target.value })} /></label>
            <label>Audience<select value={opportunityForm.audience} onChange={(event) => setOpportunityForm({ ...opportunityForm, audience: event.target.value })}><option value="home_cook">Home cook</option><option value="independent_operator">Independent operator</option><option value="both">Both</option></select></label>
            <label className="form-span">Problem<textarea required value={opportunityForm.problem} onChange={(event) => setOpportunityForm({ ...opportunityForm, problem: event.target.value })} /></label>
            <label className="form-span">Usefulness test<textarea required value={opportunityForm.usefulnessTest} onChange={(event) => setOpportunityForm({ ...opportunityForm, usefulnessTest: event.target.value })} /></label>
            <div className="form-span admin-form-actions">
              <p>{opportunity ? `Selected: ${opportunity.id}` : "Creates a new opportunity. No social network is contacted."}</p>
              <div className="growth-queue-actions">
                <button className="button" type="submit">{opportunity ? "Save opportunity" : "Create opportunity"}</button>
                {opportunity ? (
                  <>
                    <button type="button" onClick={() => void setOpportunityStatus("selected")}>Select</button>
                    <button type="button" onClick={() => void setOpportunityStatus("discarded")}>Discard</button>
                    <button type="button" onClick={() => { setSelectedOpportunityId(null); setOpportunityForm(emptyOpportunity); clearPackageDerivedUiState(); }}>New</button>
                  </>
                ) : null}
              </div>
            </div>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="package-title">
          <div className="admin-panel-heading">
            <h3 id="package-title">Package</h3>
            <span>Commercial posture: {pkg?.commercialPosture ?? "none"} · status {pkg?.status ?? "—"} · authority {authority?.hasValidApproval ? "approval record present" : "no publication authority"}</span>
          </div>
          <div className="growth-queue-split">
            <ul className="growth-queue-list">
              {packages.map((item) => (
                <li key={item.id}><button type="button" className={item.id === pkg?.id ? "active" : ""} onClick={() => selectPackage(item)}>{item.slug} · {item.commercialPosture} · {item.id === pkg?.id ? "Package: selected" : item.status}</button></li>
              ))}
            </ul>
            <form className="product-form" onSubmit={pkg && packageForm.slug === pkg.slug ? savePackage : createPackage}>
              <label>Slug<input required value={packageForm.slug} disabled={Boolean(pkg) && packageForm.slug === pkg?.slug} onChange={(event) => setPackageForm({ ...packageForm, slug: event.target.value })} /></label>
              <label>Commercial posture<select value={packageForm.commercialPosture} onChange={(event) => setPackageForm({ ...packageForm, commercialPosture: event.target.value })}><option value="none">none</option><option value="informational">informational</option><option value="pending">pending</option><option value="affiliate">affiliate</option></select></label>
              <label className="form-span">Thesis<textarea required value={packageForm.thesis} onChange={(event) => setPackageForm({ ...packageForm, thesis: event.target.value })} /></label>
              <label className="form-span">Usefulness test<textarea required value={packageForm.usefulnessTest} onChange={(event) => setPackageForm({ ...packageForm, usefulnessTest: event.target.value })} /></label>
              <div className="form-span admin-form-actions">
                <p>{opportunity ? (pkg ? `Package belongs to opportunity ${opportunity.slug}.` : `Creates a new package under opportunity ${opportunity.slug}. No package is selected.`) : "Select an opportunity before creating a package."} Monetization stays downstream of usefulness. Commission is not a field. Status cannot be patched here.</p>
                <div className="growth-queue-actions">
                  <button className="button" type="submit" disabled={!opportunity}>{pkg && packageForm.slug === pkg.slug ? "Save package" : "Create package"}</button>
                  {pkg ? <button type="button" onClick={() => clearPackageDerivedUiState()}>New package</button> : null}
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="admin-panel" aria-labelledby="autonomous-operator-title">
          <div className="admin-panel-heading">
            <h3 id="autonomous-operator-title">Autonomous Operator</h3>
            <span>{operator?.state ?? "intake"} · publishing disabled · founder control room</span>
          </div>
          <p className="growth-queue-note">Orchestrates permitted operations only. Stops at human governance gates. Create claims from investigation is explicit human authorization to create unevidenced claims from the current acknowledged plan, then run bounded research. Does not accept evidence, approve packages, or publish. Growth Queue below remains the audit trail.</p>
          {pkg && operator ? (
            <>
              <p className="growth-queue-note" aria-label="Operator Summary">
                <strong>Operator Summary</strong>
                <span>{operator.summary.headline}</span>
                <span>{operator.summary.materialQuestionCount} material questions · {operator.summary.safetySensitiveCount} safety-sensitive · {operator.summary.claimCount ?? 0} claims · {operator.summary.verifiedFactCount} verified facts</span>
                <span>{operator.summary.unresearchedGapCount ?? 0} unresearched gaps · {operator.summary.awaitingCorpusReviewCount ?? 0} awaiting corpus review · {operator.summary.rejectedCorpusCandidateCount ?? 0} rejected (history)</span>
                <span>{operator.summary.researchStatus}</span>
                <span>Human action: {operator.summary.humanAction ?? "none required for the next automatic step"}</span>
              </p>
              {investigationPlan?.state === "acknowledged" && operator.state === "claims_needed" ? (
                <p className="growth-queue-note" aria-label="Investigation plan acknowledged">
                  <strong>Investigation plan acknowledged</strong>
                  <span>Current operator state: {operator.state}</span>
                  <span>Next required action: {operator.primaryAction.label}</span>
                  <span>Claims were not created. Research did not start. Evidence was not accepted. The package was not approved. Publishing stays disabled.</span>
                </p>
              ) : null}
              {humanReviewTasks.filter((item) => item.state === "open").map((task) => (
                <p className="growth-queue-note" key={task.id}>
                  <strong>Human review</strong>
                  <span>{task.decisionRequired}</span>
                  <span>Why automation stopped: {task.whyAutomationStopped}</span>
                  <span>If acknowledged: {task.approveConsequence}</span>
                  <span>If rejected: {task.rejectConsequence}</span>
                </p>
              ))}
              <ul className="growth-queue-evidence" aria-label="Refined investigation plan">
                {materialInvestigationItems.map((item) => (
                  <li key={item.itemKey}>
                    <strong>{item.kind}{item.safetySensitive ? " · safety-sensitive" : ""} · priority {item.priority}</strong>
                    <span>{item.researchQuestion}</span>
                    <span>Why it matters: {item.whyItMatters}</span>
                    <span>Authority: {item.recommendedSourceClass} · human review before claim creation</span>
                    <span>Provenance: {item.sourceProposalIds.length} raw proposal{item.sourceProposalIds.length === 1 ? "" : "s"}</span>
                  </li>
                ))}
                {pkg && investigationPlan && materialInvestigationItems.length === 0 ? <li><strong>No material investigation items</strong><span>Context-only metadata was pruned from the research budget.</span></li> : null}
                {contextInvestigationItems.map((item) => (
                  <li key={item.itemKey}>
                    <strong>context-only · pruned</strong>
                    <span>{item.researchQuestion}</span>
                    <span>{item.prunedReason}</span>
                  </li>
                ))}
              </ul>
              {operator.state === "corpus_review_required" || evidenceReviewQueue.length ? (
                <ul className="growth-queue-evidence" aria-label="Evidence review queue">
                  {evidenceReviewQueue.map((item) => (
                    <li key={item.candidateId}>
                      <strong>{item.publisher || "Unknown publisher"} · {item.authorityClass}{item.policyAdvancement ? ` · ${item.policyAdvancement.replace(/_/g, " ")}` : ""}</strong>
                      <span>Claim: {item.claimText}</span>
                      <span>Coverage: {item.claimCoverage || "unrecorded"} · Authority: {item.authorityClass.replace(/_/g, " ")} · Advancement: {(item.policyAdvancement || "none").replace(/_/g, " ")}</span>
                      <span>{item.title}</span>
                      <span>{item.canonicalUrl}</span>
                      <span>{item.excerpt}</span>
                      <span>Provenance: {item.retrievalStatus || "ok"} · corpus {item.ingestionStatus || "awaiting_review"} · not accepted evidence · {item.whyItMatters}</span>
                      <span><a href="/admin/marketplace/research">Open corpus review</a></span>
                    </li>
                  ))}
                  {evidenceReviewQueue.length === 0 ? (
                    <li>
                      <strong>No candidates awaiting corpus review</strong>
                      <span>Research stopped without a policy-advancing candidate. Continue evidence research if gaps remain.</span>
                    </li>
                  ) : null}
                </ul>
              ) : null}
              {evidenceReviewHistory.length ? (
                <ul className="growth-queue-evidence" aria-label="Corpus submission history">
                  {evidenceReviewHistory.slice(0, 8).map((item) => (
                    <li key={`history-${item.candidateId}`}>
                      <strong>History · {item.ingestionStatus || "unknown"} · {item.publisher || "Unknown publisher"}</strong>
                      <span>{item.title}</span>
                      <span>{item.canonicalUrl}</span>
                      <span>Not actionable. Current corpus disposition: {item.ingestionStatus || "unknown"}.</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="growth-queue-actions">
                <button
                  className="button"
                  type="button"
                  disabled={!pkg || (!operator.primaryAction.automatic && !["review_investigation_plan", "create_claims", "continue_evidence_research", "review_evidence"].includes(operator.primaryAction.id))}
                  onClick={() => void runAutonomousOperator()}
                >
                  {operator.primaryAction.label}
                </button>
              </div>
              <p className="admin-note">One primary action. Existing granular controls remain below for audit and debugging. Repeated actions are idempotent at this gate.</p>
            </>
          ) : (
            <p className="growth-queue-note">Select a package to see operator state. Operator actions are package-scoped and cannot resurrect another opportunity&apos;s child state.</p>
          )}
        </section>

        <section className="admin-panel" aria-labelledby="claim-decomposition-title">
          <div className="admin-panel-heading">
            <h3 id="claim-decomposition-title">Claim Decomposition</h3>
            <span>Raw proposals · audit detail · not evidence · publishing disabled</span>
          </div>
          <p className="growth-queue-note">Raw proposal cards remain for provenance. Refined investigation items live in Autonomous Operator above. Generate, inspect, Select or Discard, then Create selected claims. That action does not attach evidence, approve, or publish.</p>
          <form className="product-form" onSubmit={generateClaimProposals}>
            <div className="form-span admin-form-actions">
              <p>{pkg ? `Parent package: ${pkg.slug}. Existing claims are not recreated.` : "Select a package before generating proposals."}</p>
              <div className="growth-queue-actions">
                <button className="button" type="submit" disabled={!pkg}>Generate proposals</button>
              </div>
            </div>
          </form>
          <ul className="growth-queue-evidence">
            {claimProposals.map((proposal) => (
              <li key={proposal.id}>
                <strong>{proposal.claimKind} · {proposal.status}{proposal.safetySensitive ? " · safety-sensitive" : ""}{proposal.createdClaimId ? " · claim created" : ""}</strong>
                <span>{proposal.proposedClaimText}</span>
                <span>Why it matters: {proposal.whyItMatters}</span>
                <span>Authority: {proposal.recommendedSourceClass} · {proposal.authorityRequirement}</span>
                <span>Independence: {proposal.independenceRequirement}</span>
                <span>Trace: {proposal.sourceTrace.field} · {proposal.sourceTrace.excerpt} · thesis is not evidence</span>
                <span>
                  <button type="button" disabled={!pkg || Boolean(proposal.createdClaimId)} onClick={() => void setClaimProposalReview(proposal.id, "selected")}>Select</button>
                  {" "}
                  <button type="button" disabled={!pkg || Boolean(proposal.createdClaimId)} onClick={() => void setClaimProposalReview(proposal.id, "discarded")}>Discard</button>
                </span>
              </li>
            ))}
            {pkg && claimProposals.length === 0 ? <li><strong>No proposals</strong><span>Generate proposals to inspect atomic claims before creating rows.</span></li> : null}
          </ul>
          <form className="product-form" onSubmit={createSelectedClaims}>
            <div className="form-span admin-form-actions">
              <p>Create selected claims writes claim rows without evidence. Discarded proposals never become claims. Evidence Intelligence can then classify missing evidence.</p>
              <div className="growth-queue-actions">
                <button className="button" type="submit" disabled={!pkg || !claimProposals.some((item) => item.status === "selected" && !item.createdClaimId)}>Create selected claims</button>
              </div>
            </div>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="claims-title">
          <div className="admin-panel-heading"><h3 id="claims-title">Claims / evidence</h3><span>Historical gate: {gate?.canApprove ? "open" : "blocked"} · Intelligence authority: {intelligence?.decisionDna.intelligenceAuthority ?? (intelligence?.intelligenceAuthorityReady ? "ready" : intelligence ? "blocked" : "—")}</span></div>
          {gate?.blockers.length ? <p className="growth-queue-blockers" role="alert">{gate.blockers.join(" ")}</p> : null}
          <ul className="growth-queue-evidence">
            {claims.map((claim) => {
              const refs = (claim.evidenceRefs?.length ? claim.evidenceRefs : [claim.evidence]).filter((ref) => ref?.id);
              return (
                <li key={claim.id}>
                  <strong>{claim.claimText}</strong>
                  <span>{refs.length} attached ref{refs.length === 1 ? "" : "s"}{claim.safetySensitive ? " · safety-sensitive" : ""} · {claim.id}</span>
                  <span>{refs.length ? refs.map((ref) => {
                    const item = queue?.evidenceCatalog.find((entry) => entry.kind === ref.kind && entry.id === ref.id);
                    return `${ref.kind}:${ref.id} (${item?.verificationStatus || item?.ingestionStatus || "referenced"})`;
                  }).join(" · ") : "no evidence attached"}</span>
                </li>
              );
            })}
          </ul>
          <form className="product-form" onSubmit={addClaim}>
            <label>Claim slug<input required value={claimForm.slug} onChange={(event) => setClaimForm({ ...claimForm, slug: event.target.value })} /></label>
            <label>Safety-sensitive<select value={claimForm.safetySensitive ? "yes" : "no"} onChange={(event) => setClaimForm({ ...claimForm, safetySensitive: event.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes — verified evidence required</option></select></label>
            <label className="form-span">Claim text<textarea required value={claimForm.claimText} onChange={(event) => setClaimForm({ ...claimForm, claimText: event.target.value })} /></label>
            <label>Evidence<select value={`${claimForm.evidenceKind}:${claimForm.evidenceId}`} onChange={(event) => {
              const [kind, ...rest] = event.target.value.split(":");
              setClaimForm({ ...claimForm, evidenceKind: kind, evidenceId: rest.join(":") });
            }}>
              <option value="knowledge_source:">Select existing evidence</option>
              {(queue?.evidenceCatalog ?? []).map((item) => (
                <option key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.kind} · {item.label} · {item.verificationStatus || item.ingestionStatus || "n/a"}</option>
              ))}
            </select></label>
            <div className="form-span admin-form-actions">
              <p>References existing sources, workflow sources, corpus documents, or citations. Does not create a second evidence store. An evidence request is not selectable here.</p>
              <button className="button" type="submit" disabled={!pkg}>Attach claim</button>
            </div>
          </form>
          <form className="product-form" onSubmit={attachExtraEvidence}>
            <label>Existing claim<select required value={extraEvidenceForm.claimId} onChange={(event) => setExtraEvidenceForm({ ...extraEvidenceForm, claimId: event.target.value })}>
              <option value="">Select a claim</option>
              {claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.claimText}</option>)}
            </select></label>
            <label>Additional evidence<select value={`${extraEvidenceForm.evidenceKind}:${extraEvidenceForm.evidenceId}`} onChange={(event) => {
              const [kind, ...rest] = event.target.value.split(":");
              setExtraEvidenceForm({ ...extraEvidenceForm, evidenceKind: kind, evidenceId: rest.join(":") });
            }}>
              <option value="knowledge_source:">Select existing evidence</option>
              {(queue?.evidenceCatalog ?? []).map((item) => (
                <option key={`extra-${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.kind} · {item.label} · {item.verificationStatus || item.ingestionStatus || "n/a"}</option>
              ))}
            </select></label>
            <div className="form-span admin-form-actions">
              <p>Attaches another existing corpus or knowledge record to the same claim. Duplicates are ignored. This is not a second evidence store.</p>
              <button className="button" type="submit" disabled={!pkg || !extraEvidenceForm.claimId}>Attach additional evidence</button>
            </div>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="evidence-needed-title">
          <div className="admin-panel-heading">
            <h3 id="evidence-needed-title">Evidence needed</h3>
            <span>Bridge to existing corpus review · not a second store</span>
          </div>
          {!gate?.canApprove ? <p className="growth-queue-blockers" role="alert">This package stays blocked until an existing accepted evidence record is attached as a claim. Creating a request does not bypass that gate.</p> : null}
          <p className="growth-queue-note">Preferred hierarchy: government/regulatory guidance, accessible codes/standards, manufacturer technical documentation, equipment manuals, recognized technical organizations, then primary documentation. Editorial material keeps its actual provenance. Manufacturer copy is not automatically true. Review happens in the existing corpus library. Live web research stays off.</p>
          <ul className="growth-queue-evidence">
            {evidenceRequests.map((item) => (
              <li key={item.id}>
                <strong>{item.status} · {item.question}</strong>
                <span>{item.whyRequired} · created by {item.createdBy}{item.candidateDocumentId ? ` · candidate ${item.candidateDocumentId}` : ""}{item.resolvedEvidence ? ` · resolved ${item.resolvedEvidence.kind}:${item.resolvedEvidence.id}` : ""}</span>
                <div className="growth-queue-actions">
                  <button type="button" onClick={() => setCandidateForm({ ...candidateForm, requestId: item.id })}>Use for candidate</button>
                  <button type="button" onClick={() => void resolveRequest(item.id)}>Resolve if corpus accepted</button>
                  <button type="button" onClick={() => void rejectRequest(item.id)}>Reject request</button>
                </div>
              </li>
            ))}
            {evidenceRequests.length === 0 ? <li><strong>No evidence requests</strong><span>Ask a specific unsupported question. Do not attach unrelated catalog rows.</span></li> : null}
          </ul>
          <form className="product-form" onSubmit={createEvidenceRequest}>
            <label>Request slug<input required value={requestForm.slug} onChange={(event) => setRequestForm({ ...requestForm, slug: event.target.value })} /></label>
            <label>Preferred source class<select value={requestForm.preferredSourceType} onChange={(event) => setRequestForm({ ...requestForm, preferredSourceType: event.target.value })}>
              <option value="government_regulatory">government / regulatory</option>
              <option value="electrical_code_standard">electrical code / standard</option>
              <option value="manufacturer_technical">manufacturer technical</option>
              <option value="equipment_manual">equipment manual</option>
              <option value="industry_organization">industry organization</option>
              <option value="primary_documentation">primary documentation</option>
              <option value="editorial">editorial (secondary)</option>
            </select></label>
            <label className="form-span">Unsupported claim / research question<textarea required value={requestForm.question} onChange={(event) => setRequestForm({ ...requestForm, question: event.target.value })} placeholder="What must be true, and what source class should support it?" /></label>
            <label className="form-span">Why evidence is required<textarea required value={requestForm.whyRequired} onChange={(event) => setRequestForm({ ...requestForm, whyRequired: event.target.value })} /></label>
            <div className="form-span admin-form-actions">
              <p>This request is workflow metadata. It cannot approve the package and cannot become verified evidence.</p>
              <button className="button" type="submit" disabled={!pkg}>Create evidence request</button>
            </div>
          </form>
          <form className="product-form" onSubmit={submitCandidate}>
            <label>Evidence request<select required value={candidateForm.requestId} onChange={(event) => setCandidateForm({ ...candidateForm, requestId: event.target.value })}>
              <option value="">Select a request</option>
              {evidenceRequests.map((item) => <option key={item.id} value={item.id}>{item.question}</option>)}
            </select></label>
            <label>Title<input required value={candidateForm.title} onChange={(event) => setCandidateForm({ ...candidateForm, title: event.target.value })} /></label>
            <label>Publisher / source<input required value={candidateForm.publisher} onChange={(event) => setCandidateForm({ ...candidateForm, publisher: event.target.value })} /></label>
            <label className="form-span">Source URL<input value={candidateForm.canonicalUrl} onChange={(event) => setCandidateForm({ ...candidateForm, canonicalUrl: event.target.value })} placeholder="https://…" /></label>
            <label>Provenance<select value={candidateForm.provenanceMethod} onChange={(event) => setCandidateForm({ ...candidateForm, provenanceMethod: event.target.value })}>
              <option value="founder_uploaded_document">founder uploaded / transcribed</option>
              <option value="manually_verified_excerpt">manually verified excerpt</option>
              <option value="repository_practice">repository practice</option>
            </select></label>
            <label className="form-span">Excerpt / claim support<textarea required value={candidateForm.excerpt} onChange={(event) => setCandidateForm({ ...candidateForm, excerpt: event.target.value })} placeholder="Paste the supporting excerpt. A URL alone is never accepted evidence." /></label>
            <label className="form-span">Notes<input value={candidateForm.notes} onChange={(event) => setCandidateForm({ ...candidateForm, notes: event.target.value })} /></label>
            <div className="form-span admin-form-actions">
              <p>Submits into the existing corpus inbox at awaiting review. Growth cannot accept, verify, or expose it. Continue review in the corpus library.</p>
              <div className="growth-queue-actions">
                <button className="button" type="submit" disabled={!candidateForm.requestId}>Submit corpus candidate</button>
                <Link className="admin-workflow-link" href="/admin/marketplace/research">Open corpus review →</Link>
              </div>
            </div>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="evidence-intelligence-title">
          <div className="admin-panel-heading">
            <h3 id="evidence-intelligence-title">Evidence Intelligence</h3>
            <span>Sufficiency is not corpus acceptance · not publication authority</span>
          </div>
          <p className="growth-queue-note">This layer judges whether accepted evidence is sufficient, independent, and authoritative enough for the claim. It cannot accept corpus documents, approve the package, or publish. Historical approval remains a separate gate. Commercial posture does not change authority.</p>
          <ul className="growth-queue-evidence">
            {(intelligence?.claimAssessments ?? []).map((item) => (
              <li key={item.claimId}>
                <strong>{item.state} · {item.claimText}</strong>
                <span>
                  {item.acceptedSourceCount} accepted sources · {item.independentSourceCount} independent publishers
                  {" · "}{item.policyClass}
                  {item.safetySensitive ? " · safety-sensitive" : ""}
                  {" · authority "}{item.authorityStatus}
                </span>
                <span>{item.acceptedSources.map((source) => `${source.publisher || source.ref.id} (${source.authorityClass})`).join(" · ") || "No accepted sources"}</span>
                <span>Gaps: {item.gaps.join(" ") || "none"}</span>
                <span>Next: {item.recommendedNextAction}</span>
                {item.researchPlan ? <span>Plan: {item.researchPlan.reason} Stop: {item.researchPlan.stopCondition}</span> : null}
              </li>
            ))}
            {intelligence && intelligence.claimAssessments.length === 0 ? <li><strong>No claims to assess</strong><span>Attach existing evidence to a claim, or open an evidence request.</span></li> : null}
          </ul>
          <div className="admin-panel-heading"><h4>Evidence Gap Radar</h4><span>{intelligence?.policyVersion ?? "not loaded"}</span></div>
          <ul className="growth-queue-evidence">
            {(intelligence?.radar.supported ?? []).map((item) => <li key={`s-${item.id}`}><strong>supported</strong><span>{item.label}</span></li>)}
            {(intelligence?.radar.partial ?? []).map((item) => <li key={`p-${item.id}`}><strong>partial</strong><span>{item.label}</span></li>)}
            {(intelligence?.radar.unsupported ?? []).map((item) => <li key={`u-${item.id}`}><strong>unsupported</strong><span>{item.label}</span></li>)}
            {(intelligence?.radar.unresolvedEvidenceRequests ?? []).map((item) => <li key={`r-${item.id}`}><strong>unresolved request · {item.state}</strong><span>{item.label} · {item.recommendedNextAction}</span></li>)}
            {(intelligence?.radar.needsIndependentCorroboration ?? []).map((item) => <li key={`i-${item.id}`}><strong>independent corroboration needed</strong><span>{item.label}</span></li>)}
            {(intelligence?.radar.strongerAuthority ?? []).map((item) => <li key={`a-${item.id}`}><strong>stronger authority required</strong><span>{item.label}</span></li>)}
            {(intelligence?.radar.contradictions ?? []).map((item) => <li key={`c-${item.id}`}><strong>contradiction</strong><span>{item.label}</span></li>)}
            {!intelligence ? <li><strong>Select a package</strong><span>Intelligence is derived per package from existing claims, requests, and corpus state.</span></li> : null}
          </ul>
          <div className="admin-panel-heading"><h4>Decision DNA</h4><span>Readiness states stay distinct</span></div>
          {intelligence?.decisionDna ? (
            <ul className="growth-queue-evidence">
              <li><strong>Problem</strong><span>{intelligence.decisionDna.problem || "No opportunity problem on file."}</span></li>
              <li><strong>Audience</strong><span>{intelligence.decisionDna.audience || "unknown"}</span></li>
              <li><strong>Thesis</strong><span>{intelligence.decisionDna.thesis}</span></li>
              <li><strong>Commercial posture</strong><span>{intelligence.decisionDna.commercialPosture} · metadata only</span></li>
              <li><strong>Historical gate</strong><span>{intelligence.decisionDna.historicalGate ?? (intelligence.historicalCanApprove ? "open" : "blocked")} · existence/verification only · not readiness</span></li>
              <li><strong>Intelligence authority</strong><span>{intelligence.decisionDna.intelligenceAuthority ?? (intelligence.intelligenceAuthorityReady ? "ready" : "blocked")} · required for human package approval</span></li>
              <li><strong>Autonomy readiness</strong><span>{intelligence.decisionDna.autonomyReadiness ?? intelligence.autonomyReadiness ?? "blocked"} · classification only · does not execute</span></li>
              <li><strong>Evidence readiness</strong><span>{intelligence.decisionDna.evidenceReadiness}</span></li>
              <li><strong>Content readiness</strong><span>{intelligence.decisionDna.contentReadiness}</span></li>
              <li><strong>Recommendation readiness</strong><span>{intelligence.decisionDna.recommendationReadiness}</span></li>
              <li><strong>Publication readiness</strong><span>{intelligence.decisionDna.publicationReadiness}</span></li>
              <li><strong>Unresolved questions</strong><span>{intelligence.decisionDna.unresolvedQuestions.join(" · ") || "none"}</span></li>
              <li><strong>Contradictions</strong><span>{intelligence.decisionDna.contradictions.join(" · ") || "none"}</span></li>
              <li><strong>Assumptions</strong><span>{intelligence.decisionDna.assumptions.join(" ")}</span></li>
            </ul>
          ) : <p className="growth-queue-note">Decision DNA appears after a package is selected.</p>}
          <div className="admin-panel-heading"><h4>Research Plan</h4><span>Discovery: {discoveryMode}{liveConfigured ? "" : " · live unavailable"}</span></div>
          <ul className="growth-queue-evidence">
            {(intelligence?.claimAssessments ?? []).filter((item) => item.researchPlan).map((item) => (
              <li key={`plan-${item.claimId}`}>
                <strong>{item.policyClass} · {item.safetySensitive ? "safety-sensitive" : "standard risk"} · {item.state.replace(/_/g, " ")}</strong>
                <span>{item.researchPlan?.claimOrQuestion}</span>
                <span>Remaining policy gap: {item.state.replace(/_/g, " ")} · need {item.researchPlan?.independentSourcesDesired} independent source(s) · required {item.researchPlan?.requiredAuthorityClass}</span>
                <span>Accepted publishers: {item.acceptedSources.map((source) => source.publisher || source.ref.id).join(", ") || "none"}</span>
                <span>Publishers excluded from next run: {item.state === "needs_independent_corroboration" || item.state === "conflicted" ? (item.acceptedSources.map((source) => source.publisher).filter(Boolean).join(", ") || "none") : "none"}</span>
                <span>Authoritative source paths planned: {item.state === "insufficient_authority"
                  ? "government/regulatory · professional/engineering/standards · education technical"
                  : "independent technical PDF/manual · professional/engineering/standards · government/education"}</span>
                <span>Authority classes still needed: {item.state === "insufficient_authority" || item.state === "needs_independent_corroboration" ? (item.researchPlan?.requiredAuthorityClass || "especially_authoritative") : "none"}</span>
                <span>Preferred: {(item.researchPlan?.preferredPrimarySources ?? []).join("; ")}</span>
                <span>Disallowed: {(item.researchPlan?.disallowedSourceClasses ?? []).join(", ")}</span>
                <span>Why: {item.researchPlan?.reason}</span>
                <span>Stop: {item.researchPlan?.stopCondition}</span>
              </li>
            ))}
            {latestResearchRun ? (
              <li>
                <strong>{latestResearchRun.providerKind === "live" ? "Live run" : "Fixture run"}</strong>
                <span>Queries executed {latestResearchRun.queriesExecuted.length} / {latestResearchRun.plan.maximumQueries || RESEARCH_LIMITS.maximumQueries}</span>
                <span>URLs attempted {latestResearchRun.diagnostics?.urlAttemptCount ?? latestResearchRun.diagnostics?.retrievalAttemptedCount ?? 0} / {RESEARCH_LIMITS.maximumUrlAttempts}</span>
                <span>Duplicates/already-counted skipped before retrieval: {latestResearchRun.diagnostics?.alreadyCountedSkippedCount ?? latestResearchRun.diagnostics?.preRetrievalExclusionCount ?? 0}</span>
                <span>Prior URLs skipped: {latestResearchRun.diagnostics?.priorUrlsSkipped ?? latestResearchRun.diagnostics?.memorySkippedCount ?? 0}</span>
                <span>Retrieval attempts saved: {(latestResearchRun.diagnostics?.urlAttemptsSaved ?? 0)}</span>
                <span>Memory retrieval attempts saved: {latestResearchRun.diagnostics?.memoryUrlAttemptsSaved ?? 0}</span>
                <span>New URLs assessed: {latestResearchRun.diagnostics?.newUrlsAssessed ?? latestResearchRun.candidates.filter((item) => (item.memoryState || item.extraction?.memoryState || "new_candidate") === "new_candidate" && (item.retrievalStatus || "ok") === "ok").length}</span>
                <span>URL attempts saved: {latestResearchRun.diagnostics?.urlAttemptsSaved ?? 0}</span>
                <span>Authoritative source paths planned: {(latestResearchRun.plan.queryPlans ?? latestResearchRun.diagnostics?.queryAuthorityPaths ?? []).map((item) => `${item.authorityPath.replace(/_/g, " ")}`).join(" · ") || "none"}</span>
                {(latestResearchRun.plan.queryPlans ?? latestResearchRun.diagnostics?.queryAuthorityPaths ?? []).map((item) => (
                  <span key={item.query}>Authority path {item.authorityPath.replace(/_/g, " ")}: {item.query}</span>
                ))}
                <span>Cross-run memory: {latestResearchRun.plan.researchMemorySummary
                  ? `${latestResearchRun.plan.researchMemorySummary.priorRunCount} prior run(s) · ${latestResearchRun.plan.researchMemorySummary.attemptedUrlCount} attempted URL(s) · ${latestResearchRun.plan.researchMemorySummary.skippableUrlCount} skippable · gap ${latestResearchRun.plan.researchMemorySummary.policyGap.replace(/_/g, " ")}`
                  : "none"}</span>
                <span>Candidates assessed {latestResearchRun.diagnostics?.assessedCandidateCount ?? latestResearchRun.candidates.filter((item) => (item.retrievalStatus || "ok") === "ok" && item.policyAdvancement !== "already_counted").length} / {latestResearchRun.plan.maximumCandidateDocuments || RESEARCH_LIMITS.maximumCandidates}</span>
                <span>PDFs parsed {latestResearchRun.diagnostics?.pdfParsedCount ?? 0} · PDF leads unextractable {latestResearchRun.diagnostics?.pdfUnextractableCount ?? latestResearchRun.candidates.filter((item) => item.extraction?.extractionMethod === "pdf_unsupported").length}</span>
                <span>Sources selected {latestResearchRun.candidates.filter((item) => item.proposedForReview).length} · contradictions {latestResearchRun.candidates.filter((item) => item.relationship === "contradicts" || item.relationship === "mixed").length}</span>
                <span>Queries: {latestResearchRun.queriesExecuted.join(" · ") || latestResearchRun.plan.queries.join(" · ")}</span>
                <span>Publishers excluded from this run: {(latestResearchRun.plan.evidenceGap?.excludedPublisherClusters ?? latestResearchRun.plan.evidenceGap?.acceptedPublishers ?? []).join(", ") || "none"}</span>
                <span>Stop recorded: {latestResearchRun.stopReason}</span>
                {latestResearchRun.diagnostics?.queryContinuationReason ? <span>{latestResearchRun.diagnostics.queryContinuationReason}</span> : null}
                {(latestResearchRun.diagnostics?.querySkipReasons ?? []).map((reason) => <span key={reason}>{reason}</span>)}
                {latestResearchRun.diagnostics ? (
                  <span>
                    Provider raw {latestResearchRun.diagnostics.rawResultCount}
                    {" · "}normalized {latestResearchRun.diagnostics.normalizedHitCount}
                    {" · "}URL-safe {latestResearchRun.diagnostics.urlSafeCount}
                    {" · "}deduped {latestResearchRun.diagnostics.deduplicatedCount}
                    {" · "}retrieval attempted {latestResearchRun.diagnostics.retrievalAttemptedCount}
                    {" · "}ok {latestResearchRun.diagnostics.retrievalSuccessCount}
                    {" · "}blocked {latestResearchRun.diagnostics.blockedCount}
                    {" · "}timeout {latestResearchRun.diagnostics.timeoutCount}
                    {" · "}oversized {latestResearchRun.diagnostics.oversizedCount}
                    {" · "}unextractable {latestResearchRun.diagnostics.unextractableCount}
                    {" · "}failed {latestResearchRun.diagnostics.failedCount}
                    {" · "}PDFs detected {latestResearchRun.diagnostics.pdfDetectedCount ?? 0}
                  </span>
                ) : null}
              </li>
            ) : null}
            {!((intelligence?.claimAssessments ?? []).some((item) => item.researchPlan)) && !latestResearchRun ? <li><strong>No research required</strong><span>Evidence Intelligence has no remaining gap plan for this package.</span></li> : null}
          </ul>
          <form className="product-form" onSubmit={discoverCandidates}>
            <div className="form-span admin-form-actions">
              <p>{liveConfigured
                ? "Discover candidates uses the bounded live provider when configured. It does not accept evidence or publish."
                : "Discover candidates uses the bounded fixture provider. Live discovery is unavailable until a search endpoint is configured. This is not a live web search."}</p>
              <button className="button" type="submit" disabled={!pkg}>Discover candidates</button>
            </div>
          </form>
          <ul className="growth-queue-evidence">
            <li>
              <strong>Candidate memory states</strong>
              <span>new_candidate · seen_before · memory_skipped · plus the existing policy-advancement label</span>
            </li>
            {(latestResearchRun?.candidates ?? []).map((candidate) => {
              const coverage = candidate.claimCoverage || candidate.extraction?.claimCoverage || "none";
              const topical = candidate.topicalRelevance || candidate.extraction?.topicalRelevance
                || (candidate.relationship === "supports" ? "relevant" : candidate.relationship === "relevant" ? "partial" : "irrelevant");
              const advancementRaw = candidate.policyAdvancement || candidate.extraction?.policyAdvancement || "none";
              const advancement = advancementRaw === "relevant_no_policy_gain" ? "none" : advancementRaw;
              const independence = advancementRaw === "already_counted" ? "already_counted" : "independent";
              const supportsVisible = candidate.relationship === "supports" && coverage === "direct";
              return (
                <li key={candidate.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={activeCandidateIds.includes(candidate.id)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...activeCandidateIds, candidate.id]
                          : activeCandidateIds.filter((id) => id !== candidate.id);
                        setSelectionRunId(latestResearchRun.id);
                        setSelectedCandidateIds(next);
                      }}
                    />
                    <strong>{candidate.publisher} — {candidate.authorityClass.replace(/_/g, " ")}{supportsVisible ? " — SUPPORTS" : ""} — {candidate.memoryState || candidate.extraction?.memoryState || "new_candidate"}</strong>
                  </label>
                  <span>Relevant: {topical} · Coverage: {coverage} · Authority: {candidate.authorityClass.replace(/_/g, " ")} · Independence: {independence} · Advancement: {String(advancement).replace(/_/g, " ")}</span>
                  <span>{candidate.title}</span>
                  <span>{candidate.canonicalUrl}</span>
                  <span>Retrieval: {candidate.retrievalStatus || "ok"}</span>
                  <span>Memory: {candidate.memoryState || candidate.extraction?.memoryState || "new_candidate"}{candidate.memorySkipReason || candidate.extraction?.memorySkipReason ? ` · skipped ${String(candidate.memorySkipReason || candidate.extraction?.memorySkipReason)}` : ""}{candidate.memoryRetryReason || candidate.extraction?.memoryRetryReason ? ` · retried ${String(candidate.memoryRetryReason || candidate.extraction?.memoryRetryReason)}` : ""}{candidate.queryAuthorityPath || candidate.extraction?.queryAuthorityPath ? ` · path ${String(candidate.queryAuthorityPath || candidate.extraction?.queryAuthorityPath)}` : ""}</span>
                  <span>Extraction: {candidate.extraction
                    ? `${candidate.extraction.extractionMethod} · ${candidate.extraction.contentType || "unknown type"} · raw ${candidate.extraction.rawBytes}B · text ${candidate.extraction.extractedChars} chars · passages ${candidate.extraction.passageMatchCount}${candidate.extraction.pdfDetected ? ` · PDF ${candidate.extraction.pdfBytes ?? candidate.extraction.rawBytes}B · pages ${candidate.extraction.pagesInspected ?? 0}` : ""}${candidate.extraction.passageMissReason ? ` · ${candidate.extraction.passageMissReason}` : ""}${candidate.extraction.parserFailureReason ? ` · parser ${candidate.extraction.parserFailureReason}` : ""}`
                    : "No extraction diagnostics"}</span>
                  <span>Excerpt{candidate.excerpts[0]?.locator ? ` (${candidate.excerpts[0].locator})` : ""}: {candidate.excerpts[0]?.text || "No traceable excerpt"}</span>
                  <span>
                    Identity: {candidate.publisher}
                    {" · "}basis {candidate.extraction?.publisherIdentityBasis || "not recorded"}
                    {" · "}domain {candidate.extraction?.registrableDomain || "unknown"}
                    {" · "}class {candidate.sourceClass.replace(/_/g, " ")}
                    {" · "}cluster {candidate.independenceCluster}
                    {" · "}authority {candidate.authorityClass.replace(/_/g, " ")}
                    {candidate.authorityAdequate ? " · adequate" : " · insufficient"}
                    {candidate.extraction?.documentAuthor
                      ? ` · document author ${candidate.extraction.documentAuthor}${candidate.extraction.authorTrust ? ` (${candidate.extraction.authorTrust})` : ""}`
                      : ""}
                    {candidate.extraction?.documentCreator
                      ? ` · creator ${candidate.extraction.documentCreator}${candidate.extraction.creatorTrust ? ` (${candidate.extraction.creatorTrust})` : ""}`
                      : ""}
                    {candidate.extraction?.documentProducer
                      ? ` · producer ${candidate.extraction.documentProducer}${candidate.extraction.producerTrust ? ` (${candidate.extraction.producerTrust})` : ""}`
                      : ""}
                    {candidate.extraction?.documentSubject ? ` · subject ${candidate.extraction.documentSubject}` : ""}
                    {candidate.extraction?.issuer ? ` · issuer ${candidate.extraction.issuer}` : ""}
                    {candidate.extraction?.publisherConflict ? ` · ${candidate.extraction.publisherConflict}` : ""}
                  </span>
                  <span>{candidate.scopeLimitations}</span>
                  <span>{candidate.reasonSelected || candidate.reasonExcluded}</span>
                  <span>{candidate.submittedDocumentId ? `Submitted ${candidate.submittedDocumentId} · see corpus disposition (not automatically awaiting review)` : "Not submitted"}</span>
                </li>
              );
            })}
            {latestResearchRun && latestResearchRun.candidates.length === 0 ? (
              <li>
                <strong>No candidates</strong>
                <span>{describeLiveEmptyReason((latestResearchRun.diagnostics?.emptyReason as LiveEmptyReason | null) ?? null)}</span>
                {(latestResearchRun.diagnostics?.exclusions ?? []).slice(0, 8).map((item, index) => (
                  <span key={`${item.stage}-${index}`}>{item.stage}: {item.reason}{item.url ? ` · ${item.url}` : ""}</span>
                ))}
              </li>
            ) : null}
          </ul>
          <form className="product-form" onSubmit={submitSelectedCandidates}>
            <div className="form-span admin-form-actions">
              <p>Submit selected candidates for corpus review. Title, publisher, URL, excerpt, and provenance are taken from discovery. This is not acceptance.</p>
              <button className="button" type="submit" disabled={!latestResearchRun || activeCandidateIds.length === 0}>Submit selected candidates for corpus review</button>
            </div>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="content-intelligence-title">
          <div className="admin-panel-heading">
            <h3 id="content-intelligence-title">Content Intelligence</h3>
            <span>Plan and draft only · publishing disabled</span>
          </div>
          <p className="growth-queue-note">{pkg ? contentIntelligenceStatus : "Select a package to derive a content brief."}</p>
          {visibleContentIntelligence ? (
            <ul className="growth-queue-evidence">
              <li><strong>Problem</strong><span>{visibleContentIntelligence.brief.primaryUserProblem}</span></li>
              <li><strong>Audience</strong><span>{visibleContentIntelligence.brief.targetAudience || "unknown"} · intent {visibleContentIntelligence.brief.searchIntent}</span></li>
              <li><strong>Evidence readiness</strong><span>{visibleContentIntelligence.brief.evidenceReadiness} · confidence {visibleContentIntelligence.brief.confidence}</span></li>
              <li><strong>Content opportunity score</strong><span>{visibleContentIntelligence.score.total} · {visibleContentIntelligence.score.reasons.join(" ")}</span></li>
              <li><strong>Recommended format / channel</strong><span>{visibleContentIntelligence.brief.recommendedFormat} · {(visibleContentIntelligence.formats[0]?.channel) || "none"}</span></li>
              <li><strong>Content brief</strong><span>{visibleContentIntelligence.brief.contentThesis}</span></li>
              <li><strong>Claims allowed</strong><span>{visibleContentIntelligence.brief.verifiedFacts.map((item) => item.claimText).join(" · ") || "none"}</span></li>
              <li><strong>Claims prohibited / unresolved</strong><span>{[...visibleContentIntelligence.brief.claimsMustNotMake.map((item) => `${item.claimText} (${item.reason})`), ...visibleContentIntelligence.brief.unresolvedQuestions].join(" · ") || "none"}</span></li>
              <li><strong>Commercial route</strong><span>{visibleContentIntelligence.commercialRoute.route} · {visibleContentIntelligence.commercialRoute.reason}</span></li>
              <li><strong>CTA</strong><span>{visibleContentIntelligence.brief.recommendedCta} · {visibleContentIntelligence.commercialRoute.destinationPath}</span></li>
              <li><strong>Attribution plan</strong><span>{visibleContentIntelligence.attribution.map((item) => `${item.channel}: campaign ${item.campaign} · ${item.utmSource}/${item.utmMedium} · dest ${item.destinationPath}${item.requiresSavedVariant ? " · save a variant to mint utm_content" : ""}`).join(" · ") || "none"}</span></li>
              <li><strong>Learning signal</strong><span>{visibleContentIntelligence.learning.recommendedAction} · {visibleContentIntelligence.learning.reason} · first-party clicks {visibleContentIntelligence.learning.clicks} · views {visibleContentIntelligence.learning.pageViews} · signups {visibleContentIntelligence.learning.emailSignups} · impressions {visibleContentIntelligence.learning.impressions === null ? "not available" : visibleContentIntelligence.learning.impressions}</span></li>
            </ul>
          ) : <p className="growth-queue-note">Content Intelligence appears after a package is selected.</p>}
        </section>

        <section className="admin-panel" aria-labelledby="draft-studio-title">
          <div className="admin-panel-heading">
            <h3 id="draft-studio-title">Draft Studio</h3>
            <span>Generate / review channel variants · does not publish</span>
          </div>
          <form className="product-form" onSubmit={generateContentDrafts}>
            <div className="form-span admin-form-actions">
              <p>Generate channel drafts from the evidence-grounded brief. Drafts are not saved variants, not accepted evidence, and not published.</p>
              <button className="button" type="submit" disabled={!pkg}>Generate drafts</button>
            </div>
          </form>
          <ul className="growth-queue-evidence">
            {(visibleContentIntelligence?.drafts ?? []).map((draft) => {
              const firewall = draft.claimFirewall;
              const transformedOrRemoved = (firewall?.statementsTransformed ?? 0) + (firewall?.statementsRemoved ?? 0);
              return (
                <li key={`${draft.format}-${draft.channel}`}>
                  <strong>{draft.format} · {draft.channel}{draft.recommendationBlocked ? " · recommendation blocked" : ""} · Claim Firewall: {firewall?.status ?? "blocked"}</strong>
                  <span>{draft.copy}</span>
                  <span>
                    Factual statements authorized: {firewall?.factualStatementsAuthorized ?? 0}
                    {" · "}Recommendations authorized: {firewall?.recommendationsAuthorized ?? 0}
                    {" · "}Statements transformed/removed: {transformedOrRemoved}
                  </span>
                  <span>
                    {(firewall?.traces ?? draft.statementTrace ?? []).map((trace) => (
                      `${trace.classification} · ${trace.action}${trace.authorized ? " · authorized" : ""}${trace.claimIds.length ? ` · ${trace.claimIds.join(",")}` : ""} · ${trace.reason}`
                    )).join(" | ") || "Claim Firewall traces available after generate."}
                  </span>
                </li>
              );
            })}
            {visibleContentIntelligence && visibleContentIntelligence.drafts.length === 0 ? <li><strong>No drafts</strong><span>The brief did not select a channel format.</span></li> : null}
          </ul>
        </section>

        <section className="admin-panel" aria-labelledby="variant-title">
          <div className="admin-panel-heading"><h3 id="variant-title">Channel variants and destination / UTM</h3><span>Facebook · Instagram · Pinterest · TikTok</span></div>
          <ul className="growth-queue-evidence">
            {variants.map((variant) => {
              const destination = destinations.find((item) => item.variantId === variant.id);
              return <li key={variant.id}><strong>{variant.channel}</strong><span>{variant.copy || "(no copy)"} · {destination?.href || "no destination"}</span></li>;
            })}
          </ul>
          <form className="product-form" onSubmit={addVariant}>
            <label>Variant slug<input required value={variantForm.slug} onChange={(event) => setVariantForm({ ...variantForm, slug: event.target.value })} /></label>
            <label>Channel<select value={variantForm.channel} onChange={(event) => setVariantForm({ ...variantForm, channel: event.target.value })}><option value="facebook">facebook</option><option value="instagram">instagram</option><option value="pinterest">pinterest</option><option value="tiktok">tiktok</option></select></label>
            <label className="form-span">Copy<textarea value={variantForm.copy} onChange={(event) => setVariantForm({ ...variantForm, copy: event.target.value })} /></label>
            <label>Chef Gringo path or URL<input required value={variantForm.destinationPath} onChange={(event) => setVariantForm({ ...variantForm, destinationPath: event.target.value })} /></label>
            <label>Asset<select value={variantForm.assetId} onChange={(event) => setVariantForm({ ...variantForm, assetId: event.target.value })}><option value="">None</option>{(queue?.assets ?? []).map((asset) => <option key={asset.id} value={asset.id}>{asset.altText}</option>)}</select></label>
            <div className="form-span admin-form-actions">
              <p>{preview || "Preview mints UTMs without saving or posting."}</p>
              <div className="growth-queue-actions">
                <button type="button" onClick={() => void previewDestination()}>Preview destination</button>
                <button className="button" type="submit" disabled={!pkg}>Save variant</button>
              </div>
            </div>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="asset-title">
          <div className="admin-panel-heading"><h3 id="asset-title">Content assets</h3><span>Metadata only · no R2 upload</span></div>
          <form className="product-form" onSubmit={addAsset}>
            <label>Slug<input required value={assetForm.slug} onChange={(event) => setAssetForm({ ...assetForm, slug: event.target.value })} /></label>
            <label>Type<select value={assetForm.assetType} onChange={(event) => setAssetForm({ ...assetForm, assetType: event.target.value })}><option value="still">still</option><option value="carousel">carousel</option><option value="pin">pin</option><option value="reel_script">reel_script</option><option value="caption">caption</option></select></label>
            <label>Alt text<input required value={assetForm.altText} onChange={(event) => setAssetForm({ ...assetForm, altText: event.target.value })} /></label>
            <label>License<input required value={assetForm.license} onChange={(event) => setAssetForm({ ...assetForm, license: event.target.value })} /></label>
            <label className="form-span">Provenance note<input value={assetForm.provenanceNote} onChange={(event) => setAssetForm({ ...assetForm, provenanceNote: event.target.value })} /></label>
            <label className="form-span">Chef Gringo URI<input value={assetForm.uri} onChange={(event) => setAssetForm({ ...assetForm, uri: event.target.value })} placeholder="/images/editorial/…" /></label>
            <div className="form-span admin-form-actions"><p>Merchant or affiliate URLs are rejected.</p><button className="button" type="submit">Save asset metadata</button></div>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="approval-title">
          <div className="admin-panel-heading"><h3 id="approval-title">Approval history</h3><span>One subject at a time · no bulk approve</span></div>
          <ul className="growth-queue-evidence">
            {approvals.map((item) => (
              <li key={item.id}><strong>{item.decision}</strong><span>{item.actorEmail} · {item.occurredAt} · {item.reason}</span></li>
            ))}
          </ul>
          <form className="product-form" onSubmit={(event) => event.preventDefault()}>
            <label>Subject<select value={approvalSubject} onChange={(event) => setApprovalSubject(event.target.value)}>
              <option value="package">Package {pkg?.slug ?? ""}</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>{variant.channel} variant · {variant.id}</option>
              ))}
            </select></label>
            <label className="form-span">Reason (required to reject; also stored on approve)<textarea required value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <div className="form-span admin-form-actions">
              <p>Server uses the authenticated administrator email, not this form. Approval writes a social_approvals row. It does not publish. Variant approval still requires the package evidence gate.</p>
              <div className="growth-queue-actions">
                <button type="button" disabled={!pkg || !gate?.canApprove || !reason.trim()} onClick={() => void decide("approved")}>{approvalSubject === "package" ? "Approve package" : "Approve variant"}</button>
                <button type="button" disabled={!pkg || !reason.trim()} onClick={() => void decide("rejected")}>{approvalSubject === "package" ? "Reject package" : "Reject variant"}</button>
              </div>
            </div>
          </form>
        </section>

        <section className="admin-panel" aria-labelledby="publication-title">
          <div className="admin-panel-heading">
            <h3 id="publication-title">Manual publication record</h3>
            <span>Tracked destination stays on Chef Gringo</span>
          </div>
          <p className="growth-queue-banner" role="status">MANUAL PUBLICATION RECORD — Chef Gringo does not post to the platform</p>
          <p>Reserve a publication slug first. That locks sgo:publication:slug and mints the publication-specific Chef Gringo URL with utm_term. Copy that URL into the social post, then complete this record with the live permalink. Repeating prepare with the same slug does not mint a new id.</p>
          <label>Variant to record<select value={publicationVariant?.id ?? ""} onChange={(event) => setPublicationVariantId(event.target.value || null)}>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>{variant.channel} · {variant.id}</option>
            ))}
          </select></label>
          <div className="growth-queue-copy">
            <p><strong>Caption</strong><span>{publicationVariant?.copy || "No caption stored."}</span></p>
            <p><strong>Variant destination</strong><span>{publicationDestination?.href || "Save a variant first."}</span></p>
            <p><strong>Publication tracked URL</strong><span>{publicationTrackedHref || "Prepare a slug to reserve utm_term=publicationId."}</span></p>
            <p><strong>Attribution</strong><span>{publicationVariant && publicationDestination
              ? `package ${pkg?.id ?? "—"} · variant ${publicationVariant.id} · publication ${reservedPublication?.id ?? "sgo:publication:" + (publicationForm.slug || "…")} · destination ${publicationDestination.id} · utm_campaign=${pkg?.id ?? "—"} · utm_content=${publicationVariant.id} · utm_term=${reservedPublication?.id ?? "reserved-on-prepare"}`
              : "No variant selected."}</span></p>
            <div className="growth-queue-actions">
              <button type="button" onClick={() => void copyText("caption", publicationVariant?.copy || "")}>Copy caption</button>
              <button type="button" onClick={() => void copyText("publication-specific tracked URL", publicationTrackedHref)}>Copy tracked destination</button>
            </div>
          </div>
          {!canRecordManualPublication ? <p className="growth-queue-blockers" role="alert">Recording is blocked until a valid social_approvals row exists for this package or variant. Package status is not enough.</p> : null}
          <form className="product-form" onSubmit={recordManualPost}>
            <label>Publication slug<input required value={publicationForm.slug} onChange={(event) => setPublicationForm({ ...publicationForm, slug: event.target.value })} /></label>
            <label>Published at<input value={publicationForm.publishedAt} onChange={(event) => setPublicationForm({ ...publicationForm, publishedAt: event.target.value })} placeholder="2026-08-22T16:00:00.000Z" /></label>
            <label className="form-span">Live platform post URL<input value={publicationForm.platformPostUrl} onChange={(event) => setPublicationForm({ ...publicationForm, platformPostUrl: event.target.value })} placeholder="https://www.pinterest.com/pin/…" /></label>
            <label className="form-span">Platform post ID (optional)<input value={publicationForm.platformPostId} onChange={(event) => setPublicationForm({ ...publicationForm, platformPostId: event.target.value })} /></label>
            <div className="form-span admin-form-actions">
              <p>Prepare reserves the publication id and tracked URL. Save publication record stores the permalink. Chef Gringo does not post to the platform. Server identity is used.</p>
              <div className="growth-queue-actions">
                <button type="button" disabled={!pkg || !publicationVariant || !canRecordManualPublication || !publicationForm.slug.trim()} onClick={() => void prepareTrackedUrl()}>Prepare tracked URL</button>
                <button className="button" type="submit" disabled={!pkg || !publicationVariant || !canRecordManualPublication || !publicationForm.slug.trim() || !publicationForm.platformPostUrl.trim() || !publicationForm.publishedAt.trim()}>Save publication record</button>
              </div>
            </div>
          </form>
          <h4>Publication history</h4>
          <ul className="growth-queue-evidence">
            {publications.map((item) => (
              <li key={item.id}>
                <strong>{item.channel} · {item.status} · {item.mode}</strong>
                <span>{item.trackedHref} · {item.platformPostUrl || "permalink pending"} · posted {item.publishedAt || "—"} · recorded {item.recordedAt} by {item.actorEmail}{item.platformPostId ? ` · id ${item.platformPostId}` : ""}</span>
              </li>
            ))}
            {publications.length === 0 ? <li><strong>None reserved</strong><span>No manual publication records for this package.</span></li> : null}
          </ul>
        </section>

        <section className="admin-panel" aria-labelledby="performance-title">
          <div className="admin-panel-heading">
            <h3 id="performance-title">First-party performance</h3>
            <span>Live from commercial_events · no snapshots</span>
          </div>
          <p className="growth-queue-banner" role="status">FIRST-PARTY CHEF GRINGO PERFORMANCE</p>
          <p className="growth-queue-note">Platform reach/engagement not connected yet. These numbers are Chef Gringo site events joined on utm_term = publication id. Variant-only and package-only events stay diagnostic and do not count as a publication. Windows are half-open [start, end) in stored UTC; first 7/30 days are exact 24-hour multiples, not calendar periods.</p>
          <label>Window<select value={performanceWindow} onChange={(event) => {
            setPerformanceWindow(event.target.value);
            void loadFirstPartyPerformance(event.target.value);
          }}>
            <option value="since_publication">Since publication (UTC, clipped to now)</option>
            <option value="first_24h">First 24 hours</option>
            <option value="first_7d">First 7 days</option>
            <option value="first_30d">First 30 days</option>
          </select></label>
          <div className="growth-queue-actions">
            <button type="button" onClick={() => void loadFirstPartyPerformance()}>Load first-party performance</button>
          </div>
          <ul className="growth-queue-evidence">
            {publications.filter((item) => item.status === "recorded").map((item) => {
              const report = performanceById[item.id];
              const metrics = report?.metrics;
              return (
                <li key={item.id}>
                  <strong>{item.channel} · {item.id}</strong>
                  <span>Published {item.publishedAt || "—"} · {item.trackedHref}</span>
                  <span>Attribution {report?.attributionState ?? "not loaded"} · window {report?.window.window ?? performanceWindow}{report?.window.futurePublication ? " · future publication (empty)" : ""}</span>
                  {report ? <span>Diagnostics exact {report.diagnostics.publicationExactEvents} · variant-only {report.diagnostics.variantOnlyEvents} · package-only {report.diagnostics.packageOnlyEvents} · unattributed candidates {report.diagnostics.unattributedCandidates}</span> : null}
                  <dl className="growth-queue-metrics">
                    <div><dt>Page views</dt><dd>{metrics ? metrics.pageViews : 0}</dd></div>
                    <div><dt>Unique sessions</dt><dd>{metrics ? metrics.uniqueSessions : 0}</dd></div>
                    <div><dt>Recommendation views</dt><dd>{metrics ? metrics.recommendationViews : 0}</dd></div>
                    <div><dt>Merchant clicks</dt><dd>{metrics ? metrics.merchantClicks : 0}</dd></div>
                    <div><dt>Affiliate clicks</dt><dd>{metrics ? metrics.affiliateClicks : 0}</dd></div>
                    <div><dt>Email signups</dt><dd>{metrics ? metrics.emailSignups : 0}</dd></div>
                    <div><dt>Verified sales</dt><dd>{metrics ? `${metrics.verifiedSales}${metrics.verifiedSalesAmountCents === null ? "" : ` · ${metrics.verifiedSalesAmountCents}¢`}` : 0}</dd></div>
                  </dl>
                </li>
              );
            })}
            {publications.filter((item) => item.status === "recorded").length === 0
              ? <li><strong>No recorded publications</strong><span>Reserve and complete a manual post before first-party reporting.</span></li>
              : null}
          </ul>
        </section>
      </main>
    </div>
  );
}
