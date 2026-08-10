"use client";

import type { PublicDecisionProof } from "../home/decision-proof";

const stateLabels = {
  evidence_incomplete: "Evidence incomplete",
  verify_first: "Verify first",
  recommendation_available: "Recommendation available",
  no_viable_route: "No viable route found",
} as const;

export function DecisionProofPanel({ proof }: { proof: PublicDecisionProof }) {
  return (
    <section className="cg-decision-proof" id="decision-proof" aria-labelledby="decision-proof-title">
      <div className="cg-width-wide">
        <header className="cg-case-header">
          <div><p className="cg-type-operational">Public decision proof · Synthetic case</p><h2 id="decision-proof-title" className="cg-type-display" tabIndex={-1}>The case file is open.</h2></div>
          <div className="cg-case-state"><span>Recommendation state</span><strong>{stateLabels[proof.recommendationState]}</strong><small>Confidence: {proof.confidence}</small></div>
        </header>

        <div className="cg-case-summary">
          <article><span>Problem summary</span><p>{proof.problem}</p></article>
          <article><span>Identified equipment</span><p>{proof.identifiedItem}</p></article>
        </div>

        <div className="cg-evidence-board">
          <article><h3>What we know</h3><ul>{proof.knownFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul></article>
          <article><h3>What we don’t know</h3><ul>{proof.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></article>
        </div>

        <section className="cg-route-file" aria-labelledby="route-file-title">
          <header><p className="cg-type-operational">Decision ledger</p><h3 id="route-file-title">Available routes</h3></header>
          <ol>{proof.routes.map((route, index) => <li key={route.route} className={`cg-route-${route.availability}`}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{route.label}</small><strong>{route.status}</strong><p>{route.detail}</p></div><em>{route.cost}</em></li>)}</ol>
        </section>

        <section className="cg-case-checks" aria-labelledby="case-checks-title">
          <header><p className="cg-type-operational">Risk gates</p><h3 id="case-checks-title">Compatibility, compliance, service, and source checks</h3></header>
          <dl>{proof.checks.map((check) => <div key={check.label}><dt>{check.label}</dt><dd><span>{check.status === "unknown" ? "Unknown" : check.status}</span>{check.detail}</dd></div>)}</dl>
        </section>

        <section className="cg-case-verdict" aria-labelledby="case-verdict-title">
          <div><p className="cg-type-operational">Chef Gringo verdict</p><h3 id="case-verdict-title">{proof.verdictLabel}</h3><p>{proof.explanation}</p></div>
          <dl><div><dt>Best option</dt><dd>{proof.bestOption}</dd></div><div><dt>Cheapest viable option</dt><dd>{proof.cheapestViableOption}</dd></div><div><dt>Expected total cost</dt><dd>{proof.expectedTotalCost}</dd></div><div><dt>Evidence</dt><dd>{proof.evidenceSummary}</dd></div></dl>
        </section>

        <aside className="cg-commercial-boundary" aria-label="Commercial relationship boundary"><strong>Commercial opportunity</strong><p>{proof.commercialSummary}</p></aside>
      </div>
    </section>
  );
}
