import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildBlastChillerPublicProof } from "../app/home/decision-proof.ts";

const panel = await readFile(new URL("../app/components/DecisionProofPanel.tsx", import.meta.url), "utf8");
const intake = await readFile(new URL("../app/components/HomepageIntake.tsx", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");

test("public proof preserves unknown costs and blocks an unjustified recommendation", () => {
  const proof = buildBlastChillerPublicProof();
  const factory = proof.routes.find((route) => route.route === "factory_direct");
  assert.equal(factory.cost, "Expected total unknown");
  assert.match(factory.detail, /product price only; missing costs remain unknown/);
  assert.equal(proof.verdict, "VERIFY_FIRST");
  assert.equal(proof.recommendationState, "verify_first");
  assert.equal(proof.bestOption, "No recommendation yet");
  assert.doesNotMatch(JSON.stringify(proof), /guaranteed|you save|recommended savings/i);
});

test("synthetic identity and evidence confidence are explicit", () => {
  const proof = buildBlastChillerPublicProof();
  assert.equal(proof.synthetic, true);
  assert.equal(proof.confidence, "insufficient");
  assert.match(proof.evidenceSummary, /synthetic claims/);
  assert.match(proof.evidenceSummary, /unverified/);
  assert.match(proof.evidenceSummary, /no network lookup/);
  assert.ok(proof.missingInformation.length >= 6);
});

test("result architecture exposes the full case file without chatbot presentation", () => {
  for (const copy of ["Problem summary", "Identified equipment", "What we know", "What we don’t know", "Available routes", "Risk gates", "Best option", "Cheapest viable option", "Expected total cost", "Evidence"])
    assert.match(panel, new RegExp(copy));
  for (const state of ["Evidence incomplete", "Verify first", "Recommendation available", "No viable route found"])
    assert.match(panel, new RegExp(state));
  assert.doesNotMatch(panel, /chat-bubble|assistant-avatar|typing-indicator/);
  assert.doesNotMatch(panel, /cg-decision-proof[^>]*aria-live/);
  assert.match(intake, /homepage-intake-status[^>]*aria-live="polite"/);
});

test("canonical public intake does not expose the synthetic proof control", () => {
  assert.doesNotMatch(intake, /Load synthetic case|Synthetic demo/);
  assert.doesNotMatch(intake, /selectedProof|buildBlastChillerPublicProof/);
  assert.match(intake, /onDecisionProof\?\.\(null\)/);
  assert.match(page, /decisionProof && <DecisionProofPanel/);
});

test("commercial information stays structurally separate from recommendation output", () => {
  const proof = buildBlastChillerPublicProof();
  assert.match(proof.commercialSummary, /excluded from the verdict/);
  assert.match(panel, /cg-commercial-boundary/);
  assert.doesNotMatch(proof.explanation, /commission|affiliate|payout|revenue/);
});

test("decision ledger stacks at mobile widths without fixed result columns", () => {
  assert.match(css, /@media \(max-width: 32rem\)[\s\S]*\.cg-route-file li \{ grid-template-columns: 2rem 1fr/);
  assert.match(css, /\.cg-route-file em \{ grid-column: 2; text-align: left; \}/);
  assert.doesNotMatch(css, /\.cg-decision-proof[^}]*width:\s*[4-9]\d\dpx/);
});
