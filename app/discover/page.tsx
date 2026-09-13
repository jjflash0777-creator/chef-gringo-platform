import type { Metadata } from "next";
import Link from "next/link";
import { KnowledgeSearch } from "../knowledge/components/KnowledgeSearch";

export const metadata: Metadata = {
  title: "Discover Hospitality Knowledge",
  description: "Search Chef Gringo’s connected hospitality knowledge prototype across dishes, ingredients, techniques, equipment, and cuisines.",
};

export default function DiscoverPage() {
  return (
    <div className="page-shell knowledge-canvas">
      <section className="container discover-hero">
        <p className="eyebrow">Hospitality Knowledge Engine · Curated prototype</p>
        <h1>Search the prototype. Most results are summaries.</h1>
        <p className="lede">Carbonara is the only dish with a dedicated page. Everything else is a curated summary — not a loop back into this search, and not a finished encyclopedia. For the public learning map, start at Learn.</p>
        <p><Link href="/learn">Open Learn</Link></p>
      </section>
      <KnowledgeSearch />
    </div>
  );
}
