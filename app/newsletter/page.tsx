import type { Metadata } from "next";
import { NewsletterForm } from "../components/NewsletterForm";
export const metadata: Metadata = { title: "Newsletter", description: "Get practical Chef Gringo recipe makeovers and culinary tools by email." };
export default function NewsletterPage() { return <div className="page-shell container narrow">
  <p className="breadcrumbs"><a href="/">Home</a> / Newsletter</p><p className="eyebrow">A useful email, not another kitchen fire</p><h1>Get practical makeovers and tools.</h1><p className="lede">Start with “10 Favorite Comfort Foods Made Easier to Fit,” then hear about tested recipes and professional tools as they are released.</p>
  <div className="standalone-form"><NewsletterForm source="newsletter-page" buttonLabel="Join the Chef Gringo list" /></div>
</div>; }
