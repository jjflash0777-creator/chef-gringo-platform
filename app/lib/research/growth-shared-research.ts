import type { AssistantIntent } from "../ai/assistant-contract.ts";
import type { SharedResearchService, SharedResearchSource } from "./shared-research.ts";
import { liveCandidateDiscoveryAvailable } from "../../growth/social/candidate-discovery-capability.ts";
import { executeBoundedCandidateDiscovery } from "../../growth/social/candidate-discovery.ts";
import { buildExecutableResearchPlan } from "../../growth/social/research-planner.ts";
import type { EvidencePolicyClass } from "../../growth/social/evidence-policy.ts";

export function assistantEvidencePolicyClass(intent: AssistantIntent): EvidencePolicyClass {
  if (
    intent === "food_safety"
    || intent === "dietary_accommodation"
    || intent === "business_startup"
  ) return "safety_sensitive";

  if (
    intent === "equipment_selection"
    || intent === "equipment_troubleshooting"
    || intent === "marketplace_comparison"
  ) return "broad_technical";

  return "narrow_factual";
}

function sourceFromCandidate(candidate: {
  title: string;
  publisher: string;
  canonicalUrl: string;
  excerpts: Array<{ text: string }>;
  publishedDate: string | null;
  relationship: "supports" | "contradicts" | "mixed" | "relevant" | "irrelevant";
  authorityAdequate: boolean;
}): SharedResearchSource | null {
  if (candidate.relationship === "irrelevant") return null;
  const excerpt = candidate.excerpts[0]?.text?.trim();
  if (!excerpt) return null;
  return {
    title: candidate.title,
    publisher: candidate.publisher,
    url: candidate.canonicalUrl,
    excerpt,
    publishedDate: candidate.publishedDate,
    relationship: candidate.relationship,
    authorityAdequate: candidate.authorityAdequate,
  };
}

/**
 * Adapter over the existing Growth bounded-research engine.
 *
 * Important: this service is not wired into public Ask yet. It also refuses to
 * run unless the real live-discovery provider is configured, so it can never
 * silently substitute fixture research for a public answer.
 */
export const growthSharedResearchService: SharedResearchService = {
  id: "growth-bounded-research",
  available() {
    return liveCandidateDiscoveryAvailable();
  },

  async research({ request, intent }) {
    if (!liveCandidateDiscoveryAvailable()) {
      return {
        completed: false,
        providerId: null,
        queriesExecuted: [],
        sources: [],
        limitation: "Growth bounded live research is not configured for this runtime.",
      };
    }

    const policyClass = assistantEvidencePolicyClass(intent);
    const plan = buildExecutableResearchPlan({
      claimOrQuestion: request.question,
      policyClass,
      reason: "Public Chef Gringo question requires current or externally verified information.",
      packageProblem: request.operatingContext ?? null,
    });

    const run = await executeBoundedCandidateDiscovery({
      plan,
      claim: {
        id: `assistant:${intent}`,
        claimText: request.question,
        safetySensitive: policyClass === "safety_sensitive",
        policyClass,
      },
      attached: [],
    });

    const sources = run.candidates.flatMap((candidate) => {
      const mapped = sourceFromCandidate(candidate);
      return mapped ? [mapped] : [];
    });

    return {
      completed: run.liveRetrieval && run.queriesExecuted.length > 0,
      providerId: run.providerId,
      queriesExecuted: run.queriesExecuted,
      sources,
      limitation: sources.length
        ? "Live candidates were retrieved and assessed. They are research results, not automatically accepted corpus evidence."
        : run.stopReason || "Live research completed without usable supporting excerpts.",
    };
  },
};
