import { RESEARCH_LIMITS } from "./limits.ts";
import { envString } from "./flags.ts";
import { canonicalizeUrl, validateSourceUrl } from "./url-safety.ts";
import type { GovernedFetch } from "./fetch-document.ts";
import { assertLiveDiscoveryConfigured } from "../../growth/social/candidate-discovery-capability.ts";
import { createBraveSearchClient } from "./brave-search-client.ts";
import type { FetchLike, LiveSearchClient, LiveSearchHit } from "./live-search-types.ts";

export type { FetchLike, LiveSearchClient, LiveSearchHit } from "./live-search-types.ts";

export function runtimeLiveFetch(): FetchLike | null {
  const injected = (globalThis as typeof globalThis & { __CHEF_GRINGO_LIVE_FETCH__?: FetchLike }).__CHEF_GRINGO_LIVE_FETCH__;
  if (typeof injected === "function") return injected;
  return null;
}

export function defaultLiveFetch(): GovernedFetch {
  const injected = runtimeLiveFetch();
  if (injected) return injected;
  return async (url: string, init?: { method?: string; redirect?: RequestRedirect; signal?: AbortSignal; headers?: Record<string, string> }) => {
    const response = await globalThis.fetch(url, {
      method: init?.method ?? "GET",
      redirect: "manual",
      signal: init?.signal,
      headers: init && "headers" in init ? init.headers : undefined,
    });
    return {
      status: response.status,
      headers: response.headers,
      text: () => response.text(),
      arrayBuffer: () => response.arrayBuffer(),
    };
  };
}

export function createHttpsJsonSearchClient(fetchImpl: FetchLike = defaultLiveFetch()): LiveSearchClient {
  return {
    async search(query, limit, signal) {
      const config = assertLiveDiscoveryConfigured();
      if (config.provider === "brave") {
        throw new Error("HTTPS JSON search client requires CHEF_GRINGO_LIVE_SEARCH_PROVIDER=https_json.");
      }
      const safety = validateSourceUrl(config.endpoint!);
      if (!safety.ok || !safety.canonicalUrl) throw new Error("Live search endpoint failed URL safety.");
      const target = new URL(safety.canonicalUrl);
      target.searchParams.set("q", query.slice(0, 240));
      target.searchParams.set("limit", String(Math.min(limit, RESEARCH_LIMITS.maximumCandidates)));
      const headers: Record<string, string> = { accept: "application/json" };
      const token = envString("CHEF_GRINGO_LIVE_SEARCH_TOKEN");
      if (token) headers.authorization = `Bearer ${token}`;
      const response = await fetchImpl(target.toString(), { method: "GET", signal, headers });
      if (response.status >= 400) throw new Error(`Live search endpoint returned HTTP ${response.status}.`);
      let body: unknown;
      try {
        body = JSON.parse(await response.text());
      } catch {
        throw new Error("Live search endpoint did not return JSON.");
      }
      const rows = Array.isArray((body as { results?: unknown }).results)
        ? (body as { results: Array<Record<string, unknown>> }).results
        : [];
      const hits: LiveSearchHit[] = [];
      const capped = Math.min(limit, RESEARCH_LIMITS.maximumCandidates);
      for (const row of rows.slice(0, capped)) {
        const url = typeof row.url === "string" ? row.url : typeof row.href === "string" ? row.href : "";
        if (!url) continue;
        hits.push({
          url,
          title: typeof row.title === "string" ? row.title : url,
          snippet: typeof row.snippet === "string" ? row.snippet : undefined,
        });
      }
      return hits;
    },
  };
}

export function createConfiguredLiveSearchClient(fetchImpl: FetchLike = defaultLiveFetch()): LiveSearchClient {
  return {
    async search(query, limit, signal) {
      const config = assertLiveDiscoveryConfigured();
      const client = config.provider === "brave"
        ? createBraveSearchClient(fetchImpl)
        : createHttpsJsonSearchClient(fetchImpl);
      return client.search(query, limit, signal);
    },
  };
}

export function canonicalizeSearchHit(hit: LiveSearchHit) {
  const safety = validateSourceUrl(hit.url);
  return {
    ...hit,
    safety,
    canonicalUrl: safety.canonicalUrl ?? (safety.ok ? canonicalizeUrl(hit.url) : null),
  };
}
