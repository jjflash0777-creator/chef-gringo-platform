import assert from "node:assert/strict";
import test from "node:test";
import {
  PARTNER_EVIDENCE_CONFIDENCE_LEVELS,
  PARTNER_EVIDENCE_CLAIM_TYPES,
  PARTNER_EVIDENCE_SOURCE_TYPES,
  PARTNER_EVIDENCE_VERIFICATION_STATES,
} from "../app/growth/partner-hunt.ts";
import { attachPartnerEvidence, createPartnerEvidence } from "../scripts/affiliate-worker/evidence.mjs";
import { createDiscoveredPartnerCandidate } from "../scripts/affiliate-worker/run.mjs";

const toast = createDiscoveredPartnerCandidate({ providerName: "Toast", website: "https://pos.toasttab.com" });
const toastFinding = {
  sourceUrl: "https://pos.toasttab.com/advocates",
  sourceType: "provider_terms",
  claimType: "program_exists",
  retrievedAt: "2026-08-10",
  claim: "Toast publicly operates a referral program called Toast Advocates.",
  confidence: "moderate",
  verificationState: "unverified",
  notes: "Official public program page observed; program terms are not yet verified.",
  contradiction: false,
};

test("official Toast finding becomes canonical PartnerEvidence", () => {
  const evidence = createPartnerEvidence(toast.id, toastFinding);
  assert.equal(evidence.sourceUrl, toastFinding.sourceUrl);
  assert.equal(evidence.claim, toastFinding.claim);
  assert.ok(PARTNER_EVIDENCE_SOURCE_TYPES.includes(evidence.sourceType));
  assert.ok(PARTNER_EVIDENCE_CLAIM_TYPES.includes(evidence.claimType));
  assert.ok(PARTNER_EVIDENCE_CONFIDENCE_LEVELS.includes(evidence.confidence));
  assert.ok(PARTNER_EVIDENCE_VERIFICATION_STATES.includes(evidence.verificationState));
  assert.equal(evidence.contradiction, false);
});

test("stable evidence identity is deterministic", () => {
  assert.equal(createPartnerEvidence(toast.id, toastFinding).id, createPartnerEvidence(toast.id, toastFinding).id);
});

test("invalid URLs and blank claims are rejected", () => {
  for (const sourceUrl of ["", "not-a-url", "javascript:alert(1)"])
    assert.throws(() => createPartnerEvidence(toast.id, { ...toastFinding, sourceUrl }), /sourceUrl/);
  assert.throws(() => createPartnerEvidence(toast.id, { ...toastFinding, claim: "   " }), /claim must not be blank/);
});

test("unsupported canonical values and invalid retrieval dates fail closed", () => {
  assert.throws(() => createPartnerEvidence(toast.id, { ...toastFinding, sourceType: "blog_post" }), /sourceType must be one of/);
  assert.throws(() => createPartnerEvidence(toast.id, { ...toastFinding, claimType: "commission_guess" }), /claimType must be one of/);
  assert.throws(() => createPartnerEvidence(toast.id, { ...toastFinding, confidence: "certain" }), /confidence must be one of/);
  assert.throws(() => createPartnerEvidence(toast.id, { ...toastFinding, verificationState: "approved" }), /verificationState must be one of/);
  for (const retrievedAt of ["", "08/10/2026", "2026-02-30"])
    assert.throws(() => createPartnerEvidence(toast.id, { ...toastFinding, retrievedAt }), /retrievedAt must be a valid/);
});

test("attachment is immutable and duplicate evidence is not appended", () => {
  const originalSnapshot = structuredClone(toast);
  const attached = attachPartnerEvidence(toast, toastFinding);
  const repeated = attachPartnerEvidence(attached, toastFinding);

  assert.deepEqual(toast, originalSnapshot);
  assert.notEqual(attached, toast);
  assert.notEqual(attached.evidence, toast.evidence);
  assert.equal(attached.evidence.length, 1);
  assert.equal(repeated.evidence.length, 1);
  assert.equal(repeated.evidence[0].id, attached.evidence[0].id);
});

test("evidence attachment does not alter verification checklist", () => {
  const attached = attachPartnerEvidence(toast, toastFinding);
  assert.deepEqual(attached.verification, toast.verification);
  assert.notEqual(attached.verification, toast.verification);
  assert.ok(Object.values(attached.verification).every((value) => value === false));
});
