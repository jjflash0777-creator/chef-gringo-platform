import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterForm } from "../components/NewsletterForm";

export const metadata: Metadata = { title: "Culinary Director Operator Kit", description: "Practical production, menu, inventory, scheduling, sanitation, cost, resident-dining, and emergency-operation systems." };
const groups = [
  ["Menu + production", "5-week cycle menu framework", "Recipe scaler", "Production sheet generator", "Prep and pull sheets"],
  ["Inventory + ordering", "Inventory and par workbook", "Order guide builder", "Receiving and inventory count sheets"],
  ["Labor + scheduling", "Excel scheduling system", "Daily position plan", "Onboarding checklist"],
  ["Cost control", "Portion-cost calculator", "Menu cost snapshot", "Waste and variance tracker"],
  ["Safety + sanitation", "Cleaning schedule builder", "Temperature logs", "Sanitation audit checklist"],
  ["Resident dining", "Preference interview guide", "Dining feedback log", "Special-event planning sheet"],
  ["Emergency operations", "Emergency menu planner", "Outage readiness list", "Emergency inventory framework"],
];
export default function ToolsPage() {
  return <div className="page-shell">
    <div className="container"><p className="breadcrumbs"><a href="/">Home</a> / Operator Kits / Culinary Director</p><p className="eyebrow">Flagship Operator Kit</p><h1>Stop rebuilding the same kitchen systems from scratch.</h1><p className="lede">The Culinary Director Operator Kit is being built as a practical operating system for senior-living and high-volume culinary leaders: menu cycles, production, inventory, scheduling, sanitation, cost control, resident dining, and emergency readiness in one coherent system.</p><div className="button-row"><Link className="button" href="/tools/recipe-scaler">Use the live recipe scaler</Link><a className="button secondary" href="#starter-pack">Get release updates</a></div></div>
    <div className="container resource-grid">{groups.map(([group,...tools]) => <section className="resource-card" key={group}><h2>{group}</h2>{tools.map(tool => tool === "Recipe scaler" ? <Link href="/tools/recipe-scaler" key={tool}><strong>{tool}</strong><span className="status active">Ready now</span></Link> : <div key={tool}><strong>{tool}</strong><span className="status">In development</span></div>)}</section>)}</div>
    <section className="container signup-panel" id="starter-pack"><div><p className="eyebrow light">Operator Kit release list</p><h2>Get the Culinary Director Starter System as it is released.</h2><p>Join for tested worksheets, spreadsheets, menu systems, and operational tools. We will clearly mark what is live, what is beta, and what is still being built.</p></div><NewsletterForm source="culinary-director-operator-kit" buttonLabel="Join the release list" /></section>
  </div>;
}
