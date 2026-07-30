export type EntityType =
  | "dish" | "recipe" | "ingredient" | "technique" | "cuisine"
  | "chef_interpretation" | "restaurant" | "equipment"
  | "dietary_consideration" | "nutrition_topic" | "supplier"
  | "learning_path" | "hospitality_role" | "workflow";

export type ContentStatus = "draft" | "review" | "published";
export type VerificationState = "seeded" | "source-ready" | "reviewed" | "verified";
export type GuidanceMode = "beginner" | "home" | "professional";

export interface SourceMetadata {
  label: string;
  url?: string;
  publisher?: string;
  accessedAt?: string;
  note?: string;
}

export interface EntityImage {
  src: string;
  alt: string;
  credit?: string;
}

export interface ReviewerMetadata {
  reviewer?: string;
  reviewedAt?: string;
  scope?: string;
}

export interface KnowledgeRelationship {
  id: string;
  fromId: string;
  toId: string;
  type:
    | "uses_ingredient" | "requires_technique" | "interpretation_of"
    | "belongs_to_cuisine" | "supports_technique" | "has_substitution"
    | "has_dietary_consideration" | "serves_dish" | "teaches_technique"
    | "produces_dish" | "performs_workflow" | "similar_to";
  note?: string;
  implemented: boolean;
}

export interface KnowledgeEntityBase {
  id: string;
  slug: string;
  entityType: EntityType;
  title: string;
  summary: string;
  status: ContentStatus;
  verification: VerificationState;
  tags: string[];
  image?: EntityImage;
  sources: SourceMetadata[];
  reviewer?: ReviewerMetadata;
  createdAt: string;
  updatedAt: string;
  relatedEntityIds: string[];
}

export interface Dish extends KnowledgeEntityBase {
  entityType: "dish";
  cuisineId: string;
  origin: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedMinutes: number;
  primaryTechniqueIds: string[];
  dietaryConsiderationIds: string[];
  authenticityNote: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: "gram" | "each" | "milliliter";
  display: string;
  group: "pantry" | "refrigerated" | "protein" | "produce";
  scaleNote?: string;
}

export interface RecipeStep {
  id: string;
  title: string;
  instruction: string;
  minutes?: number;
  criticalControl?: string;
}

export interface Recipe extends KnowledgeEntityBase {
  entityType: "recipe";
  dishId: string;
  author: string;
  baseYield: number;
  yieldUnit: "servings";
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  equipmentIds: string[];
  substitutions: string[];
  commonMistakes: string[];
}

export interface Ingredient extends KnowledgeEntityBase {
  entityType: "ingredient";
  category: string;
  function: string;
  substitutionIds: string[];
}

export interface Technique extends KnowledgeEntityBase {
  entityType: "technique";
  cue: string;
  failureSignal: string;
}

export interface Cuisine extends KnowledgeEntityBase {
  entityType: "cuisine";
  region: string;
}

export interface ChefInterpretation extends KnowledgeEntityBase {
  entityType: "chef_interpretation";
  creator: string;
  dishId: string;
  distinguishingApproach: string;
  authorizedSourceUrl?: string;
}

export interface Equipment extends KnowledgeEntityBase {
  entityType: "equipment";
  use: string;
}

export interface DietaryConsideration extends KnowledgeEntityBase {
  entityType: "dietary_consideration";
  educationalNote: string;
}

export type KnowledgeEntity =
  | Dish | Recipe | Ingredient | Technique | Cuisine
  | ChefInterpretation | Equipment | DietaryConsideration;
