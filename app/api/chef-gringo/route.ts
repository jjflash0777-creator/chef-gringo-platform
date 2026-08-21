import { NextResponse } from "next/server";
import type { AssistantIntent, AssistantRequest, ConversationTurn, PhotoMetadata } from "../../lib/ai/assistant-contract.ts";
import { ASSISTANT_INTENTS } from "../../lib/ai/assistant-contract.ts";
import { runAssistant } from "../../lib/ai/assistant-service.ts";

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({
      status: "error",
      intent: "general",
      answer: "Chef Gringo could not read that request. Try sending it again.",
      nextActions: [],
      assumptions: [],
      confidence: "low",
      evidence: [],
      researchCapability: "research_unavailable",
      safety: null,
      commercial: null,
      error: { code: "invalid_json", message: "Chef Gringo could not read that request. Try sending it again.", retryable: false, httpStatus: 400 },
    }, { status: 400 });
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
    return NextResponse.json(result, { status: result.status === "error" ? status : 200 });
  } catch {
    return NextResponse.json({
      status: "error",
      intent: "general",
      answer: "Something went wrong on Chef Gringo’s side. Your question was not lost — retry.",
      nextActions: [],
      assumptions: [],
      confidence: "low",
      evidence: [],
      researchCapability: "research_unavailable",
      safety: null,
      commercial: null,
      error: { code: "server_error", message: "Something went wrong on Chef Gringo’s side. Your question was not lost — retry.", retryable: true, httpStatus: 500 },
    }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
