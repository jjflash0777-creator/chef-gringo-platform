import type { KnowledgeEntity, KnowledgeRelationship } from "../domain/types.ts";
import type { SearchResult } from "../search/search.ts";

/** Provider-neutral seams. None of these contracts performs a live request in Phase 1. */
export interface KnowledgeRepository {
  findById(id: string): Promise<KnowledgeEntity | undefined>;
  search(query: string): Promise<SearchResult[]>;
  relationshipsFor(id: string): Promise<KnowledgeRelationship[]>;
}

export interface GroundedAnswerAdapter {
  answer(input: { question: string; entityIds: string[] }): Promise<{
    answer: string;
    supportingEntityIds: string[];
    sourceUrls: string[];
  }>;
}

export interface SemanticSearchAdapter {
  search(input: { query: string; limit: number }): Promise<SearchResult[]>;
}

export interface CommerceAdapter {
  findProducts(input: { ingredientIds: string[]; postalCode?: string }): Promise<Array<{
    ingredientId: string;
    merchant: string;
    price?: number;
    currency?: string;
    url?: string;
  }>>;
}

export interface PlaceDiscoveryAdapter {
  findPlaces(input: { dishId: string; location: string }): Promise<Array<{
    name: string;
    address?: string;
    mapUrl?: string;
    availabilityCheckedAt?: string;
  }>>;
}

export interface NutritionAdapter {
  analyze(input: { recipeId: string; servings: number }): Promise<{
    disclaimer: string;
    nutrients: Record<string, number>;
  }>;
}

export interface AccountCollectionsAdapter {
  saveEntity(accountId: string, entityId: string, collectionId?: string): Promise<void>;
}

export interface CommunityContributionAdapter {
  submit(input: { accountId: string; entityId: string; body: string }): Promise<{
    moderationStatus: "pending";
  }>;
}
