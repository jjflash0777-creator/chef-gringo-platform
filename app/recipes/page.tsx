import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Practical Recipes", description: "Chef Gringo recipes and favorite-food makeovers for seniors, caregivers, and professional kitchens." };
export default function RecipesPage() { return <div className="page-shell container">
  <p className="breadcrumbs"><a href="/">Home</a> / Recipes</p><p className="eyebrow">The tested recipe shelf</p><h1>Recipes</h1><p className="lede">We publish recipes when they are complete enough to be useful—not to make an empty grid look busy.</p>
  <div className="featured-recipe"><div><span className="status active">Available now</span><h2>Heart-conscious Big Mac–style burger</h2><p>Lean protein, whole-grain bun, plenty of familiar fixings, and a Greek-yogurt special sauce.</p><Link className="button" href="/favorite-food-makeovers/big-mac-style-burger">View the recipe</Link></div><div className="mini-burger" aria-hidden="true">🍔</div></div>
</div>; }
