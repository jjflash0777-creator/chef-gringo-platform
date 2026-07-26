import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "../components/Notice";
export const metadata: Metadata = { title: "Senior & Caregiver Kitchen", description: "Practical starting points for easy-to-chew meals, soft foods, lower-sodium comfort food, protein, small appetites, and caregiver prep." };
const categories = [
  ["Easy-to-chew meals", "Tender textures and moisture-forward cooking ideas."],
  ["Soft foods", "Comforting foods that are naturally soft or can be adapted."],
  ["Lower-sodium comfort foods", "Build flavor with aromatics, acidity, and spice."],
  ["Higher-protein meals", "Practical ways to make each bite work harder."],
  ["Smaller-appetite meals", "Appealing, compact portions with less plate overwhelm."],
  ["Caregiver meal prep", "Flexible components for busy weeks and changing needs."],
  ["Hydration-supporting foods", "Soups, fruit, and other foods that can add fluid."],
  ["Favorite-food makeovers", "Start with what they already love."],
];
export default function CaregiverPage() { return <div className="page-shell container">
  <p className="breadcrumbs"><a href="/">Home</a> / Senior & Caregiver Kitchen</p><p className="eyebrow">Respect the person. Keep the pleasure.</p><h1>The senior & caregiver kitchen</h1>
  <p className="lede">A practical place to start when appetite, chewing, time, or dietary goals change. Use the person’s clinical instructions when provided, and keep preferences in the conversation.</p>
  <div className="category-grid">{categories.map(([title, copy]) => <article key={title}><span className="category-dot" /><h2>{title}</h2><p>{copy}</p>{title === "Favorite-food makeovers" ? <Link className="text-link" href="/favorite-food-makeovers">Request a makeover →</Link> : <span className="status">Guides coming next</span>}</article>)}</div>
  <Notice texture />
</div>; }
