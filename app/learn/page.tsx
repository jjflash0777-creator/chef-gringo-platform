import type { Metadata } from "next";
import Link from "next/link";
import { PRIMARY_NAV } from "../lib/public-ia";
import { editorialFeatures } from "../lib/editorial-registry";

export const metadata: Metadata = {
  title: "Learn",
  description: "Recipes, technique, food safety, and the honest limits of Chef Gringo’s learning library.",
};

export default function LearnPage() {
  const learn = PRIMARY_NAV.find((entry) => entry.id === "learn");
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Learn</p>
      <p className="eyebrow">Learning, as it actually exists</p>
      <h1>Learn the craft without a fake library.</h1>
      <p className="lede">Chef Gringo publishes when there is something useful to say: long-form food and ingredient reporting, complete recipes, practical technique, and clearly labeled previews for what is still being built.</p>

      {editorialFeatures.slice(0, 3).map((feature, index) => (
        {editorialFeatures.slice(0, 3).map((feature, index) => (
        <section className="branch-note" style={{ marginBottom: "2rem" }} key={feature.href}>
          <p className="eyebrow">{index === 0 ? "New · " : ""}{feature.section}</p>
          <h2 style={{ fontSize: "2.4rem" }}>{feature.title}</h2>
          <p>{feature.summary}</p>
          <p><Link href={feature.href}><strong>Read {index === 0 ? "the latest feature" : "the article"} →</strong></Link></p>
        </section>
      ))}
      <ul className="cg-hub-list">
        {learn?.items.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>
              <strong>{item.label}{item.status === "preview" ? " · Preview" : ""}</strong>
              <span>{item.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p><Link href="/discover">Search the curated prototype</Link> — most entities still have summaries, not dedicated pages.</p>
    </div>
  );
}
