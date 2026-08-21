import type { ProductRecord } from "../catalog";
import { ContextPill } from "./ContextPill";
import { CommercialLinkAction } from "./CommercialLink";
import { PricePresentation } from "./PricePresentation";
import { ProductMedia } from "./ProductMedia";
import { evidenceLink } from "../commercial-links";
import { productCardViewModel } from "../view-models";

const INDEPENDENCE = "Editorial score is independent of commercial relationships.";

const relationshipNote: Record<string, string> = {
  affiliate: `Chef Gringo may earn a commission if you buy through this link. ${INDEPENDENCE}`,
  pending: `A commercial relationship with this seller is unverified, and Chef Gringo earns nothing from this link today. ${INDEPENDENCE}`,
  direct: `Chef Gringo has no commercial relationship with this seller and earns nothing from this link. ${INDEPENDENCE}`,
  unavailable: `Chef Gringo has not verified a purchase destination for this product. ${INDEPENDENCE}`,
  informational: `Reference link only. ${INDEPENDENCE}`,
};

export function RecommendationCard({ product }: { product: ProductRecord }) {
  const view = productCardViewModel(product);
  const evidence = evidenceLink(product);
  return (
    <article className="recommendation-card" id={product.id}>
      <ProductMedia media={view.media} name={product.name} />
      <div className="recommendation-topline">
        <span>{product.category}</span>
        <strong>{product.publication?.status==="publication_ready"?"Publication ready":product.publication?.status==="verify"?"Verify":"Discovery"}</strong>
      </div>
      <h3>{product.name}</h3>
      <p className="recommendation-verdict">{product.editorial.bestFor}</p>
      <PricePresentation price={view.pricePresentation} />
      <div className="commerce-attributes">{view.attributes.map(value=><ContextPill key={value}>{value}</ContextPill>)}</div>
      <p className="commerce-why"><strong>Why it belongs in the comparison:</strong> {product.editorial.why}</p>
      <div className="product-actions">
        <CommercialLinkAction link={view.purchase} className="button" />
        <a className="button secondary" href={`#proof-${product.id}`}>Compare details</a>
      </div>
      <p className="commerce-relationship">{relationshipNote[view.purchase.kind]}</p>
      <details className="product-proof" id={`proof-${product.id}`}><summary>Evidence, tradeoffs &amp; specifications</summary><dl>
        <div><dt>What it does well</dt><dd>{product.editorial.strengths.join(" · ")}</dd></div>
        <div><dt>Consider</dt><dd>{product.editorial.tradeoff}</dd></div>
        <div><dt>Skip it if</dt><dd>{product.editorial.skipIf}</dd></div>
        <div><dt>Verified specifications</dt><dd>{Object.entries(product.specs).map(([key,value])=><span className="spec-line" key={key}><strong>{key}:</strong> {value}</span>)}</dd></div>
        <div><dt>Publication state</dt><dd>{product.publication?.sourceNotes??"Discovery-level record; deeper source review is still required."}</dd></div>
        <div><dt>Image rights</dt><dd>{product.image.licensing}. {product.image.rightsSource??"No explicit reuse grant recorded."}</dd></div>
      </dl><CommercialLinkAction link={evidence} className="text-link light-link" />
      <p className="operator-note"><strong>Operator note:</strong> {product.editorial.operatorNotes}</p></details>
    </article>
  );
}
