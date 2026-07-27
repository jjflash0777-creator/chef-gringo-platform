import { ContextPill } from "./ContextPill";

export type Recommendation = {
  name: string;
  category: string;
  verdict: string;
  bestFor: string;
  cautions: string;
  evidence: string;
  price: string;
  tags: string[];
};

export function RecommendationCard({ product }: { product: Recommendation }) {
  return (
    <article className="recommendation-card">
      <div className="recommendation-topline">
        <span>{product.category}</span>
        <strong>{product.evidence}</strong>
      </div>
      <h3>{product.name}</h3>
      <p className="recommendation-verdict">{product.verdict}</p>
      <dl>
        <div><dt>Best for</dt><dd>{product.bestFor}</dd></div>
        <div><dt>Consider</dt><dd>{product.cautions}</dd></div>
      </dl>
      <div className="recommendation-footer">
        <div>{product.tags.map((tag) => <ContextPill key={tag}>{tag}</ContextPill>)}</div>
        <span>{product.price}</span>
      </div>
    </article>
  );
}
