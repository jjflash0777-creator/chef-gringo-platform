import Link from "next/link";
import { marketplaceCatalog, productsForWorkflow } from "./catalog";
import { RecommendationCard } from "./components/RecommendationCard";
import { TrustDisclosure } from "./components/TrustDisclosure";
import { WorkflowCard } from "./components/WorkflowCard";

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
        <div className="container marketplace-hero-grid">
          <div>
            <p className="eyebrow">Chef Gringo Marketplace · Product Harvest 001</p>
            <h1>Buy for the work, not the hype.</h1>
            <p className="lede">Thirty real products, researched against six actual kitchen and supportive-dining problems. Every pick exposes its fit, tradeoff, evidence, price context, and commercial relationship.</p>
            <div className="button-row"><a className="button" href="#problems">Start with your problem</a><a className="button secondary" href="#how-we-score">How products are scored</a></div>
            <p className="harvest-stamp">Sources and prices checked {marketplaceCatalog.harvest.checkedAt} · {marketplaceCatalog.harvest.rejected} weak candidates rejected</p>
          </div>
          <div className="advisor-panel">
            <p>Research pipeline</p>
            <ol><li><span>01</span>Discover exact models</li><li><span>02</span>Verify primary evidence</li><li><span>03</span>Compare operator fit</li><li><span>04</span>Check merchants + tradeoffs</li><li><span>05</span>Editorial QA</li></ol>
          </div>
        </div>
      </section>

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
              <div className="comparison-wrap"><table className="comparison-table"><caption>Quick comparison</caption><thead><tr><th>Recommendation</th><th>Model</th><th>Best for</th><th>Price context</th><th>Evidence</th></tr></thead><tbody>{products.map((item) => <tr key={item.id}><td><a href={`#${item.id}`}>{item.editorial.badge}</a></td><td>{item.name}</td><td>{item.editorial.bestFor}</td><td>{item.price.context}</td><td>{item.evidenceStrength}</td></tr>)}</tbody></table></div>
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
