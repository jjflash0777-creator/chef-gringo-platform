/**
 * Truthful research capability. A generated plan is never completed research.
 * Public copy may only say Chef Gringo searched, verified, or found sources
 * when the matching retrieval and validation actually occurred.
 */

export const RESEARCH_CAPABILITIES = [
  "knowledge_only",
  "repository_evidence",
  "bounded_research_plan",
  "bounded_research_complete",
  "research_unavailable",
] as const;

export type ResearchCapability = typeof RESEARCH_CAPABILITIES[number];

export const LIVE_RESEARCH_ENABLED = false;

export const PUBLIC_CAPABILITY_LABELS: Record<ResearchCapability, string> = {
  knowledge_only: "Culinary practice and judgment — no retrieved source.",
  repository_evidence: "Supported by sources already on file. Chef Gringo did not search the live web.",
  bounded_research_plan: "A bounded research plan was generated. Sources were not fetched.",
  bounded_research_complete: "Bounded retrieval and validation completed.",
  research_unavailable: "Required evidence or research provider is not available.",
};

export function publicCapabilityLabel(capability: ResearchCapability) {
  return PUBLIC_CAPABILITY_LABELS[capability];
}

export function capabilityImpliesRetrieval(capability: ResearchCapability) {
  return capability === "bounded_research_complete";
}

export function capabilityForOfflineRun(input: {
  blocked: boolean;
  queryCount: number;
  assessedCandidateCount: number;
  liveRetrievalCompleted: boolean;
}): ResearchCapability {
  if (input.liveRetrievalCompleted && LIVE_RESEARCH_ENABLED) return "bounded_research_complete";
  if (input.blocked) return "research_unavailable";
  if (input.assessedCandidateCount > 0) return "repository_evidence";
  if (input.queryCount > 0) return "bounded_research_plan";
  return "research_unavailable";
}
