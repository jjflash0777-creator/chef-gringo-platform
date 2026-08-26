import {
  assertNoEconomicsRankingFields,
  assertSocialCommercialPosture,
  assertSocialEvidenceRef,
  assertSocialGrowthId,
  assertPublishUnavailable,
  claimMaySupportApproval,
  createApprovalRecord,
  createManualPublicationDraft,
  createReservedPublicationDraft,
  hasValidSocialApproval,
  hasValidSocialPublicationAuthority,
  mintPublicationTrackedUrl,
  socialPublicationAttribution,
  socialPublicationId,
  isSocialAssetType,
  isSocialAudience,
  isSocialOpportunityStatus,
  mintSocialDestinationUrl,
  parseChefGringoDestination,
  socialGrowthId,
  parseSocialGrowthId,
  candidateDiscoveryCapability,
  liveCandidateDiscoveryAvailable,
  type SocialApproval,
  type SocialChannel,
  type SocialChannelVariant,
  type SocialContentAsset,
  type SocialContentOpportunity,
  type SocialContentPackage,
  type SocialDestinationUrl,
  type SocialEvidenceRef,
  type SocialPackageClaim,
  type SocialPublication,
} from "../app/growth/social/index.ts";
import { hasIntelligenceReadyApprovalAuthority } from "../app/growth/social/evidence-intelligence.ts";
import type { D1DatabaseLike, D1PreparedStatementLike } from "./index.ts";
import { buildPackageEvidenceIntelligence } from "./social-evidence-intelligence.ts";
import { listSocialEvidenceRequests } from "./social-evidence-request-read.ts";
import {
  evaluatePackageApprovalGate,
  getContentOpportunity,
  getContentPackage,
  getPackageClaim,
  listChannelVariants,
  listPackageClaims,
  listSocialApprovals,
  resolveSocialEvidence,
} from "./social-growth-read.ts";
import { listResearchRuns } from "./social-research-read.ts";

export {
  evaluatePackageApprovalGate,
  getContentOpportunity,
  getContentPackage,
  getPackageClaim,
  listChannelVariants,
  listClaimEvidence,
  listPackageClaims,
  listSocialApprovals,
  resolveSocialEvidence,
} from "./social-growth-read.ts";

type Persisted<T> = T & { createdAt: string; updatedAt: string };

async function first<T>(statement: D1PreparedStatementLike) {
  return statement.first<T>();
}

const parseJson = <T>(value: string, fallback: T): T => {
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

function requiredText(value: string, label: string, max = 2000) {
  const text = value.trim();
  if (!text) throw new Error(`${label} is required.`);
  if (text.length > max) throw new Error(`${label} is too long.`);
  return text;
}

function assertOwnedAssetUri(uri: string | null) {
  if (uri === null || uri === undefined || uri === "") return null;
  const value = uri.trim();
  if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
    parseChefGringoDestination(value);
    return value;
  }
  parseChefGringoDestination(value);
  return value;
}

export async function createContentOpportunity(
  db: D1DatabaseLike,
  input: Omit<SocialContentOpportunity, "id"> & { slug: string },
): Promise<Persisted<SocialContentOpportunity>> {
  assertNoEconomicsRankingFields(input as unknown as Record<string, unknown>);
  if (!isSocialAudience(input.audience)) throw new Error("Opportunity audience must be home_cook, independent_operator, or both.");
  if (!isSocialOpportunityStatus(input.status)) throw new Error("Opportunity status must be open, selected, or discarded.");
  const id = socialGrowthId("opportunity", input.slug);
  await db.prepare(`
    INSERT INTO social_content_opportunities (
      id, slug, problem, audience, usefulness_test, product_id, workflow_id, partner_opportunity_id, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.slug,
    requiredText(input.problem, "Opportunity problem"),
    input.audience,
    requiredText(input.usefulnessTest, "Opportunity usefulness test"),
    input.productId,
    input.workflowId,
    input.partnerOpportunityId,
    input.status,
  ).run();
  const created = await getContentOpportunity(db, id);
  if (!created) throw new Error("Opportunity could not be loaded after insert.");
  return created;
}

export async function listContentOpportunities(db: D1DatabaseLike) {
  const rows = (await db.prepare(`
    SELECT id, slug, problem, audience, usefulness_test AS usefulnessTest, product_id AS productId,
           workflow_id AS workflowId, partner_opportunity_id AS partnerOpportunityId, status,
           created_at AS createdAt, updated_at AS updatedAt
    FROM social_content_opportunities
    ORDER BY updated_at DESC, slug ASC
  `).all<Persisted<SocialContentOpportunity>>()).results;
  return rows;
}

export async function updateContentOpportunity(
  db: D1DatabaseLike,
  id: string,
  patch: Partial<Pick<SocialContentOpportunity, "problem" | "audience" | "usefulnessTest" | "productId" | "workflowId" | "partnerOpportunityId" | "status">>,
) {
  assertNoEconomicsRankingFields(patch as Record<string, unknown>);
  const current = await getContentOpportunity(db, id);
  if (!current) throw new Error("Opportunity was not found.");
  const next = {
    problem: patch.problem === undefined ? current.problem : requiredText(patch.problem, "Opportunity problem"),
    audience: patch.audience === undefined ? current.audience : patch.audience,
    usefulnessTest: patch.usefulnessTest === undefined ? current.usefulnessTest : requiredText(patch.usefulnessTest, "Opportunity usefulness test"),
    productId: patch.productId === undefined ? current.productId : patch.productId,
    workflowId: patch.workflowId === undefined ? current.workflowId : patch.workflowId,
    partnerOpportunityId: patch.partnerOpportunityId === undefined ? current.partnerOpportunityId : patch.partnerOpportunityId,
    status: patch.status === undefined ? current.status : patch.status,
  };
  if (!isSocialAudience(next.audience)) throw new Error("Opportunity audience must be home_cook, independent_operator, or both.");
  if (!isSocialOpportunityStatus(next.status)) throw new Error("Opportunity status must be open, selected, or discarded.");
  await db.prepare(`
    UPDATE social_content_opportunities
    SET problem = ?, audience = ?, usefulness_test = ?, product_id = ?, workflow_id = ?, partner_opportunity_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(next.problem, next.audience, next.usefulnessTest, next.productId, next.workflowId, next.partnerOpportunityId, next.status, id).run();
  const updated = await getContentOpportunity(db, id);
  if (!updated) throw new Error("Opportunity could not be loaded after update.");
  return updated;
}

export async function createContentPackage(
  db: D1DatabaseLike,
  input: Omit<SocialContentPackage, "id" | "status"> & { slug: string; status?: SocialContentPackage["status"] },
): Promise<Persisted<SocialContentPackage>> {
  assertNoEconomicsRankingFields(input as unknown as Record<string, unknown>);
  const posture = assertSocialCommercialPosture(input.commercialPosture);
  const opportunity = await getContentOpportunity(db, input.opportunityId);
  if (!opportunity) throw new Error("Packages must reference an existing content opportunity.");
  const id = socialGrowthId("package", input.slug);
  await db.prepare(`
    INSERT INTO social_content_packages (id, slug, opportunity_id, thesis, usefulness_test, commercial_posture, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.slug,
    input.opportunityId,
    requiredText(input.thesis, "Package thesis"),
    requiredText(input.usefulnessTest, "Package usefulness test"),
    posture,
    input.status ?? "drafted",
  ).run();
  const created = await getContentPackage(db, id);
  if (!created) throw new Error("Package could not be loaded after insert.");
  return created;
}

export async function listContentPackages(db: D1DatabaseLike, opportunityId?: string) {
  const statement = opportunityId
    ? db.prepare(`
        SELECT id, slug, opportunity_id AS opportunityId, thesis, usefulness_test AS usefulnessTest,
               commercial_posture AS commercialPosture, status, created_at AS createdAt, updated_at AS updatedAt
        FROM social_content_packages WHERE opportunity_id = ? ORDER BY updated_at DESC, slug ASC
      `).bind(opportunityId)
    : db.prepare(`
        SELECT id, slug, opportunity_id AS opportunityId, thesis, usefulness_test AS usefulnessTest,
               commercial_posture AS commercialPosture, status, created_at AS createdAt, updated_at AS updatedAt
        FROM social_content_packages ORDER BY updated_at DESC, slug ASC
      `);
  return (await statement.all<Persisted<SocialContentPackage>>()).results;
}

export async function updateContentPackage(
  db: D1DatabaseLike,
  id: string,
  patch: Partial<Pick<SocialContentPackage, "thesis" | "usefulnessTest" | "commercialPosture">> & { status?: never },
) {
  assertNoEconomicsRankingFields(patch as Record<string, unknown>);
  if ("status" in patch && patch.status !== undefined) {
    throw new Error("Package status can only change through an approval record.");
  }
  const current = await getContentPackage(db, id);
  if (!current) throw new Error("Package was not found.");
  const next = {
    thesis: patch.thesis === undefined ? current.thesis : requiredText(patch.thesis, "Package thesis"),
    usefulnessTest: patch.usefulnessTest === undefined ? current.usefulnessTest : requiredText(patch.usefulnessTest, "Package usefulness test"),
    commercialPosture: patch.commercialPosture === undefined ? current.commercialPosture : assertSocialCommercialPosture(patch.commercialPosture),
  };
  await db.prepare(`
    UPDATE social_content_packages
    SET thesis = ?, usefulness_test = ?, commercial_posture = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(next.thesis, next.usefulnessTest, next.commercialPosture, id).run();
  const updated = await getContentPackage(db, id);
  if (!updated) throw new Error("Package could not be loaded after update.");
  return updated;
}

export async function addPackageClaim(
  db: D1DatabaseLike,
  input: Omit<SocialPackageClaim, "id" | "evidenceRefs"> & { slug: string; attachedBy?: string; evidenceRefs?: SocialEvidenceRef[] },
): Promise<Persisted<SocialPackageClaim>> {
  assertSocialGrowthId("package", input.packageId);
  const pkg = await getContentPackage(db, input.packageId);
  if (!pkg) throw new Error("Claims must belong to an existing package.");
  const evidence = assertSocialEvidenceRef(input.evidence);
  const referenced = await resolveSocialEvidence(db, evidence);
  if (!referenced.exists) throw new Error("Claims must reference an existing Chef Gringo source, workflow source, corpus document, or citation.");
  if (input.safetySensitive && !claimMaySupportApproval({ safetySensitive: true, referenced })) {
    throw new Error("Safety-sensitive claims require a verified knowledge source or an accepted public corpus document.");
  }
  const id = socialGrowthId("claim", input.slug);
  await db.prepare(`
    INSERT INTO social_package_claims (id, package_id, claim_text, evidence_kind, evidence_id, safety_sensitive)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, input.packageId, requiredText(input.claimText, "Claim text"), evidence.kind, evidence.id, input.safetySensitive ? 1 : 0).run();
  await insertClaimEvidenceRow(db, {
    claimId: id,
    evidence,
    attachedBy: input.attachedBy ?? "claim-create",
  });
  const extras = (input.evidenceRefs ?? []).filter((ref) => !(ref.kind === evidence.kind && ref.id === evidence.id));
  for (const extra of extras) {
    await attachClaimEvidence(db, { claimId: id, evidence: extra, attachedBy: input.attachedBy ?? "claim-create" });
  }
  const created = await getPackageClaim(db, id);
  if (!created) throw new Error("Claim could not be loaded after insert.");
  return created;
}

function claimEvidenceRowId(claimId: string, evidence: SocialEvidenceRef) {
  const claimSlug = parseSocialGrowthId(claimId).slug;
  const rest = `${evidence.kind}-${evidence.id}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  return socialGrowthId("claim-evidence", `${claimSlug}-${rest || "ref"}`.slice(0, 80));
}

async function insertClaimEvidenceRow(
  db: D1DatabaseLike,
  input: { claimId: string; evidence: SocialEvidenceRef; attachedBy: string },
) {
  const evidence = assertSocialEvidenceRef(input.evidence);
  const id = claimEvidenceRowId(input.claimId, evidence);
  await db.prepare(`
    INSERT OR IGNORE INTO social_claim_evidence (id, claim_id, evidence_kind, evidence_id, attached_by)
    VALUES (?, ?, ?, ?, ?)
  `).bind(id, input.claimId, evidence.kind, evidence.id, input.attachedBy.trim() || "claim-create").run();
}

export async function attachClaimEvidence(
  db: D1DatabaseLike,
  input: { claimId: string; evidence: SocialEvidenceRef; attachedBy: string },
): Promise<Persisted<SocialPackageClaim>> {
  const claim = await getPackageClaim(db, input.claimId);
  if (!claim) throw new Error("Additional evidence must attach to an existing claim.");
  const evidence = assertSocialEvidenceRef(input.evidence);
  const referenced = await resolveSocialEvidence(db, evidence);
  if (!referenced.exists) throw new Error("Claims must reference an existing Chef Gringo source, workflow source, corpus document, or citation.");
  await insertClaimEvidenceRow(db, { claimId: claim.id, evidence, attachedBy: input.attachedBy });
  const updated = await getPackageClaim(db, claim.id);
  if (!updated) throw new Error("Claim could not be loaded after attaching evidence.");
  return updated;
}

export async function createContentAsset(
  db: D1DatabaseLike,
  input: Omit<SocialContentAsset, "id"> & { slug: string },
): Promise<Persisted<SocialContentAsset>> {
  if (!isSocialAssetType(input.assetType)) throw new Error("Unsupported social asset type.");
  const id = socialGrowthId("asset", input.slug);
  await db.prepare(`
    INSERT INTO social_content_assets (id, asset_type, alt_text, license, provenance_note, uri)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    input.assetType,
    requiredText(input.altText, "Asset alt text", 400),
    requiredText(input.license, "Asset license", 200),
    input.provenanceNote.trim(),
    assertOwnedAssetUri(input.uri),
  ).run();
  const created = await getContentAsset(db, id);
  if (!created) throw new Error("Asset could not be loaded after insert.");
  return created;
}

export async function getContentAsset(db: D1DatabaseLike, id: string) {
  return first<Persisted<SocialContentAsset>>(
    db.prepare(`
      SELECT id, asset_type AS assetType, alt_text AS altText, license, provenance_note AS provenanceNote,
             uri, created_at AS createdAt, updated_at AS updatedAt
      FROM social_content_assets WHERE id = ?
    `).bind(id),
  );
}

export async function createChannelVariant(
  db: D1DatabaseLike,
  input: {
    slug: string;
    packageId: string;
    channel: SocialChannel;
    copy: string;
    assetIds?: string[];
    destinationPath: string;
  },
): Promise<{ variant: Persisted<SocialChannelVariant>; destination: Persisted<SocialDestinationUrl> }> {
  const pkg = await getContentPackage(db, input.packageId);
  if (!pkg) throw new Error("Variants must belong to an existing package.");
  for (const assetId of input.assetIds ?? []) {
    assertSocialGrowthId("asset", assetId);
    if (!await getContentAsset(db, assetId)) throw new Error("Variant asset ids must reference existing assets.");
  }
  const variantId = socialGrowthId("variant", input.slug);
  const minted = mintSocialDestinationUrl({
    pathOrUrl: input.destinationPath,
    channel: input.channel,
    packageId: input.packageId,
    variantId,
  });
  await db.prepare(`
    INSERT INTO social_channel_variants (id, package_id, channel, copy, asset_ids, destination_url_id)
    VALUES (?, ?, ?, ?, ?, NULL)
  `).bind(variantId, input.packageId, input.channel, input.copy.trim(), JSON.stringify(input.assetIds ?? [])).run();
  const destinationId = socialGrowthId("destination", `${input.channel}-${input.slug}`);
  await db.prepare(`
    INSERT INTO social_destination_urls (id, package_id, variant_id, channel, path, href)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(destinationId, input.packageId, variantId, input.channel, minted.pathname, minted.href).run();
  await db.prepare(`
    UPDATE social_channel_variants SET destination_url_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).bind(destinationId, variantId).run();
  const variant = await getChannelVariant(db, variantId);
  const destination = await getDestinationUrl(db, destinationId);
  if (!variant || !destination) throw new Error("Variant destination could not be loaded after insert.");
  return { variant, destination };
}

export async function getChannelVariant(db: D1DatabaseLike, id: string) {
  const row = await first<{
    id: string;
    packageId: string;
    channel: SocialChannel;
    copy: string;
    assetIds: string;
    destinationUrlId: string | null;
    createdAt: string;
    updatedAt: string;
  }>(
    db.prepare(`
      SELECT id, package_id AS packageId, channel, copy, asset_ids AS assetIds,
             destination_url_id AS destinationUrlId, created_at AS createdAt, updated_at AS updatedAt
      FROM social_channel_variants WHERE id = ?
    `).bind(id),
  );
  if (!row) return null;
  return { ...row, assetIds: parseJson<string[]>(row.assetIds, []) };
}

export async function getDestinationUrl(db: D1DatabaseLike, id: string) {
  return first<Persisted<SocialDestinationUrl>>(
    db.prepare(`
      SELECT id, package_id AS packageId, variant_id AS variantId, channel, path, href,
             created_at AS createdAt, updated_at AS updatedAt
      FROM social_destination_urls WHERE id = ?
    `).bind(id),
  );
}

export async function recordSocialApproval(
  db: D1DatabaseLike,
  input: {
    slug: string;
    subjectKind: SocialApproval["subjectKind"];
    subjectId: string;
    decision: SocialApproval["decision"];
    actorEmail: string;
    reason: string;
  },
): Promise<SocialApproval & { createdAt: string }> {
  const draft = createApprovalRecord(input);
  if (draft.subjectKind === "package" && !await getContentPackage(db, draft.subjectId)) {
    throw new Error("Approvals must target an existing package.");
  }
  if (draft.subjectKind === "variant" && !await getChannelVariant(db, draft.subjectId)) {
    throw new Error("Approvals must target an existing variant.");
  }
  if (draft.decision === "approved") {
    const packageId = draft.subjectKind === "package"
      ? draft.subjectId
      : (await getChannelVariant(db, draft.subjectId))?.packageId;
    if (!packageId) throw new Error("Approvals must target an existing package or variant.");
    const gate = await evaluatePackageApprovalGate(db, packageId);
    if (!gate.canApprove) {
      throw new Error(gate.blockers[0] ?? "Approval is blocked until every claim has intact, sufficient evidence.");
    }
    const intelligence = await buildPackageEvidenceIntelligence(db, packageId);
    if (!intelligence || !hasIntelligenceReadyApprovalAuthority({
      historicalCanApprove: gate.canApprove,
      recommendationReadiness: intelligence.decisionDna.recommendationReadiness,
      claimAssessments: intelligence.claimAssessments,
    })) {
      throw new Error("Intelligence authority is blocked. Historical evidence existence is not sufficient for package approval.");
    }
  }
  const id = socialGrowthId("approval", input.slug);
  await db.prepare(`
    INSERT INTO social_approvals (id, subject_kind, subject_id, decision, actor_email, reason, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, draft.subjectKind, draft.subjectId, draft.decision, draft.actorEmail, draft.reason, draft.occurredAt).run();
  if (draft.subjectKind === "package") {
    await db.prepare(`
      UPDATE social_content_packages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(draft.decision, draft.subjectId).run();
  }
  const row = await first<SocialApproval & { createdAt: string }>(
    db.prepare(`
      SELECT id, subject_kind AS subjectKind, subject_id AS subjectId, decision, actor_email AS actorEmail,
             reason, occurred_at AS occurredAt, created_at AS createdAt
      FROM social_approvals WHERE id = ?
    `).bind(id),
  );
  if (!row) throw new Error("Approval could not be loaded after insert.");
  return row;
}

const publicationSelect = `
  SELECT id, package_id AS packageId, variant_id AS variantId, channel, mode, status,
         platform_post_id AS platformPostId, platform_post_url AS platformPostUrl,
         destination_url_id AS destinationUrlId, tracked_href AS trackedHref,
         published_at AS publishedAt, recorded_at AS recordedAt, actor_email AS actorEmail,
         created_at AS createdAt, updated_at AS updatedAt
  FROM social_publications
`;

async function resolvePublicationSubject(
  db: D1DatabaseLike,
  input: { packageId: string; variantId: string; channel?: string; destinationUrlId?: string | null },
) {
  const pkg = await getContentPackage(db, input.packageId);
  if (!pkg) throw new Error("Publication records must reference an existing package.");
  const variant = await getChannelVariant(db, input.variantId);
  if (!variant) throw new Error("Publication records must reference an existing variant.");
  if (variant.packageId !== pkg.id) throw new Error("Publication variant does not belong to the supplied package.");
  if (input.channel && input.channel !== variant.channel) {
    throw new Error("Publication channel does not match the approved variant.");
  }
  if (!variant.destinationUrlId) throw new Error("Publication records require the variant’s minted Chef Gringo destination.");
  const destination = await getDestinationUrl(db, variant.destinationUrlId);
  if (!destination || destination.variantId !== variant.id || destination.packageId !== pkg.id) {
    throw new Error("Publication records must use the variant’s minted Chef Gringo destination.");
  }
  if (input.destinationUrlId && input.destinationUrlId !== destination.id) {
    throw new Error("Publication destination cannot be substituted. Use the minted Chef Gringo destination.");
  }
  const approvals = await listSocialApprovals(db);
  if (!hasValidSocialPublicationAuthority({
    packageId: pkg.id,
    variantId: variant.id,
    approvals,
    packageStatus: pkg.status,
  })) {
    throw new Error("A valid persisted approval is required before a publication can be recorded.");
  }
  return { pkg, variant, destination };
}

function publicationResult(publication: SocialPublication & { createdAt: string; updatedAt: string }) {
  return {
    publication,
    attribution: socialPublicationAttribution({
      packageId: publication.packageId,
      variantId: publication.variantId,
      publicationId: publication.id,
      destinationUrlId: publication.destinationUrlId,
      trackedHref: publication.trackedHref,
      channel: publication.channel,
    }),
    publishingEnabled: false,
  };
}

export async function prepareManualSocialPublication(
  db: D1DatabaseLike,
  input: {
    slug: string;
    packageId: string;
    variantId: string;
    channel?: string;
    actorEmail: string;
    destinationUrlId?: string | null;
  },
) {
  const { pkg, variant, destination } = await resolvePublicationSubject(db, input);
  const id = socialPublicationId(input.slug);
  const existing = await getSocialPublication(db, id);
  const tracked = mintPublicationTrackedUrl({
    pathOrUrl: destination.href,
    channel: variant.channel,
    packageId: pkg.id,
    variantId: variant.id,
    publicationId: id,
  });
  if (existing?.status === "recorded") {
    throw new Error("This publication slug is already recorded. Use a new slug for a reshare.");
  }
  if (existing?.status === "reserved") {
    if (existing.variantId !== variant.id || existing.packageId !== pkg.id) {
      throw new Error("This publication slug is already reserved for a different package or variant.");
    }
    return publicationResult(existing);
  }
  const draft = createReservedPublicationDraft({
    slug: input.slug,
    packageId: pkg.id,
    variantId: variant.id,
    channel: variant.channel,
    destinationUrlId: destination.id,
    trackedHref: tracked.href,
    actorEmail: input.actorEmail,
  });
  await db.prepare(`
    INSERT INTO social_publications (
      id, package_id, variant_id, channel, mode, status, platform_post_id, platform_post_url,
      destination_url_id, tracked_href, published_at, recorded_at, actor_email
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, NULL, ?, ?)
  `).bind(
    id,
    draft.packageId,
    draft.variantId,
    draft.channel,
    draft.mode,
    draft.status,
    draft.destinationUrlId,
    draft.trackedHref,
    draft.recordedAt,
    draft.actorEmail,
  ).run();
  const created = await getSocialPublication(db, id);
  if (!created) throw new Error("Publication reservation could not be loaded after insert.");
  return publicationResult(created);
}

export async function recordManualSocialPublication(
  db: D1DatabaseLike,
  input: {
    slug: string;
    packageId: string;
    variantId: string;
    channel?: string;
    platformPostUrl: string;
    platformPostId?: string | null;
    publishedAt: string;
    actorEmail: string;
    destinationUrlId?: string | null;
  },
) {
  const { pkg, variant, destination } = await resolvePublicationSubject(db, input);
  const id = socialPublicationId(input.slug);
  const reserved = await getSocialPublication(db, id);
  if (reserved && (reserved.variantId !== variant.id || reserved.packageId !== pkg.id)) {
    throw new Error("This publication slug is already reserved for a different package or variant.");
  }
  if (reserved?.status === "recorded") {
    throw new Error("This publication slug is already recorded. Use a new slug for a reshare.");
  }
  const tracked = mintPublicationTrackedUrl({
    pathOrUrl: destination.href,
    channel: variant.channel,
    packageId: pkg.id,
    variantId: variant.id,
    publicationId: id,
  });
  const draft = createManualPublicationDraft({
    slug: input.slug,
    packageId: pkg.id,
    variantId: variant.id,
    channel: variant.channel,
    platformPostUrl: input.platformPostUrl,
    platformPostId: input.platformPostId,
    publishedAt: input.publishedAt,
    actorEmail: input.actorEmail,
    destinationUrlId: destination.id,
    trackedHref: tracked.href,
  });
  const duplicate = await findDuplicateSocialPublication(db, {
    variantId: variant.id,
    platformPostUrl: draft.platformPostUrl!,
    platformPostId: draft.platformPostId,
    excludeId: id,
  });
  if (duplicate) throw new Error("A publication record already exists for this variant and platform post.");
  if (reserved?.status === "reserved") {
    await db.prepare(`
      UPDATE social_publications
      SET status = ?, platform_post_id = ?, platform_post_url = ?, tracked_href = ?,
          published_at = ?, recorded_at = ?, actor_email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      draft.status,
      draft.platformPostId,
      draft.platformPostUrl,
      draft.trackedHref,
      draft.publishedAt,
      draft.recordedAt,
      draft.actorEmail,
      id,
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO social_publications (
        id, package_id, variant_id, channel, mode, status, platform_post_id, platform_post_url,
        destination_url_id, tracked_href, published_at, recorded_at, actor_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      draft.packageId,
      draft.variantId,
      draft.channel,
      draft.mode,
      draft.status,
      draft.platformPostId,
      draft.platformPostUrl,
      draft.destinationUrlId,
      draft.trackedHref,
      draft.publishedAt,
      draft.recordedAt,
      draft.actorEmail,
    ).run();
  }
  const created = await getSocialPublication(db, id);
  if (!created) throw new Error("Publication record could not be loaded after insert.");
  return publicationResult(created);
}

export async function getSocialPublication(db: D1DatabaseLike, id: string) {
  return first<SocialPublication & { createdAt: string; updatedAt: string }>(
    db.prepare(`${publicationSelect} WHERE id = ?`).bind(id),
  );
}

export async function listSocialPublications(db: D1DatabaseLike) {
  return (await db.prepare(`${publicationSelect} ORDER BY recorded_at DESC, id ASC`)
    .all<SocialPublication & { createdAt: string; updatedAt: string }>()).results;
}

async function findDuplicateSocialPublication(
  db: D1DatabaseLike,
  input: { variantId: string; platformPostUrl: string; platformPostId: string | null; excludeId?: string },
) {
  const byUrl = await first<{ id: string }>(
    db.prepare("SELECT id FROM social_publications WHERE variant_id = ? AND platform_post_url = ? AND id != ?")
      .bind(input.variantId, input.platformPostUrl, input.excludeId ?? ""),
  );
  if (byUrl) return byUrl;
  if (!input.platformPostId) return null;
  return first<{ id: string }>(
    db.prepare("SELECT id FROM social_publications WHERE variant_id = ? AND platform_post_id = ? AND id != ?")
      .bind(input.variantId, input.platformPostId, input.excludeId ?? ""),
  );
}

export async function listContentAssets(db: D1DatabaseLike) {
  return (await db.prepare(`
    SELECT id, asset_type AS assetType, alt_text AS altText, license, provenance_note AS provenanceNote,
           uri, created_at AS createdAt, updated_at AS updatedAt
    FROM social_content_assets ORDER BY updated_at DESC, id ASC
  `).all<Persisted<SocialContentAsset>>()).results;
}

export async function listDestinationUrls(db: D1DatabaseLike) {
  return (await db.prepare(`
    SELECT id, package_id AS packageId, variant_id AS variantId, channel, path, href,
           created_at AS createdAt, updated_at AS updatedAt
    FROM social_destination_urls ORDER BY channel ASC
  `).all<Persisted<SocialDestinationUrl>>()).results;
}

export type SocialEvidenceCatalogItem = {
  kind: SocialEvidenceRef["kind"];
  id: string;
  label: string;
  verificationStatus?: string | null;
  ingestionStatus?: string | null;
  productionExposure?: boolean | null;
};

export async function listSocialEvidenceCatalog(db: D1DatabaseLike): Promise<SocialEvidenceCatalogItem[]> {
  const sources = (await db.prepare("SELECT id, title, verification_status AS verificationStatus FROM sources ORDER BY id ASC").all<{ id: number; title: string; verificationStatus: string }>()).results;
  const workflowSources = (await db.prepare(`
    SELECT workflow_sources.id, workflow_sources.claim_text AS claimText, sources.verification_status AS verificationStatus
    FROM workflow_sources JOIN sources ON sources.id = workflow_sources.source_id
    ORDER BY workflow_sources.id ASC
  `).all<{ id: number; claimText: string; verificationStatus: string }>()).results;
  const documents = (await db.prepare(`
    SELECT id, title, ingestion_status AS ingestionStatus, production_exposure AS productionExposure
    FROM corpus_documents ORDER BY updated_at DESC
  `).all<{ id: string; title: string; ingestionStatus: string; productionExposure: number | boolean }>()).results;
  const citations = (await db.prepare("SELECT id, claim_text AS claimText, document_id AS documentId FROM corpus_citations ORDER BY id ASC").all<{ id: number; claimText: string; documentId: string }>()).results;
  return [
    ...sources.map((row) => ({ kind: "knowledge_source" as const, id: String(row.id), label: row.title, verificationStatus: row.verificationStatus })),
    ...workflowSources.map((row) => ({ kind: "workflow_source" as const, id: String(row.id), label: row.claimText, verificationStatus: row.verificationStatus })),
    ...documents.map((row) => ({
      kind: "corpus_document" as const,
      id: row.id,
      label: row.title,
      ingestionStatus: row.ingestionStatus,
      productionExposure: Boolean(row.productionExposure),
    })),
    ...citations.map((row) => ({ kind: "corpus_citation" as const, id: String(row.id), label: row.claimText })),
  ];
}

export async function loadSocialGrowthQueue(db: D1DatabaseLike) {
  const [opportunities, packages, assets, variants, destinations, approvals, publications, evidenceCatalog, evidenceRequests] = await Promise.all([
    listContentOpportunities(db),
    listContentPackages(db),
    listContentAssets(db),
    listChannelVariants(db),
    listDestinationUrls(db),
    listSocialApprovals(db),
    listSocialPublications(db),
    listSocialEvidenceCatalog(db),
    listSocialEvidenceRequests(db),
  ]);
  const claims = [];
  for (const pkg of packages) claims.push(...await listPackageClaims(db, pkg.id));
  const packageGates: Record<string, Awaited<ReturnType<typeof evaluatePackageApprovalGate>>> = {};
  for (const pkg of packages) packageGates[pkg.id] = await evaluatePackageApprovalGate(db, pkg.id);
  const evidenceIntelligence: Record<string, Awaited<ReturnType<typeof buildPackageEvidenceIntelligence>>> = {};
  for (const pkg of packages) evidenceIntelligence[pkg.id] = await buildPackageEvidenceIntelligence(db, pkg.id);
  const researchRuns = await listResearchRuns(db);
  return {
    publishingEnabled: false,
    discoveryCapability: candidateDiscoveryCapability(),
    liveDiscoveryAvailable: liveCandidateDiscoveryAvailable(),
    opportunities,
    packages,
    claims,
    assets,
    variants,
    destinations,
    approvals,
    publications,
    evidenceRequests,
    evidenceCatalog,
    packageGates,
    evidenceIntelligence,
    researchRuns,
    publicationAuthority: packages.map((pkg) => ({
      packageId: pkg.id,
      status: pkg.status,
      hasValidApproval: hasValidSocialApproval({ subjectKind: "package", subjectId: pkg.id, approvals, packageStatus: pkg.status }),
    })),
    variantRecordAuthority: variants.map((variant) => ({
      variantId: variant.id,
      packageId: variant.packageId,
      canRecordManualPublication: hasValidSocialPublicationAuthority({
        packageId: variant.packageId,
        variantId: variant.id,
        approvals,
        packageStatus: packages.find((pkg) => pkg.id === variant.packageId)?.status,
      }),
    })),
  };
}

export function publishSocialPackage(): never {
  return assertPublishUnavailable();
}

export function listSocialGrowthWriteMethods() {
  return [
    "createContentOpportunity",
    "updateContentOpportunity",
    "createContentPackage",
    "updateContentPackage",
    "addPackageClaim",
    "attachClaimEvidence",
    "createContentAsset",
    "createChannelVariant",
    "recordSocialApproval",
    "prepareManualSocialPublication",
    "recordManualSocialPublication",
    "createSocialEvidenceRequest",
    "submitEvidenceRequestCandidate",
    "resolveSocialEvidenceRequest",
    "rejectSocialEvidenceRequest",
    "runBoundedCandidateDiscovery",
    "submitResearchCandidatesForReview",
  ] as const;
}
