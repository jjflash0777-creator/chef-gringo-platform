"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../../components/AnalyticsBridge";
import { carbonara, carbonaraRecipe, ingredients } from "../domain/seed";
import { buildShoppingList, formatMetric, scaleRecipe } from "../domain/recipe";
import type { GuidanceMode } from "../domain/types";

const modeCopy: Record<GuidanceMode, { label: string; intro: string; workflow: string[]; caution: string }> = {
  beginner: {
    label: "Beginner",
    intro: "Your only real job is controlling heat. The sauce should thicken from the hot pasta and pan — not from direct burner heat.",
    workflow: [
      "Measure and prep everything before the pasta is ready.",
      "Take the pan off the burner before the egg mixture goes in.",
      "Toss constantly while adding pasta water a little at a time.",
      "Stop when the sauce is glossy and coats every strand."
    ],
    caution: "If the pan is still loudly sizzling when the eggs go in, wait a few seconds."
  },
  home: {
    label: "Home Cook",
    intro: "Carbonara is an emulsion: egg, cheese, rendered pork fat, starch, and residual heat working together.",
    workflow: [
      "Whisk the egg-cheese mixture while the guanciale renders.",
      "Cook pasta just shy of al dente.",
      "Reserve more pasta water than you think you need.",
      "Finish off heat and serve immediately."
    ],
    caution: "The sauce tightens quickly, so have plates — and people — ready."
  },
  professional: {
    label: "Professional",
    intro: "Treat carbonara as an à la minute pickup with a narrow service window.",
    workflow: [
      "Pre-portion pasta, egg-cheese base, guanciale, and finishing cheese.",
      "Render guanciale in controlled batches.",
      "Finish only as much as the pan can emulsify cleanly.",
      "Plate immediately; do not hot-hold finished carbonara."
    ],
    caution: "Scale mise en place, not just ingredient quantities."
  }
};

const rescueCards = [
  {
    title: "Eggs scrambled",
    reason: "The pan was too hot.",
    fix: "Remove from heat earlier and let the sizzling calm before adding the egg mixture."
  },
  {
    title: "Sauce is dry",
    reason: "Not enough pasta water or too much cooling.",
    fix: "Add warm starchy water a spoonful at a time while tossing."
  },
  {
    title: "Sauce is greasy",
    reason: "The fat and water never formed a stable emulsion.",
    fix: "Toss more aggressively off heat and add a small splash of pasta water."
  },
  {
    title: "Cheese clumped",
    reason: "The mixture hit too much heat or sat still.",
    fix: "Use finely grated cheese and keep the pasta moving as the sauce comes together."
  }
];

export function CarbonaraKnowledgePage() {
  const [mode, setMode] = useState<GuidanceMode>("home");
  const [servings, setServings] = useState(4);
  const [shoppingOpen, setShoppingOpen] = useState(false);

  const scaled = useMemo(() => scaleRecipe(carbonaraRecipe, servings), [servings]);
  const shopping = useMemo(() => buildShoppingList(carbonaraRecipe, servings), [servings]);

  useEffect(() => trackEvent("knowledge_page_viewed", { entityId: carbonara.id }), []);

  function changeMode(next: GuidanceMode) {
    setMode(next);
    trackEvent("guidance_mode_changed", { entityId: carbonara.id, mode: next });
  }

  function changeServings(next: number) {
    const safe = Math.max(1, Math.min(100, Math.round(next || 1)));
    setServings(safe);
    trackEvent("servings_changed", { entityId: carbonaraRecipe.id, servings: safe });
  }

  return (
    <article className="carbonara-experience">
      <header className="carbonara-hero">
        <div className="container carbonara-hero-grid">
          <div className="carbonara-hero-copy">
            <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/learn">Learn</Link> / Carbonara</p>
            <p className="eyebrow">Chef Gringo recipe</p>
            <h1>Carbonara: it’s all about technique.</h1>
            <p className="carbonara-tagline">No cream. Just method.</p>
            <p className="lede">Eggs, Pecorino, guanciale, black pepper, pasta water, and one critical skill: knowing when to get the pan off the heat.</p>
            <div className="button-row">
              <a className="button" href="#start-cooking">Start cooking</a>
              <a className="button secondary" href="#ingredients">Jump to ingredients</a>
            </div>
            <dl className="carbonara-quick-facts">
              <div><dt>Prep</dt><dd>10 min</dd></div>
              <div><dt>Cook</dt><dd>15–20 min</dd></div>
              <div><dt>Difficulty</dt><dd>Moderate</dd></div>
              <div><dt>Core skill</dt><dd>Heat control</dd></div>
            </dl>
          </div>
          <div className="carbonara-hero-card">
            <div className="carbonara-bowl" aria-hidden="true">
              <span className="carbonara-noodle">🍝</span>
            </div>
            <p><strong>The visual cue:</strong> glossy sauce that clings to the pasta without looking scrambled, greasy, or watery.</p>
          </div>
        </div>
      </header>

      <nav className="knowledge-subnav" aria-label="Carbonara page sections">
        <div className="container">
          <a href="#before-you-start">Before you start</a>
          <a href="#ingredients">Ingredients</a>
          <a href="#start-cooking">5 steps</a>
          <a href="#rescue">Fix it</a>
          <a href="#guidance">Guidance mode</a>
        </div>
      </nav>

      <section className="section container carbonara-intro" id="before-you-start">
        <div>
          <p className="eyebrow">Before you start</p>
          <h2>Carbonara moves fast once the pasta is ready.</h2>
          <p className="lede">Have the egg mixture made, the cheese grated, the guanciale rendered, and the pasta water reserved before you combine anything.</p>
        </div>
        <div className="carbonara-rules">
          <article><span>01</span><h3>Mise en place first</h3><p>Once the pasta leaves the water, there is no good stopping point.</p></article>
          <article><span>02</span><h3>Eggs go in off heat</h3><p>Residual heat thickens the sauce. Direct burner heat scrambles it.</p></article>
          <article><span>03</span><h3>Pasta water is your control knob</h3><p>Add it gradually until the sauce loosens and turns glossy.</p></article>
        </div>
      </section>

      <section className="section carbonara-ingredients-section" id="ingredients">
        <div className="container">
          <div className="recipe-heading">
            <div>
              <p className="eyebrow">Ingredients</p>
              <h2>Simple list. Precise execution.</h2>
              <p>{carbonaraRecipe.summary}</p>
            </div>
            <div className="yield-control">
              <label htmlFor="servings">Servings</label>
              <input id="servings" type="number" min="1" max="100" value={servings} onChange={(event) => changeServings(Number(event.target.value))} />
              <span>Base recipe: {carbonaraRecipe.baseYield}</span>
            </div>
          </div>

          {servings > 12 && (
            <aside className="production-warning">
              <strong>Large batch note:</strong> quantities scale, but carbonara should still be finished in smaller pickups. Pan capacity and egg temperature matter.
            </aside>
          )}

          <div className="carbonara-ingredient-grid">
            {scaled.map((item, index) => {
              const entity = ingredients.find((ingredient) => ingredient.id === item.ingredientId);
              return (
                <article key={`${item.ingredientId}-${index}`}>
                  <strong>{formatMetric(item.scaledQuantity, item.unit)}</strong>
                  <span>{entity?.title}</span>
                  {item.scaleNote && <small>{item.scaleNote}</small>}
                </article>
              );
            })}
          </div>

          <div className="button-row">
            <button className="button secondary" type="button" onClick={() => {
              setShoppingOpen(true);
              trackEvent("shopping_list_generated", { servings });
            }}>Generate shopping list</button>
          </div>

          {shoppingOpen && <ShoppingList servings={servings} groups={shopping} onClose={() => setShoppingOpen(false)} />}
        </div>
      </section>

      <section className="section container" id="start-cooking">
        <div className="section-heading">
          <p className="eyebrow">Start cooking</p>
          <h2>Five steps. Watch the heat.</h2>
          <p className="lede">The final two minutes matter more than anything else.</p>
        </div>
        <ol className="carbonara-step-cards">
          {carbonaraRecipe.steps.map((step, index) => (
            <li key={step.id}>
              <div className="carbonara-step-number">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <div className="carbonara-step-heading">
                  <h3>{step.title}</h3>
                  <span>{step.minutes ? `${step.minutes} min` : "Next"}</span>
                </div>
                <p>{step.instruction}</p>
                {step.criticalControl && <p className="carbonara-control"><strong>Watch this:</strong> {step.criticalControl}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section carbonara-doneness">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow light">What should it look like?</p>
            <h2>Read the sauce.</h2>
          </div>
          <div className="carbonara-doneness-grid">
            <article><span>Too dry</span><h3>Clumpy and stiff</h3><p>Add a splash of warm pasta water and toss.</p></article>
            <article><span>Too loose</span><h3>Pooling in the bowl</h3><p>Keep tossing. Add a little more finely grated cheese if needed.</p></article>
            <article className="perfect"><span>Perfect</span><h3>Glossy and clingy</h3><p>The sauce coats each strand and still moves when the pasta is tossed.</p></article>
          </div>
        </div>
      </section>

      <section className="section container carbonara-explainer">
        <div>
          <p className="eyebrow">Why no cream?</p>
          <h2>The creaminess comes from the emulsion.</h2>
        </div>
        <p>Egg, finely grated cheese, rendered pork fat, starchy pasta water, and controlled heat create the creamy texture. Cream is not required for the sauce to feel rich or smooth.</p>
      </section>

      <section className="section soft-knowledge" id="rescue">
        <div className="container">
          <div className="section-heading">
            <p className="eyebrow">Chef Gringo rescue</p>
            <h2>Something went wrong? Fix the cause.</h2>
          </div>
          <div className="carbonara-rescue-grid">
            {rescueCards.map((card) => (
              <article key={card.title}>
                <h3>{card.title}</h3>
                <p><strong>Why:</strong> {card.reason}</p>
                <p><strong>Next time:</strong> {card.fix}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section container" id="guidance">
        <div className="section-heading">
          <p className="eyebrow">Choose your guidance mode</p>
          <h2>Same recipe. Different level of detail.</h2>
        </div>
        <div className="mode-selector" role="group" aria-label="Guidance mode">
          {(Object.keys(modeCopy) as GuidanceMode[]).map((key) => (
            <button type="button" aria-pressed={mode === key} onClick={() => changeMode(key)} key={key}>{modeCopy[key].label}</button>
          ))}
        </div>
        <div className="guidance-panel" aria-live="polite">
          <div><span className="entity-badge">{modeCopy[mode].label}</span><h3>{modeCopy[mode].intro}</h3></div>
          <ol>{modeCopy[mode].workflow.map((step) => <li key={step}>{step}</li>)}</ol>
          <p className="control-note"><strong>Chef note:</strong> {modeCopy[mode].caution}</p>
        </div>
      </section>

      <section className="section container carbonara-finish">
        <p className="eyebrow">You’re ready</p>
        <h2>Make it. Eat it immediately.</h2>
        <p className="lede">Carbonara is at its best the moment the sauce becomes glossy. Plate fast, finish with Pecorino and black pepper, and serve.</p>
        <div className="button-row">
          <button className="button" type="button" onClick={() => window.print()}>Print recipe</button>
          <Link className="button secondary" href="/#operator-question">Ask Chef Gringo</Link>
          <Link className="button secondary" href="/learn">More from Chef Gringo</Link>
        </div>
      </section>
    </article>
  );
}

function ShoppingList({ servings, groups, onClose }: { servings: number; groups: ReturnType<typeof buildShoppingList>; onClose: () => void }) {
  function copyList() {
    const text = groups.flatMap((group) => [
      group.group.toUpperCase(),
      ...group.items.map((item) => `- ${formatMetric(item.scaledQuantity, item.unit)} ${ingredients.find((entity) => entity.id === item.ingredientId)?.title ?? item.ingredientId}`)
    ]).join("\n");
    void navigator.clipboard.writeText(`Carbonara · ${servings} servings\n${text}`);
  }

  return (
    <section className="shopping-list" aria-labelledby="shopping-title">
      <div className="shopping-heading">
        <div><span className="entity-badge">Ready to shop</span><h3 id="shopping-title">Shopping list · {servings} servings</h3></div>
        <button type="button" className="text-button" onClick={onClose}>Close</button>
      </div>
      <div className="shopping-groups">
        {groups.map((group) => (
          <div key={group.group}>
            <h4>{group.group}</h4>
            <ul>{group.items.map((item, index) => <li key={`${item.ingredientId}-${index}`}>{formatMetric(item.scaledQuantity, item.unit)} {ingredients.find((entity) => entity.id === item.ingredientId)?.title}</li>)}</ul>
          </div>
        ))}
      </div>
      <div className="button-row">
        <button type="button" className="button" onClick={copyList}>Copy list</button>
        <button type="button" className="button secondary" onClick={() => window.print()}>Print</button>
      </div>
    </section>
  );
}
