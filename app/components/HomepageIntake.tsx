"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { trackEvent } from "./AnalyticsBridge";
import { evaluateHomepageRequest, homepageIntentPrompts, type HomepageIntakeResult } from "../home/intake";
import type { PublicDecisionProof } from "../home/decision-proof";
import { createInvestigationCase, supportsRealInvestigation, type InvestigationCase } from "../home/investigation-case";

type ViewState = "idle" | "loading" | "validation" | "error" | "result";
type ConversationMessage = { role: "user" | "assistant"; content: string };

type AiResponse = {
  configured?: boolean;
  answer?: string;
  model?: string;
  source?: string;
  error?: string;
};

export function HomepageIntake({ onDecisionProof, onInvestigationCase }: { onDecisionProof?: (proof: PublicDecisionProof | null) => void; onInvestigationCase?: (investigation: InvestigationCase | null) => void }) {
  const [request, setRequest] = useState("");
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [result, setResult] = useState<HomepageIntakeResult | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = request.trim();
    setResult(null);
    if (!prompt) {
      setViewState("validation");
      trackEvent("homepage_intake_validation_failed", { source: "homepage_hero" });
      return;
    }

    setViewState("loading");

    // Keep the governed equipment investigation path deterministic when the request
    // contains a safety-sensitive repair scenario that Chef Gringo already supports.
    if (supportsRealInvestigation(prompt)) {
      trackEvent("homepage_real_investigation_started", { source: "homepage_hero" });
      window.setTimeout(() => {
        try {
          const investigation = createInvestigationCase({ problem: prompt, capturedAt: new Date().toISOString() });
          onDecisionProof?.(null);
          onInvestigationCase?.(investigation);
          setAiAnswer(null);
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

    onDecisionProof?.(null);
    onInvestigationCase?.(null);

    try {
      const response = await fetch("/api/chef-gringo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, history: conversation.slice(-8) }),
      });
      const payload = await response.json() as AiResponse;

      if (response.ok && payload.answer) {
        const answer = payload.answer.trim();
        setAiAnswer(answer);
        setConversation((current) => [...current, { role: "user", content: prompt }, { role: "assistant", content: answer }].slice(-8));
        setRequest("");
        setViewState("result");
        trackEvent("homepage_ai_answered", { source: "homepage_intake", runtime: payload.source || "configured" });
        window.requestAnimationFrame(() => document.getElementById("chef-gringo-ai-answer")?.focus());
        return;
      }
    } catch {
      // The deterministic intake remains an honest fallback when no AI provider is
      // configured or a local/provider runtime is temporarily unavailable.
    }

    const nextResult = evaluateHomepageRequest(prompt);
    setAiAnswer(null);
    trackEvent("homepage_intake_submitted", { source: "homepage_fallback", intent: nextResult.intent });
    setResult(nextResult);
    setViewState("result");
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
    <form ref={form} className="cg-home-intake" onSubmit={submit} aria-label="Ask Chef Gringo" noValidate>
      <label htmlFor="operator-question">Ask about cooking, equipment, costs, sourcing, operations, or whatever you’re working on.</label>
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
        placeholder="Try: Help me make marinara, scale a recipe for 90, compare two refrigerators, or figure out why my food cost is climbing."
        aria-describedby="homepage-intake-help homepage-intake-status"
        aria-invalid={viewState === "validation"}
      />
      <div className="cg-intake-actions">
        <span id="homepage-intake-help">Ctrl or ⌘ + Enter to send</span>
        <button className="cg-button cg-button-primary" type="submit" disabled={viewState === "loading"}>
          {viewState === "loading" ? "Chef Gringo is thinking" : "Ask Chef Gringo"}
        </button>
      </div>
      <div className="cg-intent-prompts" aria-label="Example requests">
        {homepageIntentPrompts.map((prompt) => (
          <button className="cg-intent-example" type="button" key={prompt.label} onClick={() => choosePrompt(prompt.value)}>{prompt.label}</button>
        ))}
      </div>
      <div id="homepage-intake-status" className="cg-intake-status" aria-live="polite" aria-atomic="false">
        {viewState === "loading" && <p><strong>{supportsRealInvestigation(request) ? "Structuring the investigation" : "Working on it"}</strong><span>{supportsRealInvestigation(request) ? "Separating observations from unknowns and identifying the evidence needed next." : "Chef Gringo is reading the question and deciding whether to answer directly or use a governed workflow."}</span></p>}
        {viewState === "validation" && <p className="cg-intake-validation" role="alert"><strong>Ask me anything hospitality.</strong><span>A few words are enough to start.</span></p>}
        {viewState === "error" && <p className="cg-intake-validation" role="alert"><strong>The case could not be opened.</strong><span>Nothing was guessed or saved. Try again.</span><button type="button" onClick={() => form.current?.requestSubmit()}>Retry</button></p>}
        {viewState === "result" && aiAnswer && (
          <div className="cg-intake-result cg-intake-result-ai" id="chef-gringo-ai-answer" tabIndex={-1}>
            <strong>Chef Gringo</strong>
            <p className="cg-ai-answer">{aiAnswer}</p>
            <small>Ask a follow-up above. Conversation context stays limited to this browser session.</small>
          </div>
        )}
        {viewState === "result" && !aiAnswer && result && (
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
