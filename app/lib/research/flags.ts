/** Feature flags default off. No paid calls in tests or local development. */

function runtimeEnv(name: string) {
  const globalEnv = globalThis as typeof globalThis & {
    __CHEF_GRINGO_ENV__?: Record<string, unknown>;
    process?: { env?: Record<string, string | undefined> };
  };
  const fromWorker = globalEnv.__CHEF_GRINGO_ENV__?.[name];
  if (typeof fromWorker === "string" && fromWorker.trim()) return fromWorker;
  return globalEnv.process?.env?.[name] ?? (typeof process !== "undefined" ? process.env[name] : undefined);
}

export function envFlag(name: string, fallback = false) {
  const value = runtimeEnv(name);
  if (value == null || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export function envString(name: string) {
  const value = runtimeEnv(name);
  return value?.trim() || null;
}

export function localCorpusEnabled() {
  return envFlag("CHEF_GRINGO_LOCAL_CORPUS_ENABLED", false);
}

export function corpusRetrievalEnabled() {
  return envFlag("CHEF_GRINGO_CORPUS_RETRIEVAL_ENABLED", false);
}

export function corpusIngestFetchEnabled() {
  return envFlag("CHEF_GRINGO_CORPUS_INGEST_FETCH_ENABLED", false);
}

export function aiSearchInstanceId() {
  return envString("CHEF_GRINGO_AI_SEARCH_INSTANCE");
}

export function corpusDailyRequestCeiling() {
  const raw = envString("CHEF_GRINGO_CORPUS_DAILY_REQUEST_CEILING");
  const parsed = raw ? Number(raw) : 50;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
}
