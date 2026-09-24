"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { NewsletterForm } from "./components/NewsletterForm";
import { trackEvent } from "./components/AnalyticsBridge";
import {
  dailyStories,
  editorialSections,
  featuredStory,
  recentStories,
  sectionFor,
  type EditorialStory,
} from "./home/editorial-publication";

function StoryCard({ story }: { story: EditorialStory }) {
  const section = sectionFor(story.section);
  return (
    <article className="cg-pub-story-card" id={story.section}>
      <Link className="cg-pub-story-image" href={story.href} aria-label={story.title}>
        <Image unoptimized src={story.image} alt={story.imageAlt} width={760} height={520} />
      </Link>
      <div className="cg-pub-story-section" style={{ backgroundColor: section.color }}>
        {section.label}
      </div>
      <div className="cg-pub-story-copy">
        <p className="cg-pub-story-format">{story.format}</p>
        <h3><Link href={story.href}>{story.title}</Link></h3>
        <p>{story.dek}</p>
        <div className="cg-pub-story-meta">
          <span>By {story.author}</span>
          <span>{story.publishedAt}</span>
        </div>
        <Link className="cg-pub-read-more" href={story.href}>Read more <span>→</span></Link>
      </div>
    </article>
  );
}

export default function Home() {
  useEffect(() => trackEvent("editorial_home_viewed"), []);

  return (
    <div className="cg-publication-home">
      <header className="cg-pub-header">
        <div className="cg-pub-header-inner">
          <Link className="cg-pub-logo" href="/" aria-label="Chef Gringo home">
            <Image
              unoptimized
              src="/brand/cg-horizontal-lockup.png"
              alt="Chef Gringo"
              width={736}
              height={200}
              priority
            />
            <span>Real-world hospitality. No bullshit.</span>
          </Link>

          <nav className="cg-pub-nav" aria-label="Editorial sections">
            {editorialSections.map((section) => (
              <Link href={section.href} key={section.id}>{section.label}</Link>
            ))}
          </nav>

          <div className="cg-pub-header-actions">
            <Link className="cg-pub-search" href="/discover" aria-label="Search Chef Gringo">⌕</Link>
            <Link className="cg-pub-marketplace-button" href="/marketplace">The Marketplace <span>→</span></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="cg-pub-featured">
          <div className="cg-pub-featured-image" aria-hidden="true">
            <Image
              unoptimized
              src={featuredStory.image}
              alt=""
              width={1600}
              height={1067}
              priority
            />
          </div>
          <div className="cg-pub-featured-shade" aria-hidden="true" />
          <div className="cg-pub-featured-inner">
            <div className="cg-pub-featured-copy">
              <p className="cg-pub-featured-label">{featuredStory.eyebrow}</p>
              <h1>{featuredStory.title}</h1>
              <p className="cg-pub-featured-dek">{featuredStory.dek}</p>
              <div className="cg-pub-author-row">
                <div className="cg-pub-author-mark">JG</div>
                <div>
                  <strong>By {featuredStory.author}</strong>
                  <span>{featuredStory.byline}</span>
                </div>
                <Link className="cg-pub-primary-button" href={featuredStory.href}>Read the full story <span>→</span></Link>
              </div>
            </div>
            <blockquote>“Hospitality is people taking care of people. Everything else is the system around it.”</blockquote>
          </div>
        </section>

        <section className="cg-pub-daily">
          <div className="cg-pub-width">
            <div className="cg-pub-section-heading">
              <div>
                <p>News. Ideas. Tools. A stronger industry.</p>
                <h2>Today on Chef Gringo</h2>
              </div>
              <span>Five perspectives. One industry. Real talk.</span>
            </div>
            <div className="cg-pub-daily-grid">
              {dailyStories.map((story) => <StoryCard story={story} key={story.slug} />)}
            </div>
          </div>
        </section>

        <section className="cg-pub-commerce">
          <div className="cg-pub-width cg-pub-commerce-grid">
            <article className="cg-pub-promo-card cg-pub-promo-gear">
              <div className="cg-pub-promo-shade" />
              <div className="cg-pub-promo-copy">
                <p>Gear I actually use</p>
                <h2>Tools that earn their place in the kitchen.</h2>
                <span>Thermometers, tools and equipment I trust enough to recommend.</span>
                <Link href="/go/thermoworks">View recommendations <b>→</b></Link>
              </div>
            </article>

            <article className="cg-pub-promo-card cg-pub-promo-operator">
              <div className="cg-pub-promo-shade" />
              <div className="cg-pub-promo-copy">
                <p>Deals & operator tools</p>
                <h2>Save time. Save money. Build smarter.</h2>
                <span>Equipment, software, systems and commercial routes worth knowing about.</span>
                <Link href="/marketplace">Browse the Marketplace <b>→</b></Link>
              </div>
            </article>

            <article className="cg-pub-newsletter-card">
              <p>Join the crew</p>
              <h2>One useful email. No corporate sludge.</h2>
              <span>Stories, tools, deals and hospitality insights from Chef Gringo.</span>
              <NewsletterForm source="homepage-publication" buttonLabel="Subscribe" />
            </article>
          </div>
        </section>

        <section className="cg-pub-recent">
          <div className="cg-pub-width">
            <div className="cg-pub-recent-heading">
              <h2>Recent Stories</h2>
              <Link href="/learn">View all stories →</Link>
            </div>
            <div className="cg-pub-recent-grid">
              {recentStories.map((story) => {
                const section = sectionFor(story.section);
                return (
                  <article key={story.slug}>
                    <Link href={story.href} className="cg-pub-recent-image">
                      <Image unoptimized src={story.image} alt={story.imageAlt} width={320} height={220} />
                    </Link>
                    <div>
                      <span style={{ color: section.color }}>{section.label}</span>
                      <h3><Link href={story.href}>{story.title}</Link></h3>
                      <small>{story.publishedAt}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="cg-pub-footer">
        <div className="cg-pub-width cg-pub-footer-grid">
          <div className="cg-pub-footer-brand">
            <Image unoptimized src="/brand/cg-horizontal-lockup.png" alt="Chef Gringo" width={736} height={200} />
            <p>Real-world hospitality. No bullshit.</p>
          </div>
          <blockquote>“Same industry. A little more truth.”</blockquote>
          <nav aria-label="Footer links">
            <Link href="/about">About</Link>
            <a href="mailto:hello@chefgringo.com">Contact</a>
            <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
