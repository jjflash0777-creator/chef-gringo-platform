import Link from "next/link";
import {
  activeFilters,
  clearFiltersHref,
  hasNarrowingFilters,
  optionCounts,
  FULL_RESET_HREF,
  type MarketplaceQuery,
} from "../query.ts";
import {
  CATEGORY_LABELS,
  COMMERCIAL_LABELS,
  ENVIRONMENT_LABELS,
  EVIDENCE_LABELS,
  EVIDENCE_STATUS,
  FILTER_AUDIENCES,
  FOOD_TRUCK_FILTER_NOTE,
  AUDIENCE_LABELS,
  MARKETPLACE_CATEGORIES,
  OPERATING_ENVIRONMENTS,
  PRICE_AVAILABILITY,
  PRICE_LABELS,
} from "../taxonomy.ts";
import { FormCheckbox } from "./FormCheckbox.tsx";
import { COMMERCIAL_LINK_KINDS } from "../commercial-links.ts";

type Group = {
  key: keyof MarketplaceQuery;
  legend: string;
  values: readonly string[];
  labels: Record<string, string>;
};

/**
 * A plain GET form. No JavaScript is required to filter, which keeps the
 * controls keyboard accessible by default and puts the whole result state in
 * the URL. Checkbox groups submit as repeated keys; parseQuery accepts both
 * repeated keys and comma-joined values.
 */
export function MarketplaceFilters({ query, total }: { query: MarketplaceQuery; total: number }) {
  const chips = activeFilters(query);
  const groups: Group[] = [
    ...(!query.path ? [{ key: "category" as const, legend: "Category", values: MARKETPLACE_CATEGORIES, labels: CATEGORY_LABELS as Record<string, string> }] : []),
    { key: "audience", legend: "Intended user", values: FILTER_AUDIENCES, labels: AUDIENCE_LABELS },
    { key: "environment", legend: "Operating environment", values: OPERATING_ENVIRONMENTS, labels: ENVIRONMENT_LABELS },
    { key: "price", legend: "Price availability", values: PRICE_AVAILABILITY, labels: PRICE_LABELS },
    { key: "evidence", legend: "Evidence strength", values: EVIDENCE_STATUS, labels: EVIDENCE_LABELS },
    { key: "commercial", legend: "Commercial relationship", values: COMMERCIAL_LINK_KINDS, labels: COMMERCIAL_LABELS },
  ];

  return (
    <section className="cg-filters" aria-labelledby="filters-title">
      <div className="cg-filters-head">
        <h2 id="filters-title">Narrow these results</h2>
        <p role="status" aria-live="polite" className="cg-result-count">
          {total} {total === 1 ? "product" : "products"} match
        </p>
      </div>

      {chips.length > 0 && (
        <div className="cg-active-filters">
          <h3 className="cg-visually-hidden">Active filters</h3>
          <ul>
            {chips.map((chip) => (
              <li key={chip.key}>
                <Link href={chip.removeHref} className="cg-filter-chip">
                  <span className="cg-chip-group">{chip.group}:</span> {chip.label}
                  <span aria-hidden="true"> ×</span>
                  <span className="cg-visually-hidden"> — remove this filter</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="cg-filter-reset-row">
            {hasNarrowingFilters(query) && (
              <Link href={clearFiltersHref(query)} className="cg-filter-reset">Clear filters</Link>
            )}
            <Link href={FULL_RESET_HREF} className="cg-filter-reset">Start over</Link>
          </div>
        </div>
      )}

      <form method="get" action="/marketplace" className="cg-filter-form">
        {query.goal && <input type="hidden" name="goal" value={query.goal} />}
        {query.path && <input type="hidden" name="path" value={query.path} />}
        {query.workflow && <input type="hidden" name="workflow" value={query.workflow} />}
        {query.view && <input type="hidden" name="view" value={query.view} />}
        {query.all && !query.goal && !query.path && !query.workflow && !query.view && <input type="hidden" name="all" value="1" />}

        <div className="cg-filter-groups">
          {groups.map((group) => {
            const counts = optionCounts(query, group.key);
            const selected = query[group.key] as string[];
            return (
              <fieldset key={String(group.key)}>
                <legend>{group.legend}</legend>
                {group.values.map((value) => {
                  const count = counts.get(value) ?? 0;
                  const checked = selected.includes(value);
                  if (count === 0 && !checked) return null;
                  return (
                    <label key={value}>
                      <FormCheckbox name={String(group.key)} value={value} defaultChecked={checked} />
                      <span>{group.labels[value]}</span>
                      <small>({count})</small>
                    </label>
                  );
                })}
                {group.key === "audience" && (
                  <p className="cg-filter-note">{FOOD_TRUCK_FILTER_NOTE}</p>
                )}
              </fieldset>
            );
          })}
        </div>

        <div className="cg-filter-actions">
          <button type="submit" className="cg-filter-apply">Apply filters</button>
          {hasNarrowingFilters(query) && <Link href={clearFiltersHref(query)} className="cg-filter-reset">Clear filters</Link>}
          <Link href={FULL_RESET_HREF} className="cg-filter-reset">Start over</Link>
        </div>
      </form>
    </section>
  );
}
