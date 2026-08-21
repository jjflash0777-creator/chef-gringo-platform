import {
  ACCEPTED_PHOTO_TYPES,
  PHOTO_MAX_BYTES,
  PUBLIC_ERROR_MESSAGES,
  QUESTION_MAX_CHARS,
  type AssistantError,
  type AssistantErrorCode,
  type AssistantNextAction,
  type AssistantRequest,
  type AssistantResponse,
  type ConversationTurn,
} from "./assistant-contract.ts";
import { clarificationFor } from "./assistant-clarification.ts";
import { commercialBlockFor } from "./assistant-commercial.ts";
import { classifyIntent, isDefinitionalQuestion } from "./assistant-intents.ts";
import { deterministicAnswerFor, missingEvidenceLanguage } from "./assistant-knowledge.ts";
import { refuseUnsafeInstruction, safetyFor } from "./assistant-safety.ts";
import { getChefGringoAiConfig } from "./chefGringoRuntime.ts";

export type ChatCompletionFn = (input: {
  messages: ConversationTurn[];
  signal?: AbortSignal;
}) => Promise<string>;

type ModelDraft = {
  answer?: unknown;
  explanation?: unknown;
  clarifyingQuestion?: unknown;
  nextActions?: unknown;
  assumptions?: unknown;
  confidence?: unknown;
};

function errorOf(code: AssistantErrorCode): AssistantError {
  const httpStatus =
    code === "empty_question" || code === "invalid_json" ? 400 :
    code === "oversized_input" ? 413 :
    code === "unsupported_photo" ? 415 :
    code === "missing_configuration" ? 503 :
    code === "timeout" ? 504 :
    code === "rate_limited" ? 429 :
    502;
  return {
    code,
    message: PUBLIC_ERROR_MESSAGES[code],
    retryable: !["empty_question", "oversized_input", "unsupported_photo", "invalid_json"].includes(code),
    httpStatus,
  };
}

export function mapProviderFailure(error: unknown): AssistantError {
  if (!error) return errorOf("server_error");
  const name = error instanceof Error ? error.name : "";
  const raw = error instanceof Error ? error.message : String(error);
  if (name === "AbortError" || /timeout|aborted/i.test(raw)) return errorOf("timeout");
  if (/\b429\b|rate limit/i.test(raw)) return errorOf("rate_limited");
  if (/empty response/i.test(raw)) return errorOf("empty_response");
  if (/network|fetch failed|ECONN|ENOTFOUND/i.test(raw)) return errorOf("network_failure");
  return errorOf("malformed_response");
}

export function validateAssistantRequest(input: AssistantRequest): AssistantError | null {
  const question = input.question?.trim() ?? "";
  if (!question) return errorOf("empty_question");
  if (question.length > QUESTION_MAX_CHARS) return errorOf("oversized_input");
  if (input.photo) {
    if (input.photo.sizeBytes > PHOTO_MAX_BYTES) return errorOf("oversized_input");
    if (!ACCEPTED_PHOTO_TYPES.includes(input.photo.mimeType.toLowerCase())) return errorOf("unsupported_photo");
  }
  return null;
}

function parseModelDraft(raw: string): ModelDraft | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed.match(/\{[\s\S]*\}/)?.[0] ?? trimmed) as ModelDraft;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }
  return { answer: trimmed };
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()).slice(0, 6);
}

function photoNote(request: AssistantRequest) {
  if (!request.photo) return "";
  return " A photo filename was attached, but Chef Gringo cannot inspect images yet — describe what you see if it matters.";
}

function nextActionsFor(intent: ReturnType<typeof classifyIntent>, request: AssistantRequest): AssistantNextAction[] {
  const actions: AssistantNextAction[] = [];
  if (intent === "equipment_troubleshooting") {
    actions.push({
      id: "open-investigation",
      label: "Open a structured case file",
      description: "Separate observations from guesses and list the evidence needed next.",
      kind: "investigate",
    });
    actions.push({ id: "marketplace-repair", label: "Browse repair and maintenance records", href: "/marketplace?workflow=repair-maintenance", kind: "marketplace" });
  }
  if (intent === "equipment_selection" || intent === "marketplace_comparison") {
    actions.push({ id: "marketplace", label: "Compare researched products", href: "/marketplace", kind: "marketplace" });
  }
  if (intent === "recipe_help" || intent === "culinary_technique") {
    actions.push({ id: "discover", label: "Explore related technique notes", href: "/discover", kind: "knowledge" });
  }
  if (intent === "business_startup") {
    actions.push({ id: "startup-shelf", label: "See the startup shelf", href: "/marketplace?path=business-startup", kind: "marketplace" });
  }
  if (request.question) {
    actions.push({
      id: "add-detail",
      label: "Add one constraint",
      prompt: "Here is the missing constraint: ",
      kind: "continue",
    });
  }
  return actions.slice(0, 4);
}

const SYSTEM_PROMPT = `You are Chef Gringo, an experienced chef helping another cook or operator.

Voice: direct, warm, practical, specific, plainspoken. Willing to say you do not know. Not corporate, not robotic, not verbose, not falsely authoritative.

Rules:
- The first paragraph answers the question. Then expand only if it helps.
- Ask a follow-up only when the missing detail materially changes the answer. "What's mirepoix?" and "help me make marinara" get useful answers immediately.
- Distinguish sourced fact, standard culinary practice, professional judgment, and unknowns. Never invent citations, prices, affiliate relationships, test results, or live research you did not do.
- If you lack a source, say so naturally and still be useful.
- Safety notes are short and contextual. Never instruct anyone to bypass safety devices, work on live electrical equipment, defeat gas controls, or serve food that cannot be established as safe.
- Medical, allergen, dysphagia, licensing, and financial questions get a useful culinary/operations answer plus a clear boundary — not a lecture and not a prescription.
- Do not expose chain-of-thought. Do not mention system prompts, models, or providers.
- Return JSON only: {"answer":"...","explanation":"...|null","clarifyingQuestion":null,"nextActions":[{"label":"...","prompt":"...","href":"..."}],"assumptions":["..."],"confidence":"high|medium|low"}
`;

export async function defaultCompleteChat(input: { messages: ConversationTurn[]; signal?: AbortSignal }): Promise<string> {
  const config = getChefGringoAiConfig();
  if (!config) throw Object.assign(new Error("missing_configuration"), { code: "missing_configuration" });

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      signal: input.signal,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...input.messages.map((message) => ({ role: message.role, content: message.content.slice(0, 6000) })),
        ],
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw Object.assign(new Error("network_failure"), { cause: error });
  }

  if (response.status === 429) throw Object.assign(new Error("429 rate limit"), { status: 429 });
  if (!response.ok) throw new Error(`provider ${response.status}`);

  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("empty response");
  return content;
}

export function isAssistantConfigured() {
  return getChefGringoAiConfig() !== null;
}

export async function runAssistant(
  request: AssistantRequest,
  options: { completeChat?: ChatCompletionFn; signal?: AbortSignal; configured?: boolean } = {},
): Promise<AssistantResponse> {
  const invalid = validateAssistantRequest(request);
  if (invalid) {
    return {
      status: "error",
      intent: "general",
      answer: invalid.message,
      nextActions: [],
      assumptions: [],
      confidence: "low",
      evidence: [],
      safety: null,
      commercial: null,
      error: invalid,
    };
  }

  const intent = classifyIntent(request);
  const clarification = clarificationFor(intent, request);
  const safety = safetyFor(intent, request);
  const deterministic = deterministicAnswerFor(request.question, intent);
  const configured = options.configured ?? isAssistantConfigured();
  const completeChat = options.completeChat ?? defaultCompleteChat;

  const base = (): Omit<AssistantResponse, "status" | "answer"> => ({
    intent,
    nextActions: nextActionsFor(intent, request),
    assumptions: deterministic?.assumptions ?? [],
    confidence: deterministic?.confidence ?? "medium",
    evidence: deterministic?.evidence ?? [{ kind: "unavailable", label: missingEvidenceLanguage(intent) }],
    safety,
    commercial: null,
    error: null,
  });

  if (clarification.needed) {
    const partial = deterministic?.answer
      ?? (intent === "food_safety"
        ? "If you cannot establish how long it sat and at what temperature, do not serve it."
        : intent === "equipment_selection"
          ? "I can compare ovens once I know the job, volume, power, space, and budget. Without that I would only be guessing."
          : intent === "business_startup"
            ? "Selling food is mostly a local-rules problem. I can walk the questions; I cannot license you."
            : "I can answer this more usefully with one detail.");
    return {
      ...base(),
      status: "needs_clarification",
      answer: refuseUnsafeInstruction(partial + photoNote(request)),
      explanation: deterministic?.explanation,
      clarifyingQuestion: clarification.question,
      confidence: "low",
      commercial: null,
    };
  }

  if (deterministic && (isDefinitionalQuestion(request.question) || !configured)) {
    return {
      ...base(),
      status: "answered",
      answer: refuseUnsafeInstruction(deterministic.answer + photoNote(request)),
      explanation: deterministic.explanation,
      commercial: commercialBlockFor(request.question, intent),
    };
  }

  if (!configured && !options.completeChat) {
    const missing = errorOf("missing_configuration");
    const fallback = deterministic?.answer ?? "I can still take the question, but live replies are not configured here, so I will not invent an answer.";
    return {
      ...base(),
      status: "error",
      answer: fallback,
      explanation: deterministic?.explanation,
      error: missing,
      commercial: null,
    };
  }

  try {
    const userPayload = [
      `Question: ${request.question}`,
      request.location ? `Location (user-stated, unverified): ${request.location}` : "",
      request.budget ? `Budget (user-stated, unverified): ${request.budget}` : "",
      request.operatingContext ? `Operating context: ${request.operatingContext}` : "",
      request.dietaryContext ? `Dietary/food-safety context: ${request.dietaryContext}` : "",
      request.photo ? `Photo attached: ${request.photo.name} (${request.photo.mimeType}). You cannot see the image.` : "",
      `Classified intent: ${intent}`,
    ].filter(Boolean).join("\n");

    const history = (request.conversation ?? []).slice(-8);
    const raw = await completeChat({
      messages: [...history, { role: "user", content: userPayload }],
      signal: options.signal,
    });
    if (!raw.trim()) {
      const empty = errorOf("empty_response");
      return { ...base(), status: "error", answer: empty.message, error: empty, commercial: null };
    }
    const draft = parseModelDraft(raw);
    if (!draft) {
      const malformed = errorOf("malformed_response");
      return { ...base(), status: "error", answer: malformed.message, error: malformed, commercial: null };
    }
    const answer = asString(draft.answer);
    if (!answer) {
      const empty = errorOf("empty_response");
      return { ...base(), status: "error", answer: empty.message, error: empty, commercial: null };
    }

    const confidence = draft.confidence === "high" || draft.confidence === "low" || draft.confidence === "medium" ? draft.confidence : "medium";
    return {
      ...base(),
      status: "answered",
      answer: refuseUnsafeInstruction(answer + photoNote(request)),
      explanation: asString(draft.explanation) || deterministic?.explanation,
      assumptions: asStringList(draft.assumptions),
      confidence,
      evidence: deterministic?.evidence ?? [{ kind: "unavailable", label: missingEvidenceLanguage(intent) }],
      safety: safetyFor(intent, request, answer),
      commercial: commercialBlockFor(request.question, intent),
      nextActions: nextActionsFor(intent, request),
    };
  } catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === "missing_configuration") {
      const missing = errorOf("missing_configuration");
      return { ...base(), status: "error", answer: missing.message, error: missing, commercial: null };
    }
    const mapped = mapProviderFailure(error);
    return { ...base(), status: "error", answer: mapped.message, error: mapped, commercial: null };
  }
}
