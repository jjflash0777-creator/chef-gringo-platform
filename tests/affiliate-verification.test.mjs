import assert from "node:assert/strict";
import test from "node:test";
import { canAppearVerified, readiness } from "../app/growth/partner-hunt.ts";
import { attachPartnerEvidence } from "../scripts/affiliate-worker/evidence.mjs";
import { createDiscoveredPartnerCandidate } from "../scripts/affiliate-worker/run.mjs";
import { applyPartnerVerification, evaluatePartnerVerification } from "../scripts/affiliate-worker/verification.mjs";

const toast = () => createDiscoveredPartnerCandidate({ providerName: "Toast", website: "https://pos.toasttab.com" });
const finding = (overrides = {}) => ({
  sourceUrl: "https://pos.toasttab.com/advocates",
  sourceType: "provider_terms",
  retrievedAt: "2026-08-11",
  claimType: "program_exists",
  claim: "Toast publicly operates a referral program called Toast Advocates.",
  confidence: "moderate",
  verificationState: "verified",
  notes: "Official Toast-controlled public program page.",
  contradiction: false,
  ...overrides,
});

test("official verified Toast program evidence verifies only program existence", () => {
  const attached = attachPartnerEvidence(toast(), finding());
  const result = applyPartnerVerification(attached);
  assert.equal(result.record.verification.programExists, true);
  for (const [key, value] of Object.entries(result.record.verification))
    if (key !== "programExists") assert.equal(value, false, `${key} must remain false`);
  assert.deepEqual(result.conflicts, []);
});

test("merely attached unverified Toast evidence does not verify program existence", () => {
  const attached = attachPartnerEvidence(toast(), finding({ verificationState: "unverified" }));
  assert.equal(evaluatePartnerVerification(attached).checklist.programExists, false);
});

test("third-party payout claim cannot verify payout", () => {
  const attached = attachPartnerEvidence(toast(), finding({
    sourceUrl: "https://affiliate-blog.example/toast-payout",
    sourceType: "editorial_note",
    claimType: "payout",
    claim: "A third-party blog claims Toast pays $1,000.",
  }));
  assert.equal(evaluatePartnerVerification(attached).checklist.payoutVerified, false);
});

test("third-party URL cannot verify payout even when mislabeled provider terms", () => {
  const attached = attachPartnerEvidence(toast(), finding({ sourceUrl: "https://affiliate-blog.example/toast", sourceType: "provider_terms", claimType: "payout", claim: "Third party repeats a Toast payout." }));
  assert.equal(evaluatePartnerVerification(attached).checklist.payoutVerified, false);
});

test("official verified Toast payout terms can verify payout", () => {
  const attached = attachPartnerEvidence(toast(), finding({
    sourceUrl: "https://pos.toasttab.com/advocates/terms",
    claimType: "payout",
    claim: "Official Toast terms explicitly document the referral payout.",
    confidence: "high",
  }));
  assert.equal(evaluatePartnerVerification(attached).checklist.payoutVerified, true);
});

test("contradictory qualifying evidence keeps the field false and surfaces conflict", () => {
  const supported = attachPartnerEvidence(toast(), finding());
  const disputed = attachPartnerEvidence(supported, finding({
    sourceUrl: "https://pos.toasttab.com/advocates/terms",
    claim: "Official Toast terms state the Advocates program is not currently available.",
    contradiction: true,
  }));
  const evaluation = evaluatePartnerVerification(disputed);
  assert.equal(evaluation.checklist.programExists, false);
  assert.equal(evaluation.conflicts.length, 1);
  assert.equal(evaluation.conflicts[0].claimType, "program_exists");
  assert.match(evaluation.conflicts[0].reason, /unresolved contradiction/);
});

test("customer value requires explicit verified editorial review", () => {
  const program = attachPartnerEvidence(toast(), finding());
  assert.equal(evaluatePartnerVerification(program).checklist.customerValueReviewed, false);
  const reviewed = attachPartnerEvidence(program, finding({
    sourceUrl: "https://chefgringo.example/reviews/toast-customer-value",
    sourceType: "editorial_note",
    claimType: "customer_value",
    claim: "Chef Gringo completed an explicit customer-value review.",
  }));
  assert.equal(evaluatePartnerVerification(reviewed).checklist.customerValueReviewed, true);
});

test("verification application is immutable and readiness remains strict", () => {
  const original = attachPartnerEvidence(toast(), finding());
  const snapshot = structuredClone(original);
  const result = applyPartnerVerification(original);
  assert.deepEqual(original, snapshot);
  assert.notEqual(result.record, original);
  assert.notEqual(result.record.evidence, original.evidence);
  assert.notEqual(result.record.verification, original.verification);
  assert.equal(readiness(result.record, "apply").ready, false);
  assert.equal(readiness(result.record, "outreach").ready, false);
  assert.equal(canAppearVerified(result.record), false);
  assert.match(readiness(result.record, "apply").missing.join(" | "), /Classify the commercial lane/);
});
