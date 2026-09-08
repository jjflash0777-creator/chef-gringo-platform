"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { HomepageIntake } from "./components/HomepageIntake";
import { DecisionProofPanel } from "./components/DecisionProofPanel";
import { InvestigationCasePanel } from "./components/InvestigationCasePanel";
import { CulinaryPulse } from "./components/CulinaryPulse";
import type { PublicDecisionProof } from "./home/decision-proof";
import type { InvestigationCase } from "./home/investigation-case";
import { editorialImages } from "./home/editorial-images";

const foodNotes = [
  {
    label: "Ingredient intelligence",
    title: "Why mushrooms keep earning more menu space",
    copy: "Umami, texture, yield, and versatility make mushrooms useful long before they become a trend story.",
  },
  {
    label: "Pantry intelligence",
    title: "Olive oil: what quality actually changes in the kitchen",
    copy: "Flavor, smoke point, storage, and application matter more than the front-label mythology.",
  },
  {
    label: "Technique",
    title: "Fermentation is useful because it solves real kitchen problems",
    copy: "Preservation, acidity, depth, and waste reduction are the operational reasons to understand it.",
  },
] as const;

const platformPaths = [
  ["Learn", "Ingredients, techniques, recipes, nutrition context, and the science worth understanding.", "/learn"],
  ["Solve", "Start with the problem: repair, replace, recost, substitute, compare, or troubleshoot.", "#operator-question"],
  ["Build", "Food trucks, restaurants, catering, cottage food, and hospitality concepts with the economics visible.", "/business"],
  ["Shop", "Publication-reviewed equipment and tools when a product is actually part of the answer.", "/marketplace"],
  ["Manage", "Operator systems for menus, production, inventory, scheduling, sanitation, and daily execution.", "/culinary-director-tools"],
] as const;

export default function Home() {
  const [decisionProof, setDecisionProof] = useState<PublicDecisionProof | null>(null);
  const [investigationCase, setInvestigationCase] = useState<InvestigationCase | null>(null);

  useEffect(() => trackEvent("landing_page_viewed"), []);

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
            <p className="cg-approved-hero-copy">Food, kitchens, equipment, costs, health, and hospitality — connected to the decision you need to make next.</p>
            <div className="cg-approved-actions">
              <a className="cg-button cg-button-primary" href="#operator-question">Ask Chef Gringo <span aria-hidden="true">→</span></a>
              <a className="cg-button cg-button-secondary" href="#food-intelligence">Explore food intelligence</a>
            </div>
          </div>
          <aside className="cg-approved-quote">
            <strong>The answer is only useful if you know what to do next.</strong>
            <small>Chef Gringo · Information → Decision → Action</small>
          </aside>
        </div>
      </section>

      <section className="cg-approved-intake" id="operator-question" aria-labelledby="operator-intake-title">
        <div className="cg-width-wide cg-approved-intake-grid">
          <div className="cg-approved-intake-copy">
            <p className="cg-type-operational">Ask Chef Gringo</p>
            <h2 id="operator-intake-title">What are you working on?</h2>
            <p>Cooking tonight? Running a kitchen? Buying equipment? Comparing software? Tell Chef Gringo the real problem and start there.</p>
          </div>
          <HomepageIntake onDecisionProof={setDecisionProof} onInvestigationCase={setInvestigationCase} />
        </div>
      </section>

      {decisionProof && <DecisionProofPanel proof={decisionProof} />}
      {investigationCase && <InvestigationCasePanel investigation={investigationCase} />}

      <section className="cg-food-intelligence" id="food-intelligence" aria-labelledby="food-intelligence-title">
        <div className="cg-width-wide">
          <div className="cg-food-intelligence-head">
            <div>
              <p className="cg-type-operational">Food intelligence</p>
              <h2 id="food-intelligence-title">Interesting food is more useful when you understand why it matters.</h2>
            </div>
            <Link href="/learn">Explore the knowledge base →</Link>
          </div>

          <div className="cg-food-feature-grid">
            <article className="cg-food-feature">
              <div className="cg-food-feature-copy">
                <span className="cg-food-label">Ingredient · nutrition · technique</span>
                <h3>Beets: More Than a Beautiful Root</h3>
                <p>Beets bring sweetness, earthiness, color, fiber, folate, and naturally occurring dietary nitrate to the same ingredient. The interesting part is what that means on the plate — and what the research actually supports.</p>
                <div className="cg-food-feature-actions">
                  <Link href="/learn/beets-more-than-a-beautiful-root">Read the full post →</Link>
                  <Link href="#operator-question">Ask Chef Gringo about beets</Link>
                </div>
              </div>
              <aside className="cg-food-feature-notes" aria-label="Beet kitchen notes">
                <p className="cg-type-operational">Chef notes</p>
                <div><strong>Roast</strong><span>Concentrates sweetness and keeps the preparation simple.</span></div>
                <div><strong>Acid</strong><span>Citrus, vinegar, yogurt, and goat cheese cut through the earthy profile.</span></div>
                <div><strong>Use the greens</strong><span>Treat them like chard instead of sending usable food to the bin.</span></div>
                <div><strong>Think beyond salad</strong><span>Purées, grains, relishes, sandwiches, soups, and composed entrées all work.</span></div>
              </aside>
            </article>
          </div>

          <div className="cg-food-note-rail" aria-label="More food intelligence">
            {foodNotes.map((note) => (
              <article key={note.title}>
                <span>{note.label}</span>
                <h3>{note.title}</h3>
                <p>{note.copy}</p>
                <Link href="/learn">Explore →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CulinaryPulse />

      <section className="cg-home-pathways" aria-labelledby="pathways-title">
        <div className="cg-width-wide">
          <div className="cg-home-pathways-head">
            <p className="cg-type-operational">One platform</p>
            <h2 id="pathways-title">Learn it. Solve it. Build it. Shop it. Manage it.</h2>
            <p>Chef Gringo is organized around the work people actually do — not around disconnected features.</p>
          </div>
          <div className="cg-home-pathway-grid">
            {platformPaths.map(([title, copy, href]) => (
              <Link href={href} key={title}>
                <strong>{title}</strong>
                <span>{copy}</span>
                <em>Explore →</em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cg-home-evidence" aria-labelledby="trust-title">
        <div className="cg-width-wide">
          <h2 id="trust-title">How Chef Gringo is supposed to make a decision</h2>
          <ol className="cg-trust-steps">
            <li><strong>Identify</strong>What are you actually trying to accomplish?</li>
            <li><strong>Investigate</strong>Use context, evidence, constraints, and real options.</li>
            <li><strong>Decide</strong>Choose the best action before commercial routing.</li>
            <li><strong>Act</strong>Cook, shop, repair, quote, buy, save — or do nothing.</li>
          </ol>
          <p>Recommendations are based on operator value, not commission. Commercial relationships are disclosed when they are part of a recommendation. <Link href="/newsletter">Field Notes newsletter</Link></p>
        </div>
      </section>
    </div>
  );
}
