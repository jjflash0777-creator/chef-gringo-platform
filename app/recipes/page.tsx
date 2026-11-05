import type { Metadata } from "next";
import Link from "next/link";
import { FieldNotesCapture } from "../components/FieldNotesCapture";

export const metadata: Metadata = {
  title: "Recipes",
  description: "Seven complete recipes: two published features and the five mother sauces. No filler cards pretending to be a library.",
};

const recipes = [
  {
    href: "/knowledge/dishes/carbonara",
    title: "Carbonara",
    note: "Complete culinary recipe on the source-ready knowledge page, with scaling, technique, and shopping list. Kitchen-test logs are not in this repository.",
  },
  {
    href: "/favorite-food-makeovers/big-mac-style-burger",
    title: "Heart-conscious Big Mac–style burger",
    note: "Complete makeover recipe: ingredients, yield, timing, and steps. Not kitchen-tested in this repository; nutrition values are pending.",
  },
  {
    href: "/recipes/bechamel",
    title: "Béchamel",
    note: "Complete mother-sauce recipe: white roux and milk, about 1 quart, with mornay, mustard and herb derivatives. Kitchen-test logs are not in this repository.",
  },
  {
    href: "/recipes/veloute",
    title: "Velouté",
    note: "Complete mother-sauce recipe: blond roux and white stock, about 1 quart, with suprême and allemande derivatives. Kitchen-test logs are not in this repository.",
  },
  {
    href: "/recipes/espagnole",
    title: "Espagnole — practical version",
    note: "Complete practical version of the brown mother sauce: brown roux, brown stock, mirepoix and tomato, about 1 quart, with the demi-glace direction. Kitchen-test logs are not in this repository.",
  },
  {
    href: "/recipes/sauce-tomate",
    title: "Sauce tomate",
    note: "Complete mother-sauce recipe: tomato cooked down with aromatics, about 1 quart, with Escoffier's classical version noted separately. Kitchen-test logs are not in this repository.",
  },
  {
    href: "/recipes/hollandaise",
    title: "Hollandaise",
    note: "Complete mother-sauce recipe: small-batch yolk-and-butter emulsion, about 1 cup, with béarnaise and choron derivatives and plain egg-safety, holding and discard rules. Kitchen-test logs are not in this repository.",
  },
] as const;

const previews = ["Breads and doughs", "Proteins and butchery", "Desserts"] as const;

export default function RecipesPage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Recipes</p>
      <p className="eyebrow">The published recipe shelf</p>
      <h1>Seven complete recipes. Not a tested library.</h1>
      <p className="lede">Chef Gringo publishes a recipe when it is complete enough to cook. “Complete” means ingredients, steps, and yield are on the page. It does not mean a kitchen-test log exists in this repository.</p>
      <ol className="cg-hub-list">
        {recipes.map((recipe) => (
          <li key={recipe.href}>
            <Link href={recipe.href}>
              <strong>{recipe.title}</strong>
              <span>{recipe.note}</span>
            </Link>
          </li>
        ))}
      </ol>
      <h2>Category previews</h2>
      <ul className="cg-preview-pills">
        {previews.map((label) => (
          <li key={label}><span>{label}</span> <small>Coming later</small></li>
        ))}
      </ul>
      <FieldNotesCapture
        heading="Seven recipes today. More when they're complete."
        copy="Chef Gringo publishes a recipe when it is complete enough to cook — ingredients, steps and yield on the page. Field Notes subscribers hear about new recipes and new Food Intelligence features first. No noise, no invented urgency, just the next useful thing, when it is ready."
      />
      <p><Link href="/cut-intelligence">Cut Intelligence</Link> will cover butchery later. It is a preview, not a recipe pack.</p>
    </div>
  );
}
