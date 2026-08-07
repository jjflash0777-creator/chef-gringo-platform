import { knowledgeEntities } from "../domain/seed.ts";
import type { EntityType, KnowledgeEntity } from "../domain/types.ts";

export interface SearchResult {
  entity: KnowledgeEntity;
  score: number;
  matchedTerms: string[];
}

export interface KnowledgeSearchAdapter {
  search(query: string): Promise<SearchResult[]>;
}

const intents: Record<string, string[]> = {
  "how do i stop eggs from scrambling in carbonara": ["carbonara", "tempering", "carryover heat", "eggs"],
  "dinner for 50 guests": ["professional", "workflow", "scaling", "production"],
  "gluten-free catering": ["dietary", "workflow", "catering"],
  "knife skills": ["technique", "learning"],
  "espresso extraction": ["coffee", "technique", "equipment"],
  "beef wellington": ["dish", "technique", "beef"],
};

export class CuratedLocalSearchAdapter implements KnowledgeSearchAdapter {
  async search(query: string): Promise<SearchResult[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const queryTerms = normalized.split(/\s+/).filter((term) => term.length > 2);
    const expanded = intents[normalized] ?? queryTerms;
    return knowledgeEntities
      .map((entity) => {
        const haystack = [entity.title, entity.summary, entity.entityType, ...entity.tags].join(" ").toLowerCase();
        const matchedTerms = expanded.filter((term) => haystack.includes(term.toLowerCase()));
        const exactBoost = entity.title.toLowerCase() === normalized ? 10 : 0;
        return { entity, matchedTerms, score: matchedTerms.length + exactBoost };
      })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.entity.title.localeCompare(b.entity.title));
  }
}

export const localSearchAdapter = new CuratedLocalSearchAdapter();

export function groupResults(results: SearchResult[]) {
  return results.reduce<Partial<Record<EntityType, SearchResult[]>>>((groups, result) => {
    (groups[result.entity.entityType] ??= []).push(result);
    return groups;
  }, {});
}
