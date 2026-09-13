import type { AssistantIntent, AssistantRequest, ConversationTurn, PhotoMetadata } from "./assistant-contract.ts";
import { ASSISTANT_INTENTS } from "./assistant-contract.ts";
import { runAssistant } from "./assistant-service.ts";

function parseHistory(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const role = "role" in item ? item.role : null;
    const content = "content" in item ? item.content : null;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return [];
    return [{ role, content }];
  }).slice(-8);
}

function parsePhoto(value: unknown): PhotoMetadata | null {
  if (!value || typeof value !== "object") return null;
  const name = "name" in value && typeof value.name === "string" ? value.name : "";
  const mimeType = "mimeType" in value && typeof value.mimeType === "string" ? value.mimeType : "";
  const sizeBytes = "sizeBytes" in value && typeof value.sizeBytes === "number" ? value.sizeBytes : NaN;
  if (!name || !mimeType || !Number.isFinite(sizeBytes)) return null;
  return { name: name.slice(0, 120), mimeType, sizeBytes };
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : null;
}

function errorBody(code: string, message: string, httpStatus: number, retryable: boolean) {
  return {
    status: "error" as const,
    intent: "general" as const,
    answer: message,
    nextActions: [],
    assumptions: [],
    confidence: "low" as const,
    evidence: [],
    researchCapability: "research_unavailable" as const,
    sourcesUsed: [],
    safety: null,
    commercial: null,
    error: { code, message, retryable, httpStatus },
  };
}

export async function handleChefGringoPost(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json(errorBody("invalid_json", "Chef Gringo could not read that request. Try sending it again.", 400, false), { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question : typeof body.prompt === "string" ? body.prompt : "";
  const intent = typeof body.intent === "string" && (ASSISTANT_INTENTS as readonly string[]).includes(body.intent)
    ? body.intent as AssistantIntent
    : undefined;

  const payload: AssistantRequest = {
    question,
    intent,
    conversation: parseHistory(body.conversation ?? body.history),
    photo: parsePhoto(body.photo),
    location: optionalString(body.location),
    budget: optionalString(body.budget),
    operatingContext: optionalString(body.operatingContext),
    dietaryContext: optionalString(body.dietaryContext),
    source: optionalString(body.source) ?? undefined,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const result = await runAssistant(payload, { signal: controller.signal });
    const status = result.error?.httpStatus ?? 200;
    return Response.json(result, { status: result.status === "error" ? status : 200 });
  } catch {
    return Response.json(errorBody("server_error", "Something went wrong on Chef Gringo’s side. Your question was not lost — retry.", 500, true), { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
