import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "../../components/PrintButton";

export const metadata: Metadata = {
  title: "Velouté Recipe | Chef Gringo",
  description: "The complete Chef Gringo velouté: blond roux and white stock. Base yield about 1 quart, with suprême and allemande derivatives and scaling notes.",
};

const ingredients = [
  "60 g (4 tablespoons) unsalted butter",
  "60 g (½ cup) all-purpose flour",
  "1 L (about 1 quart) white stock — chicken, veal or fish, well skimmed",
  "Fine salt, to taste",
  "White pepper, a pinch",
];

const instructions = [
  "Melt the butter in a heavy saucepan over medium heat. Whisk in the flour until smooth.",
  "Cook the roux 3–4 minutes to a pale blond — the raw edge gone, no browning. Color here is a mistake, not a style.",
  "Add the stock a splash at a time at first, whisking smooth after each addition, then the rest in a steady stream.",
  "Bring to a full simmer, whisking. Skim the surface as it rises — this despumation is part of the recipe, not garnish.",
  "Simmer gently 30–45 minutes, skimming occasionally, until the sauce coats a spoon and tastes like the stock, cleaned up.",
  "Season lightly with salt and white pepper. Strain. Use it, or cover the surface and hold it warm.",
];

export default function VeloutePage() {
  const recipeJsonLd = {
    "@context": "https://schema.org", "@type": "Recipe",
    name: "Velouté (Chef Gringo)", recipeYield: "About 1 quart (1 L)",
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
  };
  return (
    <article className="page-shell container article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }} />
      <p className="breadcrumbs"><a href="/">Home</a> / <a href="/recipes">Recipes</a> / Velouté</p>
      <header className="article-header">
        <p className="eyebrow">Mother sauces · Foundations of Flavor No. 2</p>
        <h1>Velouté</h1>
        <p className="lede">Blond roux plus white stock, and nothing to hide behind. The stock is the recipe — choose it like it matters, because it is the flavor.</p>
        <div className="recipe-meta"><span>Yield: about 1 quart (1 L)</span><span>About 50 minutes</span><span>Print friendly</span></div>
      </header>
      <figure className="editorial-inline-image">
        <img src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_veloute.png" alt="Finished velouté poured in a thin stream from a ladle into a steel pan, with a pot of stock behind" />
        <figcaption>Velouté: pale blond, silky, stock-forward.</figcaption>
      </figure>
      <section className="recipe-card">
        <div className="recipe-title"><div><p className="eyebrow">The complete recipe</p><h2>Velouté</h2></div><PrintButton label="Print recipe" /></div>
        <div className="recipe-columns">
          <div><h3>Ingredients</h3><ul>{ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul></div>
          <div><h3>Instructions</h3><ol>{instructions.map((step) => <li key={step}>{step}</li>)}</ol></div>
        </div>
      </section>
      <section>
        <h2>Derivatives</h2>
        <p><strong>Suprême:</strong> reduce a chicken velouté by about a quarter, temper in heavy cream (about 250 ml per litre of velouté), finish with a knob of butter and a few drops of lemon, then strain. <strong>Allemande</strong> — filed here, where Escoffier put it: temper 2 egg yolks beaten with 60 ml cream into the warm velouté off the heat, add lemon juice and, if you have it, mushroom cooking liquor. Never boil it after the liaison goes in; a fat-enriched sauce pushed past about 140 °F (60 °C) risks breaking down.</p>
      </section>
      <section>
        <h2>Scaling notes</h2>
        <p>Velouté is stock-bound: scaling the roux does not fix a weak stock, and a bigger batch of a mediocre stock is just more of it. Larger batches need longer, patient skimming. Run quantities through the <Link href="/tools/recipe-scaler">recipe scaler</Link> and spend your effort on the stock.</p>
      </section>
      <section>
        <h2>The honest fine print</h2>
        <p>Escoffier&apos;s velouté used white veal stock and about an hour and a half of despumation at professional scale; this home version keeps the method and shortens the simmer. The history — including allemande&apos;s demotion — is in the <Link href="/learn/mother-sauces-foundations-of-flavor">Mother Sauces feature</Link>. Chef Gringo recipe record <code>recipe:veloute</code> · review state: source-ready. Kitchen-test logs are not in this repository.</p>
      </section>
    </article>
  );
}
