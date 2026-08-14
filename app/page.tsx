"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { HomepageIntake } from "./components/HomepageIntake";
import { DecisionProofPanel } from "./components/DecisionProofPanel";
import { InvestigationCasePanel } from "./components/InvestigationCasePanel";
import type { PublicDecisionProof } from "./home/decision-proof";
import type { InvestigationCase } from "./home/investigation-case";
import {editorialImages} from "./home/editorial-images";

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
          <figure className="cg-editorial-photo"><Image unoptimized src={editorialImages.service.src} alt={editorialImages.service.alt} width={1067} height={1600} /><figcaption>Restaurant service in motion. Photo by <a href={editorialImages.service.sourceUrl} target="_blank" rel="noreferrer">{editorialImages.service.creator}</a> · <a href={editorialImages.service.licenseUrl} target="_blank" rel="noreferrer">{editorialImages.service.license}</a>.</figcaption></figure>
        </header>
        <ol className="cg-problem-notes">
          {realWorldProblems.map((problem, index) => <li key={problem}><span>{String(index + 1).padStart(2, "0")}</span><q>{problem}</q></li>)}
        </ol>
      </div>
    </section>

    <section className="commerce-merch cg-home-marketplace" aria-labelledby="home-marketplace-title"><div className="cg-width-wide"><div className="cg-marketplace-intro"><header className="cg-story-heading"><p className="cg-type-operational">Real equipment intelligence</p><h2 id="home-marketplace-title" className="cg-type-display">Start with the job. Then compare the product.</h2><p>Chef Gringo now organizes 100 real product and service candidates around operating problems. Twenty-two priority records have passed the current publication review; discovery records stay clearly labeled.</p></header><figure className="cg-editorial-photo cg-editorial-photo-wide"><Image unoptimized src={editorialImages.prep.src} alt={editorialImages.prep.alt} width={1067} height={1600} /><figcaption>Commercial prep work. Photo by <a href={editorialImages.prep.sourceUrl} target="_blank" rel="noreferrer">{editorialImages.prep.creator}</a> · <a href={editorialImages.prep.licenseUrl} target="_blank" rel="noreferrer">{editorialImages.prep.license}</a>.</figcaption></figure></div><div className="commerce-merch-grid">{[["True T-49-HC","Reach-in refrigeration","/marketplace#true-t-49-hc"],["Robot-Coupe R2N","Commercial prep","/marketplace#robot-coupe-r2n"],["Victorinox Fibrox","Everyday smallwares","/marketplace#victorinox-fibrox-8"],["Hobart AM16","Warewashing","/marketplace#hobart-am16"],["Square for Restaurants","Operator software","/marketplace#square-restaurants"],["Robot-Coupe Blixer 4","Healthcare production","/marketplace#robot-coupe-blixer-4"]].map(([name,label,href])=><Link href={href} key={name}><span>{label}</span><strong>{name}</strong><small>Publication source reviewed · current price or quote still must be checked</small></Link>)}</div><Link className="cg-button cg-button-primary" href="/marketplace">Explore the Marketplace</Link></div></section>

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
          <div><p className="cg-type-operational">Real comparison · Evidence incomplete</p><h2 id="proof-title" className="cg-type-display">Two real reach-ins. No invented winner.</h2></div>
          <p>True T-49-HC and Turbo Air M3R47-2-N are real two-section refrigeration candidates. The official product families are sourced; current delivered price, local service, exact configuration, and site fit still require verification.</p>
        </header>

        <div className="cg-proof-case">
          <div className="cg-proof-problem"><span>The problem</span><strong>A kitchen needs dependable two-section refrigerated storage.</strong><p>Capacity, doorway clearance, utilities, ambient conditions, service geography, urgency, and budget remain unknown.</p></div>
          <div className="cg-proof-routes" aria-label="Real reach-in candidates">
            <article><span>Candidate 01 · Publication ready</span><strong>True T-49-HC</strong><p>Two-door, bottom-mount reach-in · official model page and specification sheet</p><dl><div><dt>Footprint</dt><dd>54⅛ × 29½ × 78⅜ in</dd></div><div><dt>Electrical</dt><dd>115 V · 5.4 A · NEMA 5-15P</dd></div><div><dt>Capacity signal</dt><dd>6 shelves · cubic volume not published on reviewed source</dd></div><div><dt>Serviceability</dt><dd>Bottom-mounted system · removable gaskets</dd></div><div><dt>Acquisition cost</dt><dd>Quote required</dd></div></dl></article>
            <article><span>Candidate 02 · Publication ready</span><strong>Turbo Air M3R47-2-N</strong><p>Two-door, top-mount reach-in · official product family and model specification sheet</p><dl><div><dt>Footprint</dt><dd>51¾ × 30¾ × 77⅞ in*</dd></div><div><dt>Electrical</dt><dd>115 V · 2.8 A · NEMA 5-15P</dd></div><div><dt>Capacity signal</dt><dd>42.3 cu ft · 6 shelves</dd></div><div><dt>Warranty source</dt><dd>5-year parts/labor · 7-year compressor, USA</dd></div><div><dt>Acquisition cost</dt><dd>Quote required</dd></div></dl><small>*Manufacturer notes additional rear-enclosure and caster dimensions.</small></article>
          </div>
          <div className="cg-proof-ledger" aria-label="Reach-in decision ledger"><p>What changes the answer</p><dl><div><dt>Operating requirements</dt><dd>Both use 115 V and R-290; doorway, clearance, ambient conditions, loading pattern, and local code still need confirmation.</dd></div><div><dt>Delivered and installed cost</dt><dd>Unknown for both. Freight, lift-gate, inside delivery, removal, installation, tax, accessories, and downtime are not yet quoted.</dd></div><div><dt>Situation favoring True</dt><dd>Potentially stronger when bottom-mount service access, shallower depth, documented NSF/ANSI 7 open-food use, or established local True support matter most.</dd></div><div><dt>Situation favoring Turbo Air</dt><dd>Potentially stronger when the narrower cabinet, stated 42.3 cu ft capacity, lower published amperage, top-mount layout, or published US warranty better fit the site.</dd></div><div><dt>Evidence boundary</dt><dd>Manufacturer specifications are verified inputs—not independent durability tests, local service guarantees, or delivered-cost evidence.</dd></div></dl></div>
          <div className="cg-proof-gates"><p>Before calling it cheaper</p><ul>{["Freight quote", "Duties, brokerage & tax", "Electrical compatibility", "Certification & local compliance", "Warranty & parts access", "Seller identity & delivery time"].map(item => <li key={item}>{item}<span>Verify</span></li>)}</ul></div>
          <div className="cg-proof-verdict"><div><span>Chef Gringo verdict</span><strong>No recommendation yet</strong></div><p>Both belong in the comparison. Neither has earned the answer.</p></div>
          <dl className="cg-proof-summary">
            <div><dt>Best option</dt><dd>Not established</dd></div>
            <div><dt>Lowest-cost viable option</dt><dd>Unknown until delivered cost and service are verified</dd></div>
            <div><dt>Expected total cost</dt><dd>Unknown for both candidates</dd></div>
            <div><dt>Evidence confidence</dt><dd>Moderate identity evidence · insufficient decision evidence</dd></div>
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
