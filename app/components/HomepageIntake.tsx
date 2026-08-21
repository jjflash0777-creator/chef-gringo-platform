"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useId, useRef, useState } from "react";
import { AffiliateDisclosure } from "./AffiliateDisclosure";
import { rememberCommercialIntent, trackCommercialEvent, trackEvent } from "./AnalyticsBridge";
import { homepageIntentPrompts } from "../home/intake";
import type { PublicDecisionProof } from "../home/decision-proof";
import { createInvestigationCase, supportsRealInvestigation, type InvestigationCase } from "../home/investigation-case";
import type { AssistantCommercialRoute, AssistantRequest, AssistantResponse, ConversationTurn, PhotoMetadata } from "../lib/ai/assistant-contract";

type ViewState = "idle" | "loading" | "validation" | "error" | "result" | "clarifying";
type ThreadItem = {
  id: string;
  role: "user" | "assistant";
  question?: string;
  response?: AssistantResponse;
};

type HomepageIntakeProps = {
  onDecisionProof?: (proof: PublicDecisionProof | null) => void;
  onInvestigationCase?: (investigation: InvestigationCase | null) => void;
  initialRequest?: string;
  source?: string;
};

const STARTERS = [
  { label: "What’s mirepoix?", value: "What's mirepoix?" },
  { label: "Make marinara", value: "Help me make marinara." },
  ...homepageIntentPrompts,
];

function analyticsSafe(details: Record<string, unknown>) {
  const blocked = /question|prompt|photo|image|location|lat|lng|medical|diet|diagnos|credential|token|authorization/i;
  return Object.fromEntries(Object.entries(details).filter(([key]) => !blocked.test(key)));
}

export function HomepageIntake({ onDecisionProof, onInvestigationCase, initialRequest = "", source = "homepage" }: HomepageIntakeProps) {
  const [request, setRequest] = useState(initialRequest);
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [operatingContext, setOperatingContext] = useState("");
  const [dietaryContext, setDietaryContext] = useState("");
  const [photo, setPhoto] = useState<PhotoMetadata | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [lastError, setLastError] = useState<AssistantResponse | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const photoId = useId();

  function contextPayload(): Pick<AssistantRequest, "location" | "budget" | "operatingContext" | "dietaryContext" | "photo"> {
    return {
      location: location.trim() || null,
      budget: budget.trim() || null,
      operatingContext: operatingContext.trim() || null,
      dietaryContext: dietaryContext.trim() || null,
      photo,
    };
  }

  async function runPrompt(rawPrompt: string, opts: { retry?: boolean } = {}) {
    const prompt = rawPrompt.trim();
    onDecisionProof?.(null);
    if (!prompt) {
      setViewState("validation");
      setLastError(null);
      trackEvent("homepage_intake_validation_failed", analyticsSafe({ source }));
      return;
    }

    setViewState("loading");
    setLastError(null);
    trackEvent(opts.retry ? "chef_gringo_retry" : "chef_gringo_question_submitted", analyticsSafe({ source, retry: Boolean(opts.retry) }));

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 50000);

    try {
      const response = await fetch("/api/chef-gringo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question: prompt,
          conversation: conversation.slice(-8),
          source,
          ...contextPayload(),
        }),
      });
      const payload = await response.json() as AssistantResponse;
      if (!payload || typeof payload !== "object" || !payload.status) {
        throw new Error("malformed");
      }

      if (payload.status === "error") {
        setLastError(payload);
        setViewState("error");
        trackEvent("chef_gringo_error_shown", analyticsSafe({ source, code: payload.error?.code || "server_error" }));
        return;
      }

      const exchange: ConversationTurn[] = [
        { role: "user", content: prompt },
        { role: "assistant", content: payload.answer },
      ];
      setConversation((current) => [...current, ...exchange].slice(-8));
      setThread((current) => [
        ...current,
        { id: `u-${Date.now()}`, role: "user" as const, question: prompt },
        { id: `a-${Date.now()}`, role: "assistant" as const, response: payload },
      ].slice(-12));
      setRequest("");
      setViewState(payload.status === "needs_clarification" ? "clarifying" : "result");
      if (payload.status === "needs_clarification") {
        setViewState("clarifying");
        trackEvent("chef_gringo_clarification_requested", analyticsSafe({ source, intent: payload.intent }));
      } else {
        trackEvent("chef_gringo_answer_rendered", analyticsSafe({ source, intent: payload.intent, hasCommercial: Boolean(payload.commercial?.routes.length) }));
      }
      if (payload.commercial?.eligible) {
        rememberCommercialIntent({ intentKind: payload.intent, workflowId: payload.commercial.routes[0]?.workflowId || "unknown", confidence: payload.confidence });
        trackCommercialEvent("recommendation_view", analyticsSafe({
          source,
          pagePath: window.location.pathname,
          contentId: `intent:${payload.intent}`,
          metadata: { intent: payload.intent, routeCount: payload.commercial.routes.length },
        }));
      }
      window.requestAnimationFrame(() => document.getElementById("chef-gringo-ai-answer")?.focus());
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      const fallback: AssistantResponse = {
        status: "error",
        intent: "general",
        answer: timedOut
          ? "Chef Gringo timed out before finishing. Your question is still here — retry when you are ready."
          : "The connection dropped before Chef Gringo finished. Your question is still here.",
        nextActions: [],
        assumptions: [],
        confidence: "low",
        evidence: [],
        safety: null,
        commercial: null,
        error: {
          code: timedOut ? "timeout" : "network_failure",
          message: timedOut
            ? "Chef Gringo timed out before finishing. Your question is still here — retry when you are ready."
            : "The connection dropped before Chef Gringo finished. Your question is still here.",
          retryable: true,
          httpStatus: timedOut ? 504 : 502,
        },
      };
      setLastError(fallback);
      setViewState("error");
      trackEvent("chef_gringo_error_shown", analyticsSafe({ source, code: fallback.error?.code }));
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runPrompt(request);
  }

  function choosePrompt(value: string) {
    setRequest(value);
    onDecisionProof?.(null);
    setViewState("idle");
    input.current?.focus();
  }

  async function continueWith(prompt: string) {
    if (viewState === "loading") return;
    setRequest(prompt);
    await runPrompt(prompt);
  }

  async function openInvestigation() {
    const problem = [...thread].reverse().find((item) => item.question)?.question || request;
    if (!problem.trim()) return;
    trackEvent("homepage_real_investigation_started", analyticsSafe({ source }));
    setViewState("loading");
    window.setTimeout(() => {
      try {
        if (!supportsRealInvestigation(problem) && problem.length < 12) {
          setViewState("result");
          return;
        }
        const investigation = createInvestigationCase({ problem, capturedAt: new Date().toISOString() });
        onInvestigationCase?.(investigation);
        setViewState("result");
        window.requestAnimationFrame(() => document.getElementById("investigation-case-title")?.focus());
      } catch {
        onInvestigationCase?.(null);
        setViewState("error");
      }
    }, 120);
  }

  function openProductRoute(route: AssistantCommercialRoute) {
    if (!route.href) return;
    const eventName = route.monetized ? "affiliate_click" : "merchant_click";
    trackCommercialEvent(eventName, analyticsSafe({
      source,
      pagePath: window.location.pathname,
      contentId: route.workflowId,
      productId: route.productId,
      metadata: { commercialKind: route.commercialKind, monetized: route.monetized },
    }));
    window.open(route.href, "_blank", "noopener,noreferrer");
  }

  function submitFromKeyboard(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      form.current?.requestSubmit();
    }
  }

  function addPhoto(file: File | undefined) {
    if (!file) return;
    setPhoto({ name: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size });
    trackEvent("chef_gringo_context_added", analyticsSafe({ source, contextType: "photo" }));
    setContextOpen(true);
  }

  function setContext(field: "location" | "budget" | "operating" | "dietary", value: string) {
    if (field === "location") setLocation(value);
    if (field === "budget") setBudget(value);
    if (field === "operating") setOperatingContext(value);
    if (field === "dietary") setDietaryContext(value);
    if (value.trim()) trackEvent("chef_gringo_context_added", analyticsSafe({ source, contextType: field }));
  }

  function clearPhoto() {
    setPhoto(null);
  }

  const activeContext = [
    location.trim() && { key: "location", label: `Location: ${location.trim()}`, clear: () => setLocation("") },
    budget.trim() && { key: "budget", label: `Budget: ${budget.trim()}`, clear: () => setBudget("") },
    operatingContext.trim() && { key: "operating", label: `Operation: ${operatingContext.trim()}`, clear: () => setOperatingContext("") },
    dietaryContext.trim() && { key: "dietary", label: `Diet/safety: ${dietaryContext.trim()}`, clear: () => setDietaryContext("") },
    photo && { key: "photo", label: `Photo: ${photo.name}`, clear: clearPhoto },
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  return (
    <form ref={form} className="cg-home-intake cg-assistant" onSubmit={submit} aria-label="Ask Chef Gringo" noValidate>
      {thread.length > 0 && (
        <div className="cg-assistant-thread" aria-label="Conversation">
          {thread.map((item) => (
            item.role === "user" ? (
              <div className="cg-msg cg-msg-user" key={item.id}>
                <span className="cg-msg-who">You</span>
                <p>{item.question}</p>
              </div>
            ) : (
              <AssistantMessage
                key={item.id}
                response={item.response!}
                onContinue={continueWith}
                onInvestigate={() => void openInvestigation()}
                onOpenRoute={openProductRoute}
              />
            )
          ))}
        </div>
      )}

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
          if (viewState === "validation" || viewState === "error") setViewState(thread.length ? "result" : "idle");
        }}
        onKeyDown={submitFromKeyboard}
        placeholder="Try: What’s mirepoix?, Help me make marinara, scale a recipe for 90, or figure out why my food cost is climbing."
        aria-describedby="homepage-intake-help homepage-intake-status"
        aria-invalid={viewState === "validation"}
      />
      <div className="cg-intake-actions">
        <span id="homepage-intake-help">Choose a suggestion or type anything · Ctrl or ⌘ + Enter to send</span>
        <button className="cg-button cg-button-primary" type="submit" disabled={viewState === "loading"}>
          {viewState === "loading" ? "Chef Gringo is thinking" : "Ask Chef Gringo"}
        </button>
      </div>

      <div className="cg-assistant-context">
        <button type="button" className="cg-context-toggle" aria-expanded={contextOpen} onClick={() => setContextOpen((open) => !open)}>
          Optional context{activeContext.length ? ` · ${activeContext.length} active` : ""}
        </button>
        {contextOpen && (
          <div className="cg-context-fields">
            <label>Location<input value={location} onChange={(event) => setContext("location", event.target.value)} placeholder="City or state, if it matters" /></label>
            <label>Budget<input value={budget} onChange={(event) => setContext("budget", event.target.value)} placeholder="A range is enough" /></label>
            <label>Operating context<input value={operatingContext} onChange={(event) => setContext("operating", event.target.value)} placeholder="Home, restaurant, truck, care dining…" /></label>
            <label>Dietary or food-safety context<input value={dietaryContext} onChange={(event) => setContext("dietary", event.target.value)} placeholder="Allergen, texture, service rules…" /></label>
            <label htmlFor={photoId}>Photo
              <input
                id={photoId}
                key={photo ? photo.name : "photo-empty"}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={(event) => addPhoto(event.target.files?.[0])}
              />
            </label>
            <p className="cg-context-note">Photos are noted, not inspected. Location and diet stay on this device until you send the question — they are not written into analytics.</p>
          </div>
        )}
        {activeContext.length > 0 && (
          <ul className="cg-context-chips">
            {activeContext.map((chip) => (
              <li key={chip.key}>
                <span>{chip.label}</span>
                <button type="button" onClick={chip.clear} aria-label={`Remove ${chip.key}`}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="cg-intent-prompts" aria-label="Example requests">
        {STARTERS.map((prompt) => (
          <button className="cg-intent-example" type="button" key={prompt.label} onClick={() => choosePrompt(prompt.value)}>{prompt.label}</button>
        ))}
      </div>

      <div id="homepage-intake-status" className="cg-intake-status" aria-live="polite" aria-atomic="false">
        {viewState === "loading" && (
          <p>
            <strong>{supportsRealInvestigation(request) ? "Structuring the investigation" : "Working on it"}</strong>
            <span>{supportsRealInvestigation(request) ? "Separating observations from unknowns and identifying the evidence needed next." : "Chef Gringo is building the answer."}</span>
          </p>
        )}
        {viewState === "validation" && (
          <p className="cg-intake-validation" role="alert">
            <strong>Ask me anything hospitality.</strong>
            <span>A few words are enough to start. Nothing was sent.</span>
          </p>
        )}
        {viewState === "error" && lastError && (
          <p className="cg-intake-validation" role="alert">
            <strong>Chef Gringo could not finish.</strong>
            <span>{lastError.answer}</span>
            {lastError.error?.retryable && (
              <button type="button" onClick={() => void runPrompt(request, { retry: true })}>Retry</button>
            )}
          </p>
        )}
      </div>
    </form>
  );
}

function AssistantMessage({
  response,
  onContinue,
  onInvestigate,
  onOpenRoute,
}: {
  response: AssistantResponse;
  onContinue: (prompt: string) => void;
  onInvestigate: () => void;
  onOpenRoute: (route: AssistantCommercialRoute) => void;
}) {
  const commercial = response.commercial;
  return (
    <div className="cg-msg cg-msg-chef" id="chef-gringo-ai-answer" tabIndex={-1}>
      <span className="cg-msg-who">Chef Gringo</span>
      <p className="cg-ai-answer">{response.answer}</p>
      {response.explanation && <p className="cg-ai-explain">{response.explanation}</p>}
      {response.clarifyingQuestion && (
        <p className="cg-clarifying"><strong>One thing that would change the answer:</strong> {response.clarifyingQuestion}</p>
      )}
      {response.assumptions.length > 0 && (
        <p className="cg-assumptions"><strong>Assuming:</strong> {response.assumptions.join(" ")}</p>
      )}
      {response.evidence.length > 0 && (
        <ul className="cg-evidence-lines">
          {response.evidence.map((item) => (
            <li key={item.label} data-kind={item.kind}>
              {item.url ? <a href={item.url} rel="noreferrer" target="_blank">{item.label}</a> : item.label}
            </li>
          ))}
        </ul>
      )}
      {response.safety && (
        <p className={`cg-safety cg-safety-${response.safety.level}`}><strong>{response.safety.topic}:</strong> {response.safety.text}</p>
      )}
      {response.nextActions.length > 0 && (
        <div className="cg-next-actions" aria-label="Suggested next steps">
          {response.nextActions.map((action) => (
            action.href ? (
              <Link key={action.id} href={action.href} className="cg-next-action">{action.label}</Link>
            ) : (
              <button
                key={action.id}
                type="button"
                className="cg-next-action"
                onClick={() => {
                  trackEvent("chef_gringo_action_selected", analyticsSafe({ actionId: action.id, actionKind: action.kind }));
                  if (action.kind === "investigate") onInvestigate();
                  else if (action.prompt) onContinue(action.prompt);
                }}
              >
                {action.label}
              </button>
            )
          ))}
        </div>
      )}
      {commercial && commercial.routes.length > 0 && (
        <section className="cg-assistant-commercial" aria-labelledby="commercial-routes-title">
          <h3 id="commercial-routes-title">Related products on file</h3>
          <p>This is catalog matching, not a claim that Chef Gringo tested or endorses these items. Commercial status did not change the answer above.</p>
          {commercial.disclosureRequired && <AffiliateDisclosure />}
          <div className="cg-action-choice-grid">
            {commercial.routes.map((route) => (
              <article className="cg-action-choice cg-product-route" key={route.productId} data-commercial-kind={route.commercialKind}>
                <span>{route.manufacturer}</span>
                <strong>{route.name}</strong>
                <p>{route.bestFor}</p>
                <small>{route.whySuggested}</small>
                <small>{route.priceContext}</small>
                <div>
                  {route.evidenceUrl && <a href={route.evidenceUrl} target="_blank" rel="noreferrer">{route.evidenceLabel}</a>}
                  {route.href && (
                    <button type="button" onClick={() => onOpenRoute(route)}>
                      {route.monetized ? "See current price" : "Check current route"}
                    </button>
                  )}
                </div>
                {route.note && <small data-commercial-note={route.commercialKind}>{route.note}</small>}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
