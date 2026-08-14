"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { trackEvent } from "./AnalyticsBridge";
import { evaluateHomepageRequest, homepageIntentPrompts, type HomepageIntakeResult } from "../home/intake";
import type { PublicDecisionProof } from "../home/decision-proof";
import { createInvestigationCase, supportsRealInvestigation, type InvestigationCase } from "../home/investigation-case";

type ViewState = "idle" | "loading" | "validation" | "error" | "result";

export function HomepageIntake({ onDecisionProof, onInvestigationCase }: { onDecisionProof?: (proof: PublicDecisionProof | null) => void; onInvestigationCase?: (investigation: InvestigationCase | null) => void }) {
  const [request, setRequest] = useState("");
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [result, setResult] = useState<HomepageIntakeResult | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    if (!request.trim()) {
      setViewState("validation");
      trackEvent("homepage_intake_validation_failed", { source: "homepage_hero" });
      return;
    }

    setViewState("loading");
    if (supportsRealInvestigation(request)) {
      trackEvent("homepage_real_investigation_started", { source: "homepage_hero" });
      window.setTimeout(() => {
        try {
          const investigation = createInvestigationCase({ problem: request, capturedAt: new Date().toISOString() });
          onDecisionProof?.(null);
          onInvestigationCase?.(investigation);
          setResult({ state: "handoff", intent: "repair", heading: "The investigation is open", message: "Chef Gringo separated your observations from inferences, unknowns, safety boundaries, and the evidence needed next.", href: "#investigation-case", actionLabel: "Review the case file" });
          setViewState("result");
          window.requestAnimationFrame(() => document.getElementById("investigation-case-title")?.focus());
        } catch {
          onInvestigationCase?.(null);
          setViewState("error");
        }
      }, 120);
      return;
    }
    const nextResult = evaluateHomepageRequest(request);
    onDecisionProof?.(null);
    onInvestigationCase?.(null);
    trackEvent("homepage_intake_submitted", { source: "homepage_hero", intent: nextResult.intent });
    window.setTimeout(() => {
      setResult(nextResult);
      setViewState("result");
    }, 120);
  }

  function choosePrompt(value: string) {
    setRequest(value);
    onDecisionProof?.(null);
    onInvestigationCase?.(null);
    setResult(null);
    setViewState("idle");
    input.current?.focus();
  }

  function submitFromKeyboard(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.current?.requestSubmit();
    }
  }

  return (
    <form ref={form} className="cg-home-intake" onSubmit={submit} aria-label="Tell Chef Gringo what you are working on" noValidate>
      <label htmlFor="operator-question">What are you trying to buy, fix, compare, improve, or figure out?</label>
      <textarea
        ref={input}
        id="operator-question"
        name="request"
        rows={4}
        value={request}
        onChange={(event) => {
          setRequest(event.target.value);
          onDecisionProof?.(null);
          onInvestigationCase?.(null);
          if (viewState === "validation" || viewState === "error") setViewState("idle");
        }}
        onKeyDown={submitFromKeyboard}
        placeholder="Tell Chef Gringo what you’re trying to buy, fix, compare, improve, or figure out."
        aria-describedby="homepage-intake-help homepage-intake-status"
        aria-invalid={viewState === "validation"}
      />
      <div className="cg-intake-actions">
        <span id="homepage-intake-help">Ctrl or ⌘ + Enter to send</span>
        <button className="cg-button cg-button-primary" type="submit" disabled={viewState === "loading"}>
          {viewState === "loading" ? "Reading your request" : "Tell Chef Gringo"}
        </button>
      </div>
      <div className="cg-intent-prompts" aria-label="Example requests">
        {homepageIntentPrompts.map((prompt) => (
          <button className="cg-intent-example" type="button" key={prompt.label} onClick={() => choosePrompt(prompt.value)}>{prompt.label}</button>
        ))}
      </div>
      <div id="homepage-intake-status" className="cg-intake-status" aria-live="polite" aria-atomic="true">
        {viewState === "loading" && <p><strong>{supportsRealInvestigation(request) ? "Structuring the investigation" : "Reading your request"}</strong><span>{supportsRealInvestigation(request) ? "Separating your observations from unknowns and identifying only the evidence needed next." : "Looking for the closest capability Chef Gringo can support honestly."}</span></p>}
        {viewState === "validation" && <p className="cg-intake-validation" role="alert"><strong>Tell me what’s going on.</strong><span>A few words about what you want to buy, fix, compare, improve, or understand is enough to start.</span></p>}
        {viewState === "error" && <p className="cg-intake-validation" role="alert"><strong>The case could not be opened.</strong><span>Nothing was guessed or saved. Try the controlled case again.</span><button type="button" onClick={() => form.current?.requestSubmit()}>Retry</button></p>}
        {viewState === "result" && result && (
          <div className={`cg-intake-result cg-intake-result-${result.state}`}>
            <strong>{result.heading}</strong>
            <p>{result.message}</p>
            {result.href && result.actionLabel && <Link href={result.href}>{result.actionLabel} <span aria-hidden="true">→</span></Link>}
          </div>
        )}
      </div>
    </form>
  );
}
