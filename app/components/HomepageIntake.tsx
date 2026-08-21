"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useRef, useState } from "react";
import { AffiliateDisclosure } from "./AffiliateDisclosure";
import { rememberCommercialIntent, trackCommercialEvent, trackEvent } from "./AnalyticsBridge";
import { evaluateHomepageRequest, homepageIntentPrompts, type HomepageIntakeResult } from "../home/intake";
import type { PublicDecisionProof } from "../home/decision-proof";
import { createInvestigationCase, supportsRealInvestigation, type InvestigationCase } from "../home/investigation-case";
import type { ChefGringoActionChoice, ChefGringoActionTerminal } from "../lib/ai/actionEngine";
import type { CommercialIntelligence, EvidenceBackedProductRoute } from "../lib/ai/commercialIntelligence";

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
  commercialIntelligence?: CommercialIntelligence;
  error?: string;
};

type HomepageIntakeProps = {
  onDecisionProof?: (proof: PublicDecisionProof | null) => void;
  onInvestigationCase?: (investigation: InvestigationCase | null) => void;
  initialRequest?: string;
  source?: string;
};

export function HomepageIntake({ onDecisionProof, onInvestigationCase, initialRequest = "", source = "homepage" }: HomepageIntakeProps) {
  const [request, setRequest] = useState(initialRequest);
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [result, setResult] = useState<HomepageIntakeResult | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [actions, setActions] = useState<ChefGringoActionTerminal[]>([]);
  const [commercialIntelligence, setCommercialIntelligence] = useState<CommercialIntelligence | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  async function runPrompt(rawPrompt: string) {
    const prompt = rawPrompt.trim();
    setResult(null);
    setQuickReplies([]);
    setActions([]);
    setCommercialIntelligence(null);
    if (!prompt) {
      setViewState("validation");
      trackEvent("homepage_intake_validation_failed", { source });
      return;
    }

    setViewState("loading");

    if (supportsRealInvestigation(prompt)) {
      trackEvent("homepage_real_investigation_started", { source });
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
        const intelligence = payload.commercialIntelligence?.version === 1 ? payload.commercialIntelligence : null;
        setCommercialIntelligence(intelligence);
        const exchange: ConversationMessage[] = [{ role: "user", content: prompt }, { role: "assistant", content: answer }];
        setConversation((current) => [...current, ...exchange].slice(-8));
        setRequest("");
        setViewState("result");
        trackEvent("homepage_ai_answered", { source, runtime: payload.source || "configured" });
        if (intelligence?.intent.commercialEligible) {
          rememberCommercialIntent({ intentKind: intelligence.intent.kind, workflowId: intelligence.intent.workflowId || "unknown", confidence: intelligence.intent.confidence });
          trackCommercialEvent("recommendation_view", {
            source,
            pagePath: window.location.pathname,
            contentId: `intent:${intelligence.intent.workflowId}`,
            metadata: { intentKind: intelligence.intent.kind, confidence: intelligence.intent.confidence, routeCount: intelligence.routes.length },
          });
        }
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
    setCommercialIntelligence(null);
    trackEvent("homepage_intake_submitted", { source, intent: nextResult.intent });
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
    setCommercialIntelligence(null);
    setViewState("idle");
    input.current?.focus();
  }

  async function chooseQuickReply(reply: QuickReply) {
    if (viewState === "loading") return;
    trackEvent("homepage_ai_quick_reply_selected", { source, label: reply.label });
    setRequest(reply.value);
    await runPrompt(reply.value);
  }

  async function chooseAction(action: ChefGringoActionTerminal, choice: ChefGringoActionChoice) {
    if (viewState === "loading") return;
    trackEvent("chef_gringo_action_selected", { source, actionKind: action.kind, actionId: action.id, choiceId: choice.id });
    setRequest(choice.value);
    await runPrompt(choice.value);
  }

  function openProductRoute(route: EvidenceBackedProductRoute) {
    const attributionId = crypto.randomUUID();
    trackCommercialEvent("merchant_click", {
      source,
      pagePath: window.location.pathname,
      contentId: route.workflowId,
      recommendationId: route.recommendationId,
      productId: route.productId,
      metadata: { attributionId, routeId: route.id, affiliateStatus: route.affiliateStatus },
    });
    window.open(route.merchantUrl, "_blank", "noopener,noreferrer");
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

            {commercialIntelligence && commercialIntelligence.routes.length > 0 && (
              <section className="cg-action-terminal cg-commercial-routes" aria-labelledby="commercial-routes-title">
                <div className="cg-action-terminal-heading">
                  <div>
                    <span className="cg-action-kicker">Evidence-backed routes</span>
                    <h3 id="commercial-routes-title">Real options worth investigating</h3>
                    <p>Matched from Chef Gringo’s governed catalog. Prices, availability, exact fit, and commercial terms still require verification.</p>
                  </div>
                  <span className="cg-action-independence">Editorial score first</span>
                </div>
                <AffiliateDisclosure />
                <div className="cg-action-choice-grid">
                  {commercialIntelligence.routes.map((route) => (
                    <article className="cg-action-choice cg-product-route" key={route.id}>
                      <span>{route.manufacturer}</span>
                      <strong>{route.name}</strong>
                      <p>{route.bestFor}</p>
                      <small>{route.priceContext}</small>
                      <div>
                        <a href={route.evidenceUrl} target="_blank" rel="noreferrer">Evidence checked {route.evidenceCheckedAt}</a>
                        <button type="button" onClick={() => openProductRoute(route)}>Check current route →</button>
                      </div>
                      <small>{route.disclosure}</small>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {quickReplies.length > 0 && (
              <div className="cg-ai-quick-replies" aria-label="Suggested next choices">
                <span>Or keep exploring</span>
                <div>
                  {quickReplies.map((reply) => (
                    <button type="button" key={`${reply.label}-${reply.value}`} onClick={() => void chooseQuickReply(reply)}>
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
