import type { Metadata } from "next";
import Link from "next/link";
import { DecisionBriefForm } from "./DecisionBriefForm";

export const metadata: Metadata = { title: "Repair or Replace Decision Brief", description: "A chef-led equipment repair-versus-replace decision brief for food-service operators.", robots: { index: false, follow: false } };

export default function RepairOrReplacePage() {
  return <div className="page-shell container narrow decision-brief-page">
    <p className="breadcrumbs"><Link href="/">Home</Link> / Decision brief</p>
    <p className="eyebrow">Limited paid pilot</p>
    <h1>Repair it, replace it, or stop spending?</h1>
    <p className="lead">Send the operating context and evidence. Chef Gringo will produce a written brief comparing the practical routes, expected costs, downtime, risk, and the next action that makes the most sense.</p>
    <section className="decision-brief-offer" aria-label="Service terms">
      <div><strong>$99</strong><span>one-time pilot price</span></div>
      <div><strong>2 business days</strong><span>after sufficient evidence arrives</span></div>
      <div><strong>Full refund</strong><span>if the evidence is insufficient before substantive work starts</span></div>
    </section>
    <h2>Start the decision brief</h2>
    <p>Submitting this form creates your case. Stripe will handle the test checkout next. A redirect alone does not prove payment; Chef Gringo verifies payment separately.</p>
    <DecisionBriefForm />
  </div>;
}
