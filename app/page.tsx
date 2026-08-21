"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { HomepageIntake } from "./components/HomepageIntake";
import { DecisionProofPanel } from "./components/DecisionProofPanel";
import { InvestigationCasePanel } from "./components/InvestigationCasePanel";
import type { PublicDecisionProof } from "./home/decision-proof";
import type { InvestigationCase } from "./home/investigation-case";
import { editorialImages } from "./home/editorial-images";
import { HOMEPAGE_GOALS } from "./lib/public-ia";

const capabilities = [
  ["Ask", "A chef who answers, then names the next action.", "/#operator-question"],
  ["Learn", "Recipes and technique without a fake library.", "/learn"],
  ["Marketplace", "Equipment and software researched around the job.", "/marketplace"],
  ["Build", "Food-business questions without invented licenses.", "/business"],
  ["Tools", "Scaler, repair brief, comparison, Cut Intelligence preview.", "/tools"],
] as const;

const featured = [
  { maker: "True", model: "T-49-HC", type: "Reach-in Refrigerator", href: "/marketplace/products/true-t-49-hc" },
  { maker: "Turbo Air", model: "M3R47-2-N", type: "Reach-in Refrigerator", href: "/marketplace/products/turbo-air-m3r47" },
  { maker: "ThermoWorks", model: "Thermapen ONE", type: "Professional Thermometer", href: "/marketplace/products/thermoworks-thermapen-one" },
] as const;

export default function Home() {
  const [decisionProof, setDecisionProof] = useState<PublicDecisionProof | null>(null);
  const [investigationCase, setInvestigationCase] = useState<InvestigationCase | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const goalName = useId();

  useEffect(() => trackEvent("landing_page_viewed"), []);

  const selected = HOMEPAGE_GOALS.find((item) => item.id === goal);

  return (
    <div className="cg-approved-home">
      <section className="cg-approved-hero" aria-labelledby="approved-home-title">
        <div className="cg-approved-hero-image" aria-hidden="true">
          <Image unoptimized src={editorialImages.prep.src} alt="" width={1600} height={1067} priority />
        </div>
        <div className="cg-approved-hero-shade" aria-hidden="true" />
        <div className="cg-width-wide cg-approved-hero-inner">
          <div>
            <p className="cg-approved-kicker">Hospitality intelligence that ends in action.</p>
            <h1 id="approved-home-title">Know More. Waste Less. <em>Operate Better.</em></h1>
            <p className="cg-approved-hero-copy">Cook, repair, compare, or start a food business. Chef Gringo is one platform — not a pile of experiments.</p>
            <div className="cg-approved-actions">
              <a className="cg-button cg-button-primary" href="#operator-question">Ask Chef Gringo <span aria-hidden="true">→</span></a>
              <Link className="cg-button cg-button-secondary" href="/marketplace">Explore Marketplace</Link>
            </div>
          </div>
          <aside className="cg-approved-quote">
            <strong>The answer is only useful if you know what to do next.</strong>
            <small>Chef Gringo · Decision → Action</small>
          </aside>
        </div>
      </section>

      <section className="cg-approved-intake" id="grow" aria-labelledby="operator-intake-title">
        <div className="cg-width-wide cg-approved-intake-grid">
          <div className="cg-approved-intake-copy">
            <p className="cg-type-operational">Ask Chef Gringo</p>
            <h2 id="operator-intake-title">What are you working on?</h2>
            <p>Cooking tonight? Running a kitchen? Buying equipment? Comparing software? The recommendation comes first; commercial routes come after.</p>
          </div>
          <HomepageIntake onDecisionProof={setDecisionProof} onInvestigationCase={setInvestigationCase} />
        </div>
      </section>

      {decisionProof && <DecisionProofPanel proof={decisionProof} />}
      {investigationCase && <InvestigationCasePanel investigation={investigationCase} />}

      <section className="cg-home-goals" aria-labelledby="goal-selector-title">
        <div className="cg-width-wide">
          <p className="cg-type-operational">Orientation</p>
          <h2 id="goal-selector-title">What brought you here?</h2>
          <div className="cg-goal-grid" role="group" aria-labelledby="goal-selector-title">
            {HOMEPAGE_GOALS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="cg-goal-choice"
                aria-pressed={goal === item.id}
                aria-controls={goalName}
                onClick={() => setGoal((current) => (current === item.id ? null : item.id))}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div id={goalName} className="cg-goal-panel" hidden={!selected}>
            {selected && (
              <>
                <p>{selected.detail}</p>
                <div className="cg-goal-actions">
                  {selected.actions.map((action) => (
                    <Link key={action.href} href={action.href}>{action.label}</Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="cg-home-capabilities" aria-labelledby="capabilities-title">
        <div className="cg-width-wide">
          <h2 id="capabilities-title">What Chef Gringo is for</h2>
          <ul className="cg-capability-grid">
            {capabilities.map(([title, detail, href]) => (
              <li key={title}>
                <Link href={href}><strong>{title}</strong><span>{detail}</span></Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cg-home-learn" aria-labelledby="learn-title">
        <div className="cg-width-wide">
          <h2 id="learn-title">Learning that actually exists</h2>
          <p>Two complete recipes. Carbonara is the deep technique page. Cut Intelligence is a labeled preview.</p>
          <div className="cg-home-learn-row">
            <Link href="/knowledge/dishes/carbonara"><strong>Carbonara</strong><span>First tested culinary recipe</span></Link>
            <Link href="/favorite-food-makeovers/big-mac-style-burger"><strong>Heart-conscious burger</strong><span>First tested makeover</span></Link>
            <Link href="/cut-intelligence"><strong>Cut Intelligence</strong><span>Preview · beef first</span></Link>
          </div>
        </div>
      </section>

      <section className="cg-home-market" aria-labelledby="market-title">
        <div className="cg-width-wide">
          <div className="cg-approved-section-title">
            <h2 id="market-title">Solve a kitchen problem in Marketplace</h2>
            <Link href="/marketplace">Open Marketplace →</Link>
          </div>
          <p>Refrigeration, Food Prep, Warewashing, and thermometers are researched. Buying equipment and comparing software start from the job, not a storefront dump. Hobart AM16 — Quote required.</p>
          <div className="cg-home-market-row">
            {featured.map((product) => (
              <Link href={product.href} key={product.model}>
                <small>{product.maker}</small>
                <strong>{product.model}</strong>
                <span>{product.type}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cg-home-business" aria-labelledby="business-title">
        <div className="cg-width-wide">
          <h2 id="business-title">Build a food business without invented certainty</h2>
          <p>Cottage food, trucks, catering, and restaurants each have a real next step. Licensing stays a local question.</p>
          <Link className="cg-button cg-button-secondary" href="/business">Start here</Link>
        </div>
      </section>

      <section className="cg-home-evidence" aria-labelledby="trust-title">
        <div className="cg-width-wide">
          <h2 id="trust-title">How a decision is supposed to work</h2>
          <ol className="cg-trust-steps">
            <li><strong>Identify</strong> What are you actually trying to accomplish?</li>
            <li><strong>Investigate</strong> Use context, evidence, constraints, and real options.</li>
            <li><strong>Decide</strong> Choose the best action before commercial routing.</li>
            <li><strong>Act</strong> Cook, shop, repair, quote, buy, save — or do nothing.</li>
          </ol>
          <p>Recommendations are based on operator value — not commission. Hobart AM16 still requires a quote. Featured records stay publication-reviewed, not invented.</p>
          <p><Link href="/newsletter">Field Notes newsletter</Link></p>
        </div>
      </section>
    </div>
  );
}
