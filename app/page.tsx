import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "./components/NewsletterForm";
import { PublicationFrame } from "./components/editorial/PublicationFrame";
import { dailyHomepageArticles, featuredArticle, recentArticles } from "./editorial/repository";
import { SECTION_META } from "./editorial/types";

export default function Home() {
  const featured = featuredArticle();
  const daily = dailyHomepageArticles();
  const recent = recentArticles(5);

  return (
    <PublicationFrame>
      {featured ? (
        <section className="cg-pub-featured">
          <div className="cg-pub-featured-image" aria-hidden="true">
            <Image unoptimized src={featured.heroImage} alt="" width={1600} height={1067} priority />
          </div>
          <div className="cg-pub-featured-shade" aria-hidden="true" />
          <div className="cg-pub-featured-inner">
            <div className="cg-pub-featured-copy">
              <p className="cg-pub-featured-label">Featured story of the week</p>
              <h1>{featured.headline}</h1>
              <p className="cg-pub-featured-dek">{featured.deck}</p>
              <div className="cg-pub-author-row">
                <div className="cg-pub-author-mark">JG</div>
                <div>
                  <strong>By {featured.author}</strong>
                  <span>{featured.authorRole}</span>
                </div>
                <Link className="cg-pub-primary-button" href={`/articles/${featured.slug}`}>Read the full story <span>→</span></Link>
              </div>
            </div>
            {featured.joshTake ? <blockquote>“{featured.joshTake}”</blockquote> : null}
          </div>
        </section>
      ) : null}

      <section className="cg-pub-daily" id="today">
        <div className="cg-pub-width">
          <div className="cg-pub-section-heading">
            <div>
              <p>News. Ideas. Tools. A stronger industry.</p>
              <h2>Today on Chef Gringo</h2>
            </div>
            <span>Five perspectives. One industry. Real talk.</span>
          </div>
          <div className="cg-pub-daily-grid">
            {daily.map((article) => {
              const section = SECTION_META[article.section];
              return (
                <article className="cg-pub-story-card" id={article.section} key={article.id}>
                  <Link className="cg-pub-story-image" href={`/articles/${article.slug}`} aria-label={article.headline}>
                    <Image unoptimized src={article.heroImage} alt={article.heroImageAlt} width={760} height={520} />
                  </Link>
                  <div className="cg-pub-story-section" style={{ backgroundColor: section.color }}>{section.label}</div>
                  <div className="cg-pub-story-copy">
                    <p className="cg-pub-story-format">{article.format}</p>
                    <h3><Link href={`/articles/${article.slug}`}>{article.headline}</Link></h3>
                    <p>{article.deck}</p>
                    <div className="cg-pub-story-meta"><span>By {article.author}</span><span>{article.publishedAt}</span></div>
                    <Link className="cg-pub-read-more" href={`/articles/${article.slug}`}>Read more <span>→</span></Link>
                  </div>
                </article>
              );
            })}
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
            <Link href="/food-intelligence">View all stories →</Link>
          </div>
          <div className="cg-pub-recent-grid">
            {recent.map((article) => {
              const section = SECTION_META[article.section];
              return (
                <article key={article.id}>
                  <Link href={`/articles/${article.slug}`} className="cg-pub-recent-image">
                    <Image unoptimized src={article.heroImage} alt={article.heroImageAlt} width={320} height={220} />
                  </Link>
                  <div>
                    <span style={{ color: section.color }}>{section.label}</span>
                    <h3><Link href={`/articles/${article.slug}`}>{article.headline}</Link></h3>
                    <small>{article.publishedAt}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </PublicationFrame>
  );
}
