import { assertNoEconomicsRankingFields } from "./commercial.ts";
import { parseSocialGrowthId, socialGrowthId } from "./ids.ts";
import { materialInvestigationItems, type InvestigationItem } from "./investigation-refinement.ts";

/**
 * Maps an acknowledged InvestigationPlan onto unevidenced claim rows.
 * Pruned/context-only items never become claims. Claim text comes from the
 * refined item, not from raw ClaimProposal rows.
 */
export const INVESTIGATION_CLAIM_BRIDGE_VERSION = "investigation-claim-bridge-v1";

export type InvestigationClaimDraft = {
  itemKey: string;
  claimText: string;
  safetySensitive: boolean;
  recommendedSourceClass: InvestigationItem["recommendedSourceClass"];
  independenceRequirement: string;
  expectedEvidencePolicy: InvestigationItem["expectedEvidencePolicy"];
  sourceProposalIds: string[];
  sourceTraces: InvestigationItem["sourceTraces"];
  slug: string;
};

function kebab(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "item";
}

function stableSuffix(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash.toString(16).padStart(8, "0").slice(0, 8);
}

export function investigationClaimSlug(planId: string, item: Pick<InvestigationItem, "itemKey" | "kind" | "researchQuestion">) {
  const planSlug = parseSocialGrowthId(planId).slug.slice(0, 18);
  const kind = kebab(item.kind).slice(0, 18);
  const question = kebab(item.researchQuestion).slice(0, 32);
  const suffix = stableSuffix(`${planId}:${item.itemKey}`);
  return `${planSlug}-${kind}-${question}-${suffix}`.replace(/-+/g, "-").slice(0, 80);
}

export function investigationClaimId(planId: string, item: Pick<InvestigationItem, "itemKey" | "kind" | "researchQuestion">) {
  return socialGrowthId("claim", investigationClaimSlug(planId, item));
}

export function investigationClaimLinkId(planId: string, itemKey: string) {
  const planSlug = parseSocialGrowthId(planId).slug.slice(0, 28);
  return socialGrowthId("investigation-claim-link", `${planSlug}-${stableSuffix(itemKey)}`.replace(/-+/g, "-").slice(0, 80));
}

export function isMaterialClaimItem(item: InvestigationItem) {
  return item.material && item.kind !== "context_only" && !item.prunedReason;
}

export function claimDraftsFromInvestigationPlan(input: {
  planId: string;
  packageFingerprint: string;
  items: InvestigationItem[];
}): { drafts: InvestigationClaimDraft[]; excluded: InvestigationItem[] } {
  assertNoEconomicsRankingFields(input as unknown as Record<string, unknown>);
  const drafts: InvestigationClaimDraft[] = [];
  const excluded: InvestigationItem[] = [];
  for (const item of materialInvestigationItems({ items: input.items })) {
    if (!isMaterialClaimItem(item)) {
      excluded.push(item);
      continue;
    }
    const claimText = item.proposedClaim.trim() || item.researchQuestion.trim();
    if (!claimText) {
      excluded.push(item);
      continue;
    }
    drafts.push({
      itemKey: item.itemKey,
      claimText,
      safetySensitive: item.safetySensitive,
      recommendedSourceClass: item.recommendedSourceClass,
      independenceRequirement: item.independenceRequirement,
      expectedEvidencePolicy: item.expectedEvidencePolicy,
      sourceProposalIds: [...item.sourceProposalIds],
      sourceTraces: [...item.sourceTraces],
      slug: investigationClaimSlug(input.planId, item),
    });
  }
  for (const item of input.items) {
    if (!item.material || item.kind === "context_only" || item.prunedReason) {
      if (!excluded.some((entry) => entry.itemKey === item.itemKey)) excluded.push(item);
    }
  }
  return { drafts, excluded };
}
