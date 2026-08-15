import { deriveActionTerminals } from "./actionEngine";

export type ChefGringoMessage = { role: "user" | "assistant"; content: string };
export type ChefGringoQuickReply = { label: string; value: string };

export type ChefGringoAiConfig = {
  baseUrl: string;
  model: string;
  apiKey: string | null;
  source: "environment" | "local_ollama";
};

const SYSTEM_PROMPT = `You are Chef Gringo, an experienced hospitality and culinary intelligence assistant.

Your job is to make capable operators, cooks, culinary leaders, caregivers, and hospitality owners more effective—not to make them feel incompetent.

You can help with culinary technique, recipes, scaling, menu ideas, equipment, repairs, sourcing, purchasing, software, food cost, senior-living culinary operations, sanitation workflows, staffing decisions, and business operations.

Behavior:
- Answer normal culinary questions directly. If someone says "help me make marinara", give them a useful marinara starting point immediately instead of demanding more information.
- Ask a follow-up only when the missing detail materially changes the answer. When possible, give a useful first answer and then state what detail would improve it.
- Distinguish observed facts, estimates, recommendations, and unknowns.
- Never invent current prices, affiliate relationships, product specifications, certifications, warranties, availability, or test results.
- For product/equipment questions, explain what should be verified before purchase when exact facts are not available from Chef Gringo's evidence systems.
- Do not let commercial relationships change editorial recommendations.
- For safety-critical electrical, gas, refrigerant, fire-suppression, or similar work, keep guidance at a safe diagnostic level and identify when a qualified technician is appropriate.
- Keep food-safety guidance conservative when time/temperature control or vulnerable populations are involved.
- Be practical, concise, operator-minded, and specific.
- Do not describe yourself as a generic chatbot. Speak as Chef Gringo.
`;

const QUICK_REPLY_PROMPT = `You create guided quick-reply choices for Chef Gringo's conversational interface.

Given the user's latest message and Chef Gringo's answer, return 2 to 5 useful next choices the user can tap instead of typing.

Rules:
- Choices should move the conversation forward, not repeat the answer.
- Keep each label very short, usually 1 to 4 words.
- The value should be a natural first-person message that can be sent back to Chef Gringo.
- Prefer meaningful alternatives when Chef Gringo asks a question. Example for marinara style: Rich & slow-cooked, Bright & fresh, Savory & balanced, Spicy, Fast & easy.
- For recipes, useful next actions may include scale it, make it richer, make it healthier, use what I have, or show the full recipe.
- For equipment, useful next actions may include compare options, repair first, replacement route, budget range, or show specifications.
- For operational questions, prefer concrete paths or ranges.
- Never create a choice that asserts an unverified fact, price, affiliate relationship, warranty, availability, or compatibility.
- Do not include an "Other" choice because the user can always type freely.
- Return JSON only in this exact shape: {"replies":[{"label":"...","value":"..."}]}
`;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getChefGringoAiConfig(): ChefGringoAiConfig | null {
  const configuredBase = process.env.CHEF_GRINGO_AI_BASE_URL?.trim();
  const configuredModel = process.env.CHEF_GRINGO_AI_MODEL?.trim();
  const configuredKey = process.env.CHEF_GRINGO_AI_API_KEY?.trim() || null;

  if (configuredBase && configuredModel) {
    return {
      baseUrl: trimTrailingSlash(configuredBase),
      model: configuredModel,
      apiKey: configuredKey,
      source: "environment",
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      baseUrl: "http://127.0.0.1:11434/v1",
      model: configuredModel || "gemma3:1b",
      apiKey: null,
      source: "local_ollama",
    };
  }

  return null;
}

function normalizeHistory(history: ChefGringoMessage[]) {
  return history
    .filter((message) => message.content.trim())
    .slice(-8)
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 6000) }));
}

function parseQuickReplies(raw: string): ChefGringoQuickReply[] {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
    const parsed = JSON.parse(jsonMatch) as { replies?: unknown };
    if (!Array.isArray(parsed.replies)) return [];
    return parsed.replies.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const label = "label" in item && typeof item.label === "string" ? item.label.trim() : "";
      const value = "value" in item && typeof item.value === "string" ? item.value.trim() : "";
      if (!label || !value) return [];
      return [{ label: label.slice(0, 48), value: value.slice(0, 280) }];
    }).slice(0, 5);
  } catch {
    return [];
  }
}

async function generateQuickReplies(input: {
  prompt: string;
  answer: string;
  config: ChefGringoAiConfig;
  headers: Record<string, string>;
  signal?: AbortSignal;
}) {
  try {
    const response = await fetch(`${input.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: input.headers,
      signal: input.signal,
      body: JSON.stringify({
        model: input.config.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: QUICK_REPLY_PROMPT },
          { role: "user", content: `User: ${input.prompt.slice(0, 3000)}\n\nChef Gringo: ${input.answer.slice(0, 5000)}` },
        ],
      }),
    });
    if (!response.ok) return [];
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim();
    return content ? parseQuickReplies(content) : [];
  } catch {
    return [];
  }
}

export async function askChefGringoAi(input: {
  prompt: string;
  history?: ChefGringoMessage[];
  signal?: AbortSignal;
}) {
  const config = getChefGringoAiConfig();
  if (!config) return { configured: false as const };

  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Prompt is required");

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    signal: input.signal,
    body: JSON.stringify({
      model: config.model,
      temperature: 0.35,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...normalizeHistory(input.history || []),
        { role: "user", content: prompt.slice(0, 12000) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI provider returned ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("AI provider returned an empty response");

  const [quickReplies, actions] = await Promise.all([
    generateQuickReplies({ prompt, answer, config, headers, signal: input.signal }),
    Promise.resolve(deriveActionTerminals(prompt, answer)),
  ]);

  return {
    configured: true as const,
    answer,
    quickReplies,
    actions,
    model: config.model,
    source: config.source,
  };
}
