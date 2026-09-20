export type ChefGringoAiConfig = {
  baseUrl: string;
  model: string;
  apiKey: string | null;
  source: "environment" | "local_ollama";
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

/**
 * Canonical Chef Gringo model/runtime configuration.
 *
 * Production requires an explicitly configured OpenAI-compatible endpoint and model.
 * Local Ollama remains a development-only fallback so existing local workflows keep
 * working, but production and benchmark quality gates must not silently rely on it.
 */
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
