import assert from "node:assert/strict";
import test from "node:test";
import { thermoworksCandidate } from "../app/growth/partner-candidates.ts";
import { applicationPriority } from "../app/growth/application-priority.ts";
import { canAppearVerified, readiness } from "../app/growth/partner-hunt.ts";

test("ThermoWorks is real research, not a synthetic fixture", () => {
  assert.equal(thermoworksCandidate.synthetic, false);
  assert.equal(thermoworksCandidate.providerName, "ThermoWorks");
  assert.equal(thermoworksCandidate.verification.identityVerified, true);
  assert.equal(thermoworksCandidate.verification.programExists, true);
});

test("verified economics remain limited to official public claims", () => {
  assert.equal(thermoworksCandidate.economics.revenueSharePercent, 10);
  assert.equal(thermoworksCandidate.economics.attributionWindowDays, 30);
  assert.equal(thermoworksCandidate.economics.payoutThresholdCents, null);
  assert.equal(thermoworksCandidate.economics.clawbackRules, null);
});

test("ThermoWorks cannot become apply-now before unresolved eligibility and restriction review", () => {
  assert.equal(readiness(thermoworksCandidate, "apply").ready, false);
  assert.equal(applicationPriority(thermoworksCandidate), "VERIFY FIRST");
  assert.equal(canAppearVerified(thermoworksCandidate), true);
  assert.equal(thermoworksCandidate.verification.usEligibilityVerified, false);
  assert.equal(thermoworksCandidate.verification.restrictionsVerified, false);
  assert.equal(thermoworksCandidate.majorRestrictionsUnderstood, false);
});

test("every automatic commercial claim retains first-party provenance", () => {
  assert.ok(thermoworksCandidate.evidence.length >= 5);
  for (const evidence of thermoworksCandidate.evidence) {
    assert.equal(evidence.sourceType, "provider_terms");
    assert.match(evidence.sourceUrl, /^https:\/\/(?:www\.)?(?:affiliates\.)?thermoworks\.com\//);
    assert.equal(evidence.verificationState, "verified");
    assert.equal(evidence.contradiction, false);
  }
});
