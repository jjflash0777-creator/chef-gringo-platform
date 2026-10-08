import type { Metadata } from "next";
import { NewsletterForm } from "../components/NewsletterForm";

export const metadata: Metadata = {
  title: "Chef Gringo Field Notes",
  description: "Recipes, food stories, and practical kitchen notes from Chef Gringo by email.",
};

export default function NewsletterPage() {
  return (
    <div className="page-shell container narrow">
      <p className="breadcrumbs"><a href="/">Home</a> / Field Notes</p>
      <p className="eyebrow">Chef Gringo Field Notes</p>
      <h1>Recipes, food stories, and kitchen notes worth keeping.</h1>
      <p className="lede">Get new recipes, editorial pieces, and practical kitchen guidance as they are published — plus honest buying help when a tool is part of the answer. No invented urgency and no pay-to-rank recommendations.</p>
      <div className="standalone-form">
        <NewsletterForm source="field-notes" buttonLabel="Join Field Notes" />
      </div>
    </div>
  );
}
