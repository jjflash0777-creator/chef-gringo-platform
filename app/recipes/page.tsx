import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Recipes",
  description: "One complete culinary recipe and one complete makeover recipe. No filler cards pretending to be a library.",
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
] as const;

const previews = ["Sauces and condiments", "Breads and doughs", "Proteins and butchery", "Desserts"] as const;

export default function RecipesPage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Recipes</p>
      <p className="eyebrow">The published recipe shelf</p>
      <h1>Two complete recipes. Not a tested library.</h1>
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
      <p><Link href="/cut-intelligence">Cut Intelligence</Link> will cover butchery later. It is a preview, not a recipe pack.</p>
    </div>
  );
}
