import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy", description: "Chef Gringo privacy notice." };

export default function PrivacyPage() {
  return <div className="page-shell container narrow"><p className="breadcrumbs"><Link href="/">Home</Link> / Privacy</p><p className="eyebrow">Privacy notice</p><h1>Collect less. Explain more.</h1><div className="prose">
    <p>Chef Gringo collects information entered in early-access and newsletter forms, and in paid decision-brief requests. Decision-brief information may include contact and business details, equipment information, problem descriptions, evidence summaries, urgency, consent, and payment-status metadata.</p>
    <h2>How information is used</h2><p>Submitted information is used to deliver the requested service, operate the requested list, understand audience needs, and send relevant updates only when marketing consent is provided. It is not sold as a list.</p>
    <h2>Service and payment processing</h2><p>Decision-brief records are stored in Chef Gringo&apos;s first-party database. Stripe processes payment details; Chef Gringo stores payment status and transaction identifiers, not full card numbers.</p>
    <h2>Email processing</h2><p>Email activity is processed through Loops when connected. Chef Gringo retains the source and consent metadata. Purchasing a service does not automatically subscribe a customer to marketing.</p>
    <h2>Current limitation</h2><p>If an integration is not configured, the site reports that the request is unavailable and does not claim that it was saved.</p>
    <h2>Contact and updates</h2><p>This notice will be updated before materially different data collection is introduced. Privacy questions can be sent to <a href="mailto:hello@chefgringo.com">hello@chefgringo.com</a>.</p>
  </div></div>;
}
