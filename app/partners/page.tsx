import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Partner with Chef Gringo",
  description: "Commercial partnership information for affiliate, referral, manufacturer, software, equipment, grocery, training, and hospitality-service partners.",
};

export default function PartnersPage() {
  return (
    <div className="page-shell container narrow">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Partners</p>
      <p className="eyebrow">Commercial partnerships</p>
      <h1>Help operators act on better information.</h1>
      <div className="prose">
        <p className="lede">Chef Gringo is a hospitality intelligence brand building guided decision and action experiences across cooking, equipment, purchasing, software, operations, and professional foodservice.</p>

        <h2>What Chef Gringo publishes and builds</h2>
        <p>Current public work includes an AI-assisted hospitality intake, evidence-led equipment and product research, operator comparisons, cooking guidance, structured shopping and cooking actions, practical tools, and a growing Marketplace.</p>
        <p>The platform is designed to move from a question to a useful next action: cook, compare, shop, request a quote, book a demo, repair, buy, download, save, or decide not to purchase.</p>

        <h2>Partnerships we are evaluating</h2>
        <ul>
          <li>Affiliate and creator programs</li>
          <li>Restaurant software referral and demo programs</li>
          <li>Equipment, parts, smallwares, and manufacturer programs</li>
          <li>Grocery, pickup, and delivery integrations</li>
          <li>Training and certification programs</li>
          <li>Qualified lead and RFQ relationships</li>
          <li>Manufacturer product-data and approved-media relationships</li>
          <li>Hospitality service and operator-tool partnerships</li>
        </ul>

        <h2>Editorial independence</h2>
        <p>Commercial relationships are evaluated separately from editorial and operational recommendations. Compensation does not determine ranking or recommendation. A non-commercial route may be recommended when it better serves the user.</p>
        <p><Link href="/affiliate-disclosure">Read the affiliate disclosure</Link>.</p>

        <h2>Audience and promotion</h2>
        <p>Chef Gringo is built for home cooks seeking practical guidance as well as hospitality professionals, culinary leaders, operators, caregivers, and purchasing decision-makers. Promotional channels are being activated across the Chef Gringo website, search-led content, email, social media, and guided AI experiences.</p>
        <p>Audience metrics are provided to prospective partners only when they are verified. Chef Gringo does not inflate traffic, follower, subscriber, sales, or conversion claims.</p>

        <h2>How products and services can appear</h2>
        <p>Depending on the relationship and evidence available, partners may be eligible for comparison pages, structured shopping or fulfillment routes, product intelligence, software demo routing, quote requests, educational content, or other action-driven placements. Participation does not guarantee a favorable recommendation.</p>

        <h2>Contact</h2>
        <p>Affiliate managers, manufacturers, retailers, software providers, distributors, training organizations, and hospitality-service partners can reach Chef Gringo at <a href="mailto:hello@chefgringo.com">hello@chefgringo.com</a>.</p>
        <p><strong>Website:</strong> Chef Gringo<br /><strong>Positioning:</strong> Hospitality intelligence and decision-to-action guidance<br /><strong>Commercial policy:</strong> Practical value before promotion</p>
      </div>
    </div>
  );
}
