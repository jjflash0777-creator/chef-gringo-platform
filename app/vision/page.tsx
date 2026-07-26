import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "The Vision", description: "Chef Gringo’s long-term vision as a trusted operating system and career ecosystem for hospitality." };
const pillars = ["Home Cooking", "Culinary Arts", "Professional Kitchens", "Fine Dining", "Wine and Beverage", "Coffee and Espresso", "Food Safety and Certifications", "Careers and Jobs", "Hospitality Academy", "Senior Living and Healthcare Dining", "Food Trucks and Mobile Hospitality", "Catering and Events", "Hospitality Entrepreneurship", "Equipment and Marketplace", "Chef Gringo Pro", "Chef Gringo AI", "Community"];

export default function VisionPage() {
  return <div className="page-shell">
    <div className="container narrow"><p className="breadcrumbs"><Link href="/">Home</Link> / Vision</p><p className="eyebrow">The long-term direction</p><h1>A trusted operating system and career ecosystem for hospitality.</h1><p className="lede">Chef Gringo will help people learn, work, lead, and build businesses across hospitality. Trust, original resources, and practical usefulness come before AI hype, affiliate revenue, or feature count.</p></div>
    <section className="section container"><div className="section-heading"><p className="eyebrow">Future platform pillars</p><h2>A broad vision, built one reliable layer at a time.</h2><p>These are directional pillars—not promises that each product is available today.</p></div><div className="vision-grid">{pillars.map((pillar) => <article key={pillar}><span>Future pillar</span><h3>{pillar}</h3></article>)}</div></section>
    <section className="section dark-section"><div className="container audience-split"><div><p className="eyebrow light">The standard</p><h2>Technology supports hospitality. It does not become the story.</h2></div><div><p>AI may eventually help organize guidance, model scenarios, and reduce administrative work. It will not impersonate professional judgment, conceal uncertainty, or recycle proprietary knowledge.</p><Link className="button button-light" href="/early-access">Join Early Access</Link></div></div></section>
  </div>;
}
