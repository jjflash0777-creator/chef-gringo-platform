"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { trackEvent } from "../../components/AnalyticsBridge";
import { groupResults, localSearchAdapter, type SearchResult } from "../search/search";
import type { EntityType } from "../domain/types";

const examples = [
  "Carbonara", "Beef Wellington", "How do I stop eggs from scrambling in carbonara?",
  "Dinner for 50 guests", "Gluten-free catering", "Knife skills", "Espresso extraction",
];

const labels: Record<EntityType, string> = {
  dish: "Dishes", recipe: "Recipes", ingredient: "Ingredients", technique: "Techniques",
  cuisine: "Cuisines", chef_interpretation: "Chef interpretations", restaurant: "Restaurants",
  equipment: "Equipment", dietary_consideration: "Dietary considerations",
  nutrition_topic: "Nutrition topics", supplier: "Suppliers", learning_path: "Learning paths",
  hospitality_role: "Hospitality roles", workflow: "Workflows",
};

export function KnowledgeSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) void runSearch(initial);
  }, []);

  async function runSearch(value: string) {
    const clean = value.trim();
    setQuery(value);
    if (!clean) {
      setResults(null);
      return;
    }
    setLoading(true);
    const next = await localSearchAdapter.search(clean);
    setResults(next);
    setLoading(false);
    trackEvent("knowledge_search_submitted", { query: clean, resultCount: next.length, adapter: "curated-local" });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(String(new FormData(event.currentTarget).get("query") || ""));
  }

  const groups = results ? groupResults(results) : {};
  return (
    <section className="container discover-shell" aria-labelledby="knowledge-search-title">
      <form className="knowledge-search" onSubmit={submit} role="search">
        <label id="knowledge-search-title" htmlFor="knowledge-query">What do you want to understand?</label>
        <div className="search-row">
          <input
            id="knowledge-query"
            name="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void runSearch(event.currentTarget.value);
              }
            }}
            placeholder="Try “Carbonara” or ask a kitchen question…"
            autoComplete="off"
          />
          <button className="button" type="submit">Search knowledge</button>
        </div>
        <p className="search-boundary">Phase 1 searches curated Chef Gringo entities locally. No AI provider or external tracking is required.</p>
      </form>

      <div className="example-searches" aria-label="Example searches">
        <span>Try:</span>
        {examples.map((example) => <button type="button" key={example} onClick={() => void runSearch(example)}>{example}</button>)}
      </div>

      <div className="search-results" aria-live="polite" aria-busy={loading}>
        {loading && <div className="search-state"><strong>Connecting the knowledge…</strong></div>}
        {!loading && results === null && <div className="search-state"><strong>Start with a dish or question.</strong><p>The seeded prototype is deepest around Carbonara.</p></div>}
        {!loading && results?.length === 0 && <div className="search-state"><strong>No curated result yet.</strong><p>This prototype does not invent an answer. Try Carbonara, eggs, emulsification, pasta water, or Roman cuisine.</p></div>}
        {!loading && results && results.length > 0 && (
          <div>
            <div className="result-summary"><strong>{results.length} connected result{results.length === 1 ? "" : "s"}</strong><span>Curated local index</span></div>
            {Object.entries(groups).map(([type, items]) => items?.length ? (
              <section className="result-group" key={type}>
                <h2>{labels[type as EntityType]}</h2>
                <div className="knowledge-result-grid">
                  {items.map(({ entity, matchedTerms }) => {
                    const href = entity.id === "dish:carbonara" || entity.id === "recipe:chef-gringo-carbonara"
                      ? "/knowledge/dishes/carbonara"
                      : null;
                    const body = (
                      <>
                        <EntityBadge type={entity.entityType} />
                        <h3>{entity.title}</h3>
                        <p>{entity.summary}</p>
                        <span className="match-note">Matched: {matchedTerms.join(", ")}</span>
                        {!href && <span className="match-note">No dedicated page yet — this is a curated summary, not a loop back into search.</span>}
                      </>
                    );
                    return href
                      ? <Link className="knowledge-result-card" href={href} key={entity.id} onClick={() => trackEvent("knowledge_result_selected", { entityId: entity.id, entityType: entity.entityType })}>{body}</Link>
                      : <article className="knowledge-result-card" key={entity.id}>{body}</article>;
                  })}
                </div>
              </section>
            ) : null)}
          </div>
        )}
      </div>
    </section>
  );
}

function EntityBadge({ type }: { type: EntityType }) {
  return <span className="entity-badge">{type.replaceAll("_", " ")}</span>;
}
