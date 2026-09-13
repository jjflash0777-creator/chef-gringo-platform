import Link from "next/link";
import { AffiliateDisclosure } from "../components/AffiliateDisclosure";
import { marketplaceCatalog } from "./catalog";
import { ProductCard } from "./components/ProductCard";
import { MarketplaceFilters } from "./components/MarketplaceFilters";
import { TrustDisclosure } from "./components/TrustDisclosure";
import { FragmentRouter } from "./components/FragmentRouter";
import { CATEGORY_DEFINITIONS, GOALS, categoryById, goalById } from "./paths";
import {
  BROWSE_ALL_QUERY,
  EMPTY_QUERY,
  PROBLEMS_QUERY,
  applyQuery,
  buildHref,
  categoryCounts,
  goalCount,
  isBrowsing,
  paginate,
  parseQuery,
  startingRecommendations,
  workflowCount,
  type SearchParams,
} from "./query";

export const metadata = {
  title: "Marketplace | Decision support for working kitchens",
  description:
    "Problem-led, evidence-backed equipment, software, and food-safety recommendations for home cooks, restaurants, caterers, healthcare dining, and independent hospitality operators.",
  openGraph: { title: "Chef Gringo Marketplace", description: "Buy for the work, not the hype.", images: [{ url: "/og-marketplace.png", width: 1536, height: 908, alt: "Chef Gringo Marketplace" }] },
  twitter: { card: "summary_large_image", images: ["/og-marketplace.png"] },
};

export default async function MarketplacePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const query = parseQuery(params);
  const browsing = isBrowsing(query);

  return (
    <>
      <FragmentRouter productIds={marketplaceCatalog.products.map((product) => product.id)} />
      <section className="cg-marketplace-intro">
        <div className="container">
          <p className="eyebrow">Chef Gringo Marketplace</p>
          <h1>Start with the problem. The product comes second.</h1>
          <p className="cg-marketplace-lede">
            {marketplaceCatalog.products.length} researched candidates for home cooks, food trucks, restaurants,
            caterers, healthcare and senior dining, and independent operators. Every record shows what is verified,
            what is not, and whether any money changes hands. Checked {marketplaceCatalog.harvest.checkedAt}. No pay-to-rank.
          </p>
          <AffiliateDisclosure id="affiliate-disclosure" />
        </div>
      </section>

      {browsing ? <ResultsView query={query} /> : <OpeningView />}

      <section className="section container" id="how-we-score">
        <TrustDisclosure />
      </section>
    </>
  );
}

function OpeningView() {
  const counts = categoryCounts();
  const starters = startingRecommendations();

  return (
    <>
      <section className="section container" aria-labelledby="goals-title">
        <div className="cg-section-heading">
          <h2 id="goals-title">What are you trying to accomplish?</h2>
          <p>Pick a goal and Chef Gringo narrows the catalogue to the records that apply.</p>
        </div>
        <ul className="cg-goal-grid">
          {GOALS.map((goal) => {
            const count = goal.query ? goalCount(goal.id) : null;
            const href = goal.destination?.href ?? buildHref({ ...EMPTY_QUERY, goal: goal.id });
            return (
              <li key={goal.id}>
                <Link href={href} className="cg-goal" data-empty={count === 0 ? "true" : undefined}>
                  <strong>{goal.label}</strong>
                  <span>{goal.description}</span>
                  <small>
                    {goal.destination ? goal.destination.label : count === 0 ? "Nothing researched yet" : `${count} researched ${count === 1 ? "record" : "records"}`}
                  </small>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="section container" aria-labelledby="paths-title">
        <div className="cg-section-heading">
          <h2 id="paths-title">Or browse by path</h2>
          <p>Counts are real. Where a shelf is empty, it says so instead of borrowing products from elsewhere.</p>
        </div>
        <ul className="cg-path-grid">
          <li>
            <Link href={buildHref(PROBLEMS_QUERY)} className="cg-path">
              <strong>Solve a problem</strong>
              <span>Start from the operational problem the research workflows were built around, then pick a product.</span>
              <small>{marketplaceCatalog.workflows.length} problem routes</small>
            </Link>
          </li>
          {CATEGORY_DEFINITIONS.map((category) => {
            const count = counts.get(category.id) ?? 0;
            return (
              <li key={category.id}>
                <Link
                  href={buildHref({ ...EMPTY_QUERY, path: category.id })}
                  className="cg-path"
                  data-empty={count === 0 ? "true" : undefined}
                >
                  <strong>{category.label}</strong>
                  <span>{category.blurb}</span>
                  <small>{count === 0 ? "Nothing researched yet" : `${count} ${count === 1 ? "product" : "products"}`}</small>
                </Link>
              </li>
            );
          })}
          <li>
            <Link href={buildHref(BROWSE_ALL_QUERY)} className="cg-path cg-path-all">
              <strong>Browse everything</strong>
              <span>Every researched record, filterable by category, user, environment, price, evidence, and commercial status.</span>
              <small>{marketplaceCatalog.products.length} products</small>
            </Link>
          </li>
        </ul>
      </section>

      <section className="section container" aria-labelledby="starters-title">
        <div className="cg-section-heading">
          <h2 id="starters-title">Where most people start</h2>
          <p>
            The records that have completed publication review, ordered by evidence quality. Not the most profitable —
            no product on this page earns Chef Gringo anything today.
          </p>
        </div>
        <div className="cg-product-grid">
          {starters.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </>
  );
}

function ResultsView({ query }: { query: ReturnType<typeof parseQuery> }) {
  if (query.view === "problems" && !query.workflow) {
    return <ProblemsView />;
  }

  const matches = applyQuery(query);
  const { items, page, pageCount, total, start } = paginate(matches, query.page);
  const goal = goalById(query.goal);
  const category = categoryById(query.path);
  const workflow = marketplaceCatalog.workflows.find((item) => item.id === query.workflow);

  const heading = goal?.label ?? category?.label ?? workflow?.title ?? (query.view === "problems" ? "Solve a problem" : "Every researched record");
  const caveat = goal?.caveat;
  const emptyReason = category?.emptyReason;

  return (
    <section className="section container cg-results" aria-labelledby="results-title">
      <div className="cg-section-heading">
        <p className="eyebrow"><Link href="/marketplace">← All paths</Link></p>
        <h2 id="results-title">{heading}</h2>
        {goal?.description && <p>{goal.description}</p>}
        {category?.blurb && !goal && <p>{category.blurb}</p>}
        {workflow && <p>{workflow.summary}</p>}
      </div>

      {caveat && <p className="cg-caveat"><strong>Worth knowing:</strong> {caveat}</p>}

      <MarketplaceFilters query={query} total={total} />

      {total === 0 ? (
        <div className="cg-empty" role="status">
          <h3>No products match</h3>
          {emptyReason ? <p>{emptyReason}</p> : (
            <p>
              Nothing in the researched catalogue matches every filter at once. Remove a filter above to widen the
              search, or start over from all paths.
            </p>
          )}
          <p className="cg-empty-actions">
            <Link className="cg-product-action" href={buildHref(BROWSE_ALL_QUERY)}>Browse all {marketplaceCatalog.products.length} products</Link>
            <Link className="cg-text-action" href="/marketplace">Back to all paths</Link>
          </p>
        </div>
      ) : (
        <>
          <p className="cg-result-range">
            Showing {start + 1}–{start + items.length} of {total}
          </p>
          <form method="get" action="/marketplace/compare" className="cg-compare-form">
            <div className="cg-product-grid">
              {items.map((product) => <ProductCard key={product.id} product={product} selectable />)}
            </div>
            <div className="cg-compare-bar">
              <button type="submit" className="cg-product-action">Compare selected</button>
              <span>Tick 2–4 products above to see them side by side.</span>
            </div>
          </form>
          {pageCount > 1 && (
            <nav className="cg-pagination" aria-label="Result pages">
              {page > 1
                ? <Link href={buildHref(query, { page: page - 1 })} rel="prev">← Previous</Link>
                : <span aria-hidden="true">← Previous</span>}
              <span className="cg-page-status" aria-current="page">Page {page} of {pageCount}</span>
              {page < pageCount
                ? <Link href={buildHref(query, { page: page + 1 })} rel="next">Show more →</Link>
                : <span aria-hidden="true">Show more →</span>}
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function ProblemsView() {
  return (
    <section className="section container cg-results" aria-labelledby="results-title">
      <div className="cg-section-heading">
        <p className="eyebrow"><Link href="/marketplace">← All paths</Link></p>
        <h2 id="results-title">Solve a problem</h2>
        <p>These are the operational problems Chef Gringo has researched. Each route opens only the records that belong to it.</p>
      </div>
      <ul className="cg-path-grid">
        {marketplaceCatalog.workflows.map((workflow) => {
          const count = workflowCount(workflow.id);
          return (
            <li key={workflow.id}>
              <Link href={buildHref({ ...EMPTY_QUERY, view: "problems", workflow: workflow.id })} className="cg-path" id={workflow.id}>
                <strong>{workflow.title}</strong>
                <span>{workflow.summary}</span>
                <small>{count} {count === 1 ? "record" : "records"}</small>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
