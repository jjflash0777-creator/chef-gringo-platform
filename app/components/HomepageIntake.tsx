"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { trackEvent } from "./AnalyticsBridge";
import { evaluateHomepageRequest, homepageIntentPrompts, type HomepageIntakeResult } from "../home/intake";
import type { PublicDecisionProof } from "../home/decision-proof";
import { createInvestigationCase, supportsRealInvestigation, type InvestigationCase } from "../home/investigation-case";
import type { ChefGringoActionChoice, ChefGringoActionTerminal } from "../lib/ai/actionEngine";

type ViewState = "idle" | "loading" | "validation" | "error" | "result";
type ConversationMessage = { role: "user" | "assistant"; content: string };
type QuickReply = { label: string; value: string };

type AiResponse = {
  configured?: boolean;
  answer?: string;
  quickReplies?: QuickReply[];
  actions?: ChefGringoActionTerminal[];
  model?: string;
  source?: string;
  error?: string;
};

export function HomepageIntake({ onDecisionProof, onInvestigationCase }: { onDecisionProof?: (proof: PublicDecisionProof | null) => void; onInvestigationCase?: (investigation: InvestigationCase | null) => void }) {
  const [request, setRequest] = useState("");
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [result, setResult] = useState<HomepageIntakeResult | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [actions, setActions] = useState<ChefGringoActionTerminal[]>([]);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  async function runPrompt(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    setResult(null);
    setQuickReplies([]);
    setActions([]);
    if (!prompt) {
      setViewState("validation");
      trackEvent("homepage_intake_validation_failed", { source: "homepage_hero" });
      return;
    }

    setViewState("loading");

    if (supportsRealInvestigation(prompt)) {
      trackEvent("homepage_real_investigation_started", { source: "homepage_hero" });
      window.setTimeout(() => {
        try {
          const investigation = createInvestigationCase({ problem: prompt, capturedAt: new Date().toISOString() });
          onDecisionProof?.(null);
          onInvestigationCase?.(investigation);
          setAiAnswer(null);
          setRequest("");
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
        setQuickReplies(Array.isArray(payload.quickReplies) ? payload.quickReplies.slice(0, 5) : []);
        setActions(Array.isArray(payload.actions) ? payload.actions.slice(0, 4) : []);
        setConversation((current) => [...current, { role: "user", content: prompt }, { role: "assistant", content: answer }].slice(-8));
        setRequest("");
        setViewState("result");
        trackEvent("homepage_ai_answered", { source: "homepage_intake", runtime: payload.source || "configured" });
        window.requestAnimationFrame(() => document.getElementById("chef-gringo-ai-answer")?.focus());
        return;
      }
    } catch {
      // Honest deterministic fallback when the AI runtime is unavailable.
    }

    const nextResult = evaluateHomepageRequest(prompt);
    setAiAnswer(null);
    setQuickReplies([]);
    setActions([]);
    trackEvent("homepage_intake_submitted", { source: "homepage_fallback", intent: nextResult.intent });
    setResult(nextResult);
    setViewState("result");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runPrompt(request);
  }

  function choosePrompt(value: string) {
    setRequest(value);
    onDecisionProof?.(null);
    onInvestigationCase?.(null);
    setResult(null);
    setQuickReplies([]);
    setActions([]);
    setViewState("idle");
    input.current?.focus();
  }

  async function chooseQuickReply(reply: QuickReply) {
    if (viewState === "loading") return;
    trackEvent("homepage_ai_quick_reply_selected", { label: reply.label });
    setRequest(reply.value);
    await runPrompt(reply.value);
  }

  async function chooseAction(action: ChefGringoActionTerminal, choice: ChefGringoActionChoice) {
    if (viewState === "loading") return;
    trackEvent("chef_gringo_action_selected", { actionKind: action.kind, actionId: action.id, choiceId: choice.id });
    setRequest(choice.value);
    await runPrompt(choice.value);
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
        <span id="homepage-intake-help">Choose a suggestion or type anything · Ctrl or ⌘ + Enter to send</span>
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
        {viewState === "loading" && <p><strong>{supportsRealInvestigation(request) ? "Structuring the investigation" : "Working on it"}</strong><span>{supportsRealInvestigation(request) ? "Separating observations from unknowns and identifying the evidence needed next." : "Chef Gringo is building the answer and the easiest next actions."}</span></p>}
        {viewState === "validation" && <p className="cg-intake-validation" role="alert"><strong>Ask me anything hospitality.</strong><span>A few words are enough to start.</span></p>}
        {viewState === "error" && <p className="cg-intake-validation" role="alert"><strong>The case could not be opened.</strong><span>Nothing was guessed or saved. Try again.</span><button type="button" onClick={() => form.current?.requestSubmit()}>Retry</button></p>}
        {viewState === "result" && aiAnswer && (
          <div className="cg-intake-result cg-intake-result-ai" id="chef-gringo-ai-answer" tabIndex={-1}>
            <div className="cg-ai-answer-header"><strong>Chef Gringo</strong><span>Decision → Action</span></div>
            <p className="cg-ai-answer">{aiAnswer}</p>

            {actions.length > 0 && (
              <div className="cg-action-terminal-stack" aria-label="Chef Gringo next actions">
                {actions.map((action) => (
                  <section className={`cg-action-terminal cg-action-${action.kind}`} key={action.id}>
                    <div className="cg-action-terminal-heading">
                      <div>
                        <span className="cg-action-kicker">Next action</span>
                        <h3>{action.title}</h3>
                        <p>{action.description}</p>
                      </div>
                      <span className="cg-action-independence">Recommendation first</span>
                    </div>
                    {action.choices && action.choices.length > 0 && (
                      <div className="cg-action-choice-grid">
                        {action.choices.map((choice) => (
                          <button
                            type="button"
                            className={`cg-action-choice cg-action-choice-${choice.emphasis || "standard"}`}
                            key={choice.id}
                            onClick={() => void chooseAction(action, choice)}
                            disabled={viewState === "loading"}
                          >
                            <strong>{choice.label}</strong>
                            <span>{choice.description}</span>
                            <b>Choose →</b>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}

            {quickReplies.length > 0 && (
              <div className="cg-ai-quick-replies" aria-label="Suggested next choices">
                <span>Or keep exploring</span>
                <div>
                  {quickReplies.map((reply) => (
                    <button type="button" key={`${reply.label}-${reply.value}`} onClick={() => void chooseQuickReply(reply)} disabled={viewState === "loading"}>
                      {reply.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <small>You can always ignore the choices and type exactly what you want.</small>
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
