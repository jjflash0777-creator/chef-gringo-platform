import { RESEARCH_LIFECYCLE_STATES, type IntelligenceConfidence, type RecommendationScorecard, type ResearchLifecycleState } from "./types.ts";

export function canTransitionResearch(from: ResearchLifecycleState, to: ResearchLifecycleState) {
  const fromIndex = RESEARCH_LIFECYCLE_STATES.indexOf(from);
  const toIndex = RESEARCH_LIFECYCLE_STATES.indexOf(to);
  return to === "challenge" || toIndex === fromIndex + 1;
}

const reducedConfidence: Record<IntelligenceConfidence, IntelligenceConfidence> = {
  high: "moderate", moderate: "low", low: "insufficient", insufficient: "insufficient",
};

export function challengeRecommendation(
  scorecard: RecommendationScorecard,
  input: { id: string; createdAt: string; reason: string; outcome: "flagged" | "confidence_reduced" | "rejected" },
): RecommendationScorecard {
  if (!input.id.trim() || !input.reason.trim() || !/^\d{4}-\d{2}-\d{2}/.test(input.createdAt)) {
    throw new Error("A challenge requires an ID, reason, and retrieval-compatible date.");
  }
  return {
    ...scorecard,
    confidence: input.outcome === "confidence_reduced" || input.outcome === "rejected" ? reducedConfidence[scorecard.confidence] : scorecard.confidence,
    status: input.outcome === "rejected" ? "rejected" : "challenged",
    revision: scorecard.revision + 1,
    challenges: [...scorecard.challenges, { ...input, previousScore: scorecard.score, previousConfidence: scorecard.confidence }],
  };
}
