"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { HomepageIntake } from "./components/HomepageIntake";
import { DecisionProofPanel } from "./components/DecisionProofPanel";
import { InvestigationCasePanel } from "./components/InvestigationCasePanel";
import { DepthLink, HeroDepthSection } from "./components/InteractiveDepth";
import type { PublicDecisionProof } from "./home/decision-proof";
import type { InvestigationCase } from "./home/investigation-case";
import styles from "./home/BrandHomepage.module.css";

const visualWorlds = [
  { code: "EQUIPMENT", title: "Refrigeration", detail: "Buy smarter. Diagnose first. Keep cold assets working.", image: "/brand/editorial/refrigeration.webp", href: "/marketplace#problems" },
  { code: "CRAFT", title: "Cooking", detail: "Production, technique and the reality of a working line.", image: "/brand/editorial/cooking-line.webp", href: "/#operator-question" },
  { code: "PREP", title: "Food Prep", detail: "Workflow, small equipment and mise en place that actually scales.", image: "/brand/editorial/prep-station.webp", href: "/marketplace#robot-coupe-r2n" },
  { code: "OPERATIONS", title: "Warewashing", detail: "The invisible engine that keeps every service moving.", image: "/brand/editorial/dishpit.webp", href: "/marketplace#hobart-am16" },
  { code: "MOBILE", title: "Food Truck", detail: "Compact kitchens, equipment choices and independent ownership.", image: "/brand/editorial/food-truck.webp", href: "/marketplace" },
  { code: "SUPPLY", title: "Receiving", detail: "Purchasing starts before the product ever reaches the line.", image: "/brand/editorial/receiving.webp", href: "/marketplace" },
] as const;

const featured = [
  { status: "Recommended", maker: "True", model: "T-49-HC", type: "Reach-in Refrigerator", image: "/brand/editorial/refrigeration.webp", href: "/marketplace#true-t-49-hc" },
  { status: "Compare", maker: "Turbo Air", model: "M3R47-2-N", type: "Reach-in Refrigerator", image: "/brand/editorial/refrigeration.webp", href: "/marketplace#turbo-air-m3r47-2-n" },
  { status: "Ready", maker: "ThermoWorks", model: "Thermapen ONE", type: "Professional Thermometer", image: "/brand/editorial/prep-station.webp", href: "/marketplace#thermapen-one" },
  { status: "Publication ready", maker: "Hobart", model: "AM16", type: "Warewashing", image: "/brand/editorial/dishpit.webp", href: "/marketplace#hobart-am16" },
  { status: "Software", maker: "Square", model: "Restaurants", type: "POS & Operations", image: "/brand/editorial/operator-intelligence.webp", href: "/marketplace#square-restaurants" },
] as const;

const process = [
  ["1", "Identify", "What are you actually trying to accomplish?"],
  ["2", "Investigate", "Context, evidence, constraints and real options."],
  ["3", "Decide", "Choose the route that fits the operation."],
  ["4", "Act", "Cook, repair, quote, buy, save—or do nothing."],
] as const;

export default function Home() {
  const [decisionProof, setDecisionProof] = useState<PublicDecisionProof | null>(null);
  const [investigationCase, setInvestigationCase] = useState<InvestigationCase | null>(null);

  useEffect(() => trackEvent("landing_page_viewed"), []);

  return (
    <div className={styles.page}>
      <HeroDepthSection className={`${styles.hero} cg-approved-hero`}>
        <div className={`cg-approved-hero-image ${styles.heroImage}`} aria-hidden="true">
          <Image src="/brand/editorial/hero-kitchen.webp" alt="" fill priority sizes="100vw" />
        </div>
        <div className={`cg-approved-hero-shade ${styles.heroShade}`} aria-hidden="true" />
        <div className={`cg-approved-hero-inner ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={`${styles.kicker} cg-approved-kicker`}>Hospitality intelligence for the people doing the work.</p>
            <h1 id="approved-home-title">Know More.<br />Waste Less.<br /><em>Operate Better.</em></h1>
            <p className={`cg-approved-hero-copy ${styles.heroLead}`}>Chef Gringo helps independent operators understand the problem before spending money—across food, equipment, purchasing, labor, software and the entire machine behind hospitality.</p>
            <div className={`cg-approved-actions ${styles.heroActions}`}>
              <a className={styles.primaryButton} href="#operator-question">Ask Chef Gringo →</a>
              <Link className={styles.secondaryButton} href="/marketplace">Explore Marketplace</Link>
            </div>
          </div>
          <aside className={styles.heroSignal}>
            <span>Decision → Action</span>
            <strong>The answer is only useful if you know what to do next.</strong>
            <p>Diagnose first. Compare honestly. Spend when the evidence says it makes sense.</p>
          </aside>
        </div>
      </HeroDepthSection>

      <section className={styles.exploreSection} aria-labelledby="explore-operation-title">
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Explore the operation</p>
            <h2 id="explore-operation-title">Hospitality is more than the plate.</h2>
          </div>
          <p>Move through the working parts of an operation—from the line and dish room to refrigeration, receiving and the decisions that happen after everyone else goes home.</p>
        </header>
        <div className={styles.worldRail}>
          {visualWorlds.map((world) => (
            <DepthLink className={styles.worldCard} href={world.href} key={world.title} maxTilt={4.2}>
              <Image src={world.image} alt="" fill sizes="(max-width: 760px) 78vw, 280px" />
              <div className={styles.worldContent}>
                <span>{world.code}</span>
                <strong>{world.title}</strong>
                <small>{world.detail}</small>
              </div>
            </DepthLink>
          ))}
        </div>
      </section>

      <section className={styles.editorialBreak}>
        <div className={styles.editorialInner}>
          <div className={styles.editorialIndex}>Chef Gringo / Hospitality Intelligence</div>
          <div>
            <h2>We care about the whole operation—not just what looks good from the dining room.</h2>
            <p>The chef, dishwasher, refrigeration technician, receiver, culinary director and food-truck owner are all part of the same system. Chef Gringo exists to make that system easier to understand, operate and improve.</p>
          </div>
        </div>
      </section>

      <section className={styles.storySection}>
        <div className={styles.storyGrid}>
          <figure className={`${styles.storyMedia} ${styles.storyMediaPortrait}`}>
            <Image src="/brand/editorial/operator-intelligence.webp" alt="Restaurant operator reviewing invoices, notes and equipment decisions after service" fill sizes="(max-width: 1050px) 100vw, 58vw" />
          </figure>
          <div className={styles.storyCopy}>
            <p className={styles.storyEyebrow}>Operator intelligence</p>
            <h2>The hard decisions usually happen after service.</h2>
            <p>Repair the refrigerator or replace it? Raise a menu price or change the recipe? Which POS actually fits? Chef Gringo is being built around the decisions operators make when the easy answer is usually the expensive one.</p>
            <ul className={styles.storyList}>
              <li><span>01</span> Understand the actual problem</li>
              <li><span>02</span> Compare evidence and realistic options</li>
              <li><span>03</span> See the cost, risk and commercial route</li>
              <li><span>04</span> Take the next useful action</li>
            </ul>
            <a className={styles.darkLink} href="#operator-question">Bring us a real decision →</a>
          </div>
        </div>
      </section>

      <section className={styles.storySectionAlt}>
        <div className={`${styles.storyGrid} ${styles.storyGridReverse}`}>
          <figure className={styles.storyMedia}>
            <Image src="/brand/editorial/repair-replace.webp" alt="Kitchen professionals diagnosing equipment before deciding whether to repair or replace it" fill sizes="(max-width: 1050px) 100vw, 58vw" />
          </figure>
          <div className={styles.storyCopy}>
            <p className={styles.storyEyebrow}>Repair before replace</p>
            <h2>Buying something new is not automatically the smart move.</h2>
            <p>Chef Gringo's marketplace is designed to start with the problem, not the commission. We want the route that makes operational and economic sense—even when the answer is repair it, source used equipment, change the process, or buy nothing.</p>
            <Link className={styles.darkLink} href="/marketplace">Enter the decision-first marketplace →</Link>
          </div>
        </div>
      </section>

      <section className={styles.humanSection} aria-labelledby="whole-operation-title">
        <header className={styles.humanHeader}>
          <div>
            <p className={styles.cardEyebrow}>The whole operation</p>
            <h2 id="whole-operation-title">The work that hospitality technology usually ignores.</h2>
          </div>
          <p>Chef Gringo's visual language is intentionally built around real operational work—not staged restaurant glamour.</p>
        </header>
        <div className={styles.humanGrid}>
          <article className={styles.humanCard}>
            <Image src="/brand/editorial/dishpit.webp" alt="Dish room worker operating a commercial dishmachine through steam" fill sizes="(max-width: 1050px) 100vw, 42vw" />
            <div className={styles.humanCardContent}><span>Warewashing</span><strong>The invisible engine</strong><p>Service stops when the dish room stops. Operations intelligence has to understand the places customers never see.</p></div>
          </article>
          <article className={styles.humanCard}>
            <Image src="/brand/editorial/senior-living.webp" alt="Senior living culinary team preparing a large meal service" fill sizes="(max-width: 760px) 100vw, 29vw" />
            <div className={styles.humanCardContent}><span>Production at scale</span><strong>Senior living culinary</strong><p>High-volume hospitality where consistency, nutrition, staffing and resident experience meet.</p></div>
          </article>
          <article className={styles.humanCard}>
            <Image src="/brand/editorial/receiving.webp" alt="Kitchen operator checking an early morning produce delivery" fill sizes="(max-width: 760px) 100vw, 29vw" />
            <div className={styles.humanCardContent}><span>Supply chain</span><strong>It starts at the back door</strong><p>Price, quality and waste decisions begin long before ingredients reach the prep table.</p></div>
          </article>
        </div>
      </section>

      <section className={styles.marketplaceSection} aria-labelledby="featured-marketplace-title">
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionEyebrow}>Marketplace intelligence</p>
            <h2 id="featured-marketplace-title">Products are part of the answer—not the starting point.</h2>
          </div>
          <p>Featured equipment and software routes stay connected to analysis, operator fit and the evidence behind the recommendation.</p>
        </header>
        <div className={styles.marketplaceGrid}>
          {featured.map((product) => (
            <DepthLink className={styles.productCard} href={product.href} key={`${product.maker}-${product.model}`} maxTilt={4.5} variant="product">
              <div className={styles.productImage}>
                <Image src={product.image} alt="" fill sizes="(max-width: 760px) 50vw, 20vw" />
                <span className={styles.productBadge}>{product.status}</span>
              </div>
              <div className={styles.productBody}>
                <small>{product.maker}</small>
                <strong>{product.model}</strong>
                <span>{product.type}</span>
                <b>View analysis →</b>
              </div>
            </DepthLink>
          ))}
        </div>
      </section>

      <section className={styles.processSection} aria-label="How Chef Gringo works">
        <div className={styles.processGrid}>
          {process.map(([number, title, detail]) => (
            <div className={styles.processStep} key={number}><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div></div>
          ))}
        </div>
      </section>

      <section className={styles.intakeSection} id="grow" aria-labelledby="operator-intake-title">
        <div className={styles.intakeGrid}>
          <div className={styles.intakeCopy}>
            <p className={styles.sectionEyebrow}>Bring the real problem</p>
            <h2 id="operator-intake-title">What are you working on?</h2>
            <p>Cooking tonight? Buying equipment? Troubleshooting a failure? Comparing software? Tell Chef Gringo what you're trying to accomplish. The recommendation comes first; the commercial route comes after.</p>
          </div>
          <HomepageIntake onDecisionProof={setDecisionProof} onInvestigationCase={setInvestigationCase} />
        </div>
      </section>

      {decisionProof && <DecisionProofPanel proof={decisionProof} />}
      {investigationCase && <InvestigationCasePanel investigation={investigationCase} />}
    </div>
  );
}
