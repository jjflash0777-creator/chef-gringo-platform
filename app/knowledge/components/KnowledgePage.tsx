"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../../components/AnalyticsBridge";
import { carbonara, carbonaraRecipe, cuisine, dietary, equipment, ingredients, interpretations, techniques } from "../domain/seed";
import { buildShoppingList, formatMetric, scaleRecipe } from "../domain/recipe";
import type { GuidanceMode } from "../domain/types";

const modeCopy: Record<GuidanceMode, { label: string; intro: string; workflow: string[]; caution: string }> = {
  beginner: {
    label: "Beginner",
    intro: "Carbonara is an off-heat egg sauce, not scrambled eggs mixed with pasta. Your most important skill is controlling residual heat.",
    workflow: ["Prepare every ingredient before boiling pasta.", "Take the pan off the burner before eggs enter.", "Toss continuously and add pasta water one spoonful at a time.", "Look for a glossy sauce that moves—not a stiff coating."],
    caution: "Confidence cue: if the pan is loudly sizzling when the egg mixture goes in, pause and let it cool.",
  },
  home: {
    label: "Home Cook",
    intro: "Use a bowl or wide pan to balance speed and control. Guanciale is distinctive, but pancetta is a practical, clearly labeled interpretation.",
    workflow: ["Whisk the sauce while the guanciale renders.", "Cook pasta just shy of done so it can finish while tossing.", "Reserve more pasta water than you think you need.", "Warm serving bowls and eat immediately."],
    caution: "Household workflow: recruit diners before finishing—the sauce waits for nobody.",
  },
  professional: {
    label: "Professional",
    intro: "Treat carbonara as an à la minute emulsion with a narrow pickup window. Scale mise en place, not only ingredient quantities.",
    workflow: ["Portion pasta, guanciale, egg-cheese base, and finishing cheese by station.", "Render guanciale in controlled batches; hold fat and crisp solids separately.", "Cook and finish in small pickups sized to pan capacity.", "Track pasta-water salinity, pan temperature, pickup time, and immediate handoff."],
    caution: "Critical control: large-volume multiplication is not a service plan. Establish batch size, safe egg handling, hot-holding limits, and a defined discard window.",
  },
};

const troubleshooting = [
  ["Why did my eggs scramble?", "The mixture met too much direct heat. Remove the pan from the burner, let the pasta stop sizzling, and combine while tossing continuously."],
  ["Why is the sauce dry?", "It cooled or tightened without enough pasta water. Add warm starchy water in small increments while tossing."],
  ["Why is the sauce watery?", "Too much water arrived before the emulsion formed. Keep tossing off heat; add finely grated cheese gradually if needed."],
  ["Can I use bacon?", "You can make a bacon interpretation, but smoke and sweetness change the dish. Guanciale or pancetta produces a closer cured-pork profile."],
  ["Should carbonara contain cream?", "Many contemporary Roman conventions exclude cream. Other versions use it. Label the approach honestly rather than turning authenticity into a certainty contest."],
  ["How do I hold it for service?", "Carbonara degrades quickly when held. Professionals should stage mise en place and finish small batches à la minute instead of hot-holding the completed dish."],
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
    <article className="knowledge-page">
      <header className="knowledge-hero">
        <div className="container knowledge-hero-grid">
          <div>
            <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/discover">Discover</Link> / Carbonara</p>
            <div className="identity-row"><span className="verification-badge">Source-ready prototype</span><span>Dish knowledge page</span></div>
            <h1>{carbonara.title}</h1>
            <p className="lede">{carbonara.summary}</p>
            <dl className="identity-facts">
              <div><dt>Cuisine</dt><dd>{cuisine.title}</dd></div><div><dt>Origin</dt><dd>{carbonara.origin}</dd></div>
              <div><dt>Difficulty</dt><dd>{carbonara.difficulty}</dd></div><div><dt>Time</dt><dd>{carbonara.estimatedMinutes} minutes</dd></div>
            </dl>
          </div>
          <div className="knowledge-orbit" aria-label="Carbonara’s connected knowledge">
            <strong>Carbonara</strong>
            <span>5 ingredients</span><span>5 techniques</span><span>2 interpretations</span><span>1 cuisine</span>
          </div>
        </div>
      </header>

      <nav className="knowledge-subnav" aria-label="Carbonara page sections">
        <div className="container"><a href="#guidance">Guidance</a><a href="#history">Story</a><a href="#recipe">Recipe</a><a href="#troubleshooting">Troubleshooting</a><a href="#connections">Connections</a></div>
      </nav>

      <section className="section container" id="guidance">
        <div className="section-heading"><p className="eyebrow">Choose your guidance mode</p><h2>Same dish. Different working context.</h2></div>
        <div className="mode-selector" role="group" aria-label="Guidance mode">
          {(Object.keys(modeCopy) as GuidanceMode[]).map((key) => <button type="button" aria-pressed={mode === key} onClick={() => changeMode(key)} key={key}>{modeCopy[key].label}</button>)}
        </div>
        <div className="guidance-panel" aria-live="polite">
          <div><span className="entity-badge">{modeCopy[mode].label} guidance</span><h3>{modeCopy[mode].intro}</h3></div>
          <ol>{modeCopy[mode].workflow.map((step) => <li key={step}>{step}</li>)}</ol>
          <p className="control-note"><strong>Watch for:</strong> {modeCopy[mode].caution}</p>
        </div>
      </section>

      <section className="section story-band" id="history">
        <div className="container story-grid">
          <div><p className="eyebrow light">Overview and history</p><h2>A Roman icon with a debated origin story.</h2></div>
          <div><p>Carbonara is strongly associated with Rome, but tidy origin stories often outrun the evidence. Accounts connect it to charcoal workers, postwar ingredients, American service members, and the evolution of Roman pasta cooking.</p><p>{carbonara.authenticityNote}</p><SourceAttribution /></div>
        </div>
      </section>

      <section className="section container" id="recipe">
        <div className="recipe-heading"><div><p className="eyebrow">Original Chef Gringo reference recipe</p><h2>Build the emulsion, not a mythology.</h2><p>{carbonaraRecipe.summary}</p></div><div className="yield-control"><label htmlFor="servings">Servings</label><input id="servings" type="number" min="1" max="100" value={servings} onChange={(event) => changeServings(Number(event.target.value))} /><span>Base yield: {carbonaraRecipe.baseYield}</span></div></div>
        {servings > 12 && <aside className="production-warning"><strong>Production judgment required.</strong> Above 12 servings, plan multiple pickups around pan capacity, egg safety, and immediate service. The quantities scale; the workflow does not scale linearly.</aside>}
        <div className="knowledge-recipe-grid">
          <div><h3>Scaled ingredients · {servings} servings</h3><ul className="ingredient-list">{scaled.map((item, index) => {
            const entity = ingredients.find((ingredient) => ingredient.id === item.ingredientId);
            return <li key={`${item.ingredientId}-${index}`}><span><strong>{formatMetric(item.scaledQuantity, item.unit)}</strong>{entity?.title}</span>{item.scaleNote && <small>{item.scaleNote}</small>}</li>;
          })}</ul>
          <button className="button secondary" type="button" onClick={() => { setShoppingOpen(true); trackEvent("shopping_list_generated", { servings }); }}>Generate shopping list</button></div>
          <div><h3>Production sequence</h3><ol className="recipe-steps">{carbonaraRecipe.steps.map((step) => <li key={step.id}><span>{step.minutes ? `${step.minutes} min` : "Next"}</span><div><strong>{step.title}</strong><p>{step.instruction}</p>{step.criticalControl && <small><b>Control:</b> {step.criticalControl}</small>}</div></li>)}</ol></div>
        </div>
        {shoppingOpen && <ShoppingList servings={servings} groups={shopping} onClose={() => setShoppingOpen(false)} />}
      </section>

      <section className="section soft-knowledge" id="troubleshooting">
        <div className="container"><div className="section-heading"><p className="eyebrow">Troubleshooting</p><h2>Diagnose the sauce, not yourself.</h2></div>
          <div className="troubleshooting-list">{troubleshooting.map(([question, answer]) => <details key={question} onToggle={(event) => { if (event.currentTarget.open) trackEvent("troubleshooting_opened", { question }); }}><summary>{question}</summary><p>{answer}</p></details>)}</div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading"><p className="eyebrow">Attributed interpretations</p><h2>Different approaches, summarized—not copied.</h2><p>These cards describe distinguishing ideas in original language. They are not complete third-party recipes.</p></div>
        <div className="interpretation-grid">{interpretations.map((item) => <article key={item.id}><span className="entity-badge">Attributed summary</span><h3>{item.title}</h3><p>{item.summary}</p><strong>{item.distinguishingApproach}</strong><small>{item.sources[0].label}</small></article>)}</div>
      </section>

      <section className="section connections-section" id="connections">
        <div className="container"><div className="section-heading"><p className="eyebrow light">Connected knowledge</p><h2>Follow the dish into the craft.</h2></div>
          <RelationshipGroup title="Ingredients" items={ingredients} />
          <RelationshipGroup title="Techniques" items={techniques} />
          <RelationshipGroup title="Equipment & context" items={[...equipment, cuisine, dietary]} />
        </div>
      </section>

      <section className="section container ask-section">
        <div>
          <p className="eyebrow">Ask Chef Gringo</p>
          <h2>Same chef, one conversation.</h2>
          <p>Technique notes on this page stay curated. Questions that need judgment go to the canonical Ask Chef Gringo intake — not a second assistant.</p>
        </div>
        <p><Link className="button" href="/#operator-question">Ask Chef Gringo</Link> · <Link href="/cut-intelligence">Cut Intelligence preview</Link> · <Link href="/learn">All learning</Link></p>
        <ul className="ask-local-notes">
          {troubleshooting.map(([prompt, answer]) => (
            <li key={prompt}><strong>{prompt}</strong> {answer}</li>
          ))}
        </ul>
      </section>

      <section className="container contextual-disclosure"><strong>Knowledge boundary:</strong> History claims require careful sourcing; nutrition and dietary content is educational; third-party approaches are attributed summaries; restaurant and retailer availability can change; large-production scaling requires professional judgment.</section>
    </article>
  );
}

function RelationshipGroup({ title, items }: { title: string; items: Array<{ id: string; title: string; summary: string; entityType: string }> }) {
  return (
    <section className="relationship-group">
      <h3>{title}</h3>
      <div className="relationship-grid">
        {items.map((item) => (
          <article key={item.id}>
            <span className="entity-badge">{item.entityType.replaceAll("_", " ")}</span>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
            <small>No dedicated page yet.</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function SourceAttribution() {
  return <aside className="source-attribution"><span className="verification-badge">Source-ready</span><p>Historical framing is original editorial copy with a citation structure prepared for final review. Debated claims are labeled rather than presented as settled fact.</p></aside>;
}

function ShoppingList({ servings, groups, onClose }: { servings: number; groups: ReturnType<typeof buildShoppingList>; onClose: () => void }) {
  function copyList() {
    const text = groups.flatMap((group) => [group.group.toUpperCase(), ...group.items.map((item) => `- ${formatMetric(item.scaledQuantity, item.unit)} ${ingredients.find((entity) => entity.id === item.ingredientId)?.title ?? item.ingredientId}`)]).join("\n");
    void navigator.clipboard.writeText(`Carbonara · ${servings} servings\n${text}`);
  }
  return <section className="shopping-list" aria-labelledby="shopping-title"><div className="shopping-heading"><div><span className="entity-badge">Generated locally</span><h3 id="shopping-title">Shopping list · {servings} servings</h3></div><button type="button" className="text-button" onClick={onClose}>Close</button></div><div className="shopping-groups">{groups.map((group) => <div key={group.group}><h4>{group.group}</h4><ul>{group.items.map((item, index) => <li key={`${item.ingredientId}-${index}`}>{formatMetric(item.scaledQuantity, item.unit)} {ingredients.find((entity) => entity.id === item.ingredientId)?.title}</li>)}</ul></div>)}</div><div className="button-row"><button type="button" className="button" onClick={copyList}>Copy list</button><button type="button" className="button secondary" onClick={() => window.print()}>Print</button></div><p className="search-boundary">Retailer availability, local pricing, ordering, and affiliate partners are future integrations.</p></section>;
}
