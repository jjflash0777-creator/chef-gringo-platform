/**
 * Bounded candidate discovery capability. Separate from LIVE_RESEARCH_ENABLED.
 * Fixture discovery is the only wired provider. Live search is not available.
 */

export const BOUNDED_CANDIDATE_DISCOVERY_ENABLED = true;
export const LIVE_CANDIDATE_DISCOVERY_AVAILABLE = false;
export const CANDIDATE_DISCOVERY_PROVIDER_KIND = "fixture" as const;
export const CANDIDATE_DISCOVERY_PROVIDER_ID = "chef-gringo-fixture-v1";

export type CandidateDiscoveryCapability = "fixture_bounded" | "live_unavailable";

export function candidateDiscoveryCapability(): CandidateDiscoveryCapability {
  if (LIVE_CANDIDATE_DISCOVERY_AVAILABLE) return "live_unavailable";
  if (BOUNDED_CANDIDATE_DISCOVERY_ENABLED) return "fixture_bounded";
  return "live_unavailable";
}

export function assertBoundedDiscoveryAllowed() {
  if (!BOUNDED_CANDIDATE_DISCOVERY_ENABLED) {
    throw new Error("Bounded candidate discovery is disabled.");
  }
  if (LIVE_CANDIDATE_DISCOVERY_AVAILABLE) {
    throw new Error("Live candidate discovery is not wired. Discovery fails closed.");
  }
}
