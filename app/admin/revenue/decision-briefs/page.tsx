import type { Metadata } from "next";
import Link from "next/link";
import { getD1Binding } from "../../../../db/index.ts";
import { listDecisionBriefRequests, type DecisionBriefRequest } from "../../../../db/decision-brief-repository.ts";
import { requireMarketplaceAdministrator } from "../../../marketplace-authorization.ts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Decision Brief Queue", robots: { index: false, follow: false } };

export default async function DecisionBriefQueuePage() {
  await requireMarketplaceAdministrator("/admin/revenue/decision-briefs");
  let briefs: DecisionBriefRequest[] = [];
  let configured = true;
  try { briefs = await listDecisionBriefRequests(getD1Binding()); } catch { configured = false; }
  return <div className="partner-hunt">
    <header><p>Founder-only · paid pilot operations</p><h1>Decision Brief Queue</h1><p><Link href="/admin/revenue">← Revenue Operations</Link></p></header>
    {!configured ? <p>Decision brief storage is not configured.</p> : briefs.length === 0 ? <p>No decision brief requests yet.</p> : <table><thead><tr><th>Status</th><th>Customer</th><th>Equipment</th><th>Urgency</th><th>Payment</th><th>Created</th></tr></thead><tbody>{briefs.map((brief) => <tr key={brief.id}><td><strong>{brief.status.replaceAll("_", " ")}</strong><br /><small>{brief.id}</small></td><td>{brief.firstName}<br /><a href={`mailto:${brief.email}`}>{brief.email}</a>{brief.businessName ? <><br />{brief.businessName}</> : null}</td><td>{brief.equipmentType}{brief.manufacturer ? <><br />{brief.manufacturer} {brief.modelNumber}</> : null}<details><summary>Problem</summary><p>{brief.problemSummary}</p>{brief.evidenceSummary ? <p><strong>Evidence:</strong> {brief.evidenceSummary}</p> : null}</details></td><td>{brief.urgency}</td><td>{brief.status === "awaiting_payment" ? "Unverified" : `$${(brief.amountCents / 100).toFixed(2)} ${brief.currency}`}<br /><small>{brief.paidAt || "—"}</small></td><td>{brief.createdAt}</td></tr>)}</tbody></table>}
  </div>;
}
