import { envFlag, envString } from "../../lib/research/flags.ts";
import { validateSourceUrl } from "../../lib/research/url-safety.ts";

export const BOUNDED_CANDIDATE_DISCOVERY_ENABLED = true;
export const CANDIDATE_DISCOVERY_PROVIDER_ID = "chef-gringo-fixture-v1";
export const LIVE_CANDIDATE_DISCOVERY_PROVIDER_ID = "chef-gringo-live-bounded-v1";

export type CandidateDiscoveryCapability = "fixture_bounded" | "live_bounded" | "unavailable";

export type LiveDiscoveryConfig = {
  ok: boolean;
  enabled: boolean;
  endpoint: string | null;
  hasToken: boolean;
  issues: string[];
};

export function readLiveDiscoveryConfig(): LiveDiscoveryConfig {
  const enabled = envFlag("CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY", false);
  const endpoint = envString("CHEF_GRINGO_LIVE_SEARCH_ENDPOINT");
  const hasToken = Boolean(envString("CHEF_GRINGO_LIVE_SEARCH_TOKEN"));
  const issues: string[] = [];
  if (!enabled) issues.push("CHEF_GRINGO_LIVE_CANDIDATE_DISCOVERY is not enabled.");
  if (!endpoint) issues.push("CHEF_GRINGO_LIVE_SEARCH_ENDPOINT is not configured.");
  else {
    const safety = validateSourceUrl(endpoint);
    if (!safety.ok || !safety.canonicalUrl) issues.push(`Live search endpoint rejected: ${safety.issues.join(", ") || "invalid"}.`);
  }
  return {
    ok: issues.length === 0,
    enabled,
    endpoint,
    hasToken,
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
