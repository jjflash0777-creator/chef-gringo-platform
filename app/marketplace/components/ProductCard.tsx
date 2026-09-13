import Link from "next/link";
import { FormCheckbox } from "./FormCheckbox";
import type { ProductRecord } from "../catalog";
import { facetsOf } from "../query.ts";
import {
  AUDIENCE_LABELS,
  COMMERCIAL_LABELS,
  EVIDENCE_LABELS,
  PRICE_LABELS,
} from "../taxonomy.ts";

/**
 * A decision card, not a storefront tile.
 *
 * There is no image frame: no product in the catalogue carries a reuse grant,
 * and an empty grey box pretending to be photography is worse than none. The
 * card leads with typography and a category line instead.
 *
 * Exactly one action leaves the card, and it points at the internal detail
 * page. Outbound merchant links live on the detail page, where the full
 * commercial context sits beside them.
 */
export function ProductCard({ product, selectable = false }: { product: ProductRecord; selectable?: boolean }) {
  const facets = facetsOf(product);
  const audience = facets.audience.slice(0, 3).map((value) => AUDIENCE_LABELS[value]);

  return (
    <article className="cg-product-card" id={product.id} tabIndex={-1} aria-labelledby={`${product.id}-name`}>
      {selectable && (
        <label className="cg-compare-toggle">
          <FormCheckbox name="ids" value={product.id} />
          <span>Compare<span className="cg-visually-hidden"> {product.name}</span></span>
        </label>
      )}
      <p className="cg-product-kicker">{facets.subcategory}</p>
      <h3 className="cg-product-name" id={`${product.id}-name`}>
        <Link href={`/marketplace/products/${product.id}`}>{product.name}</Link>
      </h3>

      <dl className="cg-product-facts">
        <div>
          <dt>Helps you</dt>
          <dd>{product.editorial.bestFor}</dd>
        </div>
        <div>
          <dt>Built for</dt>
          <dd>{audience.length ? audience.join(", ") : "Not established"}</dd>
        </div>
        <div>
          <dt>Worth considering because</dt>
          <dd>{product.editorial.why}</dd>
        </div>
        <div>
          <dt>Main limitation</dt>
          <dd>{product.editorial.tradeoff}</dd>
        </div>
      </dl>

      <ul className="cg-product-status" aria-label="Record status">
        <li data-status="price">
          <span>Price</span>
          <strong>{PRICE_LABELS[facets.priceAvailability]}</strong>
        </li>
        <li data-status="evidence">
          <span>Evidence</span>
          <strong>{EVIDENCE_LABELS[facets.evidenceStatus]}</strong>
        </li>
        <li data-status="commercial">
          <span>Commercial</span>
          <strong>{COMMERCIAL_LABELS[facets.commercialLinkStatus]}</strong>
        </li>
      </ul>

      <Link className="cg-product-action" href={`/marketplace/products/${product.id}`}>
        See full details
        <span className="cg-visually-hidden"> for {product.name}</span>
      </Link>
    </article>
  );
}
