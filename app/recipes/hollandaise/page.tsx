import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "../../components/PrintButton";

export const metadata: Metadata = {
  title: "Hollandaise Recipe | Chef Gringo",
  description: "The complete Chef Gringo hollandaise: a small-batch emulsion of yolk and butter, about 1 cup, with béarnaise and choron derivatives — and the egg-safety, holding and discard rules stated plainly.",
};

const ingredients = [
  "3 egg yolks, from fresh eggs",
  "170 g (12 tablespoons) unsalted butter, melted and warm — clarified if you prefer",
  "1 tablespoon white wine vinegar, reduced to about 1 teaspoon (or 2 teaspoons lemon juice plus 1 tablespoon water)",
  "Fine salt, to taste",
  "A pinch of white pepper or cayenne",
  "Lemon juice, a few drops to finish",
];

const instructions = [
  "Set the station up first: butter melted and warm, bain-marie ready (a bowl over, not in, simmering water), whisk in hand. Hollandaise does not forgive a cook who is still looking for equipment.",
  "Whisk the yolks with the vinegar reduction (or lemon and water) in the bowl over the bain-marie. Keep the whisk moving and the heat gentle.",
  "Whisk until the yolks turn pale and thick and fall in a ribbon — Escoffier's test is a cream consistency. If the bowl feels hot to the touch or the yolks start to look grainy, lift it off the heat and keep whisking.",
  "Off the direct heat, add the warm butter in a thin thread, whisking constantly. Return the bowl briefly over the bath as needed to keep the sauce warm — never hot.",
  "Finish with lemon juice, salt and pepper. Serve warm, promptly.",
];

export default function HollandaisePage() {
  const recipeJsonLd = {
    "@context": "https://schema.org", "@type": "Recipe",
    name: "Hollandaise (Chef Gringo)", recipeYield: "About 1 cup (240 ml)",
    recipeIngredient: ingredients,
    recipeInstructions: instructions,
  };
  return (
    <article className="page-shell container article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }} />
      <p className="breadcrumbs"><a href="/">Home</a> / <a href="/recipes">Recipes</a> / Hollandaise</p>
      <header className="article-header">
        <p className="eyebrow">Mother sauces · Foundations of Flavor No. 2</p>
        <h1>Hollandaise</h1>
        <p className="lede">The emulsion mother: no flour, no roux — yolk, butter and temperature discipline. Small-batch by design, because temperature control is the recipe.</p>
        <div className="recipe-meta"><span>Yield: about 1 cup (240 ml)</span><span>About 15 minutes</span><span>Print friendly</span></div>
      </header>
      <figure className="editorial-inline-image">
        <img src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_hollandaise.png" alt="Finished hollandaise ribboning from a spoon into a white saucier, with a halved lemon beside it" />
        <figcaption>Hollandaise at the ribbon stage: glossy, warm, holding together.</figcaption>
      </figure>
      <section className="recipe-card">
        <div className="recipe-title"><div><p className="eyebrow">The complete recipe</p><h2>Hollandaise</h2></div><PrintButton label="Print recipe" /></div>
        <div className="recipe-columns">
          <div><h3>Ingredients</h3><ul>{ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul></div>
          <div><h3>Instructions</h3><ol>{instructions.map((step) => <li key={step}>{step}</li>)}</ol></div>
        </div>
      </section>
      <section>
        <h2>Egg safety, holding and discard — read this part</h2>
        <div className="notice-card">
          <strong>Hollandaise is not a make-ahead-and-reheat sauce.</strong>
          <div>
            <p>Use fresh eggs with clean, uncracked shells, kept refrigerated until the moment you cook. Make the sauce, serve it warm and promptly, and treat leftovers as finished: do not reheat and re-serve hollandaise.</p>
            <p>If the sauce must be held, hold it hot at 135 °F (57 °C) or above, per the FDA Food Code&apos;s hot-holding standard (§3-501.16, Food Code 2022). Where time itself is the control instead of temperature, the Food Code&apos;s limit is four hours total — then the sauce is discarded, not saved (§3-501.19). When in doubt, throw it out and make a fresh quarter-batch; it takes fifteen minutes.</p>
          </div>
        </div>
      </section>
      <section>
        <h2>Derivatives</h2>
        <p><strong>Béarnaise:</strong> replace the plain acid with a strained reduction of vinegar, shallots, fresh tarragon, fresh chervil and crushed peppercorns, then build the same emulsion on it. <strong>Choron:</strong> fold tomato purée into a béarnaise-style base, leaving the tarragon and chervil out. Both start from a hollandaise that is already under control — fix the mother before dressing the children.</p>
      </section>
      <section>
        <h2>Scaling notes</h2>
        <p>Small-batch by design. For a crowd, make parallel small batches rather than one large one: a big bowl over a bath is harder to keep in the narrow warm window, and a broken gallon is a worse problem than a broken cup. Quantities, if you must, scale through the <Link href="/tools/recipe-scaler">recipe scaler</Link> — but the technique does not scale, only the batch count does.</p>
      </section>
      <section>
        <h2>The honest fine print</h2>
        <p>Escoffier&apos;s hollandaise ran a pound and a half of butter to six yolks per quart, with a vinegar reduction and a pass through a tammy; this page keeps his structure at home scale. The Dutch-origin story attached to the sauce is tradition, not established fact. Chef Gringo recipe record <code>recipe:hollandaise</code> · review state: source-ready. Kitchen-test logs are not in this repository. Full history and science in the <Link href="/learn/mother-sauces-foundations-of-flavor">Mother Sauces feature</Link>.</p>
      </section>
    </article>
  );
}
