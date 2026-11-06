import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "../../components/PrintButton";
import { ShopThisPost } from "../../components/ShopThisPost";
import { RelatedPosts } from "../../components/RelatedPosts";

export const metadata: Metadata = {
  title: "Espagnole Recipe (Practical Version) | Chef Gringo",
  description: "A practical home-and-small-kitchen espagnole: brown roux, brown stock, mirepoix and tomato, reduced. Base yield about 1 quart, with the demi-glace direction.",
};

const ingredients = [
  "60 g (4 tablespoons) unsalted butter or rendered fat",
  "60 g (½ cup) all-purpose flour",
  "1.25 L (about 5 cups) brown stock",
  "150 g mirepoix — onion, carrot and celery in small dice",
  "100 g tomato purée or crushed tomato",
  "1 bay leaf and 2 sprigs of thyme",
  "Fine salt and black pepper, to finish",
];

const instructions = [
  "Make the brown roux: melt the butter in a heavy saucepan over medium heat, whisk in the flour, and cook, stirring steadily, 10–15 minutes until the roux turns light brown and smells like hazelnuts. Watch it — brown to burned is a short walk.",
  "Whisk in the brown stock a little at a time at first, then the rest. Bring to a simmer, whisking.",
  "Add the mirepoix, tomato and herbs. Settle into a gentle simmer.",
  "Simmer 1½–2 hours, skimming the surface as fat and foam rise, until the sauce has reduced to about 1 quart (1 L) and coats a spoon with a gloss.",
  "Strain, pressing the vegetables lightly. Discard the solids.",
  "Season at the end — reduction concentrates salt. Use it as a foundation, or take it one step further to demi-glace (below).",
];

export default function EspagnolePage() {
  const recipeJsonLd = {
    "@context": "https://schema.org", "@type": "Recipe",
    name: "Espagnole, Practical Version (Chef Gringo)", recipeYield: "About 1 quart (1 L)",
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
  };
  return (
    <article className="page-shell container article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }} />
      <p className="breadcrumbs"><a href="/">Home</a> / <a href="/recipes">Recipes</a> / Espagnole</p>
      <header className="article-header">
        <p className="eyebrow">Mother sauces · Foundations of Flavor No. 2</p>
        <h1>Espagnole — practical version</h1>
        <p className="lede">This is explicitly a practical home-and-small-kitchen version of a professional foundation sauce: same architecture as the classical method, human scale, no stockpot program. Espagnole is a means, not an end — judge it by what it becomes.</p>
        <div className="recipe-meta"><span>Yield: about 1 quart (1 L)</span><span>About 2½ hours, mostly simmering</span><span>Print friendly</span></div>
      </header>
      <figure className="editorial-inline-image">
        <img src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_espagnole.png" alt="Finished espagnole in a dark steel pan, deep glossy brown, with a spoon trailed through it" />
        <figcaption>Espagnole: deep brown, glossy, reduced.</figcaption>
      </figure>
      <section className="recipe-card">
        <div className="recipe-title"><div><p className="eyebrow">The complete recipe</p><h2>Espagnole (practical version)</h2></div><PrintButton label="Print recipe" /></div>
        <div className="recipe-columns">
          <div><h3>Ingredients</h3><ul>{ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul></div>
          <div><h3>Instructions</h3><ol>{instructions.map((step) => <li key={step}>{step}</li>)}</ol></div>
        </div>
      </section>
      <section>
        <h2>Derivatives: the demi-glace direction</h2>
        <p>Espagnole&apos;s most important descendant is <strong>demi-glace</strong>. Following the proportions in Escoffier&apos;s Guide: combine equal parts espagnole and first-class brown stock (500 ml + 500 ml at this scale), reduce to a little under half a litre — glossy, coating, concentrated — and finish off the heat with about 50 ml of sherry. He called the result “the base of all the smaller brown sauces,” and he was not overselling it.</p>
      </section>
      <section>
        <h2>Scaling notes</h2>
        <p>Reduction time does not scale linearly: a double batch in the same pot reduces slower, because evaporation depends on surface area. Use a wide pan, and never fill a pot past three-quarters when reducing — a reducing sauce climbs and foams. At larger scales, budget the skimming time, not just the simmer time. The <Link href="/tools/recipe-scaler">recipe scaler</Link> handles the quantities; the clock is yours to watch.</p>
      </section>
      <section>
        <h2>The honest fine print</h2>
        <p>Escoffier&apos;s espagnole ran six quarts of brown stock down to four, with two pounds of tomatoes at professional scale. This version preserves the method — brown roux, despumation, tomato and mirepoix added before the final straining — at home scale. Full history in the <Link href="/learn/mother-sauces-foundations-of-flavor">Mother Sauces feature</Link>. Chef Gringo recipe record <code>recipe:espagnole</code> · review state: source-ready. Kitchen-test logs are not in this repository.</p>
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
