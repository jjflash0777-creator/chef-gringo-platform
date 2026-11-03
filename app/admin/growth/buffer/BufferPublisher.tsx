"use client";

import { FormEvent, useState } from "react";

type Scheduled = { id: string; text: string | null; dueAt: string | null; channel?: { name?: string; service?: string } | null };
type DiagnosticChannel = { id: string; name: string; service: string };
type Diagnostics = {
  channels: DiagnosticChannel[];
  pinterestBoard: { ok: boolean; serviceId?: string; error?: string };
};

export function BufferPublisher() {
  const [status, setStatus] = useState("Loading Buffer queue…");
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  async function refresh() {
    const response = await fetch("/api/social/buffer/queue", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Buffer queue unavailable.");
    setScheduled(body.scheduled || []);
    setStatus(`Buffer queue confirmed: ${(body.scheduled || []).length} scheduled post(s).`);
  }


  async function runDiagnostics() {
    setStatus("Running read-only Buffer diagnostics…");
    const response = await fetch("/api/social/buffer/channels", { cache: "no-store" });
    const body = await response.json() as Diagnostics & { error?: string };
    if (!response.ok) throw new Error(body.error || "Buffer diagnostics unavailable.");
    setDiagnostics(body);
    setStatus(`Connected Buffer channels: ${body.channels.map((channel) => channel.service).join(", ")}. Pinterest board: ${body.pinterestBoard.ok ? "resolved" : "not resolved"}.`);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Scheduling approved variant…");
    const dueAtLocal = String(form.get("dueAt") || "");
    const response = await fetch("/api/growth/publications/buffer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        packageId: form.get("packageId"),
        variantId: form.get("variantId"),
        slug: form.get("slug"),
        title: form.get("title"),
        dueAt: new Date(dueAtLocal).toISOString(),
      }),
    });
    const body = await response.json();
    if (!response.ok || !body.confirmed) {
      setStatus(body.error || "Buffer did not confirm the schedule.");
      return;
    }
    setStatus(`Scheduled and confirmed in Buffer: ${body.bufferPostId || body.post?.id}`);
    await refresh();
  }

  return (
    <main className="container narrow" style={{ paddingBlock: "3rem 5rem" }}>
      <p className="eyebrow">Growth Queue · approved publishing</p>
      <h1>Buffer publishing</h1>
      <p className="lede">This form cannot bypass Growth Queue approval. It schedules the saved copy and production assets belonging to the approved variant.</p>
      <section style={{ marginBlock: "2rem" }}>
        <h2>Read-only diagnostics</h2>
        <p>Checks connected Buffer channels and Pinterest board resolution without creating or scheduling a post.</p>
        <button className="button secondary" type="button" onClick={() => runDiagnostics().catch((error) => setStatus(error.message))}>Run diagnostics</button>
        {diagnostics && (
          <div style={{ marginTop: "1rem" }}>
            <p><strong>Channels:</strong> {diagnostics.channels.map((channel) => `${channel.name} (${channel.service})`).join(", ")}</p>
            <p><strong>Pinterest board:</strong> {diagnostics.pinterestBoard.ok ? `resolved · ${diagnostics.pinterestBoard.serviceId}` : diagnostics.pinterestBoard.error}</p>
          </div>
        )}
      </section>
      <form onSubmit={submit} style={{ display: "grid", gap: "1rem", marginBlock: "2rem" }}>
        <label>Package ID<input name="packageId" required placeholder="sgo:package:..." /></label>
        <label>Variant ID<input name="variantId" required placeholder="sgo:variant:..." /></label>
        <label>Publication slug<input name="slug" required placeholder="mirepoix-instagram-2026-11-09" /></label>
        <label>Display title<input name="title" placeholder="Chef Gringo" /></label>
        <label>Publish date & time<input name="dueAt" type="datetime-local" required /></label>
        <button className="button" type="submit">Schedule approved variant</button>
      </form>
      <p role="status">{status}</p>
      <h2>Confirmed Buffer queue</h2>
      <ul>
        {scheduled.map((post) => <li key={post.id}><strong>{post.channel?.service || "channel"}</strong> · {post.dueAt || "no due time"} · {post.id}</li>)}
      </ul>
    </main>
  );
}
