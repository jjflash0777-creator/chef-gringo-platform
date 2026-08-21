import type { Metadata } from "next";
import { Notice } from "../../components/Notice";
import { RecipeViewTracker } from "./RecipeViewTracker";
import { PrintButton } from "../../components/PrintButton";

export const metadata: Metadata = {
  title: "Heart-Conscious Big Mac–Style Burger Recipe",
  description: "A familiar Big Mac–style burger makeover designed with lean protein, a Greek-yogurt sauce, and moderate sodium in mind.",
};

const ingredients = [
  "1 pound 96% lean ground beef or lean ground turkey",
  "4 whole-grain hamburger buns",
  "4 leaves lettuce, shredded",
  "1 medium tomato, thinly sliced",
  "¼ cup finely diced onion",
  "8 lower-sodium pickle slices, used moderately",
  "4 slices reduced-fat cheese (optional)",
  "½ cup plain Greek yogurt",
  "2 teaspoons mustard",
  "1 tablespoon relish",
  "½ teaspoon paprika",
  "½ teaspoon onion powder",
];

export default function BurgerPage() {
  const recipeJsonLd = {
    "@context": "https://schema.org", "@type": "Recipe",
    name: "Heart-Conscious Big Mac–Style Burger", recipeYield: "4 burgers",
    recipeIngredient: ingredients,
    recipeInstructions: [
      "Stir together Greek yogurt, mustard, relish, paprika, and onion powder.",
      "Form the meat into four thin patties and cook to a safe internal temperature.",
      "Toast buns if desired, then layer sauce, lettuce, tomato, patty, onion, pickle, and optional cheese.",
    ],
  };
  return (
    <article className="page-shell container article">
      <RecipeViewTracker />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }} />
      <p className="breadcrumbs"><a href="/">Home</a> / <a href="/favorite-food-makeovers">Makeovers</a> / Big Mac–style burger</p>
      <header className="article-header">
        <p className="eyebrow">Favorite-food makeover</p>
        <h1>The “yes, it’s still a burger” Big Mac–style makeover</h1>
        <p className="lede">A favorite food carries memories. So this recipe keeps the stack, the sauce, the pickle tang, and the fun—then makes practical changes around the edges.</p>
        <div className="recipe-meta"><span>Serves 4</span><span>About 30 minutes</span><span>Print friendly</span></div>
      </header>
      <Notice texture />
      <section>
        <h2>What we are changing</h2>
        <div className="change-grid">
          <div><strong>Very fatty patties → lean protein</strong><p>96% lean beef keeps classic flavor; lean turkey works too.</p></div>
          <div><strong>Heavy special sauce → Greek-yogurt sauce</strong><p>Creamy, tangy, and made with a smaller amount of relish.</p></div>
          <div><strong>Automatic double everything → one satisfying layer</strong><p>Familiar build, more intentional portions.</p></div>
          <div><strong>Salt piled on salt → flavor from spice and tang</strong><p>Mustard, paprika, onion, and moderate lower-sodium pickle do the work.</p></div>
        </div>
      </section>
      <section className="recipe-card">
        <div className="recipe-title"><div><p className="eyebrow">The complete recipe</p><h2>Heart-conscious Big Mac–style burger</h2></div><PrintButton label="Print recipe" /></div>
        <div className="recipe-columns">
          <div><h3>Ingredients</h3><ul>{ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul></div>
          <div><h3>Instructions</h3><ol>
            <li>In a small bowl, stir together the Greek yogurt, mustard, relish, paprika, and onion powder. Chill while the burgers cook.</li>
            <li>Divide the meat into four equal portions and form thin patties. Cook in a skillet or on a grill until they reach a safe internal temperature: 160°F / 71°C for ground beef in the U.S., or the equivalent for turkey. This page does not record a kitchen test of the assembled burger.</li>
            <li>Toast buns if desired. Layer sauce, lettuce, tomato, patty, onion, pickle, and optional cheese. Serve immediately.</li>
          </ol></div>
        </div>
        <p><strong>Estimated serving size:</strong> 1 assembled burger. Nutrition values are pending verified calculation from a credible data source.</p>
      </section>
      <section><h2>Easy sides that do not steal the show</h2><p>Try roasted potato wedges seasoned with paprika and black pepper, or tender roasted vegetables. Keep added salt modest and follow any individualized directions you have received.</p></section>
      <section><h2>Optional easier-to-chew preparation</h2><p>Use a soft bun, cook a thinner patty until tender without overbrowning, finely dice the vegetables, and serve sauce on the side for added moisture. This is not a dysphagia classification or a guarantee of safety. Follow the person’s clinician-provided texture instructions.</p></section>
    </article>
  );
}
