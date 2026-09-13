"use client";
import { useMemo, useState } from "react";
import {
  applicationPriority,
  knownCommercialPotential,
} from "../../growth/application-priority";
import {
  readiness,
  PROGRAM_RELATIONSHIP_TYPES,
} from "../../growth/partner-hunt";
import { COMMERCIAL_LANES } from "../../growth/types";
import type {
  PersistedPartner,
  RevenueSummary,
  ThermoWorksAnalytics,
} from "../../../db/revenue-operations-repository";
const money = (value: number | null) =>
  value === null
    ? "Unknown"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value / 100);
const count = (value: number) => value.toLocaleString();
export function RevenueOperationsDashboard({
  partners,
  summary,
  thermoWorks,
  storageStatus,
}: {
  partners: PersistedPartner[];
  summary: RevenueSummary | null;
  thermoWorks: ThermoWorksAnalytics | null;
  storageStatus: "READY" | "NOT CONFIGURED";
}) {
  const [lane, setLane] = useState("all"),
    [program, setProgram] = useState("all"),
    [lifecycle, setLifecycle] = useState("all"),
    [priority, setPriority] = useState("all"),
    [sort, setSort] = useState("priority");
  const shown = useMemo(
    () =>
      partners
        .filter(
          (record) =>
            (lane === "all" || record.commercialLane === lane) &&
            (program === "all" || record.programType === program) &&
            (lifecycle === "all" || record.lifecycle === lifecycle) &&
            (priority === "all" || applicationPriority(record) === priority),
        )
        .sort((a, b) =>
          sort === "commercial"
            ? (knownCommercialPotential(b) ?? -1) -
              (knownCommercialPotential(a) ?? -1)
            : applicationPriority(a).localeCompare(applicationPriority(b)) ||
              a.providerName.localeCompare(b.providerName),
        ),
    [partners, lane, program, lifecycle, priority, sort],
  );
  const events = summary?.eventCounts;
  return (
    <div className="revenue-operations">
      <section className="score-separation">
        <article>
          <span>Revenue storage</span>
          <strong>{storageStatus}</strong>
          <p>
            {storageStatus === "READY"
              ? "Existing D1 repository available."
              : "D1 is not bound. No durable operational data can be loaded."}
          </p>
        </article>
        <article>
          <span>Verified revenue</span>
          <strong>{money(summary?.paidCommissionCents ?? null)}</strong>
          <p>No amount appears unless recorded by an authorized operator.</p>
        </article>
      </section>
      <section aria-labelledby="revenue-title">
        <h2 id="revenue-title">Revenue and conversion ledger</h2>
        <div className="score-separation">
          <article>
            <span>Sales</span>
            <strong>{events ? count(events.sale) : "Unknown"}</strong>
            <p>
              Known sales amount: {money(summary?.salesAmountCents ?? null)}
            </p>
          </article>
          <article>
            <span>Commission</span>
            <strong>{money(summary?.approvedCommissionCents ?? null)}</strong>
            <p>
              Pending {money(summary?.pendingCommissionCents ?? null)} · Paid{" "}
              {money(summary?.paidCommissionCents ?? null)}
            </p>
          </article>
          <article>
            <span>Commercial intent</span>
            <strong>
              {events
                ? count(events.merchant_click + events.affiliate_click)
                : "Unknown"}
            </strong>
            <p>Merchant and affiliate clicks only.</p>
          </article>
        </div>
      </section>
      <ThermoWorksPerformance analytics={thermoWorks} />
      <section aria-labelledby="traffic-title">
        <h2 id="traffic-title">Traffic and conversions</h2>
        <dl>
          <div>
            <dt>Page views</dt>
            <dd>{events ? count(events.page_view) : "Unknown"}</dd>
          </div>
          <div>
            <dt>Content views</dt>
            <dd>{events ? count(events.content_view) : "Unknown"}</dd>
          </div>
          <div>
            <dt>Recommendation views</dt>
            <dd>{events ? count(events.recommendation_view) : "Unknown"}</dd>
          </div>
          <div>
            <dt>Email signups</dt>
            <dd>{events ? count(events.email_signup) : "Unknown"}</dd>
          </div>
          <div>
            <dt>Leads</dt>
            <dd>{events ? count(events.lead) : "Unknown"}</dd>
          </div>
          <div>
            <dt>Affiliate-click conversion</dt>
            <dd>
              {summary?.affiliateClickToSaleRate === null ||
              summary?.affiliateClickToSaleRate === undefined
                ? "Insufficient data"
                : `${(summary.affiliateClickToSaleRate * 100).toFixed(1)}%`}
            </dd>
          </div>
        </dl>
        <p>
          Top content, recommendations, partners, and acquisition channels
          remain insufficient until attributed events exist.
        </p>
      </section>
      <section aria-labelledby="portfolio-title">
        <h2 id="portfolio-title">Portfolio application queue</h2>
        <div className="hunt-toolbar">
          <label>
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="all">All</option>
              {[...new Set(partners.map(applicationPriority))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Lane
            <select
              value={lane}
              onChange={(event) => setLane(event.target.value)}
            >
              <option value="all">All</option>
              {COMMERCIAL_LANES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Program
            <select
              value={program}
              onChange={(event) => setProgram(event.target.value)}
            >
              <option value="all">All</option>
              {PROGRAM_RELATIONSHIP_TYPES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Lifecycle
            <select
              value={lifecycle}
              onChange={(event) => setLifecycle(event.target.value)}
            >
              <option value="all">All</option>
              {[...new Set(partners.map((record) => record.lifecycle))].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <label>
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="priority">Priority</option>
              <option value="commercial">Known commercial value</option>
            </select>
          </label>
        </div>
        {shown.length ? (
          <div className="opportunity-board">
            {shown.map((record) => (
              <PortfolioCard key={record.id} record={record} />
            ))}
          </div>
        ) : (
          <p>
            No partner opportunities match these filters. Empty means no stored
            candidates—not zero opportunity.
          </p>
        )}
      </section>
    </div>
  );
}
function ThermoWorksPerformance({
  analytics,
}: {
  analytics: ThermoWorksAnalytics | null;
}) {
  const percent = (value: number | null) =>
    value === null ? "Not enough data" : `${(value * 100).toFixed(1)}%`;
  return (
    <section
      className="thermoworks-performance"
      aria-labelledby="thermoworks-title"
    >
      <header>
        <p>Affiliate performance</p>
        <h2 id="thermoworks-title">ThermoWorks</h2>
        <p>
          Visitor click-through is unique visitors who clicked divided by unique
          visitors to the ThermoWorks page.
        </p>
      </header>
      {analytics ? (
        <>
          <div className="thermoworks-periods">
            {analytics.windows.map((window) => (
              <article key={window.days}>
                <span>Last {window.days} days</span>
                <strong>{percent(window.clickThroughRate)}</strong>
                <dl>
                  <div>
                    <dt>Page views</dt>
                    <dd>{count(window.pageViews)}</dd>
                  </div>
                  <div>
                    <dt>Unique visitors</dt>
                    <dd>{count(window.uniqueVisitors)}</dd>
                  </div>
                  <div>
                    <dt>Affiliate clicks</dt>
                    <dd>{count(window.affiliateClicks)}</dd>
                  </div>
                  <div>
                    <dt>Unique clickers</dt>
                    <dd>{count(window.uniqueClickers)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="thermoworks-breakdowns">
            <Breakdown
              title="Clicks by button placement"
              heading="Placement"
              rows={analytics.byPlacement}
            />
            <Breakdown
              title="Clicks by traffic source"
              heading="Source"
              rows={analytics.bySource}
            />
          </div>
        </>
      ) : (
        <p>Analytics storage is unavailable. No values are being estimated.</p>
      )}
    </section>
  );
}

function Breakdown({
  title,
  heading,
  rows,
}: {
  title: string;
  heading: string;
  rows: { key: string; clicks: number }[];
}) {
  return (
    <article>
      <h3>{title}</h3>
      {rows.length ? (
        <table>
          <thead>
            <tr>
              <th>{heading}</th>
              <th>Clicks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{row.key}</td>
                <td>{count(row.clicks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No tracked clicks yet.</p>
      )}
    </article>
  );
}

function PortfolioCard({ record }: { record: PersistedPartner }) {
  const apply = readiness(record, "apply");
  return (
    <article className="opportunity-card">
      <span>
        {applicationPriority(record)} · {record.lifecycle}
      </span>
      <h3>{record.providerName}</h3>
      <p>
        <strong>Program:</strong> {record.programType}
      </p>
      <p>
        <strong>Lane:</strong> {record.commercialLane}
      </p>
      <p>
        <strong>Verification:</strong>{" "}
        {Object.values(record.verification).filter(Boolean).length}/8 checks
      </p>
      <p>
        <strong>Known commercial value:</strong>{" "}
        {money(knownCommercialPotential(record))}
      </p>
      <p>
        <strong>Next:</strong>{" "}
        {apply.missing[0] ?? "Human review before submission"}
      </p>
      <details>
        <summary>Application packet</summary>
        <p>
          <strong>Website:</strong> {record.website}
        </p>
        <p>
          <strong>Application route:</strong>{" "}
          {record.contactOrApplicationRoute ?? "Unknown"}
        </p>
        <p>
          <strong>Why Chef Gringo fits:</strong>{" "}
          {record.customerValueThesis || record.whyItMatters || "Unknown"}
        </p>
        <p>
          <strong>Proposed promotion:</strong>{" "}
          {record.proposedRelationship ?? "Unknown"}
        </p>
        <p>
          <strong>Restrictions:</strong>{" "}
          {record.majorRestrictionsUnderstood ? "Reviewed" : "Review required"}
        </p>
        <p>
          <strong>Evidence:</strong>{" "}
          {record.evidence.length
            ? `${record.evidence.length} source-backed claim(s)`
            : "None"}
        </p>
      </details>
    </article>
  );
}
