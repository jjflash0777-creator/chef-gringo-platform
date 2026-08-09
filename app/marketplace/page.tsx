import Link from "next/link";
import { marketplaceCatalog, productsForWorkflow } from "./catalog";
import { RecommendationCard } from "./components/RecommendationCard";
import { TrustDisclosure } from "./components/TrustDisclosure";
import { WorkflowCard } from "./components/WorkflowCard";
import { MarketplaceAdvisor } from "./components/MarketplaceAdvisor";
import { merchandisingLabel } from "./view-models";

export const metadata = {
  title: "Marketplace | 30 researched culinary products",
  description: "Problem-led, evidence-backed equipment recommendations for working kitchens, senior living, caregivers, and hospitality operators.",
  openGraph: { title: "Chef Gringo Marketplace", description: "Buy for the work, not the hype.", images: [{ url: "/og-marketplace.png", width: 1536, height: 908, alt: "Chef Gringo Marketplace" }] },
  twitter: { card: "summary_large_image", images: ["/og-marketplace.png"] },
};

export default function MarketplacePage() {
  return (
    <>
      <section className="marketplace-hero">
        <div className="container"><p className="eyebrow">Chef Gringo Marketplace</p><h1>Show me the problem.<br />I&apos;ll help you make the smart move.</h1><MarketplaceAdvisor /><p className="harvest-stamp">30 researched products · Checked {marketplaceCatalog.harvest.checkedAt} · No pay-to-rank</p></div>
      </section>

      <section className="commerce-merch container" aria-labelledby="merch-title"><div className="marketplace-section-heading"><div><p className="eyebrow">Fast decision orientation</p><h2 id="merch-title">Start with the strongest signals.</h2></div><p>Labels come from existing editorial recommendations—not commissions or invented popularity.</p></div><div className="commerce-merch-grid">{marketplaceCatalog.products.filter(product => merchandisingLabel(product)).slice(0,3).map(product => <a href={`#${product.id}`} key={product.id}><span>{merchandisingLabel(product)}</span><strong>{product.name}</strong><small>{product.editorial.bestFor}</small></a>)}</div></section>

      <section className="section container" id="problems">
        <div className="marketplace-section-heading"><div><p className="eyebrow">Problem-based navigation</p><h2>What are you trying to solve?</h2></div><p>Start with the operational need. The product category comes later.</p></div>
        <div className="workflow-grid">{marketplaceCatalog.workflows.map((workflow) => <WorkflowCard key={workflow.id} id={workflow.id} title={workflow.title} description={workflow.summary} context={workflow.context} count={productsForWorkflow(workflow.id).length} />)}</div>
      </section>

      {marketplaceCatalog.workflows.map((workflow, workflowIndex) => {
        const products = productsForWorkflow(workflow.id);
        return (
          <section className={`section workflow-results ${workflowIndex % 2 ? "workflow-results-alt" : ""}`} id={workflow.id} key={workflow.id}>
            <div className="container">
              <div className="workflow-heading"><div><p className="eyebrow">Research workflow {String(workflowIndex + 1).padStart(2, "0")}</p><h2>{workflow.title}</h2><p>{workflow.summary}</p></div><Link className="text-link" href={workflow.knowledgeHref}>{workflow.knowledgeLabel} →</Link></div>
              <details className="comparison-wrap"><summary>Open quick comparison</summary><table className="comparison-table"><caption>Quick comparison</caption><thead><tr><th>Recommendation</th><th>Model</th><th>Best for</th><th>Price context</th><th>Evidence</th></tr></thead><tbody>{products.map((item) => <tr key={item.id}><td><a href={`#${item.id}`}>{item.editorial.badge}</a></td><td>{item.name}</td><td>{item.editorial.bestFor}</td><td>{item.price.context}</td><td>{item.evidenceStrength}</td></tr>)}</tbody></table></details>
              <div className="recommendation-grid">{products.map((item) => <RecommendationCard key={item.id} product={item} />)}</div>
            </div>
          </section>
        );
      })}

      <section className="section container" id="how-we-score">
        <TrustDisclosure />
        <div className="scoring-grid">
          <article><strong>Editorial score</strong><p>Workflow fit, durability, sanitation, performance, serviceability, value, evidence quality, and environment fit.</p></article>
          <article><strong>Commercial relationship</strong><p>Program, network, terms, and approval status are stored separately. Unknown means unknown—not assumed.</p></article>
          <article><strong>Price discipline</strong><p>Prices are dated context, never permanent promises. Delivered cost, installation, accessories, and service still need confirmation.</p></article>
          <article><strong>Image integrity</strong><p>Cards link to manufacturer or specialty-merchant imagery with provenance. Chef Gringo does not fabricate product appearance.</p></article>
        </div>
      </section>
    </>
  );
}
