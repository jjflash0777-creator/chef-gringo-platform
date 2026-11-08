/**
 * The published recipe registry: every complete recipe Chef Gringo
 * currently publishes, in one place. The /recipes index describes this
 * same shelf in prose; the homepage Recipe of the Day rotates through
 * it. When a new recipe publishes, add it here and both surfaces pick
 * it up — the rotation grows on its own.
 *
 * Rotation order is deliberate: recipes whose own framing carries a
 * lighter angle lead the cycle, then the rest of the shelf follows.
 * Every recipe appears exactly once per cycle — the preference is in
 * the ordering, not in repetition. Hooks are drawn from each recipe's
 * own summary, and a lighterAngle note exists only where the recipe
 * itself supports it (the tomate is tomato and aromatics; the burger
 * is the site's heart-conscious makeover). No health claims are
 * attached to dishes that do not make them.
 */
export type PublishedRecipe = {
  href: string;
  title: string;
  hook: string;
  image: string;
  imageAlt: string;
  lighterAngle?: string;
};

export const PUBLISHED_RECIPES: readonly PublishedRecipe[] = [
  {
    href: "/recipes/sauce-tomate",
    title: "Sauce Tomate",
    hook: "Tomato cooked down with aromatics until the raw acidity resolves — about a quart, with Escoffier's classical version kept as history, not method.",
    image: "/images/editorial/mother-sauces-foundations-of-flavor/recipe_sauce_tomate.png",
    imageAlt: "Finished sauce tomate in a rustic ceramic saucier with an olive-oil drizzle, thyme beside it and ripe tomatoes behind",
    lighterAngle: "The lightest of the five mothers — no cream, and no roux in our version.",
  },
  {
    href: "/favorite-food-makeovers/big-mac-style-burger",
    title: "Heart-Conscious Big Mac–Style Burger",
    hook: "Keeps the stack, the sauce, and the pickle tang — then makes practical changes around the edges.",
    image: "/images/editorial/favorite-food-makeovers/big-mac-style-burger.webp",
    imageAlt: "Stacked burger on a whole-grain bun with shredded lettuce, tomato, pickles and melted cheese, a bowl of yogurt-based burger sauce beside it",
    lighterAngle: "The heart-conscious makeover: lean protein, a Greek-yogurt sauce, and moderate sodium by design.",
  },
  {
    href: "/recipes/veloute",
    title: "Velouté",
    hook: "Blond roux and white stock — about a quart, with suprême and allemande derivatives.",
    image: "/images/editorial/mother-sauces-foundations-of-flavor/recipe_veloute.png",
    imageAlt: "Finished velouté poured in a thin stream from a ladle into a steel pan, with a pot of stock behind",
  },
  {
    href: "/recipes/bechamel",
    title: "Béchamel",
    hook: "White roux, milk, and the discipline to let it finish cooking — with mornay and the other derivatives.",
    image: "/images/editorial/mother-sauces-foundations-of-flavor/recipe_bechamel.png",
    imageAlt: "Finished béchamel in a white ceramic saucier, coating the back of a spoon",
  },
  {
    href: "/knowledge/dishes/carbonara",
    title: "Carbonara",
    hook: "The complete recipe with scaling, technique, and a shopping list — plus why it scrambles, and how to stop it.",
    image: "/images/editorial/carbonara/carbonara-bowl.webp",
    imageAlt: "Bowl of spaghetti carbonara with crisp guanciale and cracked black pepper, grated pecorino beside it",
  },
  {
    href: "/recipes/espagnole",
    title: "Espagnole — Practical Version",
    hook: "Brown roux, brown stock, mirepoix and tomato, reduced — about a quart, with the demi-glace direction.",
    image: "/images/editorial/mother-sauces-foundations-of-flavor/recipe_espagnole.png",
    imageAlt: "Finished espagnole in a dark steel pan, deep glossy brown, with a spoon trailed through it",
  },
  {
    href: "/recipes/hollandaise",
    title: "Hollandaise",
    hook: "The emulsion mother, built patiently — and what to do when it breaks, because eventually it breaks.",
    image: "/images/editorial/mother-sauces-foundations-of-flavor/recipe_hollandaise.png",
    imageAlt: "Finished hollandaise ribboning from a spoon into a white saucier, with a halved lemon beside it",
  },
];

/**
 * Whole days since the Unix epoch for the calendar date in
 * America/New_York at the given instant. Pure UTC arithmetic on the
 * New York date parts, so DST never shifts the count.
 */
export function newYorkDayNumber(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? NaN);
  return Math.floor(Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000);
}

/** Long-form New York date label, e.g. "Saturday, November 7". */
export function newYorkDateLabel(instant: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(instant);
}

/**
 * The recipe of the day: one recipe per New York calendar day,
 * rotating deterministically through the published pool. The same
 * recipe shows all day; the pick advances at midnight Eastern.
 */
export function recipeOfTheDay(instant: Date, pool: readonly PublishedRecipe[] = PUBLISHED_RECIPES): PublishedRecipe {
  const count = pool.length;
  const index = ((newYorkDayNumber(instant) % count) + count) % count;
  return pool[index];
}
