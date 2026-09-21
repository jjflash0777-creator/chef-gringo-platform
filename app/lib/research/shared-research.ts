import type { AssistantIntent, AssistantRequest } from "../ai/assistant-contract.ts";
import { researchTriggerFor } from "./trigger.ts";

export type SharedResearchSource = {
  title: string;
  publisher: string;
  url: string;
  excerpt: string;
  publishedDate: string | null;
  relationship: "supports" | "contradicts" | "mixed" | "relevant";
  authorityAdequate: boolean;
};

export type SharedResearchResult = {
  completed: boolean;
  providerId: string | null;
  queriesExecuted: string[];
  sources: SharedResearchSource[];
  limitation: string | null;
};

export type SharedResearchService = {
  id: string;
  available(): boolean;
  research(input: {
    request: AssistantRequest;
    intent: AssistantIntent;
    signal?: AbortSignal;
  }): Promise<SharedResearchResult>;
};

export function assistantMayUseSharedResearch(
  request: AssistantRequest,
  intent: AssistantIntent,
) {
  const trigger = researchTriggerFor(request.question, intent);
  return trigger === "prefer_repository" || trigger === "plan_only" || trigger === "unavailable";
}

/**
 * Fail-closed default. This keeps the public Ask path honest until the existing
 * Growth bounded-research engine is explicitly adapted and founder-approved.
 */
export const disabledSharedResearchService: SharedResearchService = {
  id: "disabled",
  available() {
    return false;
  },
  async research() {
    return {
      completed: false,
      providerId: null,
      queriesExecuted: [],
      sources: [],
      limitation: "Shared live research is not enabled for public Ask.",
    };
  },
};
