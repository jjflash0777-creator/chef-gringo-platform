import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "../../components/PrintButton";
import { ShopThisPost } from "../../components/ShopThisPost";
import { RelatedPosts } from "../../components/RelatedPosts";

export const metadata: Metadata = {
  title: "Sauce Tomate Recipe | Chef Gringo",
  description: "The complete Chef Gringo sauce tomate: tomato cooked down with aromatics until the raw acidity resolves. Base yield about 1 quart, with Escoffier's classical version noted separately.",
};

const ingredients = [
  "2 tablespoons olive oil (plus 30 g butter, optional)",
  "100 g onion, finely diced",
  "80 g carrot, finely diced",
  "2 garlic cloves, minced",
  "1 kg ripe tomatoes, chopped — or 800 g canned whole tomatoes with their juice",
  "250 ml (1 cup) white stock or water",
  "1 bay leaf and 2 sprigs of thyme",
  "A pinch of sugar, only if needed",
  "Fine salt and black pepper, to taste",
];

const instructions = [
  "Warm the olive oil (and butter, if using) in a heavy pot over medium heat. Sweat the onion and carrot 8–10 minutes without color, until soft and sweet.",
  "Add the garlic for the last minute.",
  "Add the tomatoes, stock or water, bay and thyme. Bring to a simmer.",
  "Simmer gently 45–60 minutes, partially covered, stirring now and then, until the sauce is brick-red and the sharp, raw acidity has resolved into sweetness.",
  "Remove the bay and thyme. Mill, blend, or leave it rustic — texture is a choice, not a rule.",
  "Season with salt and pepper. Add the pinch of sugar only if the acidity is still sharp after full cooking — cook first, correct second.",
];

export default function SauceTomatePage() {
  const recipeJsonLd = {
    "@context": "https://schema.org", "@type": "Recipe",
    name: "Sauce Tomate (Chef Gringo)", recipeYield: "About 1 quart (1 L)",
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
  };
  return (
    <article className="page-shell container article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }} />
      <p className="breadcrumbs"><a href="/">Home</a> / <a href="/recipes">Recipes</a> / Sauce Tomate</p>
      <header className="article-header">
        <p className="eyebrow">Mother sauces · Foundations of Flavor No. 2</p>
        <h1>Sauce tomate</h1>
        <p className="lede">The modern Chef Gringo version: tomato and aromatics, cooked down with patience until it stops tasting raw. The classical Escoffier version is noted separately below — the two are cousins, not twins.</p>
        <div className="recipe-meta"><span>Yield: about 1 quart (1 L)</span><span>About 1¼ hours</span><span>Print friendly</span></div>
      </header>
      <figure className="editorial-inline-image">
        <img src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_sauce_tomate.png" alt="Finished sauce tomate in a rustic ceramic saucier with an olive-oil drizzle, thyme beside it and ripe tomatoes behind" />
        <figcaption>Sauce tomate, finished: deep red, textured, cooked through.</figcaption>
      </figure>
      <section className="recipe-card">
        <div className="recipe-title"><div><p className="eyebrow">The complete recipe</p><h2>Sauce tomate</h2></div><PrintButton label="Print recipe" /></div>
        <div className="recipe-columns">
          <div><h3>Ingredients</h3><ul>{ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul></div>
          <div><h3>Instructions</h3><ol>{instructions.map((step) => <li key={step}>{step}</li>)}</ol></div>
        </div>
      </section>
      <section>
        <h2>The classical version, for the record</h2>
        <p>Escoffier&apos;s sauce tomate (per four quarts) was a different animal: 5 oz salted breast of pork, 6 oz each of carrot and onion, bay and thyme, 5 oz flour and 2 oz butter, ten pounds of raw tomatoes, two quarts of white stock and a crushed clove of garlic — cooked covered in a moderate oven for an hour and a half, then sieved. His purée variant omitted the flour. This page&apos;s recipe is the modern convention, presented as such; the classical formula is history, not the method above.</p>
      </section>
      <section>
        <h2>Variations, honestly labeled</h2>
        <p>Tomate never grew the formal derivative family the roux sauces did. What it has is variations: a Provençale direction with garlic and herbs, a spicy version, a mushroom version. Treat them as variations of one sauce, not a dynasty of small sauces.</p>
      </section>
      <section>
        <h2>Scaling notes</h2>
        <p>Reduction changes the balance at any scale: re-check acidity and salt after the sauce has cooked down, not before. Wide pans reduce faster and more evenly. Quantities scale through the <Link href="/tools/recipe-scaler">recipe scaler</Link>; seasoning is re-tasted, never scaled blind.</p>
      </section>
      <section>
        <h2>The honest fine print</h2>
        <p>Chef Gringo recipe record <code>recipe:sauce-tomate</code> · review state: source-ready. Kitchen-test logs are not in this repository. The full classification history is in the <Link href="/learn/mother-sauces-foundations-of-flavor">Mother Sauces feature</Link>.</p>
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
            { href: "/recipes/bechamel", label: "Béchamel", detail: "Another mother, complete." },
            { href: "/recipes/veloute", label: "Velouté", detail: "Another mother, complete." },
            { href: "/learn/mother-sauces-family-tree", label: "The Mother Sauces Family Tree", detail: "All five mothers on one printable sheet — free with Field Notes." },
        ]}
      />
    </article>
  );
}
