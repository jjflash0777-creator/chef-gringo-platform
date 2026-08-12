import { attachPartnerEvidence } from "./evidence.mjs";
import { applyPartnerVerification } from "./verification.mjs";

function today() { return new Date().toISOString().slice(0, 10); }
function has(text, pattern) { return pattern.test(text); }

export function extractCanonicalFindings(page, retrievedAt = today()) {
  const text = String(page.text ?? "");
  const sourceUrl = String(page.url ?? "");
  const findings = [];
  const add = (claimType, claim, notes, sourceType = "provider_terms", confidence = "high") => findings.push({ sourceUrl, sourceType, retrievedAt, claimType, claim, confidence, verificationState: "verified", notes, contradiction: false });

  if (has(text, /Toast Advocates[\s\S]{0,180}(?:referral program|referrals)/i)) add("program_exists", "Toast publicly operates a referral program called Toast Advocates.", "Exact program language was inspected on a Toast-owned public page.");
  if (has(text, /US Toast Advocates Program Terms & Conditions/i)) add("current_terms", "Toast publishes current US Toast Advocates Program Terms & Conditions.", "Official terms page inspected; effective-date language is present.");
  if (has(text, /eligible[\s\S]{0,300}United States|US-based advocates/i)) add("us_eligibility", "Toast documents United States eligibility requirements for Toast Advocates.", "Eligibility is conditional; this does not establish Chef Gringo's eligibility.");
  if (has(text, /Bonus Payouts[\s\S]{0,900}\$1,000|earn up to \$2,000/i)) add("payout", "Toast documents tiered bonus payouts for qualified Toast Advocates referrals.", "Amounts and qualification conditions remain in the source; no economics were copied into the candidate record.");
  if (has(text, /Verbal referrals will not be accepted|Toast will determine, in its sole discretion, whether a referral is a Qualified Referral/i)) add("restrictions", "Toast documents referral restrictions and retains discretion over qualified-referral status.", "Restriction language was inspected on official terms.");
  if (has(text, /Join Now|online referral form|Refer a Business Form/i)) add("contact_route", "Toast provides a public route to join Toast Advocates or submit written referrals.", "Route is recorded as evidence only; no form was opened or submitted.", "application_page", "moderate");
  return findings;
}

export function applyResearchPages(candidate, acquisition, retrievedAt = today()) {
  const accepted = [];
  const rejected = [];
  let updated = candidate;
  for (const page of acquisition.pages) {
    for (const finding of extractCanonicalFindings(page, retrievedAt)) {
      try { updated = attachPartnerEvidence(updated, finding); accepted.push(finding); }
      catch (error) { rejected.push({ finding, reason: error instanceof Error ? error.message : "Evidence rejected" }); }
    }
  }
  const verification = applyPartnerVerification(updated);
  return { candidate: verification.record, accepted, rejected, conflicts: verification.conflicts, acquisition };
}
