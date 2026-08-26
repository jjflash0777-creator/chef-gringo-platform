"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

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
type ResearchCandidate = {
  id: string;
  runId: string;
  canonicalUrl: string;
  title: string;
  publisher: string;
  sourceClass: string;
  provenance: string;
  independenceCluster: string;
  excerpts: Array<{ text: string; start: number; end: number }>;
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
    preferredSourceClasses: string[];
    disallowedSourceClasses: string[];
  };
  queriesExecuted: string[];
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
const emptyPackage = { slug: "", thesis: "", usefulnessTest: "", commercialPosture: "none" };

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
  const [claimForm, setClaimForm] = useState({ slug: "", claimText: "", evidenceKind: "knowledge_source", evidenceId: "", safetySensitive: false });
  const [extraEvidenceForm, setExtraEvidenceForm] = useState({ claimId: "", evidenceKind: "knowledge_source", evidenceId: "" });
  const [variantForm, setVariantForm] = useState({ slug: "", channel: "pinterest", copy: "", destinationPath: "/learn", assetId: "" });
  const [assetForm, setAssetForm] = useState({ slug: "", assetType: "still", altText: "", license: "", provenanceNote: "", uri: "" });
  const [preview, setPreview] = useState<string>("");
  const [reason, setReason] = useState("");
  const [approvalSubject, setApprovalSubject] = useState("package");
  const [publicationVariantId, setPublicationVariantId] = useState<string | null>(null);
  const [publicationForm, setPublicationForm] = useState({
    slug: "",
    platformPostUrl: "",
    platformPostId: "",
    publishedAt: "",
  });
  const [performanceWindow, setPerformanceWindow] = useState("since_publication");
  const [performanceById, setPerformanceById] = useState<Record<string, PerformanceReport>>({});
  const [requestForm, setRequestForm] = useState({ slug: "", question: "", whyRequired: "", preferredSourceType: "manufacturer_technical" });
  const [candidateForm, setCandidateForm] = useState({
    requestId: "",
    title: "",
    publisher: "",
    canonicalUrl: "",
    excerpt: "",
    notes: "",
    provenanceMethod: "founder_uploaded_document",
  });
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [selectionRunId, setSelectionRunId] = useState<string | null>(null);

  function applyQueue(next: Queue, keepOpportunityId: string | null, keepPackageId: string | null) {
    setQueue(next);
    const opportunityId = keepOpportunityId && next.opportunities.some((item) => item.id === keepOpportunityId)
      ? keepOpportunityId
      : next.opportunities[0]?.id ?? null;
    const packageId = keepPackageId && next.packages.some((item) => item.id === keepPackageId)
      ? keepPackageId
      : next.packages.find((item) => item.opportunityId === opportunityId)?.id ?? next.packages[0]?.id ?? null;
    setSelectedOpportunityId(opportunityId);
    setSelectedPackageId(packageId);
    const selectedOpportunity = next.opportunities.find((item) => item.id === opportunityId);
    const selectedPackage = next.packages.find((item) => item.id === packageId);
    if (selectedOpportunity) {
      setOpportunityForm({
        slug: selectedOpportunity.slug,
        problem: selectedOpportunity.problem,
        audience: selectedOpportunity.audience,
        usefulnessTest: selectedOpportunity.usefulnessTest,
        status: selectedOpportunity.status,
      });
    }
    if (selectedPackage) {
      setPackageForm({
        slug: selectedPackage.slug,
        thesis: selectedPackage.thesis,
        usefulnessTest: selectedPackage.usefulnessTest,
        commercialPosture: selectedPackage.commercialPosture,
      });
    }
    setApprovalSubject("package");
    const nextVariantId = packageId
      ? next.variants.find((item) => item.packageId === packageId)?.id ?? null
      : null;
    setPublicationVariantId(nextVariantId);
    setStatus(`${next.opportunities.length} opportunities · publishing disabled`);
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
  const latestResearchRun = researchRuns[0] ?? null;
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
    const firstPackage = queue?.packages.find((entry) => entry.opportunityId === item.id);
    if (firstPackage) selectPackage(firstPackage);
  }

  function selectPackage(item: Package) {
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
    await submit("/api/growth/packages", "POST", { ...packageForm, opportunityId: opportunity.id }, "Package drafted. Manual entry only.");
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
              {item.slug}<span>{item.status}</span>
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
                    <button type="button" onClick={() => { setSelectedOpportunityId(null); setOpportunityForm(emptyOpportunity); }}>New</button>
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
                <li key={item.id}><button type="button" className={item.id === pkg?.id ? "active" : ""} onClick={() => selectPackage(item)}>{item.slug} · {item.commercialPosture} · {item.status}</button></li>
              ))}
            </ul>
            <form className="product-form" onSubmit={pkg && packageForm.slug === pkg.slug ? savePackage : createPackage}>
              <label>Slug<input required value={packageForm.slug} disabled={Boolean(pkg) && packageForm.slug === pkg?.slug} onChange={(event) => setPackageForm({ ...packageForm, slug: event.target.value })} /></label>
              <label>Commercial posture<select value={packageForm.commercialPosture} onChange={(event) => setPackageForm({ ...packageForm, commercialPosture: event.target.value })}><option value="none">none</option><option value="informational">informational</option><option value="pending">pending</option><option value="affiliate">affiliate</option></select></label>
              <label className="form-span">Thesis<textarea required value={packageForm.thesis} onChange={(event) => setPackageForm({ ...packageForm, thesis: event.target.value })} /></label>
              <label className="form-span">Usefulness test<textarea required value={packageForm.usefulnessTest} onChange={(event) => setPackageForm({ ...packageForm, usefulnessTest: event.target.value })} /></label>
              <div className="form-span admin-form-actions">
                <p>Monetization stays downstream of usefulness. Commission is not a field. Status cannot be patched here.</p>
                <div className="growth-queue-actions">
                  <button className="button" type="submit" disabled={!opportunity}>{pkg && packageForm.slug === pkg.slug ? "Save package" : "Create package"}</button>
                  {pkg ? <button type="button" onClick={() => { setSelectedPackageId(null); setPackageForm(emptyPackage); }}>New package</button> : null}
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="admin-panel" aria-labelledby="claims-title">
          <div className="admin-panel-heading"><h3 id="claims-title">Claims / evidence</h3><span>Historical gate: {gate?.canApprove ? "open" : "blocked"} · Intelligence authority: {intelligence?.decisionDna.intelligenceAuthority ?? (intelligence?.intelligenceAuthorityReady ? "ready" : intelligence ? "blocked" : "—")}</span></div>
          {gate?.blockers.length ? <p className="growth-queue-blockers" role="alert">{gate.blockers.join(" ")}</p> : null}
          <ul className="growth-queue-evidence">
            {claims.map((claim) => {
              const refs = claim.evidenceRefs?.length ? claim.evidenceRefs : [claim.evidence];
              return (
                <li key={claim.id}>
                  <strong>{claim.claimText}</strong>
                  <span>{refs.length} attached ref{refs.length === 1 ? "" : "s"}{claim.safetySensitive ? " · safety-sensitive" : ""} · {claim.id}</span>
                  <span>{refs.map((ref) => {
                    const item = queue?.evidenceCatalog.find((entry) => entry.kind === ref.kind && entry.id === ref.id);
                    return `${ref.kind}:${ref.id} (${item?.verificationStatus || item?.ingestionStatus || "referenced"})`;
                  }).join(" · ")}</span>
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
                <strong>{item.policyClass} · {item.safetySensitive ? "safety-sensitive" : "standard risk"}</strong>
                <span>{item.researchPlan?.claimOrQuestion}</span>
                <span>Need {item.researchPlan?.independentSourcesDesired} independent source(s) · required {item.researchPlan?.requiredAuthorityClass}</span>
                <span>Preferred: {(item.researchPlan?.preferredPrimarySources ?? []).join("; ")}</span>
                <span>Disallowed: {(item.researchPlan?.disallowedSourceClasses ?? []).join(", ")}</span>
                <span>Why: {item.researchPlan?.reason}</span>
                <span>Stop: {item.researchPlan?.stopCondition}</span>
              </li>
            ))}
            {latestResearchRun ? (
              <li>
                <strong>{latestResearchRun.providerKind === "live" ? "Live run" : "Fixture run"}</strong>
                <span>{latestResearchRun.queriesExecuted.length} queries · {latestResearchRun.candidates.length} candidates evaluated · {latestResearchRun.candidates.filter((item) => item.proposedForReview).length} sources selected · {latestResearchRun.candidates.filter((item) => item.relationship === "contradicts").length} contradictions</span>
                <span>{latestResearchRun.plan.maximumQueries} queries max · {latestResearchRun.plan.maximumCandidateDocuments} candidates max · {latestResearchRun.plan.riskClass} risk</span>
                <span>Queries: {latestResearchRun.queriesExecuted.join(" · ") || latestResearchRun.plan.queries.join(" · ")}</span>
                <span>Stop recorded: {latestResearchRun.stopReason}</span>
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
            {(latestResearchRun?.candidates ?? []).map((candidate) => {
              const independent = candidate.proposedForReview || (candidate.relationship === "supports" && candidate.authorityAdequate);
              const label = candidate.authorityAdequate ? candidate.relationship.toUpperCase() : `${candidate.relationship.toUpperCase()} · insufficient authority`;
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
                    <strong>{candidate.publisher} — {candidate.authorityClass.replace(/_/g, " ")} — {label}{independent && candidate.authorityAdequate ? " · independent" : ""}</strong>
                  </label>
                  <span>{candidate.title}</span>
                  <span>{candidate.canonicalUrl}</span>
                  <span>Excerpt: {candidate.excerpts[0]?.text || "No traceable excerpt"}</span>
                  <span>{candidate.scopeLimitations}</span>
                  <span>{candidate.reasonSelected || candidate.reasonExcluded}</span>
                  <span>{candidate.submittedDocumentId ? `Submitted ${candidate.submittedDocumentId} · awaiting corpus review` : "Not submitted"}</span>
                </li>
              );
            })}
            {latestResearchRun && latestResearchRun.candidates.length === 0 ? <li><strong>No candidates</strong><span>The bounded provider returned nothing inside query and candidate limits.</span></li> : null}
          </ul>
          <form className="product-form" onSubmit={submitSelectedCandidates}>
            <div className="form-span admin-form-actions">
              <p>Submit selected candidates for corpus review. Title, publisher, URL, excerpt, and provenance are taken from discovery. This is not acceptance.</p>
              <button className="button" type="submit" disabled={!latestResearchRun || activeCandidateIds.length === 0}>Submit selected candidates for corpus review</button>
            </div>
          </form>
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
