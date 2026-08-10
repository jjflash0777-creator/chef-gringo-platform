"use client";

import { FormEvent, useState } from "react";
import { EXTERNAL_SOURCE_TYPES, ingestExternalEvidence, type EvidenceMediaType, type ExternalEvidenceResult, type ExternalSourceType } from "../home/external-evidence";
import type { InvestigationCase } from "../home/investigation-case";

const sourceLabels: Record<ExternalSourceType, string> = { data_plate_image: "Data plate photo", manufacturer_documentation: "Manufacturer document", technician_report: "Technician report", service_invoice: "Service invoice", parts_documentation: "Parts documentation", seller_listing: "Seller listing", distributor_quote: "Replacement quote", regulatory_document: "Regulatory document" };
function mediaType(file: File): EvidenceMediaType { if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf"; if (file.type.startsWith("image/")) return "image"; return "plain_text"; }

export function ExternalEvidencePanel({ investigation, onUpdated }: { investigation: InvestigationCase; onUpdated: (result: ExternalEvidenceResult) => void }) {
  const [sourceType, setSourceType] = useState<ExternalSourceType>("data_plate_image");
  const [file, setFile] = useState<File | null>(null);
  const [sourceLocation, setSourceLocation] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [state, setState] = useState<"idle" | "reading" | "error" | "added">("idle");
  const [message, setMessage] = useState("");
  const [lastResult, setLastResult] = useState<ExternalEvidenceResult | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setState("error"); setMessage("Choose one supported evidence file."); return; }
    setState("reading"); setMessage("Reading only the supplied evidence.");
    try {
      const kind = mediaType(file);
      const text = sourceText.trim() || (kind === "plain_text" ? await file.text() : "");
      const result = ingestExternalEvidence(investigation, { fileName: file.name, mediaType: kind, sourceType, contentText: text, sourceLocation: sourceLocation.trim() || null, extractedAt: new Date().toISOString() });
      setLastResult(result); onUpdated(result); setState("added"); setMessage("Evidence added. The case was recomputed without storing the file.");
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "The evidence could not be ingested."); }
  }
  return <section className="cg-external-evidence" aria-labelledby="external-evidence-title">
    <header><p className="cg-type-operational">External evidence</p><h3 id="external-evidence-title" tabIndex={-1}>Add one source to the case</h3><p>Choose a narrow source type. Plain-text files are read locally. PDF and image evidence requires exact visible-text transcription in this prototype; no OCR or network service is used.</p></header>
    <form onSubmit={submit} noValidate>
      <label htmlFor="evidence-source-type">Evidence type</label><select id="evidence-source-type" value={sourceType} onChange={(event) => setSourceType(event.target.value as ExternalSourceType)}>{EXTERNAL_SOURCE_TYPES.map((type) => <option key={type} value={type}>{sourceLabels[type]}</option>)}</select>
      <label htmlFor="evidence-file">Source file</label><input id="evidence-file" type="file" accept=".txt,text/plain,.pdf,application/pdf,image/*" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setState("idle"); }} />
      <label htmlFor="evidence-location">Page or location reference</label><input id="evidence-location" value={sourceLocation} onChange={(event) => setSourceLocation(event.target.value)} placeholder="Example: page 4 or data plate front" />
      <label htmlFor="evidence-text">Exact source text</label><textarea id="evidence-text" rows={7} value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder={sourceType === "data_plate_image" ? "Manufacturer: Example Co.\nModel: ABC123\nVoltage: 208–230V" : "Paste or transcribe only what the source explicitly states."} />
      <button className="cg-button cg-button-primary" type="submit" disabled={state === "reading"}>{state === "reading" ? "Checking evidence" : "Add evidence to case"}</button>
      <div className={`cg-evidence-add-status cg-evidence-add-${state}`} aria-live="polite">{message}</div>
    </form>
    {lastResult && <div className="cg-evidence-change"><div><span>Source authority</span><strong>{lastResult.document.validation.replaceAll("_", " ")}</strong></div><div><span>What it established</span><strong>{lastResult.establishedFacts.length} supported facts</strong></div><div><span>Conflicts</span><strong>{lastResult.conflicts.length || "None"}</strong></div><div><span>Case state</span><strong>{lastResult.stateBefore.replaceAll("_", " ")} → {lastResult.stateAfter.replaceAll("_", " ")}</strong></div>{lastResult.quote && <p><strong>Quote total:</strong> {lastResult.quote.complete && lastResult.quote.totalCents !== null ? `$${(lastResult.quote.totalCents / 100).toLocaleString("en-US")}` : "Unknown — incomplete components"}</p>}{lastResult.conflicts.length > 0 && <div className="cg-evidence-findings"><strong>Conflicting claims retained</strong><ul>{lastResult.conflicts.map((conflict) => <li key={conflict}>{conflict}</li>)}</ul></div>}{lastResult.unresolved.length > 0 && <div className="cg-evidence-findings"><strong>Still unresolved</strong><ul>{lastResult.unresolved.map((unknown) => <li key={unknown}>{unknown}</li>)}</ul></div>}</div>}
  </section>;
}
