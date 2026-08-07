"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewWorkflowForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState("New workflows start as insufficient-confidence drafts.");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/marketplace/workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, slug, summary, confidenceLevel: "insufficient" }),
    });
    const body = await response.json() as { workflow?: { slug: string }; error?: string };
    if (!response.ok || !body.workflow) {
      setMessage(body.error || "The draft could not be created.");
      setBusy(false);
      return;
    }
    router.push(`/admin/marketplace/workflows/${encodeURIComponent(body.workflow.slug)}`);
  }

  return (
    <main className="knowledge-editor">
      <header className="knowledge-editor-header">
        <div><p className="eyebrow">Knowledge Core</p><h1>Create a workflow draft.</h1><p>{message}</p></div>
      </header>
      <form className="knowledge-editor-panel knowledge-form-grid" onSubmit={submit}>
        <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase())} /></label>
        <label className="form-span">Summary<textarea value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        <p className="form-span">After creation, add context, ordered steps, evidence, reviewer, and verification data in the governed editor. Publication remains blocked until every server-side gate passes.</p>
        <button className="button" disabled={busy}>{busy ? "Creating…" : "Create draft workflow"}</button>
      </form>
    </main>
  );
}
