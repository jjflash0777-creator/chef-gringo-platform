import { LEAD_ONLY_SOURCE_CLASSES } from "../../lib/research/source-policy.ts";

export const FORBIDDEN_EVIDENCE_ECONOMICS_KEYS = [
  "commission",
  "commissionCents",
  "commissionRate",
  "commissionAmountCents",
  "commissionValue",
  "payout",
  "payoutCents",
  "affiliatePayout",
  "epc",
  "earningsPerClick",
  "earningsPerClickCents",
  "roas",
  "revenueShare",
  "revenueSharePercent",
  "expectedLifetimeRevenue",
  "expectedCommercialValue",
  "merchantRevenue",
  "sponsorshipStatus",
  "sponsorship",
] as const;

/**
 * Inspectable Evidence Intelligence v1 policy. Not UI conditionals.
 * Does not accept evidence, approve packages, or publish.
 */
export const EVIDENCE_POLICY_CLASSES = ["narrow_factual", "broad_technical", "safety_sensitive"] as const;
export type EvidencePolicyClass = typeof EVIDENCE_POLICY_CLASSES[number];

export const EVIDENCE_AUTHORITY_CLASSES = [
  "government_regulatory",
  "code_standard",
  "industry_organization",
  "primary_documentation",
  "manufacturer_technical",
  "equipment_manual",
  "editorial",
  "lead_only",
  "unknown",
] as const;
export type EvidenceAuthorityClass = typeof EVIDENCE_AUTHORITY_CLASSES[number];

export const ESPECIALLY_AUTHORITATIVE_CLASSES: readonly EvidenceAuthorityClass[] = [
  "government_regulatory",
  "code_standard",
];

export const CREDIBLE_PRIMARY_CLASSES: readonly EvidenceAuthorityClass[] = [
  "government_regulatory",
  "code_standard",
  "industry_organization",
  "primary_documentation",
  "manufacturer_technical",
  "equipment_manual",
];

export const MANUFACTURER_AUTHORITY_CLASSES: readonly EvidenceAuthorityClass[] = [
  "manufacturer_technical",
  "equipment_manual",
];

export const DISALLOWED_SOURCE_CLASSES: readonly string[] = [
  ...LEAD_ONLY_SOURCE_CLASSES,
  "editorial",
  "lead_only",
];

/** Generic recommendation/breadth markers. Not product- or brand-specific. */
export const BROAD_TECHNICAL_CLAIM_PATTERN = /\b(recommend(?:ed|ation)?s?|should\b|ought\b|guidance|under (?:what |these |those |certain )?conditions|technically appropriate|operating (?:margin|headroom)|independent corroboration)\b/i;

export const EVIDENCE_POLICY = {
  version: "evidence-intelligence-v1",
  narrow_factual: {
    description: "A narrow low-risk factual claim may be supported by one accepted authoritative primary source.",
    minIndependentAccepted: 1,
    manufacturerAloneSufficient: true,
    especiallyAuthoritativeAloneSufficient: true,
    leadOnlyNeverSufficient: true,
    unresolvedContradictionBlocks: true,
  },
  broad_technical: {
    description: "A broader technical recommendation needs two independent credible sources, or one especially authoritative source whose class covers the full claim. Manufacturer material alone is not that exception.",
    minIndependentAccepted: 2,
    manufacturerAloneSufficient: false,
    especiallyAuthoritativeAloneSufficient: true,
    leadOnlyNeverSufficient: true,
    unresolvedContradictionBlocks: true,
  },
  safety_sensitive: {
    description: "Safety-sensitive, regulatory, or health-sensitive claims require a stronger authority class. Manufacturer marketing or manuals alone are not sufficient. Unresolved contradiction blocks.",
    minIndependentAccepted: 1,
    manufacturerAloneSufficient: false,
    especiallyAuthoritativeAloneSufficient: true,
    requiresEspeciallyAuthoritative: true,
    leadOnlyNeverSufficient: true,
    unresolvedContradictionBlocks: true,
  },
} as const;

const SOURCE_TYPE_TO_AUTHORITY: Record<string, EvidenceAuthorityClass> = {
  regulatory_guidance: "government_regulatory",
  regulatory_document: "government_regulatory",
  statute_or_rule: "code_standard",
  electrical_code_standard: "code_standard",
  government_regulatory: "government_regulatory",
  professional_standard: "code_standard",
  professional_organization_guidance: "industry_organization",
  clinical_organization: "industry_organization",
  industry_organization: "industry_organization",
  educational_institution: "primary_documentation",
  primary_documentation: "primary_documentation",
  professional_practice: "primary_documentation",
  direct_professional_experience: "primary_documentation",
  manufacturer_documentation: "manufacturer_technical",
  manufacturer_technical: "manufacturer_technical",
  equipment_manual: "equipment_manual",
  distributor_documentation: "editorial",
  commercial_program: "editorial",
  editorial_judgment: "editorial",
  editorial: "editorial",
  chef_gringo_judgment: "editorial",
  seller_listing: "lead_only",
  user_submitted: "lead_only",
};

export function isEvidencePolicyClass(value: string): value is EvidencePolicyClass {
  return (EVIDENCE_POLICY_CLASSES as readonly string[]).includes(value);
}

export function isEvidenceAuthorityClass(value: string): value is EvidenceAuthorityClass {
  return (EVIDENCE_AUTHORITY_CLASSES as readonly string[]).includes(value);
}

export function deriveClaimPolicyClass(input: {
  safetySensitive: boolean;
  claimText: string;
  policyClass?: EvidencePolicyClass | null;
}): EvidencePolicyClass {
  if (input.policyClass && isEvidencePolicyClass(input.policyClass)) return input.policyClass;
  if (input.safetySensitive) return "safety_sensitive";
  if (BROAD_TECHNICAL_CLAIM_PATTERN.test(input.claimText)) return "broad_technical";
  return "narrow_factual";
}

export function authorityClassFromSourceMetadata(input: {
  sourceType?: string | null;
  preferredSourceType?: string | null;
  provenanceMethod?: string | null;
}): EvidenceAuthorityClass {
  const preferred = input.preferredSourceType?.trim();
  if (preferred && SOURCE_TYPE_TO_AUTHORITY[preferred]) return SOURCE_TYPE_TO_AUTHORITY[preferred];
  const sourceType = input.sourceType?.trim();
  if (sourceType && SOURCE_TYPE_TO_AUTHORITY[sourceType]) return SOURCE_TYPE_TO_AUTHORITY[sourceType];
  if (sourceType && (LEAD_ONLY_SOURCE_CLASSES as readonly string[]).includes(sourceType)) return "lead_only";
  if (input.provenanceMethod === "metadata_only" || input.provenanceMethod === "test_fixture") return "unknown";
  return "unknown";
}

export function isEspeciallyAuthoritative(authority: EvidenceAuthorityClass) {
  return (ESPECIALLY_AUTHORITATIVE_CLASSES as readonly string[]).includes(authority);
}

export function isCrediblePrimary(authority: EvidenceAuthorityClass) {
  return (CREDIBLE_PRIMARY_CLASSES as readonly string[]).includes(authority);
}

export function isManufacturerAuthority(authority: EvidenceAuthorityClass) {
  return (MANUFACTURER_AUTHORITY_CLASSES as readonly string[]).includes(authority);
}

export function assertNoEvidenceEconomics(record: Record<string, unknown>, label = "Evidence intelligence") {
  const present = FORBIDDEN_EVIDENCE_ECONOMICS_KEYS.filter((key) => record[key] !== undefined);
  if (present.length) {
    throw new Error(`${label} cannot use commercial economics: ${present.join(", ")}.`);
  }
}

export function preferredPrimarySourcesForDomain(evidenceDomain?: string | null) {
  if (evidenceDomain === "food_safety_public_health" || evidenceDomain === "nutrition_therapeutic_diets") {
    return ["government/regulatory guidance", "public-health or clinical authorities", "applicable codes/standards"];
  }
  if (evidenceDomain === "equipment" || evidenceDomain === "business_licensing") {
    return ["government/regulatory guidance", "accessible codes/standards", "independent manufacturer technical documentation", "recognized technical organizations"];
  }
  return ["government/regulatory guidance", "primary documentation", "recognized technical or professional organizations"];
}
