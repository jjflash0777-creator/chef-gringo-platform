import { envFlag, envString } from "../../lib/research/flags.ts";
import { validateSourceUrl } from "../../lib/research/url-safety.ts";

export const BOUNDED_CANDIDATE_DISCOVERY_ENABLED = true;
export const CANDIDATE_DISCOVERY_PROVIDER_ID = "chef-gringo-fixture-v1";
export const LIVE_CANDIDATE_DISCOVERY_PROVIDER_ID = "chef-gringo-live-bounded-v1";

/** Official Brave Web Search endpoint. Auth is X-Subscription-Token, not Bearer. */
export const BRAVE_WEB_SEARCH_ENDPOINT = "https://api.search.brave.com/res/v1/web/search";
export const BRAVE_WEB_SEARCH_COUNT_MAX = 20;

export type CandidateDiscoveryCapability = "fixture_bounded" | "live_bounded" | "unavailable";
export type LiveSearchAdapterKind = "brave" | "https_json";

export type LiveDiscoveryConfig = {
  ok: boolean;
  enabled: boolean;
  provider: LiveSearchAdapterKind | null;
  endpoint: string | null;
  hasToken: boolean;
  issues: string[];
};

function parseLiveSearchProvider(raw: string | null): LiveSearchAdapterKind | "unsupported" | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "brave") return "brave";
  if (value === "https_json" || value === "generic" || value === "json") return "https_json";
  return "unsupported";
}

export function readLiveDiscoveryConfig(): LiveDiscoveryConfig {
  const enabled = envFlag("CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY", false);
  const parsed = parseLiveSearchProvider(envString("CHEF_GRINGO_LIVE_SEARCH_PROVIDER"));
  const genericEndpoint = envString("CHEF_GRINGO_LIVE_SEARCH_ENDPOINT");
  const genericToken = Boolean(envString("CHEF_GRINGO_LIVE_SEARCH_TOKEN"));
  const braveKeyPresent = Boolean(envString("CHEF_GRINGO_BRAVE_SEARCH_API_KEY"));
  const issues: string[] = [];
  if (!enabled) issues.push("CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY is not enabled.");
  if (parsed === "unsupported") {
    issues.push("Unsupported live search provider. Use brave or https_json.");
    return { ok: false, enabled, provider: null, endpoint: null, hasToken: false, issues };
  }

  if (parsed === "brave") {
    if (!braveKeyPresent) issues.push("CHEF_GRINGO_BRAVE_SEARCH_API_KEY is not configured.");
    const safety = validateSourceUrl(BRAVE_WEB_SEARCH_ENDPOINT);
    if (!safety.ok || !safety.canonicalUrl) {
      issues.push(`Brave search endpoint rejected: ${safety.issues.join(", ") || "invalid"}.`);
    }
    return {
      ok: issues.length === 0,
      enabled,
      provider: "brave",
      endpoint: safety.canonicalUrl ?? BRAVE_WEB_SEARCH_ENDPOINT,
      hasToken: braveKeyPresent,
      issues,
    };
  }

  const provider: LiveSearchAdapterKind = "https_json";
  if (!genericEndpoint) issues.push("CHEF_GRINGO_LIVE_SEARCH_ENDPOINT is not configured.");
  else {
    const safety = validateSourceUrl(genericEndpoint);
    if (!safety.ok || !safety.canonicalUrl) issues.push(`Live search endpoint rejected: ${safety.issues.join(", ") || "invalid"}.`);
  }
  return {
    ok: issues.length === 0,
    enabled,
    provider: genericEndpoint ? provider : null,
    endpoint: genericEndpoint,
    hasToken: genericToken,
    issues,
  };
}

export function liveCandidateDiscoveryAvailable() {
  return readLiveDiscoveryConfig().ok;
}

export function candidateDiscoveryCapability(): CandidateDiscoveryCapability {
  if (!BOUNDED_CANDIDATE_DISCOVERY_ENABLED) return "unavailable";
  if (liveCandidateDiscoveryAvailable()) return "live_bounded";
  return "fixture_bounded";
}

export function assertBoundedDiscoveryAllowed() {
  if (!BOUNDED_CANDIDATE_DISCOVERY_ENABLED) {
    throw new Error("Bounded candidate discovery is disabled.");
  }
}

export function assertLiveDiscoveryConfigured() {
  const config = readLiveDiscoveryConfig();
  if (!config.ok) {
    throw new Error(`Live candidate discovery is not available. ${config.issues.join(" ")}`);
  }
  return config;
}
