import type { AssistantIntent, AssistantRequest } from "../ai/assistant-contract.ts";
import { LIVE_RESEARCH_ENABLED, type ResearchCapability } from "./capability.ts";
import { buildGenericBoundedQueries } from "./plan.ts";
import { publicEvidenceFromRepository, type PublicEvidenceView } from "./public-view.ts";
import { productionEvidenceForPublic } from "./repository.ts";
import { researchTriggerFor } from "./trigger.ts";

export type AssistantEvidenceAttachment = {
  capability: ResearchCapability;
  evidence: PublicEvidenceView[];
  limitation: string | null;
  plannedQueries: string[];
  liveRetrievalCompleted: false;
};

export function attachRepositoryEvidence(request: AssistantRequest, intent: AssistantIntent): AssistantEvidenceAttachment {
  const trigger = researchTriggerFor(request.question, intent);
  if (trigger === "skip") {
    return {
      capability: "knowledge_only",
      evidence: [],
      limitation: null,
      plannedQueries: [],
      liveRetrievalCompleted: false,
    };
  }

  const hits = productionEvidenceForPublic(request.question);
  if (hits.length) {
    return {
      capability: "repository_evidence",
      evidence: publicEvidenceFromRepository(hits),
      limitation: null,
      plannedQueries: [],
      liveRetrievalCompleted: false,
    };
  }

  if (trigger === "plan_only") {
    return {
      capability: LIVE_RESEARCH_ENABLED ? "bounded_research_plan" : "bounded_research_plan",
      evidence: [{
        kind: "unavailable",
        label: "A bounded research plan can be written, but Chef Gringo did not fetch sources.",
        authorityLabel: "unavailable support",
      }],
      limitation: "Sources were not fetched. This is a plan, not completed research.",
      plannedQueries: buildGenericBoundedQueries(request.question),
      liveRetrievalCompleted: false,
    };
  }

  return {
    capability: "research_unavailable",
    evidence: [{
      kind: "unavailable",
      label: "No verified source is on file, and live retrieval is not enabled.",
      authorityLabel: "unavailable support",
    }],
    limitation: "Chef Gringo does not have a retrieved, validated source for this. The answer stays conservative.",
    plannedQueries: [],
    liveRetrievalCompleted: false,
  };
}
