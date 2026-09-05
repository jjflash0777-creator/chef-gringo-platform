"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./HomepageEditorial.module.css";
import { trackEvent } from "./components/AnalyticsBridge";
import { HomepageIntake } from "./components/HomepageIntake";
import { DecisionProofPanel } from "./components/DecisionProofPanel";
import { InvestigationCasePanel } from "./components/InvestigationCasePanel";
import { DepthAside, HeroDepthSection } from "./components/InteractiveDepth";
import type { PublicDecisionProof } from "./home/decision-proof";
import type { InvestigationCase } from "./home/investigation-case";

const explore = [
  {
    label: "Equipment intelligence",
    title: "Refrigeration",
    detail: "Diagnose the problem, compare the real options, and know when repair beats replacement.",
    image: "/brand/editorial/refrigeration.jpg",
    href: "/marketplace#problems",
  },
  {
    label: "Culinary craft",
    title: "Cooking",
    detail: "Technique, production, recipes, and decisions grounded in how professional kitchens actually work.",
    image: "/brand/editorial/cooking-line.jpg",
    href: "/#operator-question",
  },
  {
    label: "Production",
    title: "Food Prep",
    detail: "Equipment, workflow, mise en place, and the small choices that compound across every service.",
    image: "/brand/editorial/prep-station.jpg",
    href: "/marketplace#robot-coupe-r2n",
  },
  {
    label: "Independent operator",
    title: "Food Truck",
    detail: "Build a tighter operation around space, equipment, menu, purchasing, and technology.",
    image: "/brand/editorial/food-truck.jpg",
    href: "/marketplace",
  },
  {
    label: "Hospitality at scale",
    title: "Senior Living",
    detail: "Production, staffing, resident experience, purchasing, and culinary leadership under one roof.",
    image: "/brand/editorial/senior-living.jpg",
    href: "/culinary-director-tools",
  },
] as const;

const featured = [
  {
    status: "Recommended",
    maker: "True",
    model: "T-49-HC",
    type: "Reach-in Refrigerator",
    tags: ["Serviceable", "Verified specs"],
    href: "/marketplace#true-t-49-hc",
    image: "/brand/editorial/refrigeration.jpg",
  },
  {
    status: "Compare",
    maker: "Turbo Air",
    model: "M3R47-2-N",
    type: "Reach-in Refrigerator",
    tags: ["Compact", "Verified specs"],
    href: "/marketplace#turbo-air-m3r47-2-n",
    image: "/brand/editorial/refrigeration.jpg",
  },
  {
    status: "Ready",
    maker: "ThermoWorks",
    model: "Thermapen ONE",
    type: "Professional Thermometer",
    tags: ["Fast", "Operator fit"],
    href: "/marketplace#thermapen-one",
    image: "/brand/editorial/prep-station.jpg",
  },
  {
    status: "Publication ready",
    maker: "Hobart",
    model: "AM16",
    type: "Warewashing",
    tags: ["High-AOV", "Quote required"],
    href: "/marketplace#hobart-am16",
    image: "/brand/editorial/dish-pit.jpg",
  },
  {
    status: "Software",
    maker: "Square",
    model: "Restaurants",
    type: "POS & Operations",
    tags: ["Operator stack", "Commercial route"],
    href: "/marketplace#square-restaurants",
    image: "/brand/editorial/operator-intelligence.jpg",
  },
] as const;

const process = [
  ["1", "Identify", "What are you actually trying to accomplish?"],
  ["2", "Investigate", "Use context, evidence, constraints, and real options."],
  ["3", "Decide", "Choose the best action before commercial routing."],
  ["4", "Act", "Cook, shop, repair, quote, buy, save—or do nothing."],
] as const;

export default function Home() {
  const [decisionProof, setDecisionProof] = useState<PublicDecisionProof | null>(null);
  const [investigationCase, setInvestigationCase] = useState<InvestigationCase | null>(null);

  useEffect(() => trackEvent("landing_page_viewed"), []);

  return (
    <div className={styles.home}>
      <HeroDepthSection className={styles.hero}>
        <div className={`${styles.heroImage} cg-approved-hero-image`} aria-hidden="true">
          <Image unoptimized src="/brand/editorial/hero-kitchen.jpg" alt="" width={1600} height={977} priority />
        </div>
        <div className={`${styles.heroShade} cg-approved-hero-shade`} aria-hidden="true" />
        <div className={`${styles.heroInner} cg-approved-hero-inner`}>
          <div>
            <p className={`${styles.kicker} cg-approved-kicker`}>Hospitality intelligence that ends in action.</p>
            <h1 id="approved-home-title">Know More. Waste Less. <em>Operate Better.</em></h1>
            <p className={`${styles.heroCopy} cg-approved-hero-copy`}>
              Chef Gringo helps the people who actually make hospitality work solve equipment problems, compare purchases,
              lower costs, improve production, and choose the next move with more confidence.
            </p>
            <div className={`${styles.heroActions} cg-approved-actions`}>
              <a className={styles.heroPrimary} href="#operator-question">Ask Chef Gringo <span aria-hidden="true">→</span></a>
              <Link className={styles.heroSecondary} href="/marketplace">Explore Marketplace</Link>
            </div>
          </div>
          <DepthAside className={`${styles.heroQuote} cg-approved-quote`}>
            <strong>The answer is only useful if you know what to do next.</strong>
            <small>Chef Gringo · Decision → Action</small>
          </DepthAside>
        </div>
      </HeroDepthSection>

      <section className={styles.railSection} aria-labelledby="explore-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionKicker}>Inside the operation</p>
            <h2 id="explore-title">Hospitality is bigger than the dining room.</h2>
          </div>
          <p>Explore the equipment, production systems, people, and decisions that keep service moving.</p>
        </div>
        <div className={styles.rail}>
          {explore.map((item) => (
            <Link className={styles.railCard} href={item.href} key={item.title}>
              <Image unoptimized src={item.image} alt="" width={1320} height={880} />
              <div className={styles.railCardBody}>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.storySection} aria-labelledby="operator-story-title">
        <div className={styles.storyMedia}>
          <Image unoptimized src="/brand/editorial/operator-intelligence.jpg" alt="Restaurant operator reviewing costs and operating information after service" width={1440} height={810} />
        </div>
        <div className={styles.storyCopy}>
          <p className={styles.storyLabel}>Operator intelligence</p>
          <h2 id="operator-story-title">The work continues after the kitchen goes quiet.</h2>
          <p>
            Equipment decisions, invoices, labor, purchasing, food cost, software, repairs, and tomorrow&apos;s service all
            compete for the same limited time and money. Chef Gringo is built for that part of the job too.
          </p>
          <ul className={styles.storyPoints}>
            <li><span>01</span><div><strong>Understand the real problem.</strong><br />Start with context before recommending a product.</div></li>
            <li><span>02</span><div><strong>Compare the routes.</strong><br />Repair, replace, buy used, change process, or spend nothing.</div></li>
            <li><span>03</span><div><strong>Make the next action obvious.</strong><br />Turn research into a decision an operator can use.</div></li>
          </ul>
          <a className={styles.storyAction} href="#operator-question">Bring Chef Gringo a problem →</a>
        </div>
      </section>

      <section className={styles.marketplaceSection} aria-labelledby="featured-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionKicker}>Marketplace intelligence</p>
            <h2 id="featured-title">Products are useful only when they solve the right problem.</h2>
          </div>
          <Link className={styles.sectionLink} href="/marketplace">View Marketplace →</Link>
        </div>
        <div className={styles.marketplaceGrid}>
          {featured.map((product) => (
            <Link className={styles.productCard} href={product.href} key={`${product.maker}-${product.model}`}>
              <div className={styles.productImage}>
                <Image unoptimized src={product.image} alt="" width={1000} height={667} />
                <span className={styles.productStatus}>{product.status}</span>
              </div>
              <div className={styles.productBody}>
                <small>{product.maker}</small>
                <strong>{product.model}</strong>
                <span>{product.type}</span>
                <div className={styles.productTags}>{product.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                <b>View Analysis →</b>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.decisionSection} aria-labelledby="repair-title">
        <div className={styles.decisionMedia}>
          <Image unoptimized src="/brand/editorial/repair-replace.jpg" alt="Hospitality operators examining commercial equipment before deciding whether to repair or replace it" width={1320} height={880} />
        </div>
        <div className={styles.decisionCopy}>
          <p className={styles.storyLabel}>Repair vs. replace</p>
          <h2 id="repair-title">Buying something new is not automatically the smart answer.</h2>
          <p>
            A useful recommendation accounts for failure mode, repairability, downtime, replacement cost, remaining life,
            operating impact, and the reality of your kitchen—not just an affiliate link.
          </p>
          <div className={styles.decisionMetric}>Diagnose → Compare → Decide → Spend only when the decision earns it.</div>
          <Link className={styles.heroSecondary} href="/marketplace#problems">Investigate an equipment problem →</Link>
        </div>
      </section>

      <section className={styles.fullBleedStory} aria-labelledby="whole-operation-title">
        <Image unoptimized src="/brand/editorial/dish-pit.jpg" alt="Dishwasher working through steam in a commercial kitchen" width={1440} height={810} />
        <div className={styles.fullBleedCopy}>
          <p className={styles.kicker}>The whole operation matters.</p>
          <h2 id="whole-operation-title">Hospitality runs on work most people never see.</h2>
          <p>
            The dish room, refrigeration, prep table, receiving door, cook line, office, and service window are one system.
            Chef Gringo is being built to understand that system—not just the glamorous parts of it.
          </p>
        </div>
      </section>

      <section className={styles.pathways} aria-labelledby="pathway-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionKicker}>Built for real operators</p>
            <h2 id="pathway-title">Different kitchens. The same pressure to make better decisions.</h2>
          </div>
          <p>Start from the kind of operation you run and move into the tools, equipment, and intelligence that fit it.</p>
        </div>
        <div className={styles.pathwayGrid}>
          <Link className={styles.pathwayCard} href="/culinary-director-tools">
            <Image unoptimized src="/brand/editorial/senior-living.jpg" alt="Senior living culinary team preparing meal service" width={1320} height={880} />
            <div className={styles.pathwayBody}><span className={styles.pathwayLabel}>Senior living</span><strong>Culinary leadership at scale</strong><small>Production, residents, staffing, menus, purchasing, and accountability.</small></div>
          </Link>
          <Link className={styles.pathwayCard} href="/marketplace">
            <Image unoptimized src="/brand/editorial/food-truck.jpg" alt="Food truck operator preparing for service" width={1320} height={880} />
            <div className={styles.pathwayBody}><span className={styles.pathwayLabel}>Food truck</span><strong>Every inch has to earn its place</strong><small>Equipment, workflow, menu, POS, sourcing, and startup economics.</small></div>
          </Link>
          <a className={styles.pathwayCard} href="#operator-question">
            <Image unoptimized src="/brand/editorial/cooking-line.jpg" alt="Professional cooking line during service" width={1320} height={880} />
            <div className={styles.pathwayBody}><span className={styles.pathwayLabel}>Independent restaurant</span><strong>Protect the operation behind the menu</strong><small>Cooking, equipment, labor, purchasing, repairs, and the next service.</small></div>
          </a>
        </div>
      </section>

      <section className={styles.processSection} aria-label="How Chef Gringo works">
        <div className={styles.processRow}>
          <div className={styles.processIntro}>How it works</div>
          {process.map(([number, title, detail]) => (
            <div className={styles.processStep} key={number}><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div></div>
          ))}
        </div>
      </section>

      <section className={styles.intakeSection} id="operator-question" aria-labelledby="operator-intake-title">
        <div className={styles.intakeGrid}>
          <div className={styles.intakeCopy}>
            <p className={styles.sectionKicker}>Bring the question</p>
            <h2 id="operator-intake-title">What are you working on?</h2>
            <p>
              Cooking tonight? Running a kitchen? Buying equipment? Comparing software? Tell Chef Gringo what you want to
              accomplish. The recommendation comes first; commercial routes come after.
            </p>
          </div>
          <HomepageIntake onDecisionProof={setDecisionProof} onInvestigationCase={setInvestigationCase} />
        </div>
      </section>

      {decisionProof && <DecisionProofPanel proof={decisionProof} />}
      {investigationCase && <InvestigationCasePanel investigation={investigationCase} />}

      <section className={styles.closingImage} aria-label="Chef Gringo closing statement">
        <Image unoptimized src="/brand/editorial/empty-kitchen.jpg" alt="Quiet commercial kitchen before service" width={1440} height={810} />
        <div className={styles.closingCopy}>
          <strong>Before the first ticket. After the last plate. The operation never really stops.</strong>
          <span>Chef Gringo · Hospitality intelligence for the people doing the work.</span>
        </div>
      </section>
    </div>
  );
}
