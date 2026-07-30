import type {
  ChefInterpretation, Cuisine, DietaryConsideration, Dish, Equipment,
  Ingredient, KnowledgeEntity, KnowledgeRelationship, Recipe, Technique,
} from "./types.ts";

const dates = { createdAt: "2026-07-29", updatedAt: "2026-07-29" };
const published = { status: "published" as const, verification: "source-ready" as const, sources: [], reviewer: { scope: "Prototype editorial structure; historical citations pending final editorial review." }, ...dates };

export const ingredients: Ingredient[] = [
  ["guanciale", "Guanciale", "Cured pork jowl that brings rendered fat, savoriness, and texture.", "Cured pork", "Provides the primary fat and cured-pork character."],
  ["pecorino-romano", "Pecorino Romano", "A firm, salty sheep’s-milk cheese traditionally associated with Roman pasta.", "Cheese", "Seasons, thickens, and sharpens the emulsion."],
  ["eggs", "Eggs", "Whole eggs and yolks form the sauce when gently thickened by residual heat.", "Dairy & eggs", "Provide richness and emulsifying proteins."],
  ["black-pepper", "Black Pepper", "Freshly ground pepper adds floral heat and aromatic lift.", "Spice", "Balances the richness and defines the finish."],
  ["pasta", "Pasta", "Durum-wheat pasta carries starch into the sauce and gives the dish its structure.", "Dry goods", "Releases starch and carries the emulsion."],
].map(([slug, title, summary, category, fn]) => ({
  id: `ingredient:${slug}`, slug, entityType: "ingredient", title, summary,
  category, function: fn, substitutionIds: [], status: "published", verification: "reviewed",
  tags: ["carbonara"], sources: [], relatedEntityIds: ["dish:carbonara"], ...dates,
}));

export const techniques: Technique[] = [
  ["emulsification", "Emulsification", "Binding fat and water into a smooth, cohesive sauce.", "The sauce looks glossy and coats the pasta.", "The sauce appears greasy or separated."],
  ["tempering", "Tempering with Residual Heat", "Controlling heat so eggs thicken without scrambling.", "The bowl or pan is warm, not aggressively hot.", "Visible curds form in the sauce."],
  ["pasta-water", "Using Pasta Water", "Using starchy cooking water to loosen and stabilize the sauce.", "Add in small amounts until the sauce flows.", "A large addition makes the sauce thin."],
  ["rendering", "Rendering Cured Pork", "Slowly releasing fat while crisping guanciale.", "The fat is clear and the meat is bronze at the edges.", "High heat scorches the exterior before fat renders."],
  ["carryover-heat", "Carryover Heat", "Using retained heat in pasta and cookware after leaving the burner.", "Sauce thickens progressively as it is tossed.", "Direct burner heat scrambles eggs."],
].map(([slug, title, summary, cue, failureSignal]) => ({
  id: `technique:${slug}`, slug, entityType: "technique", title, summary, cue, failureSignal,
  status: "published", verification: "reviewed", tags: ["carbonara"], sources: [],
  relatedEntityIds: ["dish:carbonara"], ...dates,
}));

export const cuisine: Cuisine = {
  id: "cuisine:roman", slug: "roman", entityType: "cuisine", title: "Roman Cuisine",
  summary: "The food traditions associated with Rome and the surrounding Lazio region.",
  region: "Rome and Lazio, Italy", tags: ["italian", "rome"], relatedEntityIds: ["dish:carbonara"],
  ...published,
};

export const equipment: Equipment[] = [
  { id: "equipment:wide-pan", slug: "wide-pan", entityType: "equipment", title: "Wide Sauté Pan", summary: "Provides room to toss pasta and form the sauce off heat.", use: "Rendering and final emulsification.", tags: ["cookware"], relatedEntityIds: ["technique:emulsification"], ...published },
  { id: "equipment:mixing-bowl", slug: "mixing-bowl", entityType: "equipment", title: "Heatproof Mixing Bowl", summary: "Offers a forgiving environment for combining hot pasta with the egg mixture.", use: "Gentle off-heat tempering.", tags: ["prep"], relatedEntityIds: ["technique:tempering"], ...published },
];

export const dietary: DietaryConsideration = {
  id: "dietary:carbonara-allergens", slug: "carbonara-allergens", entityType: "dietary_consideration",
  title: "Carbonara Dietary Considerations", summary: "Typically contains wheat, egg, dairy, and pork.",
  educationalNote: "Ingredient changes alter both allergen exposure and culinary behavior. Verify labels and individual requirements.",
  tags: ["allergens", "educational"], relatedEntityIds: ["dish:carbonara"], ...published,
};

export const carbonara: Dish = {
  id: "dish:carbonara", slug: "carbonara", entityType: "dish", title: "Carbonara",
  summary: "A Roman pasta dish built from cured pork, egg, hard cheese, black pepper, pasta, and careful heat control.",
  cuisineId: cuisine.id, origin: "Rome, Italy", difficulty: "intermediate", estimatedMinutes: 30,
  primaryTechniqueIds: techniques.map((item) => item.id), dietaryConsiderationIds: [dietary.id],
  authenticityNote: "Its precise twentieth-century origin is debated. Contemporary Roman convention commonly excludes cream, while modern interpretations vary.",
  tags: ["pasta", "roman", "italian", "eggs", "emulsion"],
  relatedEntityIds: [...ingredients.map((item) => item.id), ...techniques.map((item) => item.id), cuisine.id, dietary.id],
  sources: [
    { label: "Editorial source record: dish history", note: "Final publication should cite current primary or reputable scholarly sources for disputed origin claims." },
  ],
  status: "published", verification: "source-ready", reviewer: { scope: "Original Chef Gringo prototype; historical review pending." }, ...dates,
};

export const carbonaraRecipe: Recipe = {
  id: "recipe:chef-gringo-carbonara", slug: "chef-gringo-carbonara", entityType: "recipe",
  title: "Chef Gringo Reference Carbonara", summary: "An original four-serving reference recipe designed around a stable off-heat emulsion.",
  dishId: carbonara.id, author: "Chef Gringo", baseYield: 4, yieldUnit: "servings",
  ingredients: [
    { ingredientId: "ingredient:pasta", quantity: 400, unit: "gram", display: "400 g dried spaghetti or rigatoni", group: "pantry" },
    { ingredientId: "ingredient:guanciale", quantity: 160, unit: "gram", display: "160 g guanciale, cut into short batons", group: "protein", scaleNote: "Large batches may require rendering in multiple pans." },
    { ingredientId: "ingredient:eggs", quantity: 2, unit: "each", display: "2 large whole eggs", group: "refrigerated", scaleNote: "Round eggs to whole units and adjust yolks by texture." },
    { ingredientId: "ingredient:eggs", quantity: 4, unit: "each", display: "4 large egg yolks", group: "refrigerated", scaleNote: "Listed separately from whole eggs." },
    { ingredientId: "ingredient:pecorino-romano", quantity: 100, unit: "gram", display: "100 g finely grated Pecorino Romano", group: "refrigerated" },
    { ingredientId: "ingredient:black-pepper", quantity: 4, unit: "gram", display: "4 g freshly ground black pepper, plus more to finish", group: "pantry", scaleNote: "Season to taste; pungency varies." },
  ],
  steps: [
    { id: "mise", title: "Set the mise en place", instruction: "Whisk whole eggs, yolks, cheese, and most of the pepper into a thick paste. Keep it beside the stove.", minutes: 5 },
    { id: "render", title: "Render the guanciale", instruction: "Start the guanciale in a cool wide pan. Cook over medium-low heat until the fat is rendered and the edges are crisp.", minutes: 10, criticalControl: "Avoid scorching; reserve the rendered fat." },
    { id: "cook", title: "Cook the pasta", instruction: "Boil pasta in moderately salted water until just shy of al dente. Reserve at least 250 ml pasta water.", minutes: 10 },
    { id: "emulsify", title: "Build the sauce off heat", instruction: "Transfer hot pasta to the guanciale pan, remove from direct heat, and toss. Add the egg mixture and toss vigorously, loosening with small additions of pasta water.", minutes: 3, criticalControl: "No direct burner heat once the egg mixture is added." },
    { id: "finish", title: "Finish immediately", instruction: "Adjust with pasta water until glossy and flowing. Fold in crisp guanciale, plate, and finish with pepper and cheese.", minutes: 2, criticalControl: "Serve promptly; the emulsion tightens as it cools." },
  ],
  equipmentIds: equipment.map((item) => item.id),
  substitutions: ["Pancetta can provide a different cured-pork profile when guanciale is unavailable.", "Parmesan may replace part of the Pecorino for a milder result; label the interpretation honestly."],
  commonMistakes: ["Adding egg mixture over active burner heat.", "Using too little pasta water.", "Over-salting before accounting for cured pork and cheese.", "Letting the finished pasta stand before service."],
  tags: ["original", "carbonara", "scaling-ready"], relatedEntityIds: [carbonara.id, ...ingredients.map((item) => item.id), ...techniques.map((item) => item.id)],
  status: "published", verification: "reviewed", sources: [{ label: "Chef Gringo original recipe", note: "Created for the Knowledge Engine prototype; not copied from a third party." }],
  reviewer: { scope: "Culinary logic reviewed for prototype use." }, ...dates,
};

export const interpretations: ChefInterpretation[] = [
  {
    id: "interpretation:luciano-monosilio", slug: "luciano-monosilio-carbonara", entityType: "chef_interpretation",
    title: "Luciano Monosilio’s precision-led approach", creator: "Luciano Monosilio", dishId: carbonara.id,
    summary: "A frequently cited modern Roman interpretation known for deliberate temperature control and a polished, custard-like emulsion.",
    distinguishingApproach: "Precision around the egg-and-cheese mixture and sauce texture.",
    tags: ["attributed-summary"], relatedEntityIds: [carbonara.id], ...published,
    sources: [{ label: "Authorized source link pending editorial verification", note: "Summary only; no recipe text reproduced." }],
  },
  {
    id: "interpretation:massimo-bottura", slug: "massimo-bottura-carbonara", entityType: "chef_interpretation",
    title: "Massimo Bottura’s interpretive lens", creator: "Massimo Bottura", dishId: carbonara.id,
    summary: "An example of how a contemporary chef may use carbonara as a point of departure while foregrounding concept and ingredient narrative.",
    distinguishingApproach: "Creative interpretation rather than a claim of Roman orthodoxy.",
    tags: ["attributed-summary"], relatedEntityIds: [carbonara.id], ...published,
    sources: [{ label: "Authorized source link pending editorial verification", note: "Summary only; no recipe text reproduced." }],
  },
];

export const knowledgeEntities: KnowledgeEntity[] = [
  carbonara, carbonaraRecipe, cuisine, dietary, ...ingredients, ...techniques, ...equipment, ...interpretations,
];

export const relationships: KnowledgeRelationship[] = [
  ...ingredients.map((item) => ({ id: `${carbonara.id}:${item.id}`, fromId: carbonara.id, toId: item.id, type: "uses_ingredient" as const, implemented: true })),
  ...techniques.map((item) => ({ id: `${carbonara.id}:${item.id}`, fromId: carbonara.id, toId: item.id, type: "requires_technique" as const, implemented: true })),
  { id: "carbonara:roman", fromId: carbonara.id, toId: cuisine.id, type: "belongs_to_cuisine", implemented: true },
  { id: "carbonara:dietary", fromId: carbonara.id, toId: dietary.id, type: "has_dietary_consideration", implemented: true },
  ...interpretations.map((item) => ({ id: `${item.id}:${carbonara.id}`, fromId: item.id, toId: carbonara.id, type: "interpretation_of" as const, implemented: true })),
  ...equipment.map((item, index) => ({ id: `${item.id}:technique`, fromId: item.id, toId: techniques[index].id, type: "supports_technique" as const, implemented: true })),
];
