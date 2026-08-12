import type { ProductRecord } from "../catalog";
import { ContextPill } from "./ContextPill";
import { PricePresentation } from "./PricePresentation";
import { ProductMedia } from "./ProductMedia";
import { productCardViewModel } from "../view-models";

export function RecommendationCard({ product }: { product: ProductRecord }) {
  const view = productCardViewModel(product);
  return (
    <article className="recommendation-card" id={product.id}>
      <ProductMedia media={view.media} name={product.name} />
      <div className="recommendation-topline">
        <span>{product.category}</span>
        <strong>{product.editorial.badge}</strong>
      </div>
      <h3>{product.name}</h3>
      <p className="recommendation-verdict">{product.editorial.bestFor}</p>
      <PricePresentation price={view.pricePresentation} />
      <div className="commerce-attributes">{view.attributes.map(value=><ContextPill key={value}>{value}</ContextPill>)}</div>
      <p className="commerce-why"><strong>Why I&apos;d pick it:</strong> {product.editorial.why}</p>
      <div className="product-actions"><a className="button" href={product.merchants[0].url} target="_blank" rel="sponsored noreferrer" data-event="merchant_click">See current price</a><a className="button secondary" href={`#proof-${product.id}`}>Compare details</a></div>
      <details className="product-proof" id={`proof-${product.id}`}><summary>Evidence, tradeoffs &amp; specifications</summary><dl>
        <div><dt>What it does well</dt><dd>{product.editorial.strengths.join(" · ")}</dd></div>
        <div><dt>Consider</dt><dd>{product.editorial.tradeoff}</dd></div>
        <div><dt>Skip it if</dt><dd>{product.editorial.skipIf}</dd></div>
      </dl><a className="text-link light-link" href={product.evidence[0].url} target="_blank" rel="noreferrer">Check evidence ↗</a>
      <p className="operator-note"><strong>Operator note:</strong> {product.editorial.operatorNotes}</p><p className="affiliate-line">Affiliate: {product.affiliate.status}. Editorial score is independent of commercial relationships.</p></details>
    </article>
  );
}
