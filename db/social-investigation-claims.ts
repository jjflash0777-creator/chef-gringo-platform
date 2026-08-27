import { claimHasAttachedEvidence } from "../app/growth/social/claim-decomposition.ts";
import {
  claimDraftsFromInvestigationPlan,
  investigationClaimId,
  investigationClaimLinkId,
  type InvestigationClaimDraft,
} from "../app/growth/social/investigation-claims.ts";
import type { InvestigationItem } from "../app/growth/social/investigation-refinement.ts";
import type { SocialPackageClaim } from "../app/growth/social/types.ts";
import type { D1DatabaseLike } from "./index.ts";
import { listClaimProposals } from "./social-claim-proposal-repository.ts";
import { getPackageClaim, listPackageClaims } from "./social-growth-read.ts";

type LinkedPlan = {
  id: string;
  packageId: string;
  packageFingerprint: string;
  state: string;
  items: InvestigationItem[];
};

export type PersistedInvestigationClaimLink = {
  id: string;
  packageId: string;
  investigationPlanId: string;
  packageFingerprint: string;
  itemKey: string;
  claimId: string;
  sourceProposalIds: string[];
  recommendedSourceClass: string;
  independenceRequirement: string;
  expectedEvidencePolicy: string;
  createdAt: string;
  updatedAt: string;
};

const parseJson = <T>(value: string, fallback: T): T => {
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

function mapLink(row: {
  id: string;
  packageId: string;
  investigationPlanId: string;
  packageFingerprint: string;
  itemKey: string;
  claimId: string;
  sourceProposalIdsJson: string;
  recommendedSourceClass: string;
  independenceRequirement: string;
  expectedEvidencePolicy: string;
  createdAt: string;
  updatedAt: string;
}): PersistedInvestigationClaimLink {
  return {
    id: row.id,
    packageId: row.packageId,
    investigationPlanId: row.investigationPlanId,
    packageFingerprint: row.packageFingerprint,
    itemKey: row.itemKey,
    claimId: row.claimId,
    sourceProposalIds: parseJson(row.sourceProposalIdsJson, [] as string[]),
    recommendedSourceClass: row.recommendedSourceClass,
    independenceRequirement: row.independenceRequirement,
    expectedEvidencePolicy: row.expectedEvidencePolicy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listInvestigationClaimLinks(db: D1DatabaseLike, packageId: string) {
  const rows = (await db.prepare(`
    SELECT id, package_id AS packageId, investigation_plan_id AS investigationPlanId,
           package_fingerprint AS packageFingerprint, item_key AS itemKey, claim_id AS claimId,
           source_proposal_ids_json AS sourceProposalIdsJson,
           recommended_source_class AS recommendedSourceClass,
           independence_requirement AS independenceRequirement,
           expected_evidence_policy AS expectedEvidencePolicy,
           created_at AS createdAt, updated_at AS updatedAt
    FROM social_investigation_claim_links
    WHERE package_id = ?
    ORDER BY created_at ASC
  `).bind(packageId).all<Parameters<typeof mapLink>[0]>()).results;
  return rows.map(mapLink);
}

async function insertUnevidencedClaim(
  db: D1DatabaseLike,
  input: { id: string; packageId: string; claimText: string; safetySensitive: boolean },
) {
  await db.prepare(`
    INSERT INTO social_package_claims (id, package_id, claim_text, evidence_kind, evidence_id, safety_sensitive)
    VALUES (?, ?, ?, 'knowledge_source', '', ?)
  `).bind(input.id, input.packageId, input.claimText, input.safetySensitive ? 1 : 0).run();
  const created = await getPackageClaim(db, input.id);
  if (!created) throw new Error("Investigation claim could not be loaded after insert.");
  if (claimHasAttachedEvidence(created)) {
    throw new Error("Investigation claim creation cannot attach evidence.");
  }
  return created;
}

async function insertLink(db: D1DatabaseLike, input: {
  plan: LinkedPlan;
  draft: InvestigationClaimDraft;
  claimId: string;
}) {
  const id = investigationClaimLinkId(input.plan.id, input.draft.itemKey);
  await db.prepare(`
    INSERT INTO social_investigation_claim_links (
      id, package_id, investigation_plan_id, package_fingerprint, item_key, claim_id,
      source_proposal_ids_json, recommended_source_class, independence_requirement, expected_evidence_policy
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.plan.packageId,
    input.plan.id,
    input.plan.packageFingerprint,
    input.draft.itemKey,
    input.claimId,
    JSON.stringify(input.draft.sourceProposalIds),
    input.draft.recommendedSourceClass,
    input.draft.independenceRequirement,
    input.draft.expectedEvidencePolicy,
  ).run();
}

async function maybeLinkProposals(db: D1DatabaseLike, packageId: string, proposalIds: string[], claimId: string) {
  if (!proposalIds.length) return;
  const proposals = await listClaimProposals(db, packageId);
  for (const proposalId of proposalIds) {
    const proposal = proposals.find((item) => item.id === proposalId);
    if (!proposal || proposal.createdClaimId) continue;
    await db.prepare(`
      UPDATE social_claim_proposals SET created_claim_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(claimId, proposal.id).run();
  }
}

export async function createClaimsFromAcknowledgedInvestigationPlan(
  db: D1DatabaseLike,
  plan: LinkedPlan,
) {
  if (plan.state !== "acknowledged") {
    throw new Error("Claims can only be created from an acknowledged investigation plan.");
  }
  const { drafts, excluded } = claimDraftsFromInvestigationPlan({
    planId: plan.id,
    packageFingerprint: plan.packageFingerprint,
    items: plan.items,
  });
  const existingClaims = await listPackageClaims(db, plan.packageId);
  const existingLinks = await listInvestigationClaimLinks(db, plan.packageId);
  const created: SocialPackageClaim[] = [];
  const reused: SocialPackageClaim[] = [];
  const skippedUnprovenanced = [];

  for (const draft of drafts) {
    const currentLink = existingLinks.find((link) => (
      link.investigationPlanId === plan.id && link.itemKey === draft.itemKey
    ));
    if (currentLink) {
      const claim = await getPackageClaim(db, currentLink.claimId);
      if (claim) {
        reused.push(claim);
        continue;
      }
    }
    const lineage = existingLinks.find((link) => link.itemKey === draft.itemKey);
    if (lineage) {
      const claim = await getPackageClaim(db, lineage.claimId);
      if (claim) {
        await insertLink(db, { plan, draft, claimId: claim.id });
        existingLinks.push({
          id: investigationClaimLinkId(plan.id, draft.itemKey),
          packageId: plan.packageId,
          investigationPlanId: plan.id,
          packageFingerprint: plan.packageFingerprint,
          itemKey: draft.itemKey,
          claimId: claim.id,
          sourceProposalIds: draft.sourceProposalIds,
          recommendedSourceClass: draft.recommendedSourceClass,
          independenceRequirement: draft.independenceRequirement,
          expectedEvidencePolicy: draft.expectedEvidencePolicy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        reused.push(claim);
        continue;
      }
    }
    const textCollision = existingClaims.find((claim) => claim.claimText === draft.claimText);
    if (textCollision) {
      const provenanced = existingLinks.some((link) => (
        link.claimId === textCollision.id && link.itemKey === draft.itemKey
      ));
      if (!provenanced) {
        skippedUnprovenanced.push({ itemKey: draft.itemKey, existingClaimId: textCollision.id });
        continue;
      }
    }
    const claimId = investigationClaimId(plan.id, {
      itemKey: draft.itemKey,
      kind: (plan.items.find((item) => item.itemKey === draft.itemKey)?.kind ?? "factual"),
      researchQuestion: draft.claimText,
    });
    const already = await getPackageClaim(db, claimId);
    const claim = already ?? await insertUnevidencedClaim(db, {
      id: claimId,
      packageId: plan.packageId,
      claimText: draft.claimText,
      safetySensitive: draft.safetySensitive,
    });
    if (!already) existingClaims.push(claim);
    if (!existingLinks.some((link) => link.investigationPlanId === plan.id && link.itemKey === draft.itemKey)) {
      await insertLink(db, { plan, draft, claimId: claim.id });
      existingLinks.push({
        id: investigationClaimLinkId(plan.id, draft.itemKey),
        packageId: plan.packageId,
        investigationPlanId: plan.id,
        packageFingerprint: plan.packageFingerprint,
        itemKey: draft.itemKey,
        claimId: claim.id,
        sourceProposalIds: draft.sourceProposalIds,
        recommendedSourceClass: draft.recommendedSourceClass,
        independenceRequirement: draft.independenceRequirement,
        expectedEvidencePolicy: draft.expectedEvidencePolicy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await maybeLinkProposals(db, plan.packageId, draft.sourceProposalIds, claim.id);
    (already ? reused : created).push(claim);
  }

  return {
    claims: [...created, ...reused],
    created,
    reused,
    excludedItemKeys: excluded.map((item) => item.itemKey),
    skippedUnprovenanced,
    publishingEnabled: false,
  };
}

export function listInvestigationClaimWriteMethods() {
  return ["createClaimsFromAcknowledgedInvestigationPlan"] as const;
}
