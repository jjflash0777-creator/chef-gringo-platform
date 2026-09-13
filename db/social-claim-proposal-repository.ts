import {
  CLAIM_DECOMPOSITION_VERSION,
  claimHasAttachedEvidence,
  decomposePackageToClaimProposals,
  isClaimProposalStatus,
  normalizeClaimProposalText,
  packageDecompositionFingerprint,
  socialGrowthId,
  parseSocialGrowthId,
  type ClaimProposalKind,
  type ClaimProposalStatus,
  type PersistedClaimProposal,
} from "../app/growth/social/index.ts";
import type { D1DatabaseLike } from "./index.ts";
import { getContentOpportunity, getContentPackage, getPackageClaim, listPackageClaims } from "./social-growth-read.ts";

type Persisted<T> = T & { createdAt: string; updatedAt: string };

type ProposalRow = {
  id: string;
  packageId: string;
  proposalKey: string;
  generationId: string;
  packageFingerprint: string;
  proposedSlug: string;
  proposedClaimText: string;
  claimKind: ClaimProposalKind;
  whyItMatters: string;
  safetySensitive: number | boolean;
  recommendedSourceClass: string;
  authorityRequirement: string;
  independenceRequirement: string;
  sourceField: string;
  sourceExcerpt: string;
  status: ClaimProposalStatus;
  createdClaimId: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapProposal(row: ProposalRow): Persisted<PersistedClaimProposal> {
  return {
    id: row.id,
    packageId: row.packageId,
    proposalKey: row.proposalKey,
    generationId: row.generationId,
    packageFingerprint: row.packageFingerprint,
    proposedSlug: row.proposedSlug,
    proposedClaimText: row.proposedClaimText,
    claimKind: row.claimKind,
    whyItMatters: row.whyItMatters,
    safetySensitive: Boolean(row.safetySensitive),
    recommendedSourceClass: row.recommendedSourceClass as PersistedClaimProposal["recommendedSourceClass"],
    authorityRequirement: row.authorityRequirement,
    independenceRequirement: row.independenceRequirement,
    sourceTrace: { field: row.sourceField as PersistedClaimProposal["sourceTrace"]["field"], excerpt: row.sourceExcerpt },
    thesisIsNotEvidence: true,
    status: row.status,
    createdClaimId: row.createdClaimId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function proposalRecordId(packageId: string, slug: string) {
  const packageSlug = parseSocialGrowthId(packageId).slug.slice(0, 20);
  const combined = `${packageSlug}-${slug}`.replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return socialGrowthId("claim-proposal", combined);
}

const PROPOSAL_SELECT = `
  SELECT id, package_id AS packageId, proposal_key AS proposalKey, generation_id AS generationId,
         package_fingerprint AS packageFingerprint, proposed_slug AS proposedSlug,
         proposed_claim_text AS proposedClaimText, claim_kind AS claimKind, why_it_matters AS whyItMatters,
         safety_sensitive AS safetySensitive, recommended_source_class AS recommendedSourceClass,
         authority_requirement AS authorityRequirement, independence_requirement AS independenceRequirement,
         source_field AS sourceField, source_excerpt AS sourceExcerpt, status, created_claim_id AS createdClaimId,
         created_at AS createdAt, updated_at AS updatedAt
  FROM social_claim_proposals
`;

export async function listClaimProposals(db: D1DatabaseLike, packageId?: string) {
  const statement = packageId
    ? db.prepare(`${PROPOSAL_SELECT} WHERE package_id = ? ORDER BY created_at ASC`).bind(packageId)
    : db.prepare(`${PROPOSAL_SELECT} ORDER BY package_id ASC, created_at ASC`);
  const rows = (await statement.all<ProposalRow>()).results;
  return rows.map(mapProposal);
}

export async function getClaimProposal(db: D1DatabaseLike, id: string) {
  const row = await db.prepare(`${PROPOSAL_SELECT} WHERE id = ?`).bind(id).first<ProposalRow>();
  return row ? mapProposal(row) : null;
}

export async function generateClaimProposals(db: D1DatabaseLike, packageId: string) {
  const pkg = await getContentPackage(db, packageId);
  if (!pkg) throw new Error("Claim decomposition requires an existing package.");
  const opportunity = await getContentOpportunity(db, pkg.opportunityId);
  if (!opportunity) throw new Error("Claim decomposition requires the package parent opportunity.");
  const fingerprint = packageDecompositionFingerprint({
    packageId: pkg.id,
    packageSlug: pkg.slug,
    thesis: pkg.thesis,
    packageUsefulnessTest: pkg.usefulnessTest,
    problem: opportunity.problem,
    audience: opportunity.audience,
    opportunityUsefulnessTest: opportunity.usefulnessTest,
    commercialPosture: pkg.commercialPosture,
  });
  const drafts = decomposePackageToClaimProposals({
    packageId: pkg.id,
    packageSlug: pkg.slug,
    thesis: pkg.thesis,
    packageUsefulnessTest: pkg.usefulnessTest,
    problem: opportunity.problem,
    audience: opportunity.audience,
    opportunityUsefulnessTest: opportunity.usefulnessTest,
    commercialPosture: pkg.commercialPosture,
  });
  const existingClaims = await listPackageClaims(db, pkg.id);
  const existingClaimText = new Set(existingClaims.map((item) => normalizeClaimProposalText(item.claimText)));
  const generationId = `cd-${fingerprint}`;
  for (const draft of drafts) {
    if (existingClaimText.has(normalizeClaimProposalText(draft.proposedClaimText))) continue;
    const id = proposalRecordId(pkg.id, draft.proposedSlug);
    await db.prepare(`
      INSERT INTO social_claim_proposals (
        id, package_id, proposal_key, generation_id, package_fingerprint, proposed_slug, proposed_claim_text,
        claim_kind, why_it_matters, safety_sensitive, recommended_source_class, authority_requirement,
        independence_requirement, source_field, source_excerpt, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'proposed')
      ON CONFLICT(package_id, proposal_key) DO UPDATE SET
        generation_id = excluded.generation_id,
        package_fingerprint = excluded.package_fingerprint,
        proposed_slug = excluded.proposed_slug,
        proposed_claim_text = excluded.proposed_claim_text,
        claim_kind = excluded.claim_kind,
        why_it_matters = excluded.why_it_matters,
        safety_sensitive = excluded.safety_sensitive,
        recommended_source_class = excluded.recommended_source_class,
        authority_requirement = excluded.authority_requirement,
        independence_requirement = excluded.independence_requirement,
        source_field = excluded.source_field,
        source_excerpt = excluded.source_excerpt,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      id,
      pkg.id,
      draft.proposalKey,
      generationId,
      fingerprint,
      draft.proposedSlug,
      draft.proposedClaimText,
      draft.claimKind,
      draft.whyItMatters,
      draft.safetySensitive ? 1 : 0,
      draft.recommendedSourceClass,
      draft.authorityRequirement,
      draft.independenceRequirement,
      draft.sourceTrace.field,
      draft.sourceTrace.excerpt,
    ).run();
  }
  const proposals = await listClaimProposals(db, pkg.id);
  return {
    version: CLAIM_DECOMPOSITION_VERSION,
    generationId,
    packageFingerprint: fingerprint,
    proposals,
    publishingEnabled: false,
  };
}

export async function setClaimProposalStatus(db: D1DatabaseLike, id: string, status: string) {
  if (!isClaimProposalStatus(status)) throw new Error("Claim proposal status must be proposed, selected, or discarded.");
  const current = await getClaimProposal(db, id);
  if (!current) throw new Error("Claim proposal was not found.");
  if (current.createdClaimId && status === "discarded") {
    throw new Error("A proposal that already created a claim cannot be discarded.");
  }
  await db.prepare(`
    UPDATE social_claim_proposals SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(status, id).run();
  const updated = await getClaimProposal(db, id);
  if (!updated) throw new Error("Claim proposal could not be loaded after update.");
  return updated;
}

export async function createUnevidencedPackageClaim(
  db: D1DatabaseLike,
  input: { slug: string; packageId: string; claimText: string; safetySensitive: boolean },
) {
  const pkg = await getContentPackage(db, input.packageId);
  if (!pkg) throw new Error("Claims must belong to an existing package.");
  const id = socialGrowthId("claim", input.slug);
  const text = input.claimText.trim();
  if (!text) throw new Error("Claim text is required.");
  const existing = (await listPackageClaims(db, input.packageId))
    .find((item) => normalizeClaimProposalText(item.claimText) === normalizeClaimProposalText(text));
  if (existing) return existing;
  await db.prepare(`
    INSERT INTO social_package_claims (id, package_id, claim_text, evidence_kind, evidence_id, safety_sensitive)
    VALUES (?, ?, ?, 'knowledge_source', '', ?)
  `).bind(id, input.packageId, text, input.safetySensitive ? 1 : 0).run();
  const created = await getPackageClaim(db, id);
  if (!created) throw new Error("Claim could not be loaded after insert.");
  if (claimHasAttachedEvidence(created)) {
    throw new Error("Claim decomposition cannot attach evidence.");
  }
  return created;
}

export async function createClaimsFromSelectedProposals(db: D1DatabaseLike, packageId: string, proposalIds?: string[]) {
  const pkg = await getContentPackage(db, packageId);
  if (!pkg) throw new Error("Selected claims require an existing package.");
  const proposals = await listClaimProposals(db, packageId);
  const selected = proposals.filter((item) => {
    if (item.status !== "selected") return false;
    if (proposalIds?.length) return proposalIds.includes(item.id);
    return true;
  });
  if (!selected.length) throw new Error("Select at least one claim proposal before creating claims.");
  const created = [];
  for (const proposal of selected) {
    if (proposal.createdClaimId) {
      const existing = await getPackageClaim(db, proposal.createdClaimId);
      if (existing) {
        created.push(existing);
        continue;
      }
    }
    const claim = await createUnevidencedPackageClaim(db, {
      slug: proposal.proposedSlug.slice(0, 80),
      packageId,
      claimText: proposal.proposedClaimText,
      safetySensitive: proposal.safetySensitive,
    });
    await db.prepare(`
      UPDATE social_claim_proposals SET created_claim_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(claim.id, proposal.id).run();
    created.push(claim);
  }
  return {
    claims: created,
    proposals: await listClaimProposals(db, packageId),
    publishingEnabled: false,
  };
}
