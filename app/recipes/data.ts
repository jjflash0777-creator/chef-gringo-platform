export type RecipeIngredient = {
  name: string;
  quantity: number;
  unit: string;
  note?: string;
};

export type RecipeStep = {
  title: string;
  instruction: string;
  minutes?: number;
};

export type RecipeRecord = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: "Entrées" | "Soups & Sauces" | "Sides" | "Desserts" | "Senior Living / Production" | "Food Truck / Batch Cooking";
  tags: string[];
  cuisine: string;
  scaleBasis: {
    amount: number;
    label: string;
  };
  prepTime: string;
  cookTime: string;
  totalTime: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  chefNotes: string[];
  substitutions: string[];
  equipment: string[];
  productionNotes: string[];
  featured: boolean;
  publishedAt: string;
  image: {
    src: string;
    alt: string;
    status: "temporary-editorial" | "approved-recipe";
  };
};

export const recipes: RecipeRecord[] = [
  {
    slug: "huli-huli-braised-short-ribs",
    title: "Huli Huli Braised Short Ribs",
    subtitle: "Sweet pineapple, soy, ginger and garlic built for a real production braise.",
    description: "A production-scale Hawaiian-inspired short-rib braise designed to finish fork-tender with enough sauce to reduce into a glossy glaze.",
    category: "Senior Living / Production",
    tags: ["short ribs", "braise", "Hawaiian-inspired", "production cooking", "beef"],
    cuisine: "Hawaiian-inspired",
    scaleBasis: { amount: 40, label: "lb raw short ribs" },
    prepTime: "45 minutes, plus 8–12 hours marinating",
    cookTime: "3½–4½ hours",
    totalTime: "About 13–17 hours including marination",
    ingredients: [
      { name: "Beef short ribs", quantity: 40, unit: "pound" },
      { name: "Pineapple juice", quantity: 1, unit: "gallon" },
      { name: "Beef stock", quantity: 3, unit: "quart" },
      { name: "Soy sauce", quantity: 2, unit: "quart" },
      { name: "Brown sugar", quantity: 6, unit: "cup" },
      { name: "Ketchup", quantity: 4, unit: "cup" },
      { name: "Rice vinegar", quantity: 3, unit: "cup" },
      { name: "Worcestershire sauce", quantity: 2, unit: "cup" },
      { name: "Fresh ginger, grated", quantity: 1.5, unit: "cup" },
      { name: "Garlic, minced", quantity: 1.5, unit: "cup" },
      { name: "Sesame oil", quantity: 1, unit: "cup" },
      { name: "Honey", quantity: 0.5, unit: "cup" },
      { name: "Yellow onions, sliced", quantity: 4, unit: "each" },
      { name: "Scallions", quantity: 2, unit: "bunch", note: "For finishing and garnish" },
    ],
    steps: [
      {
        title: "Portion and marinate",
        instruction: "Portion the short ribs before cooking. Marinate 8–12 hours under refrigeration, then drain thoroughly before searing.",
      },
      {
        title: "Dry and sear",
        instruction: "Pat the ribs dry so they brown instead of steam. Sear in batches until deeply browned on the exterior.",
      },
      {
        title: "Build the braise",
        instruction: "Arrange the browned ribs with the sliced onions. Add braising liquid until it reaches roughly one-third to one-half of the way up the meat; do not fully submerge the ribs.",
      },
      {
        title: "Braise covered",
        instruction: "Cover tightly and braise at 300°F until fork-tender and the bones release easily.",
        minutes: 240,
      },
      {
        title: "Strain and reduce",
        instruction: "Remove the ribs carefully. Strain the braising liquid, skim excess fat, and reduce the liquid until it becomes a glossy sauce.",
      },
      {
        title: "Glaze and finish",
        instruction: "Brush or spoon the reduced sauce over the ribs and finish at 425°F for 5–10 minutes to set the glaze without drying the meat.",
        minutes: 10,
      },
    ],
    chefNotes: [
      "Remove heavy exterior silver skin if it is easy to access; leave internal connective tissue that will soften during the braise.",
      "Sear after marinating, not before. Drain and dry the meat well first.",
      "The braising liquid should come only one-third to one-half up the meat so the ribs braise rather than boil.",
      "The doneness target is fork-tender meat that releases easily from the bone.",
    ],
    substitutions: [
      "Beef plate or chuck short ribs can both work; choose the cut that fits your plate size and desired bone presentation.",
      "If a long bone is awkward for service, portion before searing and braising rather than trying to cut cooked bones at the plate.",
    ],
    equipment: ["Hotel pans or braising pans", "Heavy sauté pans or flat-top for searing", "Fine strainer", "Fat separator or ladle", "Convection or deck oven"],
    productionNotes: [
      "Do not overcrowd the sear step. Browning quality drops quickly when the pan is overloaded.",
      "Large batches may need multiple pans so the liquid level remains one-third to one-half up the meat.",
      "Reduce sauce separately after braising so you can control glaze concentration without overcooking the ribs.",
    ],
    featured: true,
    publishedAt: "2026-09-22",
    image: {
      src: "/brand/editorial/cooking-line.jpg",
      alt: "Commercial kitchen cooking line used as temporary editorial imagery for Huli Huli Braised Short Ribs",
      status: "temporary-editorial",
    },
  },
];

export function recipeBySlug(slug: string) {
  return recipes.find((recipe) => recipe.slug === slug);
}

export function featuredRecipe() {
  return recipes.find((recipe) => recipe.featured) ?? recipes[0];
}
