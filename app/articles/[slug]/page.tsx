import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorialArticleCard } from "../../components/editorial/ArticleCard";
import { JoshTake } from "../../components/editorial/JoshTake";
import { PublicationFrame } from "../../components/editorial/PublicationFrame";
import { articleBySlug, publishedArticles, relatedArticles } from "../../editorial/repository";
import { SECTION_META } from "../../editorial/types";

export function generateStaticParams() {
  return publishedArticles().map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = articleBySlug((await params).slug);
  if (!article || article.status !== "published") return { title: "Story not found" };
  return {
    title: article.seoTitle,
    description: article.seoDescription,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      title: article.seoTitle,
      description: article.seoDescription,
      type: "article",
      images: [{ url: article.socialImage, alt: article.heroImageAlt }],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = articleBySlug((await params).slug);
  if (!article || article.status !== "published") notFound();
  const section = SECTION_META[article.section];
  const related = relatedArticles(article);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.headline,
    description: article.deck,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Person", name: article.author },
    image: article.socialImage,
  };

  return (
    <PublicationFrame newsletter>
      <article className="cg-article">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        <header className="cg-article-hero">
          <div className="cg-article-hero-image">
            <Image unoptimized src={article.heroImage} alt={article.heroImageAlt} width={1600} height={1067} priority />
          </div>
          <div className="cg-article-hero-shade" />
          <div className="cg-pub-width cg-article-hero-copy">
            <Link href={section.route} style={{ backgroundColor: section.color }}>{section.label}</Link>
            <p>{article.format}</p>
            <h1>{article.headline}</h1>
            <span>{article.deck}</span>
            <div><strong>By {article.author}</strong><small>{article.authorRole} · {article.publishedAt}</small></div>
          </div>
        </header>

        <div className="cg-pub-width cg-article-layout">
          <div className="cg-article-body">
            {article.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {article.joshTake ? <JoshTake>{article.joshTake}</JoshTake> : null}
            {article.commercialDestination ? (
              <aside className="cg-article-commercial">
                <p>Useful next step</p>
                <h2>This story connects to a real tool or decision.</h2>
                <Link href={article.commercialDestination.href}>{article.commercialDestination.label} →</Link>
                <small>Commercial relationships are disclosed and do not determine Chef Gringo's editorial position.</small>
              </aside>
            ) : null}
            {article.cta ? <p className="cg-article-cta"><Link href={article.cta.href}>{article.cta.label} →</Link></p> : null}
          </div>
          <aside className="cg-article-sidebar">
            <p>Filed under</p>
            <Link href={section.route}>{section.label}</Link>
            <p>Topics</p>
            <div>{article.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </aside>
        </div>

        {related.length ? (
          <section className="cg-article-related">
            <div className="cg-pub-width">
              <div className="cg-pub-recent-heading"><h2>Keep Reading</h2><Link href={section.route}>More {section.label} →</Link></div>
              <div className="cg-section-grid">{related.map((item) => <EditorialArticleCard article={item} compact key={item.id} />)}</div>
            </div>
          </section>
        ) : null}
      </article>
    </PublicationFrame>
  );
}
