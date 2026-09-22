"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "./components/AnalyticsBridge";
import { NewsletterForm } from "./components/NewsletterForm";
import { AffiliateDisclosure } from "./components/AffiliateDisclosure";
import { brandImages } from "./home/brand-images";
import { marketplaceCatalog } from "./marketplace/catalog";
import { purchaseLink } from "./marketplace/commercial-links";

const categoryLinks = [
  ["Thermometers", "/marketplace?workflow=better-thermometer", "01"],
  ["POS & software", "/marketplace?workflow=operator-software", "02"],
  ["Kitchen equipment", "/marketplace?path=equipment", "03"],
  ["Smallwares", "/marketplace?workflow=smallwares", "04"],
  ["Repair & service", "/marketplace?workflow=repair-maintenance", "05"],
  ["Food truck", "/business", "06"],
  ["Senior living", "/senior-caregiver-kitchen", "07"],
  ["Startup", "/business", "08"],
] as const;

const softwareCards = [
  {
    name: "Toast",
    copy: "POS, online ordering, team tools and restaurant operations in one ecosystem.",
    href: "/marketplace?workflow=operator-software",
  },
  {
    name: "Square",
    copy: "Flexible payments and restaurant POS for operators who want a lighter starting point.",
    href: "/marketplace/products/square-restaurants",
  },
  {
    name: "MarginEdge",
    copy: "Invoice processing, food-cost visibility and restaurant operating intelligence.",
    href: "/marketplace/products/marginedge-platform",
  },
] as const;

const featuredRecipe = {
  eyebrow: "Recipe of the week",
  title: "Huli Huli Braised Short Ribs",
  copy: "Pineapple, soy, ginger, garlic and slow-braised beef — built for the kind of batch cooking that still has to taste like somebody cared.",
  href: "/recipes/huli-huli-braised-short-ribs",
};

export default function Home() {
  useEffect(() => trackEvent("landing_page_viewed"), []);

  const thermometerIds = [
    "thermoworks-thermapen-one",
    "thermoworks-thermopop-2",
    "thermoworks-chefalarm",
  ];
  const thermometerProducts = thermometerIds
    .map((id) => marketplaceCatalog.products.find((product) => product.id === id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  return (
    <div className="cg-commerce-home">
      <section className="cg-commerce-hero">
        <div className="cg-commerce-hero-media" aria-hidden="true">
          <Image
            unoptimized
            src={brandImages.heroKitchen.src}
            alt=""
            width={1600}
            height={1067}
            priority
          />
        </div>
        <div className="cg-commerce-hero-shade" aria-hidden="true" />
        <div className="container cg-commerce-hero-inner">
          <p className="cg-commerce-kicker">Real tools. Real kitchens. No bullshit.</p>
          <h1>Recommended tools for hospitality operators.</h1>
          <p className="cg-commerce-deck">
            Chef-built recommendations, operator-tested thinking, and useful tools for restaurants,
            food trucks, senior living and people who actually work in kitchens.
          </p>
          <div className="cg-commerce-actions">
            <Link className="cg-commerce-cta" href="#recommended">Shop recommended <span>→</span></Link>
            <Link className="cg-commerce-cta secondary" href="/tools/recipe-scaler">Use kitchen tools</Link>
          </div>
          <div className="cg-commerce-signals" aria-label="Chef Gringo promises">
            <span><b>Built for real work</b>Useful over impressive.</span>
            <span><b>Strong opinions</b>What I’d buy — and what I’d skip.</span>
            <span><b>Commercially honest</b>Affiliate relationships disclosed.</span>
          </div>
        </div>
      </section>

      <section className="cg-commerce-categories" aria-labelledby="shop-by-category">
        <div className="container">
          <div className="cg-commerce-section-head compact">
            <p className="cg-commerce-kicker">Shop by category</p>
            <h2 id="shop-by-category">Start with what you actually need.</h2>
          </div>
          <div className="cg-commerce-category-grid">
            {categoryLinks.map(([label, href, number]) => (
              <Link key={label} href={href}>
                <small>{number}</small>
                <strong>{label}</strong>
                <span>Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cg-commerce-recommended" id="recommended" aria-labelledby="recommended-title">
        <div className="container">
          <div className="cg-commerce-section-head">
            <div>
              <p className="cg-commerce-kicker">Chef Gringo recommended</p>
              <h2 id="recommended-title">Three thermometers. Three jobs. Don’t overthink it.</h2>
            </div>
            <p>
              If you check temperatures all day, buy for the job — not for the biggest spec sheet.
            </p>
          </div>

          <div className="cg-commerce-product-grid">
            {thermometerProducts.map((product, index) => {
              const link = purchaseLink(product);
              const labels = ["Best overall", "Best value", "Best for monitoring"];
              const taglines = [
                "The one I’d buy if I worked the line every day.",
                "Most of the utility without the premium price.",
                "Stick it in, set the alarm, and get back to work.",
              ];
              return (
                <article className="cg-commerce-product-card" key={product.id}>
                  <div className="cg-commerce-product-visual">
                    <span>{labels[index]}</span>
                    <strong>{product.model}</strong>
                    <small>{product.manufacturer}</small>
                  </div>
                  <div className="cg-commerce-product-copy">
                    <p className="cg-commerce-badge">{labels[index]}</p>
                    <h3>{product.name}</h3>
                    <p className="cg-commerce-product-tagline">{taglines[index]}</p>
                    <ul>
                      {product.editorial.strengths.slice(0, 3).map((strength) => <li key={strength}>{strength}</li>)}
                    </ul>
                    <p className="cg-commerce-tradeoff"><b>The catch:</b> {product.editorial.tradeoff}</p>
                    {link.href ? (
                      <a
                        className="cg-commerce-buy"
                        href={link.href}
                        rel={link.rel ?? undefined}
                        target="_blank"
                        data-event={link.event ?? undefined}
                        data-product-id={product.id}
                        data-placement="homepage-recommended"
                      >
                        See current price <span>→</span>
                      </a>
                    ) : (
                      <Link className="cg-commerce-buy" href={`/marketplace/products/${product.id}`}>See full details →</Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <AffiliateDisclosure id="homepage-affiliate-disclosure" />
        </div>
      </section>

      <section className="cg-commerce-software-feature" aria-labelledby="software-feature-title">
        <div className="cg-commerce-software-image" aria-hidden="true">
          <Image unoptimized src={brandImages.operatorIntelligence.src} alt="" width={1200} height={800} />
        </div>
        <div className="cg-commerce-software-shade" aria-hidden="true" />
        <div className="container cg-commerce-software-inner">
          <p className="cg-commerce-kicker">Restaurant systems</p>
          <h2 id="software-feature-title">Run a smarter restaurant with better systems.</h2>
          <p>
            POS, inventory, food cost, scheduling and operating tools should give you time back —
            not add another dashboard nobody wants to use.
          </p>
          <Link className="cg-commerce-cta" href="/marketplace?workflow=operator-software">
            Compare restaurant software <span>→</span>
          </Link>
        </div>
      </section>

      <section className="cg-commerce-software-list" aria-labelledby="software-list-title">
        <div className="container">
          <div className="cg-commerce-section-head compact">
            <p className="cg-commerce-kicker">Restaurant software</p>
            <h2 id="software-list-title">Systems worth knowing about.</h2>
          </div>
          <div className="cg-commerce-software-grid">
            {softwareCards.map((card) => (
              <Link href={card.href} key={card.name}>
                <strong>{card.name}</strong>
                <p>{card.copy}</p>
                <span>Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cg-commerce-recipe" aria-labelledby="recipe-title">
        <div className="container cg-commerce-recipe-grid">
          <div className="cg-commerce-recipe-media">
            <Image
              unoptimized
              src={brandImages.prepStation.src}
              alt={brandImages.prepStation.alt}
              width={1200}
              height={800}
            />
          </div>
          <div className="cg-commerce-recipe-copy">
            <p className="cg-commerce-kicker">{featuredRecipe.eyebrow}</p>
            <h2 id="recipe-title">{featuredRecipe.title}</h2>
            <p>{featuredRecipe.copy}</p>
            <div className="cg-commerce-recipe-meta">
              <span>Production-friendly</span>
              <span>Chef notes included</span>
              <span>Scale it for a crowd</span>
            </div>
            <div className="cg-commerce-actions">
              <Link className="cg-commerce-cta" href={featuredRecipe.href}>View recipes <span>→</span></Link>
              <Link className="cg-commerce-cta secondary dark" href="/tools/recipe-scaler">Scale a recipe</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cg-commerce-tools" aria-labelledby="tools-title">
        <div className="container">
          <div className="cg-commerce-section-head">
            <div>
              <p className="cg-commerce-kicker">Useful kitchen tools</p>
              <h2 id="tools-title">Use the intelligence where it saves time.</h2>
            </div>
            <p>Keep the smart stuff practical: conversions, production math, recipes and operator decisions.</p>
          </div>
          <div className="cg-commerce-tools-grid">
            <Link href="/tools/recipe-scaler">
              <small>01</small>
              <strong>Recipe scaler</strong>
              <p>Take a recipe from 8 portions to 85 without doing napkin math.</p>
              <span>Scale a recipe →</span>
            </Link>
            <Link href="/recipes">
              <small>02</small>
              <strong>Recipe library</strong>
              <p>Cook something worth repeating, then adapt it to the kitchen you actually run.</p>
              <span>Browse recipes →</span>
            </Link>
            <Link href="/culinary-director-tools">
              <small>03</small>
              <strong>Operator tools</strong>
              <p>Production, menus, kitchen systems and the tools behind the daily grind.</p>
              <span>Open tools →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="cg-commerce-equipment" aria-labelledby="equipment-title">
        <div className="container cg-commerce-equipment-grid">
          <div className="cg-commerce-equipment-copy">
            <p className="cg-commerce-kicker">Equipment & service</p>
            <h2 id="equipment-title">Buy for the daily grind.</h2>
            <p>
              Refrigeration, prep, cooking, warewashing, smallwares and repair routes organized around
              the job — not around whatever a brand wants to push this week.
            </p>
            <div className="cg-commerce-actions">
              <Link className="cg-commerce-cta" href="/marketplace?path=equipment">Shop equipment →</Link>
              <Link className="cg-commerce-cta secondary dark" href="/marketplace?workflow=repair-maintenance">Repair & service</Link>
            </div>
            <p className="cg-commerce-quote-note">
              Big-ticket equipment still needs a real delivered quote. True T-49-HC, Turbo Air M3R47-2-N,
              and Hobart AM16 remain <strong>Quote required</strong> rather than pretending a sticker price is the installed cost.
            </p>
          </div>
          <div className="cg-commerce-equipment-photo">
            <Image unoptimized src={brandImages.cookingLine.src} alt={brandImages.cookingLine.alt} width={1200} height={800} />
          </div>
        </div>
      </section>

      <section className="cg-commerce-newsletter" aria-labelledby="newsletter-title">
        <div className="container cg-commerce-newsletter-grid">
          <div>
            <p className="cg-commerce-kicker">Stay in the know</p>
            <h2 id="newsletter-title">One useful recipe. One operator tip. One tool worth knowing about.</h2>
            <p>No inbox sludge. Just something useful to cook, buy, fix or run better each week.</p>
          </div>
          <NewsletterForm source="homepage-commerce" buttonLabel="Send it to me" />
        </div>
      </section>
    </div>
  );
}
