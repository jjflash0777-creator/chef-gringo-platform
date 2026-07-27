import Link from "next/link";
import { RecommendationCard } from "./components/RecommendationCard";
import { TrustDisclosure } from "./components/TrustDisclosure";
import { WorkflowCard } from "./components/WorkflowCard";
import { knowledgeGraph, marketplaceProblems, sampleRecommendations } from "./data";

export const metadata = {
  title: "Marketplace | Trusted culinary recommendations",
  description: "Problem-led equipment guidance, buying guides, and product recommendations from culinary professionals.",
  openGraph: {
    title: "Chef Gringo Marketplace",
    description: "Buy for the work, not the hype.",
    images: [{ url: "/og-marketplace.png", width: 1536, height: 908, alt: "Chef Gringo Marketplace — Buy for the work, not the hype." }],
  },
  twitter: { card: "summary_large_image", images: ["/og-marketplace.png"] },
};

export default function MarketplacePage() {
  return (
    <>
      <section className="marketplace-hero">
        <div className="container marketplace-hero-grid">
          <div>
            <p className="eyebrow">Chef Gringo Marketplace</p>
            <h1>Buy for the work, not the hype.</h1>
            <p className="lede">A recommendation platform built by culinary professionals to help you choose equipment with confidence—based on your workflow, environment, and real operating constraints.</p>
            <div className="button-row">
              <a className="button" href="#problems">Start with your problem</a>
              <a className="button secondary" href="#recommendations">See reviewed products</a>
            </div>
          </div>
          <div className="advisor-panel">
            <p>Recommendation method</p>
            <ol>
              <li><span>01</span>Define the job</li>
              <li><span>02</span>Map the context</li>
              <li><span>03</span>Test the tradeoffs</li>
              <li><span>04</span>Explain the choice</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section container" id="problems">
        <div className="marketplace-section-heading">
          <div><p className="eyebrow">Problem-based navigation</p><h2>What are you trying to solve?</h2></div>
          <p>Start with the operational need. The product category comes later.</p>
        </div>
        <div className="workflow-grid">
          {marketplaceProblems.map((problem) => <WorkflowCard key={problem.title} {...problem} />)}
        </div>
      </section>

      <section className="section marketplace-featured" id="recommendations">
        <div className="container">
          <div className="marketplace-section-heading">
            <div><p className="eyebrow light">Structured recommendations</p><h2>Clear fit. Honest tradeoffs.</h2></div>
            <p>Representative records demonstrate the editorial model. Merchant availability and affiliate links remain separate from recommendation logic.</p>
          </div>
          <div className="recommendation-grid">
            {sampleRecommendations.map((product) => <RecommendationCard product={product} key={product.name} />)}
          </div>
        </div>
      </section>

      <section className="section container">
        <TrustDisclosure />
      </section>

      <section className="section graph-section">
        <div className="container graph-grid">
          <div>
            <p className="eyebrow">The knowledge layer</p>
            <h2>Every recommendation makes the system smarter.</h2>
            <p>Products exist once. Guides, comparisons, reviews, search, and future AI recommendations reference the same structured record.</p>
            <Link className="text-link" href="/vision">Read the platform vision →</Link>
          </div>
          <div className="knowledge-grid">
            {knowledgeGraph.map(([name, purpose]) => <article key={name}><strong>{name}</strong><span>{purpose}</span></article>)}
          </div>
        </div>
      </section>
    </>
  );
}
