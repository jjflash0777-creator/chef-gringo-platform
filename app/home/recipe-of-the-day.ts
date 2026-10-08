/**
 * Featured Recipe of the Day — change this object to rotate the homepage feature.
 * Only point at complete, real Chef Gringo recipes.
 */
export const recipeOfTheDay = {
  href: "/knowledge/dishes/carbonara",
  title: "Carbonara",
  eyebrow: "Recipe of the Day",
  deck: "Emulsified sauce, controlled heat, and timing — a complete Chef Gringo recipe with technique, scaling, and a shopping list.",
  hook: "The sauce comes together off the heat. Get the pan temperature right and the pasta does the rest.",
  image: {
    src: "/brand/editorial/cooking-line.jpg",
    alt: "Active cooking line — heat and timing for a sauce that must emulsify",
  },
  ctaLabel: "Cook this recipe",
} as const;
