import { RESEARCH_LIMITS } from "./limits.ts";
import { envString } from "./flags.ts";
import { validateSourceUrl } from "./url-safety.ts";
import {
  assertLiveDiscoveryConfigured,
  BRAVE_WEB_SEARCH_COUNT_MAX,
  BRAVE_WEB_SEARCH_ENDPOINT,
} from "../../growth/social/candidate-discovery-capability.ts";
import type { FetchLike, LiveSearchClient, LiveSearchHit } from "./live-search-types.ts";

/**
 * Brave Web Search adapter.
 * Official auth is the X-Subscription-Token header, not a Bearer token or query parameter.
 * @see https://api-dashboard.search.brave.com/documentation/guides/authentication
 * @see https://api-dashboard.search.brave.com/api-reference/web/search/get
 */

export function countBraveWebResults(body: unknown): number {
  if (!body || typeof body !== "object") return 0;
  const web = (body as { web?: unknown }).web;
  if (!web || typeof web !== "object") return 0;
  const results = (web as { results?: unknown }).results;
  return Array.isArray(results) ? results.length : 0;
}

export function normalizeBraveWebSearchHits(body: unknown, limit: number): LiveSearchHit[] {
      const capped = Math.min(Math.max(0, limit), RESEARCH_LIMITS.maximumSearchHitsPerQuery, BRAVE_WEB_SEARCH_COUNT_MAX);
  if (!body || typeof body !== "object") return [];
  const web = (body as { web?: unknown }).web;
  if (!web || typeof web !== "object") return [];
  const results = (web as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  const hits: LiveSearchHit[] = [];
  for (const row of results) {
    if (hits.length >= capped) break;
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url : "";
    if (!url) continue;
    hits.push({
      url,
      title: typeof record.title === "string" && record.title.trim() ? record.title : url,
      snippet: typeof record.description === "string" ? record.description : undefined,
    });
  }
  return hits;
}

export function createBraveSearchClient(fetchImpl: FetchLike): LiveSearchClient {
  return {
    async search(query, limit, signal) {
      const config = assertLiveDiscoveryConfigured();
      if (config.provider !== "brave") {
        throw new Error("Brave search client requires CHEF_GRINGO_LIVE_SEARCH_PROVIDER=brave.");
      }
      const key = envString("CHEF_GRINGO_BRAVE_SEARCH_API_KEY");
      if (!key) throw new Error("Live candidate discovery is not available. CHEF_GRINGO_BRAVE_SEARCH_API_KEY is not configured.");
      const safety = validateSourceUrl(BRAVE_WEB_SEARCH_ENDPOINT);
      if (!safety.ok || !safety.canonicalUrl) throw new Error("Brave search endpoint failed URL safety.");
      const target = new URL(safety.canonicalUrl);
      target.searchParams.set("q", query.slice(0, 240));
      target.searchParams.set("count", String(Math.min(limit, RESEARCH_LIMITS.maximumSearchHitsPerQuery, BRAVE_WEB_SEARCH_COUNT_MAX)));
      target.searchParams.set("result_filter", "web");
      const headers: Record<string, string> = {
        accept: "application/json",
        "X-Subscription-Token": key,
      };
      const response = await fetchImpl(target.toString(), { method: "GET", signal, headers });
      if (response.status >= 400) throw new Error(`Brave search returned HTTP ${response.status}.`);
      let body: unknown;
      try {
        body = JSON.parse(await response.text());
      } catch {
        return { hits: [], rawResultCount: 0, parseFailed: true };
      }
      return {
        hits: normalizeBraveWebSearchHits(body, limit),
        rawResultCount: countBraveWebResults(body),
      };
    },
  };
}
