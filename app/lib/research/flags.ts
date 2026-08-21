/** Feature flags default off. No paid calls in tests or local development. */

export function envFlag(name: string, fallback = false) {
  const value = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name]
    ?? (typeof process !== "undefined" ? process.env[name] : undefined);
  if (value == null || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export function envString(name: string) {
  const value = typeof process !== "undefined" ? process.env[name] : undefined;
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
