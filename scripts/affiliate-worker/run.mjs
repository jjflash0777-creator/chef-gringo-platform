#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const UNKNOWN_ECONOMICS = Object.freeze({
  oneTimePayoutCents: null,
  recurringPayoutCents: null,
  revenueSharePercent: null,
  residualStructure: null,
  qualifiedLeadPayoutCents: null,
  salePayoutCents: null,
  attributionWindowDays: null,
  payoutTimingDays: null,
  payoutThresholdCents: null,
  clawbackRules: null,
});

const UNVERIFIED_CHECKLIST = Object.freeze({
  identityVerified: false,
  programExists: false,
  currentTermsVerified: false,
  usEligibilityVerified: false,
  payoutVerified: false,
  attributionVerified: false,
  restrictionsVerified: false,
  customerValueReviewed: false,
});

function slug(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function normalizeDiscoveryWebsite(website) {
  let parsed;
  try {
    parsed = new URL(website);
  } catch {
    throw new Error("website must be a valid absolute URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("website must use http or https");
  }
  parsed.hash = "";
  return {
    website: parsed.pathname === "/" && !parsed.search ? parsed.origin : parsed.href.replace(/\/$/, ""),
    domain: parsed.hostname.toLowerCase().replace(/^www\./, ""),
  };
}

/**
 * Convert a name/domain discovery into the existing PartnerHuntRecord shape.
 *
 * Classification remains explicitly unknown until evidence supports it.
 */
export function createDiscoveredPartnerCandidate({ providerName, website }) {
  const normalizedName = String(providerName ?? "").trim();
  if (!normalizedName) throw new Error("providerName is required");
  const normalized = normalizeDiscoveryWebsite(String(website ?? "").trim());

  return {
    id: `partner:${slug(normalizedName)}:${slug(normalized.domain)}`,
    providerName: normalizedName,
    website: normalized.website,
    commercialLane: "unknown",
    programType: "unknown",
    regionsServed: "Unknown",
    usAvailability: null,
    description: "",
    whyItMatters: "",
    customerValueThesis: "",
    contactOrApplicationRoute: null,
    proposedRelationship: null,
    majorRestrictionsUnderstood: false,
    credibilityBlockers: [],
    economics: { ...UNKNOWN_ECONOMICS },
    evidence: [],
    verification: { ...UNVERIFIED_CHECKLIST },
    lifecycle: "discovered",
    rejectedReason: null,
    synthetic: false,
  };
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isMainModule()) {
  const [providerName, website] = process.argv.slice(2);

  if (!providerName || !website) {
    console.error(
      'Usage: node scripts/affiliate-worker/run.mjs "Provider Name" "https://example.com"'
    );
    process.exitCode = 1;
  } else {
    try {
      console.log(JSON.stringify(createDiscoveredPartnerCandidate({ providerName, website }), null, 2));
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Discovery input is invalid");
      process.exitCode = 1;
    }
  }
}
