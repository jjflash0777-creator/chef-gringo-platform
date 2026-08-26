/**
 * Opportunity → Package selection integrity.
 *
 * Invariant: selectedPackage == null || selectedPackage.opportunityId === selectedOpportunity.id
 *
 * Fail closed on mismatch: keep the valid Opportunity, clear Package selection.
 * Never silently remap a package onto another Opportunity.
 * This module is selection/UI state only — it does not delete persisted records.
 */

export const EMPTY_PACKAGE_FORM = {
  slug: "",
  thesis: "",
  usefulnessTest: "",
  commercialPosture: "none",
};

export const EMPTY_CLAIM_FORM = {
  slug: "",
  claimText: "",
  evidenceKind: "knowledge_source",
  evidenceId: "",
  safetySensitive: false,
};

export const EMPTY_EXTRA_EVIDENCE_FORM = {
  claimId: "",
  evidenceKind: "knowledge_source",
  evidenceId: "",
};

export const EMPTY_VARIANT_FORM = {
  slug: "",
  channel: "pinterest",
  copy: "",
  destinationPath: "/learn",
  assetId: "",
};

export const EMPTY_ASSET_FORM = {
  slug: "",
  assetType: "still",
  altText: "",
  license: "",
  provenanceNote: "",
  uri: "",
};

export const EMPTY_PUBLICATION_FORM = {
  slug: "",
  platformPostUrl: "",
  platformPostId: "",
  publishedAt: "",
};

export const EMPTY_REQUEST_FORM = {
  slug: "",
  question: "",
  whyRequired: "",
  preferredSourceType: "manufacturer_technical",
};

export const EMPTY_CANDIDATE_FORM = {
  requestId: "",
  title: "",
  publisher: "",
  canonicalUrl: "",
  excerpt: "",
  notes: "",
  provenanceMethod: "founder_uploaded_document",
};

export const CONTENT_INTELLIGENCE_IDLE_STATUS = "Select a package to derive a content brief.";

export type QueueSelectableOpportunity = { id: string };
export type QueueSelectablePackage = { id: string; opportunityId: string };

export type QueueSelectionInput = {
  opportunities: QueueSelectableOpportunity[];
  packages: QueueSelectablePackage[];
  keepOpportunityId?: string | null;
  keepPackageId?: string | null;
};

export type ResolvedQueueSelection = {
  opportunityId: string | null;
  packageId: string | null;
  clearedMismatchedPackage: boolean;
  diagnostic: string | null;
};

export function selectionInvariantHolds(
  packages: QueueSelectablePackage[],
  selection: { opportunityId: string | null; packageId: string | null },
): boolean {
  if (selection.packageId == null) return true;
  const selectedPackage = packages.find((item) => item.id === selection.packageId);
  return Boolean(selectedPackage && selection.opportunityId && selectedPackage.opportunityId === selection.opportunityId);
}

export function resolveQueueSelection(input: QueueSelectionInput): ResolvedQueueSelection {
  const opportunityId = input.keepOpportunityId && input.opportunities.some((item) => item.id === input.keepOpportunityId)
    ? input.keepOpportunityId
    : input.opportunities[0]?.id ?? null;

  if (input.keepPackageId) {
    const keptPackage = input.packages.find((item) => item.id === input.keepPackageId) ?? null;
    if (keptPackage && opportunityId && keptPackage.opportunityId === opportunityId) {
      return {
        opportunityId,
        packageId: keptPackage.id,
        clearedMismatchedPackage: false,
        diagnostic: null,
      };
    }
    return {
      opportunityId,
      packageId: null,
      clearedMismatchedPackage: true,
      diagnostic: keptPackage
        ? `Cleared package selection ${keptPackage.id} because it belongs to ${keptPackage.opportunityId}, not the selected opportunity ${opportunityId ?? "(none)"}.`
        : `Cleared missing package selection ${input.keepPackageId}.`,
    };
  }

  const belongingPackageId = opportunityId
    ? input.packages.find((item) => item.opportunityId === opportunityId)?.id ?? null
    : null;
  return {
    opportunityId,
    packageId: belongingPackageId,
    clearedMismatchedPackage: false,
    diagnostic: null,
  };
}

export function applyOpportunityChange(input: {
  nextOpportunityId: string;
  currentPackage: QueueSelectablePackage | null;
}): { packageId: string | null; clearPackageDerivedState: boolean } {
  if (input.currentPackage && input.currentPackage.opportunityId === input.nextOpportunityId) {
    return { packageId: input.currentPackage.id, clearPackageDerivedState: false };
  }
  return { packageId: null, clearPackageDerivedState: true };
}

export function packageFormForSelection<T extends {
  id: string;
  slug: string;
  thesis: string;
  usefulnessTest: string;
  commercialPosture: string;
}>(packages: T[], packageId: string | null) {
  if (!packageId) return { ...EMPTY_PACKAGE_FORM };
  const selected = packages.find((item) => item.id === packageId);
  if (!selected) return { ...EMPTY_PACKAGE_FORM };
  return {
    slug: selected.slug,
    thesis: selected.thesis,
    usefulnessTest: selected.usefulnessTest,
    commercialPosture: selected.commercialPosture,
  };
}

export function recordsForSelectedPackage<T extends { packageId: string }>(records: T[], packageId: string | null): T[] {
  if (!packageId) return [];
  return records.filter((item) => item.packageId === packageId);
}

export function clearedPackageDerivedUiState() {
  return {
    selectedPackageId: null as string | null,
    packageForm: { ...EMPTY_PACKAGE_FORM },
    claimForm: { ...EMPTY_CLAIM_FORM },
    extraEvidenceForm: { ...EMPTY_EXTRA_EVIDENCE_FORM },
    variantForm: { ...EMPTY_VARIANT_FORM },
    assetForm: { ...EMPTY_ASSET_FORM },
    preview: "",
    reason: "",
    approvalSubject: "package",
    publicationVariantId: null as string | null,
    publicationForm: { ...EMPTY_PUBLICATION_FORM },
    performanceById: {} as Record<string, unknown>,
    requestForm: { ...EMPTY_REQUEST_FORM },
    candidateForm: { ...EMPTY_CANDIDATE_FORM },
    selectedCandidateIds: [] as string[],
    selectionRunId: null as string | null,
    contentIntelligence: null,
    contentIntelligencePackageId: null as string | null,
    contentIntelligenceStatus: CONTENT_INTELLIGENCE_IDLE_STATUS,
  };
}

export function opportunityNavRole(itemId: string, selectedOpportunityId: string | null): "Opportunity: active" | null {
  return itemId === selectedOpportunityId ? "Opportunity: active" : null;
}

export function packageNavRole(itemId: string, selectedPackageId: string | null): "Package: selected" | null {
  return itemId === selectedPackageId ? "Package: selected" : null;
}

export function warnSelectionInvariant(diagnostic: string | null) {
  if (!diagnostic) return;
  try {
    console.warn(`[GrowthQueue] ${diagnostic}`);
  } catch {
    // Diagnostics must never crash the admin page.
  }
}

export function submittedPackageParentId(body: Record<string, unknown>): string {
  const opportunityId = String(body.opportunityId ?? "").trim();
  if (!opportunityId) {
    throw new Error("Packages must reference an existing content opportunity.");
  }
  return opportunityId;
}
