import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "../../components/PrintButton";
import { ShopThisPost } from "../../components/ShopThisPost";
import { RelatedPosts } from "../../components/RelatedPosts";

export const metadata: Metadata = {
  title: "Béchamel Recipe | Chef Gringo",
  description: "The complete Chef Gringo béchamel: white roux, milk, patience. Base yield about 1 quart, with mornay, mustard and herb derivatives and scaling notes.",
};

const ingredients = [
  "60 g (4 tablespoons) unsalted butter",
  "60 g (½ cup) all-purpose flour",
  "1 L (about 1 quart) whole milk",
  "Fine salt, to taste",
  "White pepper, a pinch",
  "Freshly grated nutmeg, a pinch (convention, optional)",
];

const instructions = [
  "Melt the butter in a heavy saucepan over medium heat. Whisk in the flour until you have a smooth paste.",
  "Cook the white roux 2–3 minutes, whisking, until it smells faintly nutty and loses its raw edge. Do not let it color.",
  "Add the milk a splash at a time at first, whisking smooth after each addition, then add the rest in a steady stream, whisking throughout.",
  "Bring the sauce to a full simmer, still whisking. It thickens as it simmers — that is the starch doing its work.",
  "Simmer gently 15–20 minutes, whisking often and scraping the corners, until the sauce coats the back of a spoon and no raw-flour taste remains.",
  "Season with salt, white pepper and nutmeg. Strain if you want it flawless. Use it, or cover the surface and hold it warm.",
];

export default function BechamelPage() {
  const recipeJsonLd = {
    "@context": "https://schema.org", "@type": "Recipe",
    name: "Béchamel (Chef Gringo)", recipeYield: "About 1 quart (1 L)",
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
  };
  return (
    <article className="page-shell container article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }} />
      <p className="breadcrumbs"><a href="/">Home</a> / <a href="/recipes">Recipes</a> / Béchamel</p>
      <header className="article-header">
        <p className="eyebrow">Mother sauces · Foundations of Flavor No. 2</p>
        <h1>Béchamel</h1>
        <p className="lede">White roux, milk, and the discipline to let it finish cooking. The gentlest mother sauce — and the base for the derivative exercise in the feature article.</p>
        <div className="recipe-meta"><span>Yield: about 1 quart (1 L)</span><span>About 30 minutes</span><span>Print friendly</span></div>
      </header>
      <figure className="editorial-inline-image">
        <img src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_bechamel.png" alt="Finished béchamel in a white ceramic saucier, coating the back of a spoon, with grated cheese and nutmeg beside it" />
        <figcaption>Béchamel at nappe: glossy, ivory, spoon-coating.</figcaption>
      </figure>
      <section className="recipe-card">
        <div className="recipe-title"><div><p className="eyebrow">The complete recipe</p><h2>Béchamel</h2></div><PrintButton label="Print recipe" /></div>
        <div className="recipe-columns">
          <div><h3>Ingredients</h3><ul>{ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul></div>
          <div><h3>Instructions</h3><ol>{instructions.map((step) => <li key={step}>{step}</li>)}</ol></div>
        </div>
      </section>
      <section>
        <h2>Derivatives</h2>
        <p><strong>Mornay:</strong> off the heat, stir in 125 g (4 oz) grated Gruyère and 60 g (2 oz) grated Parmesan per quart of béchamel until just melted, then finish with 60 g (2 oz) butter. Cheese goes in off a hard boil, or the sauce turns grainy. <strong>Dijon and herb:</strong> whisk in a spoon of Dijon mustard and chopped soft herbs. <strong>Cream sauce direction:</strong> loosen with warm cream for a richer, softer base.</p>
      </section>
      <section>
        <h2>Scaling notes</h2>
        <p>Béchamel scales cleanly from half to four times this batch. At large batch sizes the risk is scorching: use a heavy pot, keep the heat moderate, and whisk the corners where milk solids settle. It does not freeze gracefully. Run your numbers through the <Link href="/tools/recipe-scaler">recipe scaler</Link> — equal weights of butter and flour per litre of milk is the ratio to preserve.</p>
      </section>
      <section>
        <h2>The honest fine print</h2>
        <p>This is the modern Chef Gringo version. Escoffier&apos;s classical béchamel simmered with lean veal, onion, nutmeg and thyme — the history is in the <Link href="/learn/mother-sauces-foundations-of-flavor">Mother Sauces feature</Link>. Chef Gringo recipe record <code>recipe:bechamel</code> · review state: source-ready. Kitchen-test logs are not in this repository.</p>
      </section>
      <ShopThisPost
        picks={[
          { href: "/go/thermoworks", note: "Sauces are temperature decisions — a bare simmer, a safe hold, an emulsion in its warm window. This is the thermometer work." },
          { href: "/go/gustus-vitae", note: "Mother sauces are deliberately under-seasoned bases; the finishing seasoning happens at the derivative stage." },
        ]}
      />
      <RelatedPosts
        links={[
            { href: "/learn/mother-sauces-foundations-of-flavor", label: "Mother Sauces: Five Bases, a Thousand Dinners", detail: "The feature this recipe belongs to — the whole system, not just this sauce." },
            { href: "/recipes/veloute", label: "Velouté", detail: "Another mother, complete." },
            { href: "/recipes/espagnole", label: "Espagnole", detail: "Another mother, complete." },
            { href: "/learn/mother-sauces-family-tree", label: "The Mother Sauces Family Tree", detail: "All five mothers on one printable sheet — free with Field Notes." },
        ]}
      />
    </article>
  );
}
