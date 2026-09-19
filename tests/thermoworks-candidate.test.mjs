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

test("ThermoWorks active state is backed by completed verification checks", () => {
  assert.equal(thermoworksCandidate.lifecycle, "active");
  assert.equal(thermoworksCandidate.verification.usEligibilityVerified, true);
  assert.equal(thermoworksCandidate.verification.restrictionsVerified, true);
  assert.equal(thermoworksCandidate.verification.customerValueReviewed, true);
  assert.equal(thermoworksCandidate.majorRestrictionsUnderstood, true);
  assert.equal(readiness(thermoworksCandidate, "apply").ready, true);
  assert.equal(canAppearVerified(thermoworksCandidate), true);
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
