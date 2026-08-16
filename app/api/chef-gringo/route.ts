import { NextResponse } from "next/server";
import { askChefGringoAi, type ChefGringoMessage } from "../../lib/ai/chefGringoRuntime";

export const dynamic = "force-dynamic";

type RequestBody = {
  prompt?: unknown;
  history?: unknown;
};

function parseHistory(value: unknown): ChefGringoMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const role = "role" in item ? item.role : null;
    const content = "content" in item ? item.content : null;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return [];
    return [{ role, content } satisfies ChefGringoMessage];
  }).slice(-8);
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  if (prompt.length > 12000) return NextResponse.json({ error: "Prompt is too long" }, { status: 413 });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const result = await askChefGringoAi({
      prompt,
      history: parseHistory(body.history),
      signal: controller.signal,
    });

    if (!result.configured) {
      return NextResponse.json({ configured: false, error: "AI runtime is not configured" }, { status: 503 });
    }

    return NextResponse.json({
      configured: true,
      answer: result.answer,
      quickReplies: result.quickReplies,
      actions: result.actions,
      commercialIntelligence: result.commercialIntelligence,
      model: result.model,
      source: result.source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { configured: true, error: timedOut ? "Chef Gringo AI timed out" : message },
      { status: timedOut ? 504 : 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
