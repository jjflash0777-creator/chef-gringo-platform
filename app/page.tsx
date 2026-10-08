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
import { brandImages } from "./home/brand-images";
import { recipeOfTheDay } from "./home/recipe-of-the-day";

const featuredArticle = {
  href: "/learn/what-are-we-feeding-our-kids",
  title: "What Are We Feeding Our Kids?",
  series: "The Food We Eat",
  deck: "Digestive symptoms, ultra-processed foods, additives, the microbiome — and what the evidence actually supports.",
  image: {
    src: "/images/editorial/what-are-we-feeding-our-kids/child-grocery-aisle.jpg",
    alt: "Child in a grocery aisle surrounded by brightly packaged foods",
  },
} as const;

const kitchenMore = [
  {
    href: "/learn/beets-more-than-a-beautiful-root",
    label: "Ingredients",
    title: "Beets: More Than a Beautiful Root",
    copy: "Sweetness, earthiness, nutrition context, and how beets earn a place on the plate.",
    image: brandImages.prepStation,
  },
  {
    href: "/recipes",
    label: "Recipes",
    title: "The published recipe shelf",
    copy: "Complete recipes only — ingredients, steps, and yield on the page.",
    image: brandImages.cookingLine,
  },
  {
    href: "/favorite-food-makeovers/big-mac-style-burger",
    label: "Technique",
    title: "Heart-conscious Big Mac–style burger",
    copy: "A complete makeover recipe with yield, timing, and practical steps.",
    image: brandImages.seniorLiving,
  },
] as const;

const popularGuides = [
  {
    href: "/marketplace?workflow=better-thermometer",
    title: "Choose a thermometer by the job",
    copy: "Instant-read vs leave-in monitoring — compare researched options without a universal “best.”",
  },
  {
    href: "/tools/recipe-scaler",
    title: "Scale a recipe",
    copy: "Deterministic yield math for real kitchen production — not a guess.",
  },
  {
    href: "/services/repair-or-replace",
    title: "Repair or replace equipment",
    copy: "A practical decision brief path before you buy new capital equipment.",
  },
  {
    href: "/learn/food-safety",
    title: "Food safety notes",
    copy: "Conservative practice guidance — not a certification or regulator substitute.",
  },
] as const;

const businessLinks = [
  { href: "/business", title: "Start here", copy: "What Chef Gringo can and cannot do for a new food operation." },
  { href: "/business#food-truck", title: "Food trucks", copy: "Mobile kitchen questions mapped to researched equipment notes." },
  { href: "/business#restaurant", title: "Restaurants & cafés", copy: "Equipment and software that have been researched — with limits stated." },
  { href: "/business#catering", title: "Catering", copy: "Volume, holding, and transport questions before the shopping list." },
] as const;

export default function Home() {
  const [decisionProof, setDecisionProof] = useState<PublicDecisionProof | null>(null);
  const [investigationCase, setInvestigationCase] = useState<InvestigationCase | null>(null);

  useEffect(() => trackEvent("landing_page_viewed"), []);

  return (
    <div className="cg-publication-home">
      <section className="cg-pub-hero" aria-labelledby="publication-home-title">
        <div className="cg-pub-hero-image" aria-hidden="true">
          <Image unoptimized src={brandImages.heroKitchen.src} alt="" width={1600} height={1067} priority />
        </div>
        <div className="cg-pub-hero-shade" aria-hidden="true" />
        <div className="cg-width-wide cg-pub-hero-inner">
          <p className="cg-pub-kicker">Chef Gringo</p>
          <h1 id="publication-home-title">
            Food worth understanding.<br />
            Recipes worth cooking.<br />
            <em>Kitchen knowledge worth keeping.</em>
          </h1>
          <p className="cg-pub-hero-deck">
            A chef-led food publication for cooking, ingredients, technique, and practical kitchen guidance —
            with honest buying help when a tool is actually part of the answer.
          </p>
          <div className="cg-pub-hero-actions">
            <Link className="cg-button cg-button-primary" href="/recipes">
              Browse recipes <span aria-hidden="true">→</span>
            </Link>
            <Link className="cg-button cg-button-secondary" href={featuredArticle.href}>
              Read the latest article
            </Link>
          </div>
        </div>
      </section>

      <section className="cg-pub-rotd" aria-labelledby="rotd-title">
        <div className="cg-width-wide cg-pub-rotd-grid">
          <div className="cg-pub-rotd-media">
            <Image
              unoptimized
              src={recipeOfTheDay.image.src}
              alt={recipeOfTheDay.image.alt}
              width={1400}
              height={933}
              priority
            />
          </div>
          <div className="cg-pub-rotd-copy">
            <p className="cg-pub-kicker-dark">{recipeOfTheDay.eyebrow}</p>
            <h2 id="rotd-title">{recipeOfTheDay.title}</h2>
            <p className="cg-pub-deck">{recipeOfTheDay.deck}</p>
            <p className="cg-pub-hook">{recipeOfTheDay.hook}</p>
            <Link className="cg-button cg-button-primary" href={recipeOfTheDay.href}>
              {recipeOfTheDay.ctaLabel} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="cg-pub-latest" aria-labelledby="latest-title">
        <div className="cg-width-wide cg-pub-latest-grid">
          <div className="cg-pub-latest-copy">
            <p className="cg-pub-kicker-dark">Latest from Chef Gringo</p>
            <p className="cg-pub-series">{featuredArticle.series}</p>
            <h2 id="latest-title">{featuredArticle.title}</h2>
            <p className="cg-pub-deck">{featuredArticle.deck}</p>
            <Link className="cg-button cg-button-primary" href={featuredArticle.href}>
              Read article <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="cg-pub-latest-media">
            <Image
              unoptimized
              src={featuredArticle.image.src}
              alt={featuredArticle.image.alt}
              width={1200}
              height={800}
            />
          </div>
        </div>
      </section>

      <section className="cg-pub-more" aria-labelledby="more-title">
        <div className="cg-width-wide">
          <div className="cg-pub-section-head">
            <p className="cg-pub-kicker-dark">More from the kitchen</p>
            <h2 id="more-title">Useful reading already on the shelf.</h2>
            <p>Only real published pieces — no filler cards.</p>
          </div>
          <div className="cg-pub-more-grid">
            {kitchenMore.map((item) => (
              <Link key={item.href} href={item.href} className="cg-pub-more-card">
                <span className="cg-pub-more-media" aria-hidden="true">
                  <Image unoptimized src={item.image.src} alt="" width={800} height={533} />
                </span>
                <span className="cg-pub-card-label">{item.label}</span>
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cg-pub-guides" aria-labelledby="guides-title">
        <div className="cg-width-wide">
          <div className="cg-pub-section-head">
            <p className="cg-pub-kicker-dark">Popular guides</p>
            <h2 id="guides-title">Practical help for the work of cooking and running a kitchen.</h2>
          </div>
          <ul className="cg-pub-guide-list">
            {popularGuides.map((guide) => (
              <li key={guide.href}>
                <Link href={guide.href}>
                  <strong>{guide.title}</strong>
                  <span>{guide.copy}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cg-pub-recommends" aria-labelledby="recommends-title">
        <div className="cg-width-wide">
          <div className="cg-pub-section-head">
            <p className="cg-pub-kicker-dark">Chef Gringo recommends</p>
            <h2 id="recommends-title">When a tool is part of the answer — not the whole answer.</h2>
            <p>
              Start with the job. Compare researched options. Commercial relationships are disclosed and never
              determine the ranking.{" "}
              <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
            </p>
          </div>
          <div className="cg-pub-recommend-grid">
            <article>
              <p className="cg-pub-card-label">Temperature tools</p>
              <h3>Thermometers matched to the work</h3>
              <p>
                Fast spot checks and leave-in monitoring solve different problems. Compare the researched ThermoWorks
                and commercial options on Chef Gringo before you buy.
              </p>
              <p>
                <Link href="/marketplace?workflow=better-thermometer">Open the thermometer shelf →</Link>
              </p>
              <p>
                <Link href="/marketplace/products/thermoworks-thermapen-one">Thermapen ONE product detail →</Link>
              </p>
            </article>
            <article>
              <p className="cg-pub-card-label">Partner route</p>
              <h3>ThermoWorks campaign page</h3>
              <p>
                An owned Chef Gringo route into the approved ThermoWorks affiliate relationship, with disclosure on the
                page.
              </p>
              <p>
                <Link href="/go/thermoworks">See ThermoWorks via Chef Gringo →</Link>
              </p>
              <p>
                <Link href="/marketplace">Browse Marketplace →</Link>
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="cg-pub-business" aria-labelledby="business-title">
        <div className="cg-width-wide">
          <div className="cg-pub-section-head cg-pub-section-head-light">
            <p className="cg-pub-kicker">Build a food business</p>
            <h2 id="business-title">Practical help for trucks, restaurants, catering, and independents.</h2>
            <p>Operations questions and researched equipment — not enterprise software theater.</p>
          </div>
          <div className="cg-pub-business-grid">
            {businessLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cg-pub-newsletter" aria-labelledby="newsletter-title">
        <div className="cg-width-wide cg-pub-newsletter-inner">
          <div>
            <p className="cg-pub-kicker-dark">Stay in the kitchen</p>
            <h2 id="newsletter-title">Field Notes from Chef Gringo</h2>
            <p>Recipes, food stories, and practical kitchen notes — not product-update spam.</p>
          </div>
          <Link className="cg-button cg-button-primary" href="/newsletter">
            Join the newsletter <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="cg-pub-ask" aria-labelledby="ask-title">
        <div className="cg-width-wide cg-pub-ask-grid">
          <div>
            <p className="cg-pub-kicker-dark">Have a kitchen question?</p>
            <h2 id="ask-title">Ask Chef Gringo</h2>
            <p>
              Cooking tonight, choosing a tool, or sorting an equipment problem — ask in plain language.
              Recommendations come before commercial routes.
            </p>
          </div>
          <HomepageIntake onDecisionProof={setDecisionProof} onInvestigationCase={setInvestigationCase} />
        </div>
        {decisionProof && <DecisionProofPanel proof={decisionProof} />}
        {investigationCase && <InvestigationCasePanel investigation={investigationCase} />}
      </section>
    </div>
  );
}
