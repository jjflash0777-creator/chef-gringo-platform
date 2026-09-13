import { marketplaceCatalog, type ProductRecord, type WorkflowId } from "./catalog.ts";
import { goalById, categoryById } from "./paths.ts";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  COMMERCIAL_LABELS,
  ENVIRONMENT_LABELS,
  EVIDENCE_LABELS,
  EVIDENCE_STATUS,
  MARKETPLACE_CATEGORIES,
  OPERATING_ENVIRONMENTS,
  PRICE_AVAILABILITY,
  PRICE_LABELS,
  facetsFor,
  type Audience,
  type EvidenceStatus,
  type MarketplaceCategory,
  type OperatingEnvironment,
  type PriceAvailability,
  type ProductFacets,
} from "./taxonomy.ts";
import { COMMERCIAL_LINK_KINDS, type CommercialLinkKind } from "./commercial-links.ts";

export const PAGE_SIZE = 12;
export const OPENING_CARD_LIMIT = 6;
export const FULL_RESET_HREF = "/marketplace";

/** Facets are pure derivations of static records, so they are computed once. */
const FACETS: Map<string, ProductFacets> = new Map(
  marketplaceCatalog.products.map((product) => [product.id, facetsFor(product)]),
);

export function facetsOf(product: ProductRecord): ProductFacets {
  const cached = FACETS.get(product.id);
  if (cached) return cached;
  return facetsFor(product);
}

export type MarketplaceQuery = {
  goal?: string;
  path?: MarketplaceCategory;
  workflow?: WorkflowId;
  view?: "problems";
  all: boolean;
  audience: Audience[];
  environment: OperatingEnvironment[];
  category: MarketplaceCategory[];
  price: PriceAvailability[];
  evidence: EvidenceStatus[];
  commercial: CommercialLinkKind[];
  page: number;
};

export type SearchParams = Record<string, string | string[] | undefined>;

function readList<T extends string>(params: SearchParams, key: string, allowed: readonly T[]): T[] {
  const raw = params[key];
  if (raw === undefined) return [];
  const values = (Array.isArray(raw) ? raw : [raw]).flatMap((value) => value.split(","));
  return values.filter((value): value is T => (allowed as readonly string[]).includes(value));
}

function readOne(params: SearchParams, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value || undefined;
}

export function parseQuery(params: SearchParams): MarketplaceQuery {
  const pageRaw = Number.parseInt(readOne(params, "page") ?? "1", 10);
  const path = readOne(params, "path");
  const workflow = readOne(params, "workflow");
  const view = readOne(params, "view");
  return {
    goal: goalById(readOne(params, "goal"))?.id,
    path: categoryById(path)?.id,
    workflow: marketplaceCatalog.workflows.some((item) => item.id === workflow) ? (workflow as WorkflowId) : undefined,
    view: view === "problems" ? "problems" : undefined,
    all: readOne(params, "all") === "1",
    audience: readList(params, "audience", AUDIENCES),
    environment: readList(params, "environment", OPERATING_ENVIRONMENTS),
    category: readList(params, "category", MARKETPLACE_CATEGORIES),
    price: readList(params, "price", PRICE_AVAILABILITY),
    evidence: readList(params, "evidence", EVIDENCE_STATUS),
    commercial: readList(params, "commercial", COMMERCIAL_LINK_KINDS),
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

export function hasContext(query: MarketplaceQuery) {
  return Boolean(query.goal || query.path || query.workflow || query.view);
}

export function hasNarrowingFilters(query: MarketplaceQuery) {
  return Boolean(
    query.audience.length || query.environment.length || query.category.length ||
    query.price.length || query.evidence.length || query.commercial.length,
  );
}

/** True when the reader has asked for anything at all beyond the opening view. */
export function isBrowsing(query: MarketplaceQuery) {
  return hasContext(query) || query.all || hasNarrowingFilters(query);
}

function overlaps<T>(selected: T[], available: T[]) {
  return selected.length === 0 || selected.some((value) => available.includes(value));
}

export function applyQuery(query: MarketplaceQuery): ProductRecord[] {
  const goal = goalById(query.goal);
  const goalQuery = goal?.query;

  return marketplaceCatalog.products.filter((product) => {
    const facets = facetsOf(product);

    if (goalQuery) {
      if (goalQuery.workflows && !goalQuery.workflows.includes(product.workflowId)) return false;
      if (goalQuery.categories && !goalQuery.categories.includes(facets.category)) return false;
      if (goalQuery.environments && !goalQuery.environments.some((value) => facets.operatingEnvironment.includes(value))) return false;
    }

    if (query.path && facets.category !== query.path) return false;
    if (query.workflow && product.workflowId !== query.workflow) return false;
    if (query.category.length && !query.category.includes(facets.category)) return false;
    if (!overlaps(query.audience, facets.audience)) return false;
    if (!overlaps(query.environment, facets.operatingEnvironment)) return false;
    if (query.price.length && !query.price.includes(facets.priceAvailability)) return false;
    if (query.evidence.length && !query.evidence.includes(facets.evidenceStatus)) return false;
    if (query.commercial.length && !query.commercial.includes(facets.commercialLinkStatus)) return false;
    return true;
  });
}

export function paginate(products: ProductRecord[], page: number) {
  const pageCount = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * PAGE_SIZE;
  return { items: products.slice(start, start + PAGE_SIZE), page: current, pageCount, total: products.length, start };
}

/** Which page a given product lands on, so a deep link can jump straight to it. */
export function pageOf(products: ProductRecord[], productId: string) {
  const index = products.findIndex((product) => product.id === productId);
  return index < 0 ? null : Math.floor(index / PAGE_SIZE) + 1;
}

export function startingRecommendations() {
  return marketplaceCatalog.products
    .filter((product) => facetsOf(product).recommendationStatus === "publication-ready")
    .sort((a, b) => b.scores.evidenceQuality - a.scores.evidenceQuality)
    .slice(0, OPENING_CARD_LIMIT);
}

// --- URL construction. One helper so links and chips cannot drift apart. ----

const MULTI_KEYS = ["audience", "environment", "category", "price", "evidence", "commercial"] as const;

export function buildHref(query: MarketplaceQuery, overrides: Partial<MarketplaceQuery> = {}) {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (merged.goal) params.set("goal", merged.goal);
  if (merged.path) params.set("path", merged.path);
  if (merged.workflow) params.set("workflow", merged.workflow);
  if (merged.view) params.set("view", merged.view);
  if (merged.all && !hasContext(merged)) params.set("all", "1");
  for (const key of MULTI_KEYS) {
    const values = merged[key];
    if (values.length) params.set(key, values.join(","));
  }
  if (merged.page > 1) params.set("page", String(merged.page));
  const search = params.toString();
  if (search) return `/marketplace?${search}`;
  // Browse-all with no remaining constraints stays on the catalogue, not the opening view.
  if (merged.all && !hasContext(merged)) return "/marketplace?all=1";
  return FULL_RESET_HREF;
}

/** Drop audience/environment/price/evidence/commercial/category; keep goal, path, workflow, view. */
export function clearFiltersHref(query: MarketplaceQuery) {
  return buildHref(query, {
    audience: [],
    environment: [],
    category: [],
    price: [],
    evidence: [],
    commercial: [],
    page: 1,
  });
}

export type ActiveFilter = { key: string; label: string; group: string; removeHref: string };

/** The chips a reader can see and dismiss. Every active narrowing appears here. */
export function activeFilters(query: MarketplaceQuery): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  const reset = { page: 1 };

  if (query.goal) {
    const goal = goalById(query.goal);
    if (goal) chips.push({ key: `goal:${goal.id}`, group: "Goal", label: goal.label, removeHref: buildHref(query, { goal: undefined, ...reset }) });
  }
  if (query.path) {
    chips.push({ key: `path:${query.path}`, group: "Path", label: CATEGORY_LABELS[query.path], removeHref: buildHref(query, { path: undefined, all: true, ...reset }) });
  }
  if (query.workflow) {
    const workflow = marketplaceCatalog.workflows.find((item) => item.id === query.workflow);
    if (workflow) {
      chips.push({
        key: `workflow:${workflow.id}`,
        group: "Problem",
        label: workflow.title,
        removeHref: buildHref(query, { workflow: undefined, view: "problems", ...reset }),
      });
    }
  }
  if (query.view && !query.workflow) {
    chips.push({ key: "view:problems", group: "Path", label: "Solve a problem", removeHref: buildHref(query, { view: undefined, all: true, ...reset }) });
  }

  const groups = [
    { key: "category" as const, group: "Category", labels: CATEGORY_LABELS as Record<string, string> },
    { key: "audience" as const, group: "Intended user", labels: AUDIENCE_LABELS as Record<string, string> },
    { key: "environment" as const, group: "Environment", labels: ENVIRONMENT_LABELS as Record<string, string> },
    { key: "price" as const, group: "Price", labels: PRICE_LABELS as Record<string, string> },
    { key: "evidence" as const, group: "Evidence", labels: EVIDENCE_LABELS as Record<string, string> },
    { key: "commercial" as const, group: "Commercial", labels: COMMERCIAL_LABELS as Record<string, string> },
  ];

  for (const { key, group, labels } of groups) {
    for (const value of query[key]) {
      const remaining = (query[key] as string[]).filter((item) => item !== value);
      chips.push({
        key: `${key}:${value}`,
        group,
        label: labels[value] ?? value,
        removeHref: buildHref(query, { [key]: remaining, ...reset } as Partial<MarketplaceQuery>),
      });
    }
  }

  return chips;
}

/**
 * Option counts for the filter form, computed against everything the current
 * query already selected EXCEPT the group being counted. That way a reader can
 * see what widening a group would actually get them.
 */
export function optionCounts(query: MarketplaceQuery, group: keyof MarketplaceQuery) {
  const relaxed = { ...query, [group]: [] } as MarketplaceQuery;
  const products = applyQuery(relaxed);
  const counts = new Map<string, number>();
  for (const product of products) {
    const facets = facetsOf(product);
    const values: string[] =
      group === "audience" ? facets.audience :
      group === "environment" ? facets.operatingEnvironment :
      group === "category" ? [facets.category] :
      group === "price" ? [facets.priceAvailability] :
      group === "evidence" ? [facets.evidenceStatus] :
      group === "commercial" ? [facets.commercialLinkStatus] : [];
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export function categoryCounts() {
  const counts = new Map<MarketplaceCategory, number>();
  for (const category of MARKETPLACE_CATEGORIES) counts.set(category, 0);
  for (const product of marketplaceCatalog.products) {
    const category = facetsOf(product).category;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return counts;
}

export function goalCount(goalId: string) {
  return applyQuery({ ...EMPTY_QUERY, goal: goalId }).length;
}

export function workflowCount(workflowId: WorkflowId) {
  return applyQuery({ ...EMPTY_QUERY, workflow: workflowId }).length;
}

export const EMPTY_QUERY: MarketplaceQuery = {
  all: false,
  audience: [],
  environment: [],
  category: [],
  price: [],
  evidence: [],
  commercial: [],
  page: 1,
};

export const BROWSE_ALL_QUERY: MarketplaceQuery = { ...EMPTY_QUERY, all: true };
export const PROBLEMS_QUERY: MarketplaceQuery = { ...EMPTY_QUERY, view: "problems" };
