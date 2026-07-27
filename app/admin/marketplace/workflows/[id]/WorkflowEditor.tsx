"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Workflow = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  problemStatement: string;
  jobStatement: string;
  intendedOutcome: string;
  nextAction: string;
  affiliateDisclosure: string;
  status: "draft" | "in_review" | "published";
  confidenceLevel: string;
  primaryPersonaId: number | null;
  primaryEnvironmentId: number | null;
  primaryUseCaseId: number | null;
  reviewerUserId: string | null;
  createdByUserId: string;
  lastVerifiedAt: string | null;
  reviewDueAt: string | null;
  publishedAt: string | null;
  revisionNumber: number;
  personaName?: string | null;
  environmentName?: string | null;
  useCaseName?: string | null;
};

type Step = {
  id: number;
  position: number;
  title: string;
  instruction: string;
  purpose: string;
  expectedResult: string;
  measurableCheck: string;
  commonMistake: string;
  correctiveAction: string;
  riskLevel: "low" | "medium" | "high";
};

type SourceLink = {
  id: number;
  workflowStepId: number | null;
  claimText: string;
  evidenceSummary: string;
  confidenceLevel: string;
  limitations: string;
  verifiedByUserId: string | null;
  verifiedAt: string | null;
  sourceTitle: string;
  publisher: string;
  sourceType: string;
  url: string | null;
  verificationStatus: string;
};

type HistoryEvent = {
  id: number;
  action: string;
  actorEmail: string;
  detail: string;
  createdAt: string;
};

type Bundle = {
  workflow: Workflow;
  steps: Step[];
  sources: SourceLink[];
  history: HistoryEvent[];
  qualityGates: Array<{ code: string; message: string; stepId?: number }>;
  contexts?: {
    personas: Array<{ id: number; name: string }>;
    environments: Array<{ id: number; name: string }>;
    useCases: Array<{ id: number; name: string }>;
  };
  confidenceRubric?: Record<string, { label: string; description: string; minimumEvidence: string }>;
};

const emptyStep: Omit<Step, "id" | "position"> = {
  title: "",
  instruction: "",
  purpose: "",
  expectedResult: "",
  measurableCheck: "",
  commonMistake: "",
  correctiveAction: "",
  riskLevel: "low",
};

const emptySource = {
  title: "",
  publisher: "",
  sourceType: "professional_standard",
  url: "",
  publicationDate: "",
  accessedAt: "",
  verificationStatus: "draft",
  notes: "",
  workflowStepId: "",
  claimText: "",
  evidenceSummary: "",
  confidenceLevel: "insufficient",
  limitations: "",
  verifiedByUserId: "",
  verifiedAt: "",
};

export function WorkflowEditor({ workflowId }: { workflowId: string }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [message, setMessage] = useState("Loading governed workflow…");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [newStep, setNewStep] = useState(emptyStep);
  const [source, setSource] = useState(emptySource);
  const endpoint = `/api/marketplace/workflows/${encodeURIComponent(workflowId)}`;

  async function consume(response: Response) {
    const body = await response.json() as Bundle & { error?: string; qualityGates?: Bundle["qualityGates"] };
    if (!response.ok) {
      if (body.qualityGates && bundle) setBundle({ ...bundle, qualityGates: body.qualityGates });
      throw new Error(body.error || "The workflow action failed.");
    }
    setBundle((current) => ({ ...body, contexts: body.contexts || current?.contexts, confidenceRubric: body.confidenceRubric || current?.confidenceRubric }));
    return body;
  }

  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as Bundle & { error?: string };
        if (!active) return;
        if (!response.ok) throw new Error(body.error || "Workflow unavailable.");
        setBundle(body);
        setMessage("Draft pilot loaded. No clinical or standards claims are verified until sources are entered and reviewed.");
      })
      .catch((error: Error) => active && setMessage(error.message));
    return () => { active = false; };
  }, [endpoint]);

  const parsedHistory = useMemo(() => bundle?.history.map((event) => {
    try {
      return { ...event, parsedDetail: JSON.parse(event.detail) as Record<string, unknown> };
    } catch {
      return { ...event, parsedDetail: { detail: event.detail } };
    }
  }) || [], [bundle?.history]);

  async function runAction(label: string, action: () => Promise<Response>) {
    setBusy(true);
    setMessage(label);
    try {
      await consume(await action());
      setMessage(`${label.replace(/…$/, "")} complete.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveContext(event: FormEvent) {
    event.preventDefault();
    if (!bundle || !reason.trim()) {
      setMessage("Enter a revision reason before saving.");
      return;
    }
    const w = bundle.workflow;
    await runAction("Saving workflow context…", () => fetch(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reason,
        workflow: {
          title: w.title, slug: w.slug, summary: w.summary,
          problemStatement: w.problemStatement, jobStatement: w.jobStatement,
          intendedOutcome: w.intendedOutcome, nextAction: w.nextAction,
          affiliateDisclosure: w.affiliateDisclosure, confidenceLevel: w.confidenceLevel,
          primaryPersonaId: w.primaryPersonaId, primaryEnvironmentId: w.primaryEnvironmentId,
          primaryUseCaseId: w.primaryUseCaseId, reviewerUserId: w.reviewerUserId,
          lastVerifiedAt: w.lastVerifiedAt, reviewDueAt: w.reviewDueAt,
        },
      }),
    }));
    setReason("");
  }

  async function addStep(event: FormEvent) {
    event.preventDefault();
    await runAction("Adding workflow step…", () => fetch(`${endpoint}/steps`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "add", step: newStep }),
    }));
    setNewStep(emptyStep);
  }

  async function saveStep(step: Step) {
    await runAction(`Saving step ${step.position}…`, () => fetch(`${endpoint}/steps/${step.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(step),
    }));
  }

  async function removeStep(step: Step) {
    await runAction(`Removing step ${step.position}…`, () => fetch(`${endpoint}/steps/${step.id}`, { method: "DELETE" }));
  }

  async function moveStep(index: number, direction: -1 | 1) {
    if (!bundle) return;
    const target = index + direction;
    if (target < 0 || target >= bundle.steps.length) return;
    const reordered = [...bundle.steps];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await runAction("Reordering workflow steps…", () => fetch(`${endpoint}/steps`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reorder", orderedStepIds: reordered.map((step) => step.id) }),
    }));
  }

  async function addSource(event: FormEvent) {
    event.preventDefault();
    await runAction("Adding evidence source…", () => fetch(`${endpoint}/sources`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...source,
        workflowStepId: source.workflowStepId ? Number(source.workflowStepId) : null,
        url: source.url || null,
        publicationDate: source.publicationDate || null,
        accessedAt: source.accessedAt || null,
        verifiedByUserId: source.verifiedByUserId || null,
        verifiedAt: source.verifiedAt || null,
      }),
    }));
    setSource(emptySource);
  }

  async function transition(to: Workflow["status"]) {
    if (!reason.trim()) {
      setMessage("Enter an editorial decision reason first.");
      return;
    }
    await runAction(`Moving workflow to ${to.replace("_", " ")}…`, () => fetch(`${endpoint}/transition`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, reason }),
    }));
    setReason("");
  }

  if (!bundle) return <main className="knowledge-editor-loading"><p>{message}</p></main>;
  const { workflow, steps, sources, contexts, confidenceRubric } = bundle;
  const updateWorkflowField = (field: keyof Workflow, value: unknown) =>
    setBundle({ ...bundle, workflow: { ...workflow, [field]: value } });

  return (
    <main className="knowledge-editor">
      <header className="knowledge-editor-header">
        <div><p className="eyebrow">Knowledge Core pilot</p><h1>{workflow.title}</h1><p>{message}</p></div>
        <div><span className={`editorial-status ${workflow.status}`}>{workflow.status.replace("_", " ")}</span><small>Revision {workflow.revisionNumber}</small></div>
      </header>

      <nav className="knowledge-editor-nav" aria-label="Workflow editor sections">
        <a href="#context">Context</a><a href="#steps">Steps</a><a href="#evidence">Evidence</a><a href="#review">Review</a><a href="#history">History</a>
      </nav>

      <form className="knowledge-editor-panel" id="context" onSubmit={saveContext}>
        <div className="admin-panel-heading"><h2>Workflow context</h2><span>Canonical pilot record</span></div>
        <div className="knowledge-form-grid">
          <label>Title<input value={workflow.title} onChange={(event) => updateWorkflowField("title", event.target.value)} /></label>
          <label>Slug<input value={workflow.slug} onChange={(event) => updateWorkflowField("slug", event.target.value)} /></label>
          <label className="form-span">Summary<textarea value={workflow.summary} onChange={(event) => updateWorkflowField("summary", event.target.value)} /></label>
          <label className="form-span">Problem statement<textarea value={workflow.problemStatement} onChange={(event) => updateWorkflowField("problemStatement", event.target.value)} /></label>
          <label className="form-span">Job statement<textarea value={workflow.jobStatement} onChange={(event) => updateWorkflowField("jobStatement", event.target.value)} /></label>
          <label className="form-span">Intended outcome<textarea value={workflow.intendedOutcome} onChange={(event) => updateWorkflowField("intendedOutcome", event.target.value)} /></label>
          <label className="form-span">Next action<textarea value={workflow.nextAction} onChange={(event) => updateWorkflowField("nextAction", event.target.value)} /></label>
          <label>Primary persona<select value={workflow.primaryPersonaId || ""} onChange={(event) => updateWorkflowField("primaryPersonaId", event.target.value ? Number(event.target.value) : null)}><option value="">Select</option>{contexts?.personas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Primary environment<select value={workflow.primaryEnvironmentId || ""} onChange={(event) => updateWorkflowField("primaryEnvironmentId", event.target.value ? Number(event.target.value) : null)}><option value="">Select</option>{contexts?.environments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Primary use case<select value={workflow.primaryUseCaseId || ""} onChange={(event) => updateWorkflowField("primaryUseCaseId", event.target.value ? Number(event.target.value) : null)}><option value="">Select</option>{contexts?.useCases.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Confidence<select value={workflow.confidenceLevel} onChange={(event) => updateWorkflowField("confidenceLevel", event.target.value)}>{Object.entries(confidenceRubric || {}).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
          <label>Reviewer email<input type="email" value={workflow.reviewerUserId || ""} onChange={(event) => updateWorkflowField("reviewerUserId", event.target.value || null)} /></label>
          <label>Last verified<input type="date" value={workflow.lastVerifiedAt?.slice(0, 10) || ""} onChange={(event) => updateWorkflowField("lastVerifiedAt", event.target.value || null)} /></label>
          <label>Review due<input type="date" value={workflow.reviewDueAt?.slice(0, 10) || ""} onChange={(event) => updateWorkflowField("reviewDueAt", event.target.value || null)} /></label>
          <label className="form-span">Affiliate disclosure<textarea value={workflow.affiliateDisclosure} onChange={(event) => updateWorkflowField("affiliateDisclosure", event.target.value)} /></label>
          <label className="form-span">Revision reason<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain what changed and why" /></label>
        </div>
        <button className="button" disabled={busy}>Save draft context</button>
      </form>

      <section className="knowledge-editor-panel" id="steps">
        <div className="admin-panel-heading"><h2>Ordered steps</h2><span>{steps.length} steps · deterministic sequence</span></div>
        <div className="knowledge-step-list">
          {steps.map((step, index) => (
            <article className={`knowledge-step risk-${step.riskLevel}`} key={step.id}>
              <header><span>{step.position}</span><input aria-label={`Step ${step.position} title`} value={step.title} onChange={(event) => setBundle({ ...bundle, steps: steps.map((item) => item.id === step.id ? { ...item, title: event.target.value } : item) })} /><select aria-label={`Step ${step.position} risk`} value={step.riskLevel} onChange={(event) => setBundle({ ...bundle, steps: steps.map((item) => item.id === step.id ? { ...item, riskLevel: event.target.value as Step["riskLevel"] } : item) })}><option value="low">Low risk</option><option value="medium">Medium risk</option><option value="high">High risk</option></select></header>
              {(["instruction", "purpose", "expectedResult", "measurableCheck", "commonMistake", "correctiveAction"] as const).map((field) => <label key={field}>{field.replace(/([A-Z])/g, " $1")}<textarea value={step[field]} onChange={(event) => setBundle({ ...bundle, steps: steps.map((item) => item.id === step.id ? { ...item, [field]: event.target.value } : item) })} /></label>)}
              <footer><button type="button" onClick={() => void moveStep(index, -1)} disabled={busy || index === 0}>Move up</button><button type="button" onClick={() => void moveStep(index, 1)} disabled={busy || index === steps.length - 1}>Move down</button><button type="button" onClick={() => void saveStep(step)} disabled={busy}>Save step</button><button type="button" className="danger" onClick={() => void removeStep(step)} disabled={busy}>Delete</button></footer>
            </article>
          ))}
        </div>
        <form className="knowledge-add-form" onSubmit={addStep}>
          <h3>Add step</h3>
          <label>Title<input required value={newStep.title} onChange={(event) => setNewStep({ ...newStep, title: event.target.value })} /></label>
          <label>Instruction<textarea value={newStep.instruction} onChange={(event) => setNewStep({ ...newStep, instruction: event.target.value })} /></label>
          <label>Purpose<textarea value={newStep.purpose} onChange={(event) => setNewStep({ ...newStep, purpose: event.target.value })} /></label>
          <label>Expected result<textarea value={newStep.expectedResult} onChange={(event) => setNewStep({ ...newStep, expectedResult: event.target.value })} /></label>
          <label>Measurable check<textarea value={newStep.measurableCheck} onChange={(event) => setNewStep({ ...newStep, measurableCheck: event.target.value })} /></label>
          <label>Common mistake<textarea value={newStep.commonMistake} onChange={(event) => setNewStep({ ...newStep, commonMistake: event.target.value })} /></label>
          <label>Corrective action<textarea value={newStep.correctiveAction} onChange={(event) => setNewStep({ ...newStep, correctiveAction: event.target.value })} /></label>
          <label>Risk level<select value={newStep.riskLevel} onChange={(event) => setNewStep({ ...newStep, riskLevel: event.target.value as Step["riskLevel"] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <button className="button" disabled={busy}>Add step</button>
        </form>
      </section>

      <section className="knowledge-editor-panel" id="evidence">
        <div className="admin-panel-heading"><h2>Evidence and provenance</h2><span>No invented sources</span></div>
        <div className="knowledge-source-list">
          {sources.length === 0 ? <p className="empty-state">No sources are attached. This pilot cannot be published.</p> : sources.map((item) => <article key={item.id}><strong>{item.sourceTitle}</strong><span>{item.verificationStatus} · {item.confidenceLevel}</span><p>{item.claimText}</p><small>{item.workflowStepId ? `Step ${steps.find((step) => step.id === item.workflowStepId)?.position || "?"}` : "Workflow-level"} · {item.publisher || "Publisher not recorded"}</small><button type="button" disabled={busy} onClick={() => void runAction("Unlinking source…", () => fetch(`${endpoint}/sources/${item.id}`, { method: "DELETE" }))}>Unlink</button></article>)}
        </div>
        <form className="knowledge-add-form" onSubmit={addSource}>
          <h3>Add and link a source</h3>
          <label>Source title<input required value={source.title} onChange={(event) => setSource({ ...source, title: event.target.value })} /></label>
          <label>Publisher<input value={source.publisher} onChange={(event) => setSource({ ...source, publisher: event.target.value })} /></label>
          <label>Source type<select value={source.sourceType} onChange={(event) => setSource({ ...source, sourceType: event.target.value })}><option value="professional_standard">Professional standard</option><option value="manufacturer_documentation">Manufacturer documentation</option><option value="regulatory_guidance">Regulatory guidance</option><option value="professional_organization_guidance">Professional organization guidance</option><option value="direct_professional_experience">Direct professional experience</option><option value="editorial_judgment">Editorial judgment</option></select></label>
          <label>URL<input type="url" value={source.url} onChange={(event) => setSource({ ...source, url: event.target.value })} /></label>
          <label>Publication date<input type="date" value={source.publicationDate} onChange={(event) => setSource({ ...source, publicationDate: event.target.value })} /></label>
          <label>Accessed date<input type="date" value={source.accessedAt} onChange={(event) => setSource({ ...source, accessedAt: event.target.value })} /></label>
          <label>Link to step<select value={source.workflowStepId} onChange={(event) => setSource({ ...source, workflowStepId: event.target.value })}><option value="">Whole workflow</option>{steps.map((step) => <option key={step.id} value={step.id}>Step {step.position}: {step.title}</option>)}</select></label>
          <label>Verification status<select value={source.verificationStatus} onChange={(event) => setSource({ ...source, verificationStatus: event.target.value })}><option value="draft">Draft source</option><option value="verified">Verified source</option></select></label>
          <label className="form-span">Claim text<textarea required value={source.claimText} onChange={(event) => setSource({ ...source, claimText: event.target.value })} /></label>
          <label className="form-span">Evidence summary<textarea value={source.evidenceSummary} onChange={(event) => setSource({ ...source, evidenceSummary: event.target.value })} /></label>
          <label>Confidence<select value={source.confidenceLevel} onChange={(event) => setSource({ ...source, confidenceLevel: event.target.value })}>{Object.entries(confidenceRubric || {}).map(([id, item]) => <option value={id} key={id}>{item.label}</option>)}</select></label>
          <label>Verified by<input type="email" value={source.verifiedByUserId} onChange={(event) => setSource({ ...source, verifiedByUserId: event.target.value })} /></label>
          <label>Verified at<input type="date" value={source.verifiedAt} onChange={(event) => setSource({ ...source, verifiedAt: event.target.value })} /></label>
          <label className="form-span">Limitations<textarea value={source.limitations} onChange={(event) => setSource({ ...source, limitations: event.target.value })} /></label>
          <button className="button" disabled={busy}>Add source and claim link</button>
        </form>
      </section>

      <section className="knowledge-editor-panel" id="review">
        <div className="admin-panel-heading"><h2>Editorial review</h2><span>{bundle.qualityGates.length} unmet gates</span></div>
        <div className={bundle.qualityGates.length ? "quality-gates blocked" : "quality-gates clear"}>
          {bundle.qualityGates.length ? <ul>{bundle.qualityGates.map((failure, index) => <li key={`${failure.code}-${failure.stepId || 0}-${index}`}>{failure.message}</li>)}</ul> : <p>All server publication gates currently pass.</p>}
        </div>
        <div className="confidence-rubric">{Object.entries(confidenceRubric || {}).map(([id, item]) => <article key={id}><strong>{item.label}</strong><p>{item.description}</p><small>{item.minimumEvidence}</small></article>)}</div>
        <label>Editorial decision reason<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Required for every lifecycle change" /></label>
        <div className="editorial-actions">
          {workflow.status === "draft" && <button type="button" className="button" disabled={busy} onClick={() => void transition("in_review")}>Submit for review</button>}
          {workflow.status === "in_review" && <><button type="button" className="button secondary" disabled={busy} onClick={() => void transition("draft")}>Request changes / return to draft</button><button type="button" className="button" disabled={busy} onClick={() => void transition("published")}>Approve and publish</button></>}
          {workflow.status === "published" && <button type="button" className="button secondary" disabled={busy} onClick={() => void transition("draft")}>Return published workflow to draft</button>}
        </div>
      </section>

      <section className="knowledge-editor-panel" id="history">
        <div className="admin-panel-heading"><h2>Readable audit history</h2><span>Activity log, not full reconstructable versioning</span></div>
        <ol className="knowledge-history">{parsedHistory.map((event) => <li key={event.id}><div><strong>{event.action.replaceAll("_", " ")}</strong><span>{event.actorEmail}</span></div><time>{new Date(event.createdAt).toLocaleString()}</time><pre>{JSON.stringify(event.parsedDetail, null, 2)}</pre></li>)}</ol>
      </section>
    </main>
  );
}
