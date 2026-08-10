"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { trackEvent } from "./AnalyticsBridge";
import { evaluateHomepageRequest, homepageIntentPrompts, type HomepageIntakeResult } from "../home/intake";

type ViewState = "idle" | "loading" | "validation" | "result";

export function HomepageIntake() {
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
    const nextResult = evaluateHomepageRequest(request);
    trackEvent("homepage_intake_submitted", { source: "homepage_hero", intent: nextResult.intent });
    window.setTimeout(() => {
      setResult(nextResult);
      setViewState("result");
    }, 120);
  }

  function choosePrompt(value: string) {
    setRequest(value);
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
          if (viewState === "validation") setViewState("idle");
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
          <button type="button" key={prompt.label} onClick={() => choosePrompt(prompt.value)}>{prompt.label}</button>
        ))}
      </div>
      <div id="homepage-intake-status" className="cg-intake-status" aria-live="polite" aria-atomic="true">
        {viewState === "loading" && <p><strong>Reading your request</strong><span>Looking for the closest capability Chef Gringo can support honestly.</span></p>}
        {viewState === "validation" && <p className="cg-intake-validation" role="alert"><strong>Tell me what’s going on.</strong><span>A few words about what you want to buy, fix, compare, improve, or understand is enough to start.</span></p>}
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
