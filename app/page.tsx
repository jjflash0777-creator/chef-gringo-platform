"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { HomepageIntake } from "./components/HomepageIntake";
import { DecisionProofPanel } from "./components/DecisionProofPanel";
import { InvestigationCasePanel } from "./components/InvestigationCasePanel";
import type { PublicDecisionProof } from "./home/decision-proof";
import type { InvestigationCase } from "./home/investigation-case";

const realWorldProblems = [
  "My freezer is running warm. What should I check first?",
  "This replacement unit is expensive. Is there an equivalent for less?",
  "What part is this, and will this replacement actually fit?",
  "Should I repair this equipment or replace it?",
] as const;

const investigation = [
  ["Identify", "Figure out what you’re actually dealing with.", "Symptoms, model numbers, operating context, constraints—and eventually photos when that capability is ready."],
  ["Investigate", "Open up the realistic routes.", "Repair, replacement, parts, local purchase, online purchase, manufacturer-direct, used equipment, and credible alternatives."],
  ["Compare", "Count the costs that change the decision.", "Price, shipping, compatibility, labor, downtime, warranty, service, risk, and landed cost where it applies."],
  ["Decide", "Make the tradeoffs understandable.", "The strongest option, the cheapest viable route, what remains unknown, and how confident the evidence allows us to be."],
] as const;

const comparisonDimensions = [
  ["Repair cost", "What restores useful life—and for how long?"],
  ["Replacement cost", "The complete installed route, not the tag."],
  ["Domestic price", "Availability, support, and known customer cost."],
  ["Factory-direct price", "A starting number, never landed cost by itself."],
  ["Shipping & landed cost", "Freight, duty, brokerage, tax, and final mile."],
  ["Downtime", "What waiting costs the operation."],
  ["Compatibility", "Fit, capacity, utilities, and workflow."],
  ["Warranty", "Coverage, exclusions, and who actually supports it."],
  ["Parts availability", "Whether the equipment can stay serviceable."],
  ["Supplier risk", "Identity, credibility, terms, and recourse."],
  ["Expected lifespan", "Value over useful work—not just purchase day."],
] as const;

export default function Home() {
  const [decisionProof, setDecisionProof] = useState<PublicDecisionProof | null>(null);
  const [investigationCase, setInvestigationCase] = useState<InvestigationCase | null>(null);
  useEffect(() => trackEvent("landing_page_viewed"), []);
  return <>
    <section className="cg-home-hero"><div className="cg-width-wide cg-home-hero-inner"><div className="cg-home-context"><p className="cg-type-operational">The Working Pass</p><span>Hospitality intelligence for the work in front of you</span></div><h1 className="cg-type-display">What are you working on?</h1><HomepageIntake onDecisionProof={setDecisionProof} onInvestigationCase={setInvestigationCase} /><p className="cg-home-trust">Recommendations are based on operator value—not commission.</p></div></section>
    {decisionProof && <DecisionProofPanel proof={decisionProof} />}
    {investigationCase && <InvestigationCasePanel investigation={investigationCase} />}

    <section className="cg-story-problems" aria-labelledby="problem-story-title">
      <div className="cg-width-wide cg-story-problems-grid">
        <header>
          <p className="cg-type-operational">Start with the problem</p>
          <h2 id="problem-story-title" className="cg-type-display">It usually starts with something that isn’t working.</h2>
          <p>Something broke. Something costs too much. You don’t know what part you need. Or the obvious answer doesn’t feel like the smart one.</p>
        </header>
        <ol className="cg-problem-notes">
          {realWorldProblems.map((problem, index) => <li key={problem}><span>{String(index + 1).padStart(2, "0")}</span><q>{problem}</q></li>)}
        </ol>
      </div>
    </section>

    <section className="cg-investigation" aria-labelledby="investigation-title">
      <div className="cg-width-wide">
        <header className="cg-story-heading">
          <p className="cg-type-operational">Open up the decision</p>
          <h2 id="investigation-title" className="cg-type-display">The first answer is rarely the whole answer.</h2>
          <p>Chef Gringo follows the problem far enough to expose what matters—then gives the decision back to you.</p>
        </header>
        <ol className="cg-investigation-ledger">
          {investigation.map(([label, title, detail], index) => <li key={label}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{label}</small><h3>{title}</h3><p>{detail}</p></div></li>)}
        </ol>
      </div>
    </section>

    <section className="cg-proof" aria-labelledby="proof-title">
      <div className="cg-width-wide">
        <header className="cg-proof-heading">
          <div><p className="cg-type-operational">Problem proof · Existing synthetic engine fixture</p><h2 id="proof-title" className="cg-type-display">A lower price can reveal an opportunity. It cannot prove the decision.</h2></div>
          <p>This demonstration uses test-only blast-chiller inputs already exercised by the private Decision Case engine. It is not a supplier quote or market claim.</p>
        </header>

        <div className="cg-proof-case">
          <div className="cg-proof-problem"><span>The problem</span><strong>A commercial kitchen needs a blast-chiller replacement route.</strong><p>Site utilities, local code requirements, and urgency still need confirmation.</p></div>
          <div className="cg-proof-routes" aria-label="Synthetic route comparison">
            <article><span>Domestic reference</span><strong>$12,000</strong><p>Observed synthetic product price</p><dl><div><dt>Expected known total</dt><dd>$13,540</dd></div><div><dt>Cost inputs</dt><dd>Complete fixture</dd></div></dl></article>
            <article><span>Factory-direct candidate</span><strong>$4,800</strong><p>Observed synthetic product price</p><dl><div><dt>Landed cost</dt><dd>Unknown</dd></div><div><dt>Route status</dt><dd>Not yet viable</dd></div></dl></article>
          </div>
          <div className="cg-proof-gates"><p>Before calling it cheaper</p><ul>{["Freight quote", "Duties, brokerage & tax", "Electrical compatibility", "Certification & local compliance", "Warranty & parts access", "Seller identity & delivery time"].map(item => <li key={item}>{item}<span>Verify</span></li>)}</ul></div>
          <div className="cg-proof-verdict"><div><span>Chef Gringo verdict</span><strong>Verify first</strong></div><p>Cheapest price ≠ cheapest viable solution.</p></div>
          <dl className="cg-proof-summary">
            <div><dt>Best option</dt><dd>Not established</dd></div>
            <div><dt>Lowest-cost viable option</dt><dd>Not established until both routes are verified</dd></div>
            <div><dt>Expected total cost</dt><dd>Domestic $13,540 · Factory-direct unknown</dd></div>
            <div><dt>Evidence confidence</dt><dd>Insufficient</dd></div>
          </dl>
        </div>
      </div>
    </section>

    <section className="cg-comparison" aria-labelledby="comparison-title">
      <div className="cg-width-wide cg-comparison-grid">
        <header><p className="cg-type-operational">What Chef Gringo is really comparing</p><h2 id="comparison-title" className="cg-type-display">The lowest advertised price isn’t always the cheapest decision.</h2><p>Every route earns its place by surviving the operational questions around it.</p></header>
        <dl>{comparisonDimensions.map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}</dl>
      </div>
    </section>

    <section className="cg-independence" aria-labelledby="independence-title">
      <div className="cg-width-working"><p className="cg-type-operational">The independence rule</p><h2 id="independence-title" className="cg-type-display">A commission can support the work. It cannot change the answer.</h2><p>Commercial relationships stay separate from recommendation quality. If better evidence changes the decision, the recommendation changes with it.</p><Link href="/marketplace#how-we-score">See how Marketplace recommendations are scored <span aria-hidden="true">→</span></Link></div>
    </section>

    <section className="cg-story-cta" id="grow" aria-labelledby="story-cta-title">
      <div className="cg-width-working"><p className="cg-type-operational">Your turn</p><h2 id="story-cta-title" className="cg-type-display">Got something you want figured out?</h2><p>Bring the repair, purchase, cost, operating, or growth problem. Start with what you know.</p><a className="cg-button cg-button-primary" href="#operator-question">Tell Chef Gringo</a></div>
    </section>
  </>;
}
