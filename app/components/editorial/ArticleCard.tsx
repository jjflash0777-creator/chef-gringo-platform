import Image from "next/image";
import Link from "next/link";
import { SECTION_META, type EditorialArticle } from "../../editorial/types";

export function EditorialArticleCard({ article, compact = false }: { article: EditorialArticle; compact?: boolean }) {
  const section = SECTION_META[article.section];
  return (
    <article className={compact ? "cg-editorial-card is-compact" : "cg-editorial-card"}>
      <Link href={`/articles/${article.slug}`} className="cg-editorial-card-image">
        <Image unoptimized src={article.heroImage} alt={article.heroImageAlt} width={760} height={520} />
      </Link>
      <div className="cg-editorial-card-section" style={{ backgroundColor: section.color }}>{section.label}</div>
      <div className="cg-editorial-card-copy">
        <p>{article.format}</p>
        <h3><Link href={`/articles/${article.slug}`}>{article.headline}</Link></h3>
        {!compact ? <span>{article.deck}</span> : null}
        <small>By {article.author} · {article.publishedAt}</small>
        <Link href={`/articles/${article.slug}`} className="cg-pub-read-more">Read more →</Link>
      </div>
    </article>
  );
}
