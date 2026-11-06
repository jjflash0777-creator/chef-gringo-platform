import type { Metadata } from "next";
import Link from "next/link";
import { editorialFeatures } from "../lib/editorial-registry";

export const metadata: Metadata = {
  title: "Guides & Charts",
  description: "Chef Gringo guides and charts: the Foundations of Flavor features, the free family-tree printable, and the reference charts from the blog.",
};

const charts = [
  {
    href: "/learn/mother-sauces-family-tree",
    label: "Mother Sauces family tree · Free printable",
    description: "Five mothers and their derivatives on one sheet — print it and post it.",
  },
  {
    href: "/downloads#kitchen-reference-chart-set",
    label: "Kitchen Reference Chart Set — Vol. 1",
    description: "Temperatures, wine pairing, substitutions, conversions, knife cuts, and storage — the wall-chart set.",
  },
  {
    href: "/tools/recipe-scaler",
    label: "Recipe scaler",
    description: "Deterministic recipe conversion and scaling. It does arithmetic, not opinions.",
  },
] as const;

export default function LearnPage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Guides &amp; Charts</p>
      <p className="eyebrow">Guides &amp; charts</p>
      <h1>The guides behind the recipes.</h1>
      <p className="lede">Long-form features that teach the system, not just the dish — plus the charts that belong on the wall next to the stove. Published when there is something useful to say, and labeled honestly until there is.</p>

      {editorialFeatures.map((feature, index) => (
        <section className="branch-note" style={{ marginBottom: "2rem" }} key={feature.href}>
          <p className="eyebrow">{index === 0 ? "New · " : ""}{feature.section}</p>
          <h2 style={{ fontSize: "2.4rem" }}>{feature.title}</h2>
          <p>{feature.summary}</p>
          <p><Link href={feature.href}><strong>Read the guide →</strong></Link></p>
        </section>
      ))}

      <h2>Charts &amp; tools</h2>
      <ul className="cg-hub-list">
        {charts.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p><Link href="/recipes">The recipe shelf →</Link> — the dishes these guides produce.</p>
    </div>
  );
}
