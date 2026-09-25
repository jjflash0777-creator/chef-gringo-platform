import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Repair or Replace",
  description: "Chef Gringo equipment decision support for food-service operators.",
  robots: { index: false, follow: false },
};

export default function RepairOrReplacePage() {
  return (
    <div className="page-shell container narrow decision-brief-page">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Repair or replace</p>
      <p className="eyebrow">Equipment decision support</p>
      <h1>Repair it, replace it, or stop spending?</h1>
      <p className="lead">Start with the operating problem, not a checkout screen. Chef Gringo can help organize the evidence, compare the practical routes, identify the missing information, and show what deserves attention next.</p>

      <section className="decision-brief-offer" aria-label="Decision support approach">
        <div><strong>Problem first</strong><span>Describe the equipment, failure, age, repair history, and operational impact.</span></div>
        <div><strong>Evidence next</strong><span>Use quotes, model numbers, service notes, photos, and replacement options when available.</span></div>
        <div><strong>Action last</strong><span>Repair, replace, source alternatives, gather more evidence, or wait.</span></div>
      </section>

      <h2>Start with the equipment records already researched</h2>
      <p>Chef Gringo is not selling a decision brief here. Use the researched repair, maintenance, and replacement records to narrow the next step.</p>
      <p><Link className="cg-button cg-button-primary" href="/marketplace?goal=replace-or-repair-equipment">Open repair & replacement research →</Link></p>
    </div>
  );
}
