import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Recipes",
  description: "Two complete Chef Gringo recipes. No filler cards pretending to be a library.",
};

const recipes = [
  {
    href: "/knowledge/dishes/carbonara",
    title: "Carbonara",
    note: "First tested culinary recipe — source-ready knowledge page with scaling and technique.",
  },
  {
    href: "/favorite-food-makeovers/big-mac-style-burger",
    title: "Heart-conscious Big Mac–style burger",
    note: "First tested makeover recipe — lean protein, whole-grain bun, yogurt sauce.",
  },
] as const;

const previews = ["Sauces and condiments", "Breads and doughs", "Proteins and butchery", "Desserts"] as const;

export default function RecipesPage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Recipes</p>
      <p className="eyebrow">The tested recipe shelf</p>
      <h1>Two complete recipes. Not a library.</h1>
      <p className="lede">Chef Gringo publishes a recipe when it is complete enough to cook. There is no grid of placeholders. Categories below are labeled as previews until they have a tested recipe.</p>
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
