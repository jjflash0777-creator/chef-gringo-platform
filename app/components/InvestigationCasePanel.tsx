"use client";

import type { InvestigationCase } from "../home/investigation-case";

const statusLabels: Record<InvestigationCase["status"], string> = {
  NEEDS_INFORMATION: "Needs information",
  INVESTIGATING: "Investigation open",
  PROFESSIONAL_VERIFICATION_REQUIRED: "Professional verification required",
  VERIFY_FIRST: "Verify first",
  READY_FOR_DECISION: "Ready for decision",
  NO_VIABLE_ROUTE: "No viable route",
};

const routeLabels = {
  repair: "Repair",
  domestic: "Domestic replacement",
  used_refurbished: "Used / refurbished",
  factory_direct: "Factory-direct alternative",
  upgrade: "Upgrade",
} as const;

const evidenceLabels = {
  user_provided: "User-provided",
  inferred: "Inferred",
  verified: "Verified",
  unknown: "Unknown",
} as const;

export function InvestigationCasePanel({ investigation }: { investigation: InvestigationCase }) {
  const requiredNow = investigation.evidenceRequirements.filter((item) => item.priority === "required_now");
  const usefulLater = investigation.evidenceRequirements.filter((item) => item.priority === "useful_later");
  return (
    <section className="cg-decision-proof cg-investigation-case" id="investigation-case" aria-labelledby="investigation-case-title">
      <div className="cg-width-wide">
        <header className="cg-case-header">
          <div><p className="cg-type-operational">Real investigation · Ephemeral case</p><h2 id="investigation-case-title" className="cg-type-display" tabIndex={-1}>Here’s what I understood.</h2></div>
          <div className={`cg-case-state cg-investigation-state-${investigation.status.toLowerCase()}`}><span>Investigation state</span><strong>{statusLabels[investigation.status]}</strong><small>No diagnosis or recommendation yet</small></div>
        </header>

        <div className="cg-case-summary">
          <article><span>User problem</span><p>{investigation.userProblem}</p></article>
          <article><span>Equipment identity</span><p>{investigation.equipment.identity ?? "Unknown foodservice equipment"}</p><small>{[investigation.equipment.manufacturer, investigation.equipment.modelNumber].filter(Boolean).join(" · ") || "Manufacturer and model unknown"}</small></article>
        </div>

        <section className="cg-source-ledger" aria-labelledby="source-ledger-title">
          <header><p className="cg-type-operational">Evidence ledger</p><h3 id="source-ledger-title">Claims keep their source and state.</h3></header>
          {investigation.evidence.length ? <ol>{investigation.evidence.map((item) => <li key={item.id}><span className={`cg-evidence-state cg-evidence-${item.state}`}>{evidenceLabels[item.state]}</span><div><strong>{item.claim}</strong><p>{item.source} · {item.confidence} confidence · {item.timestamp.slice(0, 10)}</p>{item.notes.map((note) => <small key={note}>{note}</small>)}</div></li>)}</ol> : <p className="cg-case-empty">No specific operating facts were supplied. Equipment identity and condition remain unknown.</p>}
        </section>

        <div className="cg-evidence-board">
          <article><h3>What we know</h3>{investigation.knownFacts.length ? <ul>{investigation.knownFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul> : <p className="cg-case-empty">No facts are verified or specific enough to rely on yet.</p>}</article>
          <article><h3>What remains unknown</h3><ul>{investigation.unknowns.map((item) => <li key={item}>{item}</li>)}</ul></article>
        </div>

        <section className="cg-evidence-request" aria-labelledby="evidence-request-title">
          <header><p className="cg-type-operational">Next evidence</p><h3 id="evidence-request-title">What Chef Gringo needs next</h3><p>Only the evidence needed to move this case forward is requested now.</p></header>
          <div className="cg-evidence-priority"><article><span>Required now</span>{requiredNow.length ? <ol>{requiredNow.map((item) => <li key={item.id}><strong>{item.label}</strong><p>{item.why}</p></li>)}</ol> : <p>No immediate user evidence is missing.</p>}</article><article><span>Useful later</span>{usefulLater.length ? <ol>{usefulLater.map((item) => <li key={item.id}><strong>{item.label}</strong><p>{item.why}</p></li>)}</ol> : <p>No secondary requests yet.</p>}</article></div>
        </section>

        <section className={`cg-safety-gate cg-safety-${investigation.safety.state}`} aria-labelledby="safety-gate-title">
          <div><p className="cg-type-operational">Safety state</p><h3 id="safety-gate-title">{investigation.safety.state === "safe_observation" ? "Safe observation only" : investigation.safety.state === "do_not_proceed" ? "Do not proceed" : "Professional verification required"}</h3><p>{investigation.safety.reason}</p></div>
          <ul>{investigation.safety.allowedActions.map((action) => <li key={action}>{action}</li>)}</ul>
        </section>

        <section className="cg-route-file" aria-labelledby="real-route-file-title">
          <header><p className="cg-type-operational">Candidate routes</p><h3 id="real-route-file-title">Routes are visible, not yet recommended.</h3></header>
          <ol>{investigation.candidateRoutes.map((route, index) => <li key={route.route} className="cg-route-not_evaluated"><span>{String(index + 1).padStart(2, "0")}</span><div><small>{routeLabels[route.route]}</small><strong>Not ready</strong><p>{route.rationale}</p></div><em>Evidence required</em></li>)}</ol>
        </section>

        <section className="cg-investigation-plan" aria-labelledby="investigation-plan-title">
          <header><p className="cg-type-operational">Investigation plan</p><h3 id="investigation-plan-title">The next steps stay constrained.</h3></header>
          <ol>{investigation.investigationPlan.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}</ol>
        </section>

        <section className="cg-case-verdict" aria-labelledby="readiness-title">
          <div><p className="cg-type-operational">Decision readiness</p><h3 id="readiness-title">{statusLabels[investigation.status]}</h3><p>{investigation.status === "PROFESSIONAL_VERIFICATION_REQUIRED" ? "The requested diagnostic step crosses a safety boundary. A qualified professional must verify the operating state before the case can advance." : "The case can advance when the required evidence is supplied. No cause, repair, replacement, or savings claim has been established."}</p></div>
          <dl><div><dt>Diagnosis</dt><dd>Unknown</dd></div><div><dt>Recommendation</dt><dd>No recommendation yet</dd></div><div><dt>Verified facts</dt><dd>{investigation.verifiedFacts.length}</dd></div><div><dt>Persistence</dt><dd>Ephemeral · nothing saved</dd></div></dl>
        </section>
      </div>
    </section>
  );
}
