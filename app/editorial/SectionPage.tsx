import Link from "next/link";
import { articlesBySection } from "./repository";
import { SECTION_META, type EditorialSectionId } from "./types";
import { EditorialArticleCard } from "../components/editorial/ArticleCard";
import { PublicationFrame } from "../components/editorial/PublicationFrame";

export function EditorialSectionPage({ section }: { section: EditorialSectionId }) {
  const meta = SECTION_META[section];
  const articles = articlesBySection(section);
  return (
    <PublicationFrame newsletter>
      <section className="cg-section-hero" style={{ "--section-color": meta.color } as React.CSSProperties}>
        <div className="cg-pub-width">
          <p>Chef Gringo</p>
          <h1>{meta.label}</h1>
          <span>{meta.description}</span>
        </div>
      </section>
      <section className="cg-section-feed">
        <div className="cg-pub-width">
          <div className="cg-pub-recent-heading">
            <h2>Latest in {meta.label}</h2>
            <Link href="/">Back to today's front page →</Link>
          </div>
          {articles.length ? (
            <div className="cg-section-grid">{articles.map((article) => <EditorialArticleCard article={article} key={article.id} />)}</div>
          ) : (
            <div className="cg-section-empty"><h2>Nothing fake here.</h2><p>This section is ready. The next real story will appear when it is published.</p></div>
          )}
        </div>
      </section>
    </PublicationFrame>
  );
}
