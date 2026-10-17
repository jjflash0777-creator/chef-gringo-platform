import { getChefGringoAiConfig } from "../lib/ai/chefGringoRuntime.ts";

export class GrowthFactoryProviderError extends Error {
  readonly status: number | null;
  readonly safeCode: string;
  constructor(status: number | null, safeCode: string) {
    super("Growth Factory AI provider request did not succeed.");
    this.name = "GrowthFactoryProviderError";
    this.status = status;
    this.safeCode = safeCode;
  }
}

const PROVIDER_ERROR_CODES = new Set([
  "invalid_api_key",
  "insufficient_quota",
  "billing_hard_limit_reached",
  "model_not_found",
  "unsupported_parameter",
  "invalid_request_error",
  "rate_limit_exceeded",
  "organization_not_found",
  "project_not_found",
  "server_error",
  "service_unavailable",
]);

function safeProviderCode(raw: unknown) {
  return typeof raw === "string" && PROVIDER_ERROR_CODES.has(raw)
    ? raw
    : "provider_request_failed";
}

const outputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    campaignSlug: { type: "string" },
    facebook: { type: "string" },
    instagram: { type: "string" },
    pinterest: { type: "string" },
    reelScript: { type: "string" },
    carouselSlides: { type: "array", items: { type: "string" } },
    visualBrief: { type: "string" },
    newsletterSubject: { type: "string" },
    newsletterTeaser: { type: "string" },
  },
  required: [
    "campaignSlug", "facebook", "instagram", "pinterest",
    "reelScript", "carouselSlides", "visualBrief",
    "newsletterSubject", "newsletterTeaser",
  ],
};

/**
 * Production copy generation uses a dedicated marketing prompt rather than
 * the public Ask Chef Gringo assistant's incompatible answer/explanation schema.
 * GPT-6 Luna accepts reasoning_effort:none. No sampling temperature is sent.
 */
export async function completeGrowthFactoryPrompt(prompt: string): Promise<string> {
  const config = getChefGringoAiConfig();
  if (!config) throw new GrowthFactoryProviderError(null, "not_configured");

  const requestBody = {
    model: config.model,
    messages: [
      {
        role: "system",
        content: "You are Chef Gringo's content editor. Produce original, useful, accurate social content based only on the supplied Chef Gringo article. Never copy navigation labels, invent facts or pricing, or claim personal product testing that the article does not establish. Return only JSON matching the provided schema.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "chef_gringo_growth_package",
        strict: true,
        schema: outputSchema,
      },
    },
    ...(config.model === "gpt-6-luna" || config.model === "gpt-6-sol"
      ? { reasoning_effort: "none" }
      : {}),
  };

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new GrowthFactoryProviderError(null, "network_or_timeout");
  }

  if (!response.ok) {
    // Return an HTTP status and whitelisted API error code to the admin.
    // Never expose raw provider errors, authorization headers or secret values.
    let code: unknown;
    try {
      const body = await response.json() as { error?: { code?: unknown } };
      code = body.error?.code;
    } catch { /* ignore invalid provider error bodies */ }
    throw new GrowthFactoryProviderError(response.status, safeProviderCode(code));
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const output = payload.choices?.[0]?.message?.content?.trim();
  if (!output) throw new SyntaxError("Growth Factory AI response was empty.");
  return output;
}
