import type { AssistantIntent, AssistantRequest, AssistantSourceUsed } from "../ai/assistant-contract.ts";
import { LIVE_RESEARCH_ENABLED, type ResearchCapability } from "./capability.ts";
import { buildGenericBoundedQueries } from "./plan.ts";
import { publicEvidenceFromRepository, type PublicEvidenceView } from "./public-view.ts";
import { productionEvidenceForPublic } from "./repository.ts";
import { researchTriggerFor } from "./trigger.ts";
import type { CorpusHit } from "./corpus-types.ts";
import type { CulinaryDomain } from "./source-policy.ts";
import { retrieveWithCache, type CorpusRetriever } from "./retriever.ts";
import { detectCorpusConflicts, conflictLimitation, jurisdictionLimitation } from "./conflicts.ts";
import { insertCitation } from "../../../db/corpus-repository.ts";
import { getD1Binding } from "../../../db/index.ts";

export type AssistantEvidenceAttachment = {
  capability: ResearchCapability;
  evidence: PublicEvidenceView[];
  sourcesUsed: AssistantSourceUsed[];
  limitation: string | null;
  plannedQueries: string[];
  liveRetrievalCompleted: false;
  retrievalAttempted: boolean;
};

function domainFor(intent: AssistantIntent): CulinaryDomain | undefined {
  if (intent === "food_safety") return "food_safety_public_health";
  if (intent === "dietary_accommodation") return "nutrition_therapeutic_diets";
  if (intent === "equipment_selection" || intent === "equipment_troubleshooting") return "equipment";
  if (intent === "business_startup") return "business_licensing";
  if (intent === "culinary_technique" || intent === "recipe_help") return "culinary_technique";
  return undefined;
}

function sourcesUsedFrom(hits: CorpusHit[]): AssistantSourceUsed[] {
  return hits.map((hit) => ({
    title: hit.title,
    organization: hit.publisher,
    dateLabel: hit.publishedDate ?? "date not established",
    jurisdiction: hit.jurisdiction ?? undefined,
    why: "Accepted library excerpt that supports this answer.",
    url: hit.canonicalUrl ?? undefined,
  }));
}

function evidenceFromHits(hits: CorpusHit[]): PublicEvidenceView[] {
  return hits.map((hit) => ({
    kind: hit.authorityTier === 1 ? "sourced" : hit.domain === "culinary_technique" ? "practice" : "sourced",
    label: `${hit.publisher} — ${hit.title}`,
    url: hit.canonicalUrl ?? undefined,
    claim: hit.excerpt.slice(0, 280),
    authorityLabel: hit.authorityTier === 1 ? "official source" : "professional practice",
  }));
}

const empty = (capability: ResearchCapability, extra: Partial<AssistantEvidenceAttachment> = {}): AssistantEvidenceAttachment => ({
  capability,
  evidence: [],
  sourcesUsed: [],
  limitation: null,
  plannedQueries: [],
  liveRetrievalCompleted: false,
  retrievalAttempted: false,
  ...extra,
});

export function attachRepositoryEvidence(request: AssistantRequest, intent: AssistantIntent): AssistantEvidenceAttachment {
  const trigger = researchTriggerFor(request.question, intent);
  if (trigger === "skip") return empty("knowledge_only");

  const hits = productionEvidenceForPublic(request.question);
  if (hits.length) {
    return empty("repository_evidence", {
      evidence: publicEvidenceFromRepository(hits),
    });
  }

  if (trigger === "plan_only") {
    return empty(LIVE_RESEARCH_ENABLED ? "bounded_research_plan" : "bounded_research_plan", {
      evidence: [{
        kind: "unavailable",
        label: "A bounded research plan can be written, but Chef Gringo did not fetch sources.",
        authorityLabel: "unavailable support",
      }],
      limitation: "Sources were not fetched. This is a plan, not completed research.",
      plannedQueries: buildGenericBoundedQueries(request.question),
    });
  }

  return empty("research_unavailable", {
    evidence: [{
      kind: "unavailable",
      label: "No verified source is on file, and live retrieval is not enabled.",
      authorityLabel: "unavailable support",
    }],
    limitation: "Chef Gringo does not have a retrieved, validated source for this. The answer stays conservative.",
  });
}

export async function attachGovernedEvidence(
  request: AssistantRequest,
  intent: AssistantIntent,
  retriever?: CorpusRetriever,
): Promise<AssistantEvidenceAttachment> {
  const trigger = researchTriggerFor(request.question, intent);
  if (trigger === "skip") return empty("knowledge_only");
  if (!retriever) return attachRepositoryEvidence(request, intent);

  let db;
  try { db = getD1Binding(); } catch { db = undefined; }
  const result = await retrieveWithCache(retriever, request.question, { domain: domainFor(intent), limit: 4, db });
  const publicHits = result.hits.filter((hit) => hit.ingestionStatus === "accepted" && hit.productionExposure);
  if (publicHits.length) {
    const conflicts = detectCorpusConflicts(publicHits);
    const extra = [conflictLimitation(conflicts), jurisdictionLimitation(publicHits, request.question)].filter(Boolean).join(" ");
    if (db) {
      for (const hit of publicHits) {
        try {
          if (hit.excerpt) await insertCitation(db, { documentId: hit.sourceId, versionId: hit.sourceVersion, chunkId: hit.chunkId, claimText: hit.excerpt.slice(0, 180) });
        } catch { /* citations require imported corpus rows; fixture-only retrieval still answers */ }
      }
    }
    return empty("curated_corpus_retrieval", {
      evidence: evidenceFromHits(publicHits),
      sourcesUsed: sourcesUsedFrom(publicHits),
      limitation: ["Retrieved from Chef Gringo’s accepted knowledge library. This is not a live web search.", extra].filter(Boolean).join(" "),
      retrievalAttempted: true,
    });
  }
  return { ...attachRepositoryEvidence(request, intent), retrievalAttempted: true };
}
