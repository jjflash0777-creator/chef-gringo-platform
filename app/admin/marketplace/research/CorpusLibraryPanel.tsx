"use client";

import { useState, type FormEvent } from "react";
import { IMPORT_MANIFEST, ACTIVATED_CORPUS_VERSION } from "../../../lib/research/local-corpus";
import type { CorpusDocument, CorpusHit } from "../../../lib/research/corpus-types";

type Dashboard = {
  manifestVersion?: string;
  documentCount?: number;
  publicEligible?: number;
  byStatus?: Record<string, number>;
  byDomain?: Record<string, number>;
  staleOrRefreshDue?: number;
  failed?: Array<{ id: string; reason: string | null }>;
  documents?: CorpusDocument[];
};

export function CorpusLibraryPanel() {
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("ground beef safe temperature");
  const [hits, setHits] = useState<CorpusHit[]>([]);
  const [title, setTitle] = useState("");
  const [publisher, setPublisher] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loaded, setLoaded] = useState(false);
  const documents = dashboard.documents ?? [];

  async function refresh() {
    const response = await fetch("/api/marketplace/corpus", { cache: "no-store" });
    const body = await response.json() as Dashboard & { error?: string };
    setLoaded(true);
    if (!response.ok) {
      setError(body.error ?? "Corpus library is unavailable.");
      setDashboard({});
      return;
    }
    setError(null);
    setDashboard(body);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/marketplace/corpus", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        publisher,
        evidenceDomain: "culinary_technique",
        sourceType: "professional_practice",
        authorityTier: 2,
        mimeType: "text/plain",
        text: text || undefined,
        canonicalUrl: url || undefined,
      }),
    });
    const body = await response.json() as { error?: string };
    if (!response.ok) setError(body.error ?? "Ingestion failed.");
    else {
      setTitle("");
      setPublisher("");
      setText("");
      setUrl("");
      await refresh();
    }
  }

  async function review(id: string, action: "accept" | "reject" | "stale") {
    await fetch(`/api/marketplace/corpus/${id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refresh();
  }

  async function testQuery(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/marketplace/corpus/retrieve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const body = await response.json() as { hits?: CorpusHit[]; error?: string };
    if (!response.ok) setError(body.error ?? "Retrieval test failed.");
    else setHits(body.hits ?? []);
  }

  return (
    <section className="cg-corpus-admin">
      <p className="cg-type-operational">Curated library · not live web research</p>
      <h2>Governed source library</h2>
      <p>Corpus {ACTIVATED_CORPUS_VERSION} / {dashboard.manifestVersion ?? "not loaded"}. Local import: <code>npm run corpus:import</code>. Cloudflare AI Search is not exercised.</p>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => void refresh()}>{loaded ? "Refresh library" : "Load library"}</button>
      {loaded && (
        <dl className="cg-corpus-stats">
          <div><dt>Documents</dt><dd>{dashboard.documentCount ?? 0}</dd></div>
          <div><dt>Public-eligible</dt><dd>{dashboard.publicEligible ?? 0}</dd></div>
          <div><dt>Stale or failed</dt><dd>{dashboard.staleOrRefreshDue ?? 0}</dd></div>
        </dl>
      )}
      {dashboard.byStatus && <p>Status: {Object.entries(dashboard.byStatus).map(([status, count]) => `${status} ${count}`).join(" · ")}</p>}
      {dashboard.byDomain && <p>Domain: {Object.entries(dashboard.byDomain).map(([domain, count]) => `${domain} ${count}`).join(" · ")}</p>}
      {dashboard.failed?.length ? (
        <ul>{dashboard.failed.map((row) => <li key={row.id}>{row.id}: {row.reason}</li>)}</ul>
      ) : null}
      <form onSubmit={(event) => void submit(event)}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label>Publisher<input value={publisher} onChange={(event) => setPublisher(event.target.value)} required /></label>
        <label>Canonical URL (optional)<input value={url} onChange={(event) => setUrl(event.target.value)} /></label>
        <label>Extracted text or transcription<textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
        <button type="submit">Submit for review</button>
      </form>
      <div className="cg-corpus-list">
        {documents.map((document) => (
          <article key={document.id} className="cg-corpus-card" data-fixture={document.fixture}>
            <strong>{document.title}</strong>
            <span>{document.publisher} · {document.ingestionStatus} · {document.fixture ? "local fixture" : "production candidate"} · {document.evidenceDomain} · tier {document.authorityTier}</span>
            <span>Checksum version: {document.currentVersionId ?? "none"} · exposure: {document.productionExposure ? "public answers" : "internal"}</span>
            {document.rejectionReason && <small>{document.rejectionReason}</small>}
            <div className="cg-corpus-actions">
              <button type="button" onClick={() => void review(document.id, "accept")}>Accept for production</button>
              <button type="button" onClick={() => void review(document.id, "reject")}>Reject</button>
              <button type="button" onClick={() => void review(document.id, "stale")}>Mark stale</button>
            </div>
          </article>
        ))}
      </div>
      <form className="cg-corpus-query" onSubmit={(event) => void testQuery(event)}>
        <label>Test retrieval query<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <button type="submit">Run local retrieval test</button>
      </form>
      {hits.length > 0 && (
        <ul>
          {hits.map((hit) => (
            <li key={hit.chunkId}>{hit.title} · score {hit.score.toFixed(2)} · {hit.locator ?? "no locator"} · {hit.fixture ? "fixture" : "library"}</li>
          ))}
        </ul>
      )}
      <details>
        <summary>Seed manifest {ACTIVATED_CORPUS_VERSION}</summary>
        <ul>
          {IMPORT_MANIFEST.map((item) => (
            <li key={item.id}>{item.id}: {item.status}. {item.notes}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
