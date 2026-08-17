import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Decision Brief Request Received", robots: { index: false, follow: false } };

export default function DecisionBriefConfirmationPage() {
  return <div className="page-shell container narrow decision-brief-page">
    <p className="eyebrow">Request received</p>
    <h1>Stripe returned you to Chef Gringo.</h1>
    <p className="lead">This page confirms the redirect—not payment. Chef Gringo marks the request paid only after Stripe sends a signed payment confirmation.</p>
    <div className="notice"><strong>What happens next:</strong> If the sandbox payment was successful, the founder queue will show the case as paid. No real money moves while this workflow remains in Stripe sandbox mode.</div>
    <p><Link className="cg-button cg-button-secondary" href="/">Return home</Link></p>
  </div>;
}
