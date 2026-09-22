import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { featuredRecipe, recipes } from "./data";

export const metadata: Metadata = {
  title: "Recipes",
  description: "Chef Gringo recipes built for real kitchens, from weeknight cooking to production-scale batches.",
};

const categories = [
  "Entrées",
  "Soups & Sauces",
  "Sides",
  "Desserts",
  "Senior Living / Production",
  "Food Truck / Batch Cooking",
] as const;

export default function RecipesPage() {
  const featured = featuredRecipe();

  return (
    <main className="cg-recipes-index">
      {featured ? (
        <section className="cg-recipes-featured">
          <div className="cg-recipes-featured-media">
            <Image unoptimized src={featured.image.src} alt={featured.image.alt} width={1600} height={1067} priority />
          </div>
          <div className="cg-recipes-featured-shade" aria-hidden="true" />
          <div className="container cg-recipes-featured-inner">
            <p className="cg-recipe-kicker">Recipe of the week</p>
            <h1>{featured.title}</h1>
            <p>{featured.subtitle}</p>
            <div className="cg-recipes-featured-meta">
              <span>{featured.category}</span>
              <span>Base: {featured.scaleBasis.amount} {featured.scaleBasis.label}</span>
              <span>{featured.cookTime}</span>
            </div>
            <div className="cg-commerce-actions">
              <Link className="cg-commerce-cta" href={`/recipes/${featured.slug}`}>Cook this recipe →</Link>
              <Link className="cg-commerce-cta secondary" href={`/recipes/${featured.slug}#scale`}>Scale it</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="container cg-recipes-categories">
        <div className="cg-commerce-section-head compact">
          <p className="cg-recipe-kicker">Browse recipes</p>
          <h2>Food worth cooking twice.</h2>
        </div>
        <div className="cg-recipes-category-grid">
          {categories.map((category) => {
            const count = recipes.filter((recipe) => recipe.category === category).length;
            return (
              <div key={category} data-empty={count === 0 ? "true" : undefined}>
                <strong>{category}</strong>
                <span>{count ? `${count} recipe${count === 1 ? "" : "s"}` : "Coming next"}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container cg-recipes-latest" aria-labelledby="latest-recipes">
        <div className="cg-commerce-section-head">
          <div>
            <p className="cg-recipe-kicker">Latest recipes</p>
            <h2 id="latest-recipes">Built for people who actually have to cook it.</h2>
          </div>
          <p>Every recipe gets a real yield, real ingredient quantities, chef notes, production context, and a scaler when the math matters.</p>
        </div>
        <div className="cg-recipes-card-grid">
          {recipes.map((recipe) => (
            <Link href={`/recipes/${recipe.slug}`} key={recipe.slug}>
              <div>
                <Image unoptimized src={recipe.image.src} alt={recipe.image.alt} width={900} height={600} />
              </div>
              <small>{recipe.category}</small>
              <h3>{recipe.title}</h3>
              <p>{recipe.description}</p>
              <span>View recipe →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="cg-recipes-tools">
        <div className="container cg-recipes-tools-grid">
          <div>
            <p className="cg-recipe-kicker">Kitchen math</p>
            <h2>Already have your own recipe?</h2>
            <p>Use the blank scaler when you just need the quantities and none of the storytelling.</p>
          </div>
          <Link className="cg-commerce-cta" href="/tools/recipe-scaler">Open recipe scaler →</Link>
        </div>
      </section>
    </main>
  );
}
