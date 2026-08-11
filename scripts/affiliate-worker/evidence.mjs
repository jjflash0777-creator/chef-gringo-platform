import { createHash } from "node:crypto";
import {
  PARTNER_EVIDENCE_CONFIDENCE_LEVELS,
  PARTNER_EVIDENCE_SOURCE_TYPES,
  PARTNER_EVIDENCE_VERIFICATION_STATES,
} from "../../app/growth/partner-hunt.ts";

function requireSupported(value, supported, field) {
  if (!supported.includes(value)) {
    throw new Error(`${field} must be one of: ${supported.join(", ")}`);
  }
  return value;
}

function requireHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("sourceUrl is required");
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("sourceUrl must be a valid absolute http(s) URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("sourceUrl must be a valid absolute http(s) URL");
  }
  return value.trim();
}

function requireRetrievalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("retrievedAt must be a valid YYYY-MM-DD date");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("retrievedAt must be a valid YYYY-MM-DD date");
  }
  return value;
}

function evidenceId(partnerId, sourceUrl, claim) {
  const digest = createHash("sha256")
    .update(JSON.stringify([partnerId, sourceUrl, claim]))
    .digest("hex")
    .slice(0, 24);
  return `partner-evidence:${digest}`;
}

export function createPartnerEvidence(partnerId, finding) {
  if (typeof partnerId !== "string" || !partnerId.trim()) throw new Error("partner id is required");
  if (!finding || typeof finding !== "object" || Array.isArray(finding)) throw new Error("finding must be an object");

  const sourceUrl = requireHttpUrl(finding.sourceUrl);
  if (typeof finding.claim !== "string" || !finding.claim.trim()) throw new Error("claim must not be blank");
  if (typeof finding.notes !== "string") throw new Error("notes must be a string");
  if (typeof finding.contradiction !== "boolean") throw new Error("contradiction must be a boolean");
  const claim = finding.claim.trim();

  return {
    id: evidenceId(partnerId.trim(), sourceUrl, claim),
    sourceUrl,
    sourceType: requireSupported(finding.sourceType, PARTNER_EVIDENCE_SOURCE_TYPES, "sourceType"),
    retrievedAt: requireRetrievalDate(finding.retrievedAt),
    claim,
    confidence: requireSupported(finding.confidence, PARTNER_EVIDENCE_CONFIDENCE_LEVELS, "confidence"),
    verificationState: requireSupported(finding.verificationState, PARTNER_EVIDENCE_VERIFICATION_STATES, "verificationState"),
    notes: finding.notes,
    contradiction: finding.contradiction,
  };
}

export function attachPartnerEvidence(record, finding) {
  if (!record || typeof record !== "object" || typeof record.id !== "string" || !Array.isArray(record.evidence)) {
    throw new Error("record must be a PartnerHuntRecord-compatible object");
  }
  const evidence = createPartnerEvidence(record.id, finding);
  const alreadyAttached = record.evidence.some((item) => item.id === evidence.id);
  return {
    ...record,
    evidence: alreadyAttached ? [...record.evidence] : [...record.evidence, evidence],
    verification: { ...record.verification },
  };
}
