import Link from "next/link";
import { marketplaceCatalog, type ProductRecord } from "../catalog";
import { facetsOf } from "../query";
import {
  AUDIENCE_LABELS,
  COMMERCIAL_LABELS,
  ENVIRONMENT_LABELS,
  EVIDENCE_LABELS,
  PRICE_LABELS,
} from "../taxonomy";

export const metadata = {
  title: "Compare products | Chef Gringo Marketplace",
  description: "Side-by-side comparison of two to four researched products, using only recorded data.",
};

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 4;

/** Only fields the catalogue actually stores. Anything absent says so. */
const ROWS: { label: string; value: (product: ProductRecord) => string }[] = [
  { label: "Intended use", value: (product) => product.editorial.bestFor },
  {
    label: "Intended user",
    value: (product) => {
      const audience = facetsOf(product).audience;
      return audience.length ? audience.map((value) => AUDIENCE_LABELS[value]).join(", ") : "Not yet verified";
    },
  },
  {
    label: "Operating fit",
    value: (product) => {
      const environments = facetsOf(product).operatingEnvironment;
      return environments.length ? environments.map((value) => ENVIRONMENT_LABELS[value]).join(", ") : "Not yet verified";
    },
  },
  {
    label: "Price availability",
    value: (product) => `${PRICE_LABELS[facetsOf(product).priceAvailability]} — ${product.price.context}`,
  },
  { label: "Evidence level", value: (product) => EVIDENCE_LABELS[facetsOf(product).evidenceStatus] },
  {
    label: "Known strengths",
    value: (product) => (product.editorial.strengths.length ? product.editorial.strengths.join(" · ") : "Not yet verified"),
  },
  {
    label: "Known limitations",
    value: (product) => {
      const limitations = [product.editorial.tradeoff, ...product.limitations].filter(Boolean);
      return limitations.length ? limitations.join(" · ") : "Not yet verified";
    },
  },
  { label: "Commercial status", value: (product) => COMMERCIAL_LABELS[facetsOf(product).commercialLinkStatus] },
];

function readIds(raw: string | string[] | undefined) {
  if (!raw) return [];
  const values = (Array.isArray(raw) ? raw : [raw]).flatMap((value) => value.split(","));
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export default async function ComparePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const requested = readIds(params.ids);
  const found = requested
    .map((id) => marketplaceCatalog.products.find((product) => product.id === id))
    .filter((product): product is ProductRecord => Boolean(product));
  const missing = requested.filter((id) => !marketplaceCatalog.products.some((product) => product.id === id));
  const products = found.slice(0, MAX_COMPARE);

  return (
    <section className="section container cg-compare" aria-labelledby="compare-title">
      <p className="eyebrow"><Link href="/marketplace?all=1">← Back to the catalogue</Link></p>
      <h1 id="compare-title">Compare products</h1>

      {missing.length > 0 && (
        <p className="cg-caveat" role="status">
          <strong>Not found:</strong> {missing.join(", ")}. {missing.length === 1 ? "That id is not" : "Those ids are not"} in the researched catalogue.
        </p>
      )}

      {products.length < MIN_COMPARE ? (
        <div className="cg-empty" role="status">
          <h2>Choose {MIN_COMPARE} to {MAX_COMPARE} products</h2>
          <p>
            Comparison needs at least {MIN_COMPARE} products and shows at most {MAX_COMPARE}. Select them with the
            checkboxes in the catalogue, then choose &ldquo;Compare selected&rdquo;.
          </p>
          <p className="cg-empty-actions">
            <Link className="cg-product-action" href="/marketplace?all=1">Browse the catalogue</Link>
          </p>
        </div>
      ) : (
        <>
          {found.length > MAX_COMPARE && (
            <p className="cg-caveat" role="status">
              <strong>Showing the first {MAX_COMPARE}.</strong> {found.length} products were selected; comparison is
              capped at {MAX_COMPARE} so the table stays readable.
            </p>
          )}
          <p className="cg-result-range">
            Comparing {products.length} products on {ROWS.length} recorded fields. Anything Chef Gringo has not
            established reads &ldquo;Not yet verified&rdquo; rather than being filled in.
          </p>
          <p className="cg-compare-hint">Scroll sideways to compare every recorded field. Columns are not hidden.</p>
          <div className="cg-compare-scroll">
            <table className="cg-compare-table">
              <caption className="cg-visually-hidden">Product comparison across recorded fields</caption>
              <thead>
                <tr>
                  <th scope="col">Field</th>
                  {products.map((product) => (
                    <th scope="col" key={product.id}>
                      <Link href={`/marketplace/products/${product.id}`}>{product.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {products.map((product) => <td key={product.id}>{row.value(product)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
