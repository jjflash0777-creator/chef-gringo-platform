import type { ProductRecord } from "../catalog";
import { ContextPill } from "./ContextPill";

export function RecommendationCard({ product }: { product: ProductRecord }) {
  return (
    <article className="recommendation-card" id={product.id}>
      <a className="product-image-reference" href={product.image.referenceUrl} target="_blank" rel="noreferrer" aria-label={`View verified manufacturer imagery for ${product.name}`}>
        <span>{product.manufacturer.slice(0, 2).toUpperCase()}</span>
        <small>Manufacturer image + specification source ↗</small>
      </a>
      <div className="recommendation-topline">
        <span>{product.category}</span>
        <strong>{product.editorial.badge}</strong>
      </div>
      <h3>{product.name}</h3>
      <p className="recommendation-verdict">Best for: {product.editorial.bestFor}</p>
      <p>{product.editorial.why}</p>
      <dl>
        <div><dt>What it does well</dt><dd>{product.editorial.strengths.join(" · ")}</dd></div>
        <div><dt>Consider</dt><dd>{product.editorial.tradeoff}</dd></div>
        <div><dt>Skip it if</dt><dd>{product.editorial.skipIf}</dd></div>
      </dl>
      <p className="operator-note"><strong>Operator note:</strong> {product.editorial.operatorNotes}</p>
      <div className="product-actions">
        <a className="button" href={product.merchants[0].url} target="_blank" rel="sponsored noreferrer">Check merchant</a>
        <a className="text-link light-link" href={product.evidence[0].url} target="_blank" rel="noreferrer">Evidence source ↗</a>
      </div>
      <div className="recommendation-footer">
        <div>{product.environments.slice(0, 3).map((tag) => <ContextPill key={tag}>{tag}</ContextPill>)}</div>
        <span>{product.price.context}</span>
      </div>
      <p className="affiliate-line">Affiliate: {product.affiliate.status}. Editorial score is independent of commercial relationships.</p>
    </article>
  );
}
