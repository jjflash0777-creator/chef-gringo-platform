import Link from "next/link";
import { getD1Binding } from "../../../db/index.ts";
import { getRevenueSummary, listPartnerOpportunities, type PersistedPartner, type RevenueSummary } from "../../../db/revenue-operations-repository.ts";
import { chefGringoApplicationProfile } from "../../growth/application-profile";
import { requireMarketplaceAdministrator } from "../../marketplace-authorization";
import { RevenueOperationsDashboard } from "./RevenueOperationsDashboard";

export const dynamic = "force-dynamic";
export const metadata={title:"Revenue Operations",robots:{index:false,follow:false}};

export default async function RevenueOperationsPage() {
  await requireMarketplaceAdministrator("/admin/revenue");
  let partners: PersistedPartner[] = [];
  let summary: RevenueSummary | null = null;
  let storageStatus: "READY" | "NOT CONFIGURED" = "NOT CONFIGURED";
  try {
    const db = getD1Binding();
    [partners, summary] = await Promise.all([listPartnerOpportunities(db), getRevenueSummary(db)]);
    storageStatus = "READY";
  } catch {}
  const profile = chefGringoApplicationProfile();
  return <main className="partner-hunt">
    <header><p>Founder-only · durable first-party operations</p><h1>Revenue Operations</h1><p>What is making money, what is earning attention, and what should move next—without invented numbers.</p><p><Link href="/admin/revenue/decision-briefs">Open paid decision brief queue →</Link></p></header>
    <details><summary>Reusable application profile</summary><p><strong>{profile.brandName}</strong> · {profile.websiteUrl ?? "Website URL not configured"} · {profile.publicContactEmail}</p><p>{profile.businessDescription}</p><p><strong>Audience:</strong> {profile.targetAudience}</p><p><strong>Founder/operator positioning:</strong> Built from front- and back-of-house hospitality operating experience.</p><p><strong>Method:</strong> {profile.recommendationApproach}</p><p><strong>Disclosure:</strong> {profile.disclosureUrl ?? "Disclosure URL unavailable until the site URL is configured"}</p><p><strong>Channels:</strong> {profile.promotionalChannels.join(" · ")}</p><p><strong>Verified metrics:</strong> Unknown until measured by the first-party event store.</p></details>
    <RevenueOperationsDashboard partners={partners} summary={summary} storageStatus={storageStatus} />
    <RevenueBreakdowns summary={summary} />
  </main>;
}

function RevenueBreakdowns({ summary }: { summary: RevenueSummary | null }) {
  const sections = [["Revenue / commission by partner", summary?.byPartner], ["Commercial intent by content", summary?.byContent], ["Acquisition channels", summary?.byChannel]] as const;
  return <section aria-label="Attributed revenue breakdowns">{sections.map(([title, items]) => <article key={title}><h2>{title}</h2>{items?.length ? <table><thead><tr><th>Identifier</th><th>Events</th><th>Sales</th><th>Known sales</th><th>Known commission</th></tr></thead><tbody>{items.map((item) => <tr key={item.key}><td>{item.key}</td><td>{item.events}</td><td>{item.sales}</td><td>{item.salesAmountCents === null ? "Unknown" : `$${(item.salesAmountCents / 100).toFixed(2)}`}</td><td>{item.commissionAmountCents === null ? "Unknown" : `$${(item.commissionAmountCents / 100).toFixed(2)}`}</td></tr>)}</tbody></table> : <p>Insufficient attributed data.</p>}</article>)}</section>;
}
