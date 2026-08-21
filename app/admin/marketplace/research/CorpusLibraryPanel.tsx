"use client";

import { useState, type FormEvent } from "react";
import { IMPORT_MANIFEST, ACTIVATED_CORPUS_VERSION } from "../../../lib/research/local-corpus";
import type { CorpusDocument, CorpusHit } from "../../../lib/research/corpus-types";

type Dashboard = {
  manifestVersion?: string;
  fingerprint?: string;
  target?: string;
  documentCount?: number;
  publicEligible?: number;
  unreviewed?: number;
  metadataOnly?: number;
  testFixtures?: number;
  staleOrSuperseded?: number;
  missingLocator?: number;
  missingReview?: number;
  lastImport?: { target?: string; createdAt?: string; fingerprintAfter?: string } | null;
  byStatus?: Record<string, number>;
  byDomain?: Record<string, number>;
  byProvenance?: Record<string, number>;
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

  async function review(id: string, action: "accept" | "reject" | "stale" | "expose" | "unexpose") {
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
      <p>Manifest {dashboard.manifestVersion ?? "not loaded"} · fingerprint {dashboard.fingerprint ?? "unknown"} · target {dashboard.target ?? "unbound"}. Cloudflare AI Search is not exercised. Local durable: <code>npm run corpus:import -- --target local</code>.</p>
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={() => void refresh()}>{loaded ? "Refresh library" : "Load library"}</button>
      {loaded && (
        <>
        <dl className="cg-corpus-stats">
          <div><dt>Public-eligible</dt><dd data-state={dashboard.publicEligible ? "ok" : "empty"}>{dashboard.publicEligible ?? 0}</dd></div>
          <div><dt>Unreviewed</dt><dd data-state={dashboard.unreviewed ? "warn" : "ok"}>{dashboard.unreviewed ?? 0}</dd></div>
          <div><dt>Metadata-only</dt><dd data-state="info">{dashboard.metadataOnly ?? 0}</dd></div>
          <div><dt>Test fixtures</dt><dd data-state={dashboard.testFixtures ? "warn" : "ok"}>{dashboard.testFixtures ?? 0}</dd></div>
          <div><dt>Stale/superseded</dt><dd data-state={dashboard.staleOrSuperseded ? "warn" : "ok"}>{dashboard.staleOrSuperseded ?? 0}</dd></div>
          <div><dt>Missing locators</dt><dd data-state={dashboard.missingLocator ? "warn" : "ok"}>{dashboard.missingLocator ?? 0}</dd></div>
          <div><dt>Missing reviewer</dt><dd data-state={dashboard.missingReview ? "warn" : "ok"}>{dashboard.missingReview ?? 0}</dd></div>
        </dl>
        {dashboard.byProvenance && <p>Provenance: {Object.entries(dashboard.byProvenance).map(([method, count]) => `${method} ${count}`).join(" · ")}</p>}
        {dashboard.lastImport && <p>Last durable import: {dashboard.lastImport.target} · {dashboard.lastImport.createdAt} · fingerprint {dashboard.lastImport.fingerprintAfter}</p>}
        </>
      )}
      {dashboard.byStatus && <p>Status: {Object.entries(dashboard.byStatus).map(([status, count]) => `${status} ${count}`).join(" · ")}</p>}
      {dashboard.byDomain && <p>Domain: {Object.entries(dashboard.byDomain).map(([domain, count]) => `${domain} ${count}`).join(" · ")}</p>}
      <form onSubmit={(event) => void submit(event)}>
        <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label>Publisher<input value={publisher} onChange={(event) => setPublisher(event.target.value)} required /></label>
        <label>Canonical URL (optional)<input value={url} onChange={(event) => setUrl(event.target.value)} /></label>
        <label>Extracted text or transcription<textarea value={text} onChange={(event) => setText(event.target.value)} /></label>
        <button type="submit">Submit for review</button>
      </form>
      <div className="cg-corpus-list">
        {documents.map((document) => (
          <article key={document.id} className="cg-corpus-card" data-fixture={document.fixture} data-exposure={document.productionExposure ? "public" : "internal"} data-provenance={document.provenanceMethod ?? document.retrievalMethod ?? "unknown"}>
            <strong>{document.title}</strong>
            <span>{document.publisher} · {document.ingestionStatus} · {document.provenanceMethod ?? "unknown provenance"} · {document.fixture ? "test fixture" : document.productionExposure ? "public answers" : "internal"} · {document.evidenceDomain}</span>
            <span>Version {document.currentVersionId ?? "none"} · reviewer {document.reviewerEmail ?? "none"} · claims {document.claimScope}</span>
            {document.rejectionReason && <small>{document.rejectionReason}</small>}
            <div className="cg-corpus-actions">
              <button type="button" onClick={() => void review(document.id, "accept")}>Accept (not auto-public)</button>
              <button type="button" onClick={() => void review(document.id, "expose")}>Expose after review</button>
              <button type="button" onClick={() => void review(document.id, "unexpose")}>Hide from public</button>
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
