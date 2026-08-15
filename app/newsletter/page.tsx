import type { Metadata } from "next";
import { NewsletterForm } from "../components/NewsletterForm";

export const metadata: Metadata = {
  title: "Chef Gringo Field Notes",
  description: "Practical Chef Gringo cooking, purchasing, equipment, and operator intelligence by email.",
};

export default function NewsletterPage() {
  return (
    <div className="page-shell container narrow">
      <p className="breadcrumbs"><a href="/">Home</a> / Field Notes</p>
      <p className="eyebrow">Chef Gringo Field Notes</p>
      <h1>Useful intelligence for the next thing you cook, buy, fix, or run.</h1>
      <p className="lede">Get practical cooking missions, equipment and purchasing investigations, operator tools, new downloads, and the strongest Chef Gringo findings as they are published. No invented urgency and no pay-to-rank recommendations.</p>
      <div className="standalone-form">
        <NewsletterForm source="field-notes" buttonLabel="Join Field Notes" />
      </div>
    </div>
  );
}
