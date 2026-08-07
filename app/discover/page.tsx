import type { Metadata } from "next";
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
        <h1>Ask about the work behind the food.</h1>
        <p className="lede">Search a dish, ingredient, technique, equipment question, or workflow. Chef Gringo connects the answer to the skills and decisions around it.</p>
      </section>
      <KnowledgeSearch />
    </div>
  );
}
