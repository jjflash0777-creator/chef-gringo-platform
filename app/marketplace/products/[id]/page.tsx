import Link from "next/link";
import { notFound } from "next/navigation";
import { AffiliateDisclosure } from "../../../components/AffiliateDisclosure";
import { marketplaceCatalog } from "../../catalog";
import { CommercialLinkAction } from "../../components/CommercialLink";
import { evidenceLink, purchaseLink } from "../../commercial-links";
import { facetsOf } from "../../query";
import {
  AUDIENCE_LABELS,
  CATEGORY_LABELS,
  COMMERCIAL_LABELS,
  ENVIRONMENT_LABELS,
  EVIDENCE_LABELS,
  PRICE_LABELS,
  RECOMMENDATION_LABELS,
} from "../../taxonomy";

const RELATIONSHIP_NOTE: Record<string, string> = {
  affiliate: "Chef Gringo may earn a commission if you buy through this link. It did not affect the ranking.",
  pending: "A commercial relationship with this seller is unverified, and Chef Gringo earns nothing from this link today.",
  direct: "Chef Gringo has no commercial relationship with this seller and earns nothing from this link.",
  unavailable: "Chef Gringo has not verified a purchase destination for this product.",
  informational: "Reference link only.",
};

function productById(id: string) {
  return marketplaceCatalog.products.find((product) => product.id === id);
}

export function generateStaticParams() {
  return marketplaceCatalog.products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const product = productById((await params).id);
  if (!product) return { title: "Product not found | Chef Gringo Marketplace" };
  return {
    title: `${product.name} | Chef Gringo Marketplace`,
    description: product.editorial.bestFor,
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const product = productById((await params).id);
  if (!product) notFound();

  const facets = facetsOf(product);
  const purchase = purchaseLink(product);
  const evidence = evidenceLink(product);

  return (
    <article className="section container cg-detail">
      <p className="eyebrow">
        <Link href={`/marketplace?path=${facets.category}`}>← {CATEGORY_LABELS[facets.category]}</Link>
      </p>
      <p className="cg-product-kicker">{facets.subcategory}</p>
      <h1 id={product.id}>{product.name}</h1>
      <p className="cg-detail-lede">{product.editorial.bestFor}</p>

      <dl className="cg-detail-status" aria-label="Record status">
        <div><dt>Price</dt><dd>{PRICE_LABELS[facets.priceAvailability]}</dd></div>
        <div><dt>Evidence</dt><dd>{EVIDENCE_LABELS[facets.evidenceStatus]}</dd></div>
        <div><dt>Review state</dt><dd>{RECOMMENDATION_LABELS[facets.recommendationStatus]}</dd></div>
        <div><dt>Commercial</dt><dd>{COMMERCIAL_LABELS[facets.commercialLinkStatus]}</dd></div>
      </dl>

      <section aria-labelledby="buy-title" className="cg-detail-buy">
        <h2 id="buy-title">Where to buy</h2>
        <AffiliateDisclosure />
        <p className="cg-detail-price">
          <strong>{product.price.context}</strong>
          <span>Checked {product.price.checked}</span>
        </p>
        <div className="cg-detail-actions">
          <CommercialLinkAction link={purchase} className="cg-product-action" />
        </div>
        <p className="cg-detail-relationship">{RELATIONSHIP_NOTE[purchase.kind]} Editorial score is independent of commercial relationships.</p>
      </section>

      <section aria-labelledby="judgment-title">
        <h2 id="judgment-title">Chef Gringo&apos;s read</h2>
        <dl className="cg-detail-facts">
          <div><dt>Why it belongs in the comparison</dt><dd>{product.editorial.why}</dd></div>
          <div><dt>What it does well</dt><dd>{product.editorial.strengths.join(" · ")}</dd></div>
          <div><dt>Consider</dt><dd>{product.editorial.tradeoff}</dd></div>
          <div><dt>Skip it if</dt><dd>{product.editorial.skipIf}</dd></div>
          <div><dt>Operator note</dt><dd>{product.editorial.operatorNotes}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="fit-title">
        <h2 id="fit-title">Who and where it fits</h2>
        <dl className="cg-detail-facts">
          <div>
            <dt>Intended user</dt>
            <dd>{facets.audience.length ? facets.audience.map((value) => AUDIENCE_LABELS[value]).join(", ") : "Not established"}</dd>
          </div>
          <div>
            <dt>Operating environment</dt>
            <dd>{facets.operatingEnvironment.length ? facets.operatingEnvironment.map((value) => ENVIRONMENT_LABELS[value]).join(", ") : "Not established"}</dd>
          </div>
          <div><dt>Business stage</dt><dd>Not established. Chef Gringo does not record buyer maturity for any product.</dd></div>
        </dl>
      </section>

      <section aria-labelledby="specs-title">
        <h2 id="specs-title">Verified specifications</h2>
        <dl className="cg-detail-facts">
          {Object.entries(product.specs).map(([key, value]) => (
            <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="evidence-title">
        <h2 id="evidence-title">Evidence and open questions</h2>
        <dl className="cg-detail-facts">
          <div><dt>Source</dt><dd>{product.evidence[0]?.label ?? "No source recorded"}</dd></div>
          <div><dt>Checked</dt><dd>{product.evidence[0]?.checked ?? "Not recorded"}</dd></div>
          <div><dt>Review state</dt><dd>{product.publication?.sourceNotes ?? "Discovery-level record; deeper source review is still required."}</dd></div>
          {product.limitations.length > 0 && <div><dt>Known limitations</dt><dd>{product.limitations.join(" · ")}</dd></div>}
          {product.unresolvedQuestions.length > 0 && <div><dt>Still unresolved</dt><dd>{product.unresolvedQuestions.join(" · ")}</dd></div>}
          <div><dt>Product imagery</dt><dd>{product.image.rightsSource ?? "No explicit reuse grant recorded."} Chef Gringo does not publish product photography without a documented grant.</dd></div>
        </dl>
        <CommercialLinkAction link={evidence} className="cg-text-action" />
      </section>
    </article>
  );
}
