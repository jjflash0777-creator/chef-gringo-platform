const CLAIM_TO_CHECKLIST = Object.freeze({
  company_identity: "identityVerified",
  program_exists: "programExists",
  current_terms: "currentTermsVerified",
  us_eligibility: "usEligibilityVerified",
  payout: "payoutVerified",
  attribution: "attributionVerified",
  restrictions: "restrictionsVerified",
  customer_value: "customerValueReviewed",
});

const OFFICIAL_FACTUAL_CLAIMS = new Set([
  "program_exists",
  "current_terms",
  "us_eligibility",
  "payout",
  "attribution",
  "restrictions",
]);
const FIRST_PARTY_SOURCE_TYPES = new Set(["provider_terms", "application_page"]);
const IDENTITY_SOURCE_TYPES = new Set(["provider_terms", "application_page", "correspondence"]);
const CONFIDENCE_RANK = Object.freeze({ insufficient: 0, low: 1, moderate: 2, high: 3 });

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validRetrievalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function sourceQualifies(evidence) {
  if (OFFICIAL_FACTUAL_CLAIMS.has(evidence.claimType)) return FIRST_PARTY_SOURCE_TYPES.has(evidence.sourceType);
  if (evidence.claimType === "company_identity") return IDENTITY_SOURCE_TYPES.has(evidence.sourceType);
  if (evidence.claimType === "customer_value") return evidence.sourceType === "editorial_note";
  return false;
}

function meetsStandard(evidence) {
  return evidence.verificationState === "verified"
    && (CONFIDENCE_RANK[evidence.confidence] ?? -1) >= CONFIDENCE_RANK.moderate
    && validHttpUrl(evidence.sourceUrl)
    && validRetrievalDate(evidence.retrievedAt)
    && sourceQualifies(evidence);
}

export function evaluatePartnerVerification(record) {
  if (!record || typeof record !== "object" || !Array.isArray(record.evidence) || !record.verification) {
    throw new Error("record must be a PartnerHuntRecord-compatible object");
  }

  const checklist = Object.fromEntries(Object.keys(record.verification).map((key) => [key, false]));
  const conflicts = [];
  const qualifyingEvidenceIds = {};

  for (const [claimType, checklistField] of Object.entries(CLAIM_TO_CHECKLIST)) {
    const candidates = record.evidence.filter((item) => item.claimType === claimType && meetsStandard(item));
    const contradictory = candidates.filter((item) => item.contradiction);
    const supporting = candidates.filter((item) => !item.contradiction);
    if (contradictory.length > 0) {
      conflicts.push({
        claimType,
        checklistField,
        reason: `Qualifying evidence for ${claimType} contains an unresolved contradiction.`,
        evidenceIds: candidates.map((item) => item.id),
      });
      continue;
    }
    if (supporting.length > 0) {
      checklist[checklistField] = true;
      qualifyingEvidenceIds[claimType] = supporting.map((item) => item.id);
    }
  }

  return { checklist, conflicts, qualifyingEvidenceIds };
}

export function applyPartnerVerification(record) {
  const evaluation = evaluatePartnerVerification(record);
  return {
    record: {
      ...record,
      evidence: record.evidence.map((item) => ({ ...item })),
      verification: { ...evaluation.checklist },
    },
    conflicts: evaluation.conflicts.map((conflict) => ({ ...conflict, evidenceIds: [...conflict.evidenceIds] })),
    qualifyingEvidenceIds: Object.fromEntries(Object.entries(evaluation.qualifyingEvidenceIds).map(([key, ids]) => [key, [...ids]])),
  };
}
