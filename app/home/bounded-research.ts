import { extractExternalEvidence, ingestExternalEvidence, type ExternalSourceType, type SourceValidation } from "./external-evidence.ts";
import type { InvestigationCase } from "./investigation-case.ts";
import { capabilityForOfflineRun, type ResearchCapability } from "../lib/research/capability.ts";
import { inspectEvidenceContent } from "../lib/research/content-safety.ts";
import { RESEARCH_LIMITS } from "../lib/research/limits.ts";
import { validateSourcePayload, validateSourceUrl } from "../lib/research/url-safety.ts";

export { RESEARCH_LIMITS };

export const RESEARCH_REQUIREMENT_TYPES = ["FIND_MANUFACTURER_MANUAL", "VERIFY_ELECTRICAL_SPEC", "FIND_PARTS_DOCUMENTATION", "VERIFY_PART_COMPATIBILITY", "VERIFY_WARRANTY"] as const;
export type ResearchRequirementType = typeof RESEARCH_REQUIREMENT_TYPES[number];
export type ResearchRequirementStatus = "ready" | "blocked" | "resolved" | "unresolved" | "conflicting";
export type AuthorityTier = 1 | 2 | 3;

export type ResearchRequirement = {
  id: string;
  caseId: string;
  type: ResearchRequirementType;
  subject: string;
  manufacturer: string | null;
  model: string | null;
  exactQuestion: string;
  whyItMatters: string;
  acceptableSourceClasses: ExternalSourceType[];
  minimumAuthority: AuthorityTier;
  officialDomains: string[];
  searchConstraints: { maximumQueries: 3; maximumCandidates: 5; exactModelRequired: boolean; stopOnAuthoritativeAnswer: boolean };
  status: ResearchRequirementStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type ResearchCandidateInput = {
  id: string;
  url: string;
  title: string;
  sourceClass: ExternalSourceType;
  retrievedAt: string;
  contentText: string;
  sourceLocation: string | null;
  applicableModels: string[];
  contentType?: string;
};

export type AssessedResearchSource = ResearchCandidateInput & {
  domain: string;
  authorityTier: AuthorityTier;
  authority: SourceValidation;
  answersRequirement: boolean;
  modelApplicability: "exact" | "unclear" | "mismatch";
  sourceIdentityConfidence: "low" | "moderate" | "high";
  ingestionStatus: "ingested" | "lead_only" | "rejected" | "not_selected";
  rejectionReason: string | null;
  relevantExcerpt: string | null;
  contentFlags: ReturnType<typeof inspectEvidenceContent>;
};

export type ResearchAudit = {
  queriesExecuted: string[];
  sourcesConsidered: AssessedResearchSource[];
  selectedSourceIds: string[];
  rejectedSources: Array<{ sourceId: string; reason: string }>;
  stoppedBecause: "authoritative_answer_found" | "candidate_limit_reached" | "sources_exhausted" | "conflicting_primary_sources";
  liveRetrievalCompleted: false;
  modelCalls: 0;
};

export type BoundedResearchResult = {
  requirement: ResearchRequirement;
  updatedCase: InvestigationCase;
  bestSource: AssessedResearchSource | null;
  establishedFacts: string[];
  unresolvedReason: string | null;
  conflicts: string[];
  audit: ResearchAudit;
  stateBefore: InvestigationCase["status"];
  stateAfter: InvestigationCase["status"];
  capability: ResearchCapability;
};

const requirementConfig: Record<ResearchRequirementType, { question: string; why: string; classes: ExternalSourceType[]; topic: string | null; tier: AuthorityTier; exactModel: boolean }> = {
  FIND_MANUFACTURER_MANUAL: { question: "Find official manufacturer documentation for this exact model.", why: "Model-specific documentation is the safest basis for specifications, installation constraints, and later service research.", classes: ["manufacturer_documentation", "regulatory_document"], topic: null, tier: 1, exactModel: true },
  VERIFY_ELECTRICAL_SPEC: { question: "Find authoritative documentation that explicitly states the operating voltage for this exact model.", why: "Electrical requirements affect compatibility and safety and cannot be inferred from a similar model.", classes: ["manufacturer_documentation", "regulatory_document", "parts_documentation"], topic: "electrical_voltage", tier: 1, exactModel: true },
  FIND_PARTS_DOCUMENTATION: { question: "Find an official parts list or diagram explicitly covering this exact model.", why: "Official parts documentation is needed before identifying an approved part.", classes: ["manufacturer_documentation", "parts_documentation"], topic: "approved_part", tier: 1, exactModel: true },
  VERIFY_PART_COMPATIBILITY: { question: "Find an authoritative direct mapping between this exact model and the proposed part.", why: "Similar names, dimensions, and seller claims do not establish safe compatibility.", classes: ["manufacturer_documentation", "parts_documentation", "regulatory_document"], topic: "approved_part", tier: 1, exactModel: true },
  VERIFY_WARRANTY: { question: "Find official warranty or documented service requirements for this exact model.", why: "Warranty and service restrictions can change the viable repair or replacement route.", classes: ["manufacturer_documentation", "regulatory_document"], topic: "warranty_condition", tier: 1, exactModel: true },
};

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function sameModel(left: string, right: string) { return left.trim().toLowerCase() === right.trim().toLowerCase(); }
function domainOf(url: string) { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return "invalid"; } }
function officialDomain(domain: string, requirement: ResearchRequirement) { return requirement.officialDomains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`)); }

export function createResearchRequirement(investigation: InvestigationCase, type: ResearchRequirementType, createdAt: string, officialDomains: string[] = []): ResearchRequirement {
  const config = requirementConfig[type];
  const manufacturer = investigation.equipment.manufacturer;
  const model = investigation.equipment.modelNumber;
  const ready = Boolean(manufacturer && model && officialDomains.length);
  return {
    id: `${investigation.id}:research:${slug(type)}`,
    caseId: investigation.id,
    type,
    subject: [manufacturer, model, investigation.equipment.identity].filter(Boolean).join(" ") || "Unidentified foodservice equipment",
    manufacturer,
    model,
    exactQuestion: config.question,
    whyItMatters: config.why,
    acceptableSourceClasses: config.classes,
    minimumAuthority: config.tier,
    officialDomains: [...new Set(officialDomains.map((item) => item.toLowerCase().replace(/^www\./, "")))],
    searchConstraints: { maximumQueries: 3, maximumCandidates: 5, exactModelRequired: config.exactModel, stopOnAuthoritativeAnswer: true },
    status: ready ? "ready" : "blocked",
    createdAt,
    resolvedAt: null,
  };
}

export function buildBoundedQueries(requirement: ResearchRequirement) {
  if (requirement.status === "blocked" || !requirement.manufacturer || !requirement.model) return [];
  const domainConstraint = requirement.officialDomains[0] ? `site:${requirement.officialDomains[0]} ` : "";
  const purpose = requirement.type === "VERIFY_ELECTRICAL_SPEC" ? "voltage electrical specifications" : requirement.type === "FIND_PARTS_DOCUMENTATION" || requirement.type === "VERIFY_PART_COMPATIBILITY" ? "parts manual approved part" : requirement.type === "VERIFY_WARRANTY" ? "warranty terms" : "manual specifications";
  return [`${domainConstraint}"${requirement.model}" ${purpose}`, `${domainConstraint}"${requirement.manufacturer}" "${requirement.model}" PDF`, `"${requirement.manufacturer}" "${requirement.model}" ${purpose}`].slice(0, RESEARCH_LIMITS.maximumQueries);
}

function emptyAudit(queries: string[], considered: AssessedResearchSource[] = [], stoppedBecause: ResearchAudit["stoppedBecause"] = "sources_exhausted"): ResearchAudit {
  return {
    queriesExecuted: queries,
    sourcesConsidered: considered,
    selectedSourceIds: [],
    rejectedSources: considered.filter((item) => item.rejectionReason).map((item) => ({ sourceId: item.id, reason: item.rejectionReason! })),
    stoppedBecause,
    liveRetrievalCompleted: false,
    modelCalls: 0,
  };
}

function assess(requirement: ResearchRequirement, candidate: ResearchCandidateInput): AssessedResearchSource {
  const urlCheck = validateSourceUrl(candidate.url);
  const payload = validateSourcePayload({ contentType: candidate.contentType ?? "text/plain", byteLength: new TextEncoder().encode(candidate.contentText).length });
  const contentFlags = inspectEvidenceContent(candidate.contentText);
  const domain = domainOf(candidate.url);
  const isOfficial = officialDomain(domain, requirement);
  const authorityTier: AuthorityTier = candidate.sourceClass === "regulatory_document" || (isOfficial && ["manufacturer_documentation", "parts_documentation"].includes(candidate.sourceClass)) ? 1 : ["manufacturer_documentation", "parts_documentation", "technician_report", "service_invoice", "distributor_quote"].includes(candidate.sourceClass) ? 2 : 3;
  const authority: SourceValidation = authorityTier === 1 ? "authoritative_source" : authorityTier === 2 ? "credible_source" : "unverified_source";
  const modelApplicability = !requirement.model || !candidate.applicableModels.length ? "unclear" : candidate.applicableModels.some((model) => sameModel(model, requirement.model!)) ? "exact" : "mismatch";
  let facts: ReturnType<typeof extractExternalEvidence>["facts"] = [];
  try {
    facts = extractExternalEvidence({
      fileName: candidate.title,
      mediaType: "plain_text",
      sourceType: candidate.sourceClass,
      contentText: candidate.contentText,
      sourceLocation: candidate.sourceLocation,
      extractedAt: candidate.retrievedAt,
      sourceUrl: candidate.url,
      sourceValidationOverride: authority,
    }).facts;
  } catch {
    facts = [];
  }
  const topic = requirementConfig[requirement.type].topic;
  const relevant = topic ? facts.find((fact) => fact.topic === topic) : facts[0];
  const compatibilityAllowed = requirement.type !== "VERIFY_PART_COMPATIBILITY" || (authorityTier === 1 && candidate.sourceClass !== "seller_listing" && Boolean(facts.find((fact) => fact.topic === "approved_part")));
  let rejectionReason: string | null = null;
  if (!urlCheck.ok) rejectionReason = `Source URL rejected: ${urlCheck.issues.join(", ")}.`;
  else if (!payload.ok) rejectionReason = `Source payload rejected: ${payload.issues.join(", ")}.`;
  else if (modelApplicability === "mismatch") rejectionReason = `Document covers ${candidate.applicableModels.join(", ") || "another model"}, not ${requirement.model}.`;
  else if (modelApplicability === "unclear") rejectionReason = "Exact model coverage is not explicit.";
  else if (!relevant) rejectionReason = "The inspected source does not answer the exact requirement.";
  else if (authorityTier > requirement.minimumAuthority) rejectionReason = "Source authority is below the requirement minimum.";
  else if (!compatibilityAllowed) rejectionReason = "Compatibility is not supported by an authoritative direct model-to-part mapping.";
  const answersRequirement = !rejectionReason && modelApplicability === "exact" && authorityTier <= requirement.minimumAuthority && Boolean(relevant) && compatibilityAllowed;
  return {
    ...candidate,
    domain,
    authorityTier,
    authority,
    answersRequirement,
    modelApplicability,
    sourceIdentityConfidence: isOfficial || candidate.sourceClass === "regulatory_document" ? "high" : authorityTier === 2 ? "moderate" : "low",
    ingestionStatus: rejectionReason ? candidate.sourceClass === "seller_listing" ? "lead_only" : "rejected" : "not_selected",
    rejectionReason,
    relevantExcerpt: relevant?.snippet ?? null,
    contentFlags,
  };
}

export function runBoundedResearch(original: InvestigationCase, requirement: ResearchRequirement, candidates: ResearchCandidateInput[], completedAt: string): BoundedResearchResult {
  if (requirement.caseId !== original.id) throw new Error("Research requirement does not belong to this case.");
  const queries = buildBoundedQueries(requirement);
  if (requirement.status === "blocked") {
    return {
      requirement,
      updatedCase: original,
      bestSource: null,
      establishedFacts: [],
      unresolvedReason: "Manufacturer, exact model, and official-domain identity are required before lookup.",
      conflicts: [],
      audit: emptyAudit([]),
      stateBefore: original.status,
      stateAfter: original.status,
      capability: capabilityForOfflineRun({ blocked: true, queryCount: 0, assessedCandidateCount: 0, liveRetrievalCompleted: false }),
    };
  }
  const ranked = candidates.map((candidate) => assess(requirement, candidate)).sort((a, b) => a.authorityTier - b.authorityTier || Number(b.answersRequirement) - Number(a.answersRequirement) || a.id.localeCompare(b.id));
  const considered = ranked.slice(0, RESEARCH_LIMITS.maximumCandidates);
  const authoritativeAnswers = considered.filter((candidate) => candidate.answersRequirement && candidate.authorityTier === 1);
  let updatedCase = original;
  const selected: AssessedResearchSource[] = [];
  const conflicts: string[] = [];
  const establishedFacts: string[] = [];
  for (const candidate of authoritativeAnswers) {
    const ingestion = ingestExternalEvidence(updatedCase, {
      fileName: candidate.title,
      mediaType: "plain_text",
      sourceType: candidate.sourceClass,
      contentText: candidate.contentText,
      sourceLocation: candidate.sourceLocation,
      extractedAt: completedAt,
      sourceUrl: candidate.url,
      sourceValidationOverride: candidate.authority,
      validationOverrideProvenance: {
        appliedBy: "bounded-research-engine",
        reason: "Authority assessed from source class and official-domain match; original source-class validation is retained.",
        appliedAt: completedAt,
      },
    });
    updatedCase = ingestion.updatedCase;
    candidate.ingestionStatus = "ingested";
    selected.push(candidate);
    establishedFacts.push(...ingestion.establishedFacts.map((fact) => fact.label));
    conflicts.push(...ingestion.conflicts);
  }
  if (!selected.length) {
    const lead = requirement.type === "VERIFY_PART_COMPATIBILITY" ? considered.find((candidate) => candidate.sourceClass === "seller_listing" && candidate.modelApplicability === "exact") : undefined;
    if (lead) {
      const ingestion = ingestExternalEvidence(updatedCase, {
        fileName: lead.title,
        mediaType: "plain_text",
        sourceType: lead.sourceClass,
        contentText: lead.contentText,
        sourceLocation: lead.sourceLocation,
        extractedAt: completedAt,
        sourceUrl: lead.url,
        sourceValidationOverride: lead.authority,
        validationOverrideProvenance: {
          appliedBy: "bounded-research-engine",
          reason: "Seller listing retained as a lead only.",
          appliedAt: completedAt,
        },
      });
      updatedCase = ingestion.updatedCase;
      lead.ingestionStatus = "lead_only";
    }
  }
  const conflicting = conflicts.length > 0;
  const resolved = selected.length > 0 && !conflicting;
  const finalRequirement: ResearchRequirement = { ...requirement, status: conflicting ? "conflicting" : resolved ? "resolved" : "unresolved", resolvedAt: resolved ? completedAt : null };
  const rejectedSources = considered.filter((candidate) => candidate.rejectionReason).map((candidate) => ({ sourceId: candidate.id, reason: candidate.rejectionReason! }));
  const stoppedBecause: ResearchAudit["stoppedBecause"] = conflicting ? "conflicting_primary_sources" : resolved ? "authoritative_answer_found" : ranked.length > RESEARCH_LIMITS.maximumCandidates ? "candidate_limit_reached" : "sources_exhausted";
  return {
    requirement: finalRequirement,
    updatedCase,
    bestSource: resolved ? selected[0] : null,
    establishedFacts: [...new Set(establishedFacts)],
    unresolvedReason: conflicting ? "Conflicting primary sources found; the requirement remains unresolved." : resolved ? null : considered.length ? "No authoritative applicable source answered the requirement." : "No candidate sources were found.",
    conflicts,
    audit: {
      queriesExecuted: queries,
      sourcesConsidered: considered,
      selectedSourceIds: selected.map((item) => item.id),
      rejectedSources,
      stoppedBecause,
      liveRetrievalCompleted: false,
      modelCalls: 0,
    },
    stateBefore: original.status,
    stateAfter: updatedCase.status,
    capability: capabilityForOfflineRun({
      blocked: false,
      queryCount: queries.length,
      assessedCandidateCount: considered.length,
      liveRetrievalCompleted: false,
    }),
  };
}
