import { getD1Binding } from "../../../../db/index.ts";
import { getRevenueSummary } from "../../../../db/revenue-operations-repository.ts";
import { requireMarketplaceAdministrator } from "../../../marketplace-authorization";
import { applicationPriority } from "../../../growth/application-priority";
import { chefGringoApplicationProfile } from "../../../growth/application-profile";
import { partnerHuntFixtures } from "../../../growth/partner-hunt-fixtures";
import { readiness } from "../../../growth/partner-hunt";
import { getEmailCaptureHealth } from "../../../lib/engagement/emailHealth";
import { PartnerHuntWorkspace } from "./PartnerHuntWorkspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Partner Hunt", robots: { index: false, follow: false } };

const value = (input: string | number | null) => (input === null ? "Unknown" : String(input));

async function getAnalyticsPersistenceHealth() {
  try {
    await getRevenueSummary(getD1Binding());
    return {
      status: "READY",
      detail: "First-party commercial events and revenue-operation summaries are backed by the configured D1 store.",
    } as const;
  } catch {
    return {
      status: "NOT CONFIGURED",
      detail: "Durable commercial analytics are unavailable until the D1 binding and revenue-operation schema are available in this runtime.",
    } as const;
  }
}

export default async function PartnerHuntPage() {
  await requireMarketplaceAdministrator("/admin/marketplace/partners");

  const profile = chefGringoApplicationProfile();
  const email = getEmailCaptureHealth();
  const analytics = await getAnalyticsPersistenceHealth();

  return (
    <main className="partner-hunt">
      <header>
        <p>Founder-only · durable partner workflow</p>
        <h1>Partner Hunt</h1>
        <p>Customer value first. Commercial opportunity second. Evidence before verification.</p>
      </header>

      <section className="score-separation" aria-label="Launch health">
        <article>
          <span>Email capture</span>
          <strong>{email.status}</strong>
          <p>{email.detail} Credentials are never displayed.</p>
        </article>
        <article>
          <span>Analytics persistence</span>
          <strong>{analytics.status}</strong>
          <p>{analytics.detail}</p>
        </article>
      </section>

      <details open>
        <summary>Reusable affiliate application profile</summary>
        <dl>
          <div><dt>Brand</dt><dd>{profile.brandName}</dd></div>
          <div><dt>Website</dt><dd>{value(profile.websiteUrl)}</dd></div>
          <div><dt>Contact</dt><dd>{profile.publicContactEmail}</dd></div>
          <div><dt>Business</dt><dd>{profile.businessDescription}</dd></div>
          <div><dt>Audience</dt><dd>{profile.targetAudience}</dd></div>
          <div><dt>Approach</dt><dd>{profile.recommendationApproach}</dd></div>
          <div><dt>Disclosure</dt><dd>{value(profile.disclosureUrl)}</dd></div>
          <div><dt>Active channels</dt><dd>{profile.promotionalChannels.join(" · ")}</dd></div>
          <div><dt>Traffic / email / social metrics</dt><dd>Unknown / Unknown / Unknown</dd></div>
        </dl>
      </details>

      <section aria-labelledby="priority-board-title">
        <h2 id="priority-board-title">What should I pursue next?</h2>
        <div className="opportunity-board">
          {partnerHuntFixtures.map((record) => {
            const apply = readiness(record, "apply");
            return (
              <article className="opportunity-card" key={`priority:${record.id}`}>
                <span>{applicationPriority(record)}</span>
                <h3>{record.providerName}</h3>
                <p><strong>Program:</strong> {record.programType}</p>
                <p><strong>Lane:</strong> {record.commercialLane}</p>
                <p><strong>Application/contact route:</strong> {value(record.contactOrApplicationRoute)}</p>
                <p><strong>Evidence:</strong> {record.evidence.length ? `${record.evidence.length} item(s)` : "None"}</p>
                <p><strong>Next required action:</strong> {apply.missing[0] ?? "Founder review before submission"}</p>
              </article>
            );
          })}
        </div>
      </section>

      <PartnerHuntWorkspace />
    </main>
  );
}
