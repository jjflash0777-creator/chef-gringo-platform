import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterForm } from "../components/NewsletterForm";

export const metadata: Metadata = { title: "Senior Living Culinary Director Tools", description: "Practical recipe, production, sanitation, cost, inventory, staffing, dining, and emergency-operation tools." };
const groups = [
  ["Recipe and production", "Recipe scaler", "Production sheet generator"],
  ["Specialized diets", "Specialized Diets", "Menu conversion studio"],
  ["Cleaning and sanitation", "Cleaning schedule builder", "Sanitation audit checklist"],
  ["Cost control", "Portion-cost calculator", "Menu cost snapshot"],
  ["Inventory and ordering", "Order guide builder", "Inventory count sheet"],
  ["Staffing and training", "Shift training cards", "Onboarding checklist"],
  ["Resident dining", "Preference interview guide", "Dining feedback log"],
  ["Emergency operations", "Emergency menu planner", "Outage readiness list"],
];
export default function ToolsPage() {
  return <div className="page-shell">
    <div className="container"><p className="breadcrumbs"><a href="/">Home</a> / Culinary Director Tools</p><p className="eyebrow">For the professional kitchen</p><h1>Tools that earn their spot on the clipboard.</h1><p className="lede">Practical resources for the work behind a reliable senior-living dining program. The scaler and Specialized Diets landing page are live; everything else is clearly marked in development.</p></div>
    <div className="container resource-grid">{groups.map(([group, ...tools]) => <section className="resource-card" key={group}><h2>{group}</h2>{tools.map((tool) => tool === "Recipe scaler" ? <Link href="/tools/recipe-scaler" key={tool}><strong>{tool}</strong><span className="status active">Ready now</span></Link> : tool === "Specialized Diets" ? <Link href="/specialized-diets" key={tool}><strong>{tool}</strong><span className="status active">Preview</span></Link> : <div key={tool}><strong>{tool}</strong><span className="status">Upcoming</span></div>)}</section>)}</div>
    <section className="container signup-panel"><div><p className="eyebrow light">Professional freebie</p><h2>Get the free Culinary Director Starter Pack.</h2><p>Join for practical resources as they are tested and released.</p></div><NewsletterForm source="professional-starter-pack" buttonLabel="Join the professional list" /></section>
  </div>;
}
