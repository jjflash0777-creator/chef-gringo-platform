"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { HomepageIntake } from "./components/HomepageIntake";
import { DecisionProofPanel } from "./components/DecisionProofPanel";
import { InvestigationCasePanel } from "./components/InvestigationCasePanel";
import type { PublicDecisionProof } from "./home/decision-proof";
import type { InvestigationCase } from "./home/investigation-case";
import { editorialImages } from "./home/editorial-images";

const categories = [
  ["REF", "Refrigeration", "Reach-ins · Undercounters · Walk-ins", "/marketplace#problems"],
  ["PREP", "Food Prep", "Mixers · Processors · Slicers", "/marketplace#robot-coupe-r2n"],
  ["COOK", "Cooking", "Ranges · Ovens · Griddles", "/marketplace"],
  ["WASH", "Warewashing", "Dishmachines · Hobart", "/marketplace#hobart-am16"],
  ["TOOLS", "Smallwares", "Thermometers · Knives · Tools", "/marketplace#thermapen-one"],
] as const;

const featured = [
  {
    status: "Recommended",
    statusClass: "",
    maker: "True",
    model: "T-49-HC",
    type: "Reach-in Refrigerator",
    tags: ["Serviceable", "Verified specs"],
    href: "/marketplace#true-t-49-hc",
  },
  {
    status: "Compare",
    statusClass: "compare",
    maker: "Turbo Air",
    model: "M3R47-2-N",
    type: "Reach-in Refrigerator",
    tags: ["Compact", "Verified specs"],
    href: "/marketplace#turbo-air-m3r47-2-n",
  },
  {
    status: "Ready",
    statusClass: "",
    maker: "ThermoWorks",
    model: "Thermapen ONE",
    type: "Professional Thermometer",
    tags: ["Fast", "Operator fit"],
    href: "/marketplace#thermapen-one",
  },
  {
    status: "Publication ready",
    statusClass: "compare",
    maker: "Hobart",
    model: "AM16",
    type: "Warewashing",
    tags: ["High-AOV", "Quote required"],
    href: "/marketplace#hobart-am16",
  },
  {
    status: "Software",
    statusClass: "software",
    maker: "Square",
    model: "Restaurants",
    type: "POS & Operations",
    tags: ["Operator stack", "Commercial route"],
    href: "/marketplace#square-restaurants",
  },
] as const;

const process = [
  ["1", "Identify", "What’s the real problem?"],
  ["2", "Investigate", "Specs, constraints, realistic routes."],
  ["3", "Compare", "Side-by-side, apples to apples."],
  ["4", "Decide", "Repair, replace, buy—or wait."],
] as const;

export default function Home() {
  const [decisionProof, setDecisionProof] = useState<PublicDecisionProof | null>(null);
  const [investigationCase, setInvestigationCase] = useState<InvestigationCase | null>(null);

  useEffect(() => trackEvent("landing_page_viewed"), []);

  return (
    <div className="cg-approved-home">
      <section className="cg-approved-hero" aria-labelledby="approved-home-title">
        <div className="cg-approved-hero-image" aria-hidden="true">
          <Image
            unoptimized
            src={editorialImages.prep.src}
            alt=""
            width={1600}
            height={1067}
            priority
          />
        </div>
        <div className="cg-approved-hero-shade" aria-hidden="true" />
        <div className="cg-width-wide cg-approved-hero-inner">
          <div>
            <p className="cg-approved-kicker">Operator-focused. Vendor-independent.</p>
            <h1 id="approved-home-title">Real answers for real <em>kitchen problems.</em></h1>
            <p className="cg-approved-hero-copy">Compare equipment, parts, software, and operating options using specifications, serviceability, operating realities, and total cost—not just list price.</p>
            <div className="cg-approved-benefits" aria-label="Chef Gringo capabilities">
              <div className="cg-approved-benefit"><span aria-hidden="true">⌕</span><div><strong>Compare Options</strong><small>Specs, performance, compatibility</small></div></div>
              <div className="cg-approved-benefit"><span aria-hidden="true">⚙</span><div><strong>Solve Problems</strong><small>Repair, replace, or reconfigure</small></div></div>
              <div className="cg-approved-benefit"><span aria-hidden="true">▥</span><div><strong>Make Better Purchases</strong><small>Lower risk, lower cost, better outcomes</small></div></div>
            </div>
            <div className="cg-approved-actions">
              <Link className="cg-button cg-button-primary" href="/marketplace">Explore the Marketplace <span aria-hidden="true">→</span></Link>
              <a className="cg-button cg-button-secondary" href="#operator-question">Tell Chef Gringo</a>
            </div>
          </div>
          <aside className="cg-approved-quote">
            <strong>You bring the problem. I bring the options, the data, and the real-world context.</strong>
            <small>— Chef Gringo</small>
          </aside>
        </div>
      </section>

      <section className="cg-approved-categories" aria-label="Popular categories">
        <div className="cg-width-wide cg-approved-category-row">
          <div className="cg-approved-category-title">Popular<br />categories →</div>
          {categories.map(([code, title, detail, href]) => (
            <Link className="cg-approved-category" href={href} key={title}>
              <span className="cg-approved-category-art" aria-hidden="true">{code}</span>
              <span><strong>{title}</strong><small>{detail}</small></span>
              <b aria-hidden="true">→</b>
            </Link>
          ))}
        </div>
      </section>

      <section className="cg-approved-featured" aria-labelledby="featured-title">
        <div className="cg-width-wide">
          <div className="cg-approved-section-title">
            <h2 id="featured-title">Featured in the Marketplace</h2>
            <Link href="/marketplace">View all →</Link>
          </div>
          <div className="cg-approved-featured-grid">
            {featured.map((product) => (
              <Link className="cg-approved-product-card" href={product.href} key={`${product.maker}-${product.model}`}>
                <div className="cg-approved-product-art">
                  <span className={`cg-approved-card-status ${product.statusClass}`}>{product.status}</span>
                </div>
                <div className="cg-approved-product-meta">
                  <small>{product.maker}</small>
                  <strong>{product.model}</strong>
                  <span>{product.type}</span>
                </div>
                <div className="cg-approved-product-tags">{product.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <b>View Analysis →</b>
              </Link>
            ))}
            <aside className="cg-approved-brand-panel">
              <Image unoptimized src="/brand/cg-horizontal-lockup.png" alt="Chef Gringo Hospitality Intelligence" width={736} height={200} />
              <p>From diagnosis to decision.</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="cg-approved-process" aria-label="How Chef Gringo works">
        <div className="cg-width-wide cg-approved-process-row">
          <div className="cg-approved-process-label">How it works</div>
          {process.map(([number, title, detail]) => (
            <div className="cg-approved-step" key={number}>
              <span>{number}</span>
              <div><strong>{title}</strong><small>{detail}</small></div>
            </div>
          ))}
          <a className="cg-button cg-button-primary" href="#operator-question">Start a consultation →</a>
        </div>
      </section>

      <section className="cg-approved-intake" id="grow" aria-labelledby="operator-intake-title">
        <div className="cg-width-wide cg-approved-intake-grid">
          <div className="cg-approved-intake-copy">
            <p className="cg-type-operational">Bring the problem</p>
            <h2 id="operator-intake-title">What are you working on?</h2>
            <p>Tell Chef Gringo what you are trying to buy, fix, compare, improve, or figure out. The recommendation stays independent from commission.</p>
          </div>
          <HomepageIntake onDecisionProof={setDecisionProof} onInvestigationCase={setInvestigationCase} />
        </div>
      </section>

      {decisionProof && <DecisionProofPanel proof={decisionProof} />}
      {investigationCase && <InvestigationCasePanel investigation={investigationCase} />}
    </div>
  );
}
