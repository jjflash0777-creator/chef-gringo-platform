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

const explore = [
  ["Learn", "Carbonara is the complete culinary recipe. The burger is a complete makeover, not kitchen-tested. Cut Intelligence is a preview.", "/learn"],
  ["Marketplace", "Refrigeration, Food Prep, Warewashing, and thermometers are researched. Hobart AM16 — Quote required.", "/marketplace"],
  ["Build", "Cottage food, trucks, catering, and restaurants. Licensing stays a local question.", "/business"],
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

      <section className="cg-home-orient" aria-labelledby="goal-selector-title">
        <div className="cg-width-wide">
          <p className="cg-type-operational">Orientation</p>
          <h2 id="goal-selector-title">What brought you here?</h2>
          <p className="cg-home-orient-copy">Pick a goal for a next step. Ask, Learn, Marketplace, Build, and Tools stay in the main menu.</p>
          <div className="cg-goal-grid" role="group" aria-labelledby="goal-selector-title">
            {HOMEPAGE_GOALS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="cg-goal-choice"
                aria-pressed={goal === item.id}
                aria-controls={selected ? goalName : undefined}
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

      <section className="cg-home-explore" aria-labelledby="explore-title">
        <div className="cg-width-wide">
          <h2 id="explore-title">Explore the platform</h2>
          <ul className="cg-explore-grid">
            {explore.map(([title, detail, href]) => (
              <li key={title}>
                <Link href={href}><strong>{title}</strong><span>{detail}</span><em>Explore</em></Link>
              </li>
            ))}
          </ul>
          <p className="cg-home-proof-line">True T-49-HC, Turbo Air M3R47-2-N, and ThermoWorks Thermapen ONE are publication-reviewed records — not a storefront dump. <Link href="/cut-intelligence">Cut Intelligence</Link> is a labeled preview.</p>
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
          <p>Recommendations are based on operator value — not commission. Featured records stay publication-reviewed, not invented. <Link href="/newsletter">Field Notes newsletter</Link></p>
        </div>
      </section>
    </div>
  );
}
