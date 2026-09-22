import Image from "next/image";
import Link from "next/link";
import type { RecipeRecord } from "./data";
import { RecipeScaler } from "../tools/recipe-scaler/RecipeScaler";

export function RecipePage({ recipe }: { recipe: RecipeRecord }) {
  return (
    <article className="cg-recipe-page">
      <header className="cg-recipe-hero">
        <div className="cg-recipe-hero-media">
          <Image unoptimized src={recipe.image.src} alt={recipe.image.alt} width={1600} height={1067} priority />
        </div>
        <div className="cg-recipe-hero-shade" aria-hidden="true" />
        <div className="container cg-recipe-hero-inner">
          <p className="cg-recipe-kicker">{recipe.category}</p>
          <h1>{recipe.title}</h1>
          <p className="cg-recipe-subtitle">{recipe.subtitle}</p>
          <div className="cg-recipe-meta" aria-label="Recipe timing and yield">
            <span><b>Base batch</b>{recipe.scaleBasis.amount} {recipe.scaleBasis.label}</span>
            <span><b>Prep</b>{recipe.prepTime}</span>
            <span><b>Cook</b>{recipe.cookTime}</span>
            <span><b>Total</b>{recipe.totalTime}</span>
          </div>
          {recipe.image.status === "temporary-editorial" && (
            <p className="cg-recipe-image-note">Temporary editorial image — dedicated recipe photography is coming next.</p>
          )}
        </div>
      </header>

      <section className="container cg-recipe-intro">
        <div>
          <p className="cg-recipe-kicker">Chef Gringo recipe</p>
          <h2>Built for the batch, not just the photo.</h2>
        </div>
        <p>{recipe.description}</p>
      </section>

      <section className="container cg-recipe-body">
        <div className="cg-recipe-ingredients">
          <p className="cg-recipe-kicker">Ingredients</p>
          <h2>40-pound production batch</h2>
          <ul>
            {recipe.ingredients.map((ingredient) => (
              <li key={`${ingredient.name}-${ingredient.unit}`}>
                <strong>{ingredient.quantity} {ingredient.unit}</strong>
                <span>{ingredient.name}{ingredient.note ? <small>{ingredient.note}</small> : null}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="cg-recipe-method">
          <p className="cg-recipe-kicker">Method</p>
          <h2>Low, slow, then glaze.</h2>
          <ol>
            {recipe.steps.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.instruction}</p>
                  {step.minutes ? <small>Approx. {step.minutes} minutes</small> : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cg-recipe-notes">
        <div className="container cg-recipe-notes-grid">
          <div>
            <p className="cg-recipe-kicker">Chef notes</p>
            <h2>The details that keep a big batch from eating itself alive.</h2>
            <ul>{recipe.chefNotes.map((note) => <li key={note}>{note}</li>)}</ul>
          </div>
          <div>
            <p className="cg-recipe-kicker">Production notes</p>
            <ul>{recipe.productionNotes.map((note) => <li key={note}>{note}</li>)}</ul>
            <p className="cg-recipe-kicker cg-recipe-sub-kicker">Substitutions</p>
            <ul>{recipe.substitutions.map((note) => <li key={note}>{note}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="container cg-recipe-scale" id="scale">
        <div className="cg-recipe-scale-head">
          <div>
            <p className="cg-recipe-kicker">Scale this recipe</p>
            <h2>Need 20 pounds? 60? 100?</h2>
          </div>
          <p>The math below uses the actual recipe ingredients and scales every entered quantity by the same factor.</p>
        </div>
        <RecipeScaler
          initialName={recipe.title}
          originalAmount={recipe.scaleBasis.amount}
          desiredAmount={recipe.scaleBasis.amount}
          basisLabel={recipe.scaleBasis.label}
          initialIngredients={recipe.ingredients.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
          }))}
        />
      </section>

      <section className="container cg-recipe-equipment">
        <p className="cg-recipe-kicker">Equipment used</p>
        <h2>What this batch actually needs.</h2>
        <div>{recipe.equipment.map((item) => <span key={item}>{item}</span>)}</div>
      </section>

      <section className="cg-recipe-next">
        <div className="container">
          <p className="cg-recipe-kicker">Keep cooking</p>
          <h2>One finished recipe. Then we build the next one.</h2>
          <div>
            <Link className="cg-commerce-cta" href="/recipes">Back to recipes →</Link>
            <Link className="cg-commerce-cta secondary" href="/tools/recipe-scaler">Open blank scaler</Link>
          </div>
        </div>
      </section>
    </article>
  );
}
