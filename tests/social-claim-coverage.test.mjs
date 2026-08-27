import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  assessDiscoveredHit,
  buildEvidenceGapFeedback,
  buildExecutableResearchPlan,
  buildOperatorSummary,
  buildResearchMemory,
  candidateQualifiesForCorpusSubmission,
  claimCoverageIsSufficientForSupport,
  classifyCandidateRelationship,
  classifyPolicyAdvancement,
  evaluateClaimCoverage,
  evaluateMemorySkip,
  wouldSatisfyPolicyIfAccepted,
} from "../app/growth/social/index.ts";

const SAFETY_CLAIM = "What operator actions are outside authorized scope: attempting unsafe electrical or refrigerant repairs?";
const GENERIC_SAFETY_PASSAGE = "Personnel take immediate actions to prevent or correct unsafe situations.";
const SOFTWARE_PASSAGE = "Software users should avoid unsafe permission behavior that lets an agent take unauthorized actions.";
const WRONG_SUBJECT_PASSAGE = "Authorized personnel must not create unsafe working conditions when operating public transit vehicles.";
const DIRECT_SAFETY_PASSAGE = "Specified electrical or refrigerant servicing must be performed by qualified authorized personnel. Independent operators must not attempt those repairs.";

function safetyPlan() {
  return buildExecutableResearchPlan({
    claimOrQuestion: SAFETY_CLAIM,
    policyClass: "safety_sensitive",
    reason: "Safety-sensitive operator boundary requires especially authoritative coverage.",
  });
}

function assessedHit(overrides = {}) {
  return assessDiscoveredHit({
    hit: {
      canonicalUrl: overrides.canonicalUrl ?? "https://www.docs.example.gov/general-safety",
      title: overrides.title ?? "General safety bulletin",
      publisher: overrides.publisher ?? "Example Government Regulator",
      sourceType: overrides.sourceType ?? "regulatory_document",
      retrievedText: overrides.retrievedText ?? GENERIC_SAFETY_PASSAGE,
      provenanceMethod: "test_fixture",
      query: "q",
      publishedDate: "2024-01-01",
    },
    plan: overrides.plan ?? safetyPlan(),
  });
}

function gapForSafety() {
  return buildEvidenceGapFeedback({
    assessment: {
      claimId: "sgo:claim:safety-boundary",
      claimText: SAFETY_CLAIM,
      safetySensitive: true,
      policyClass: "safety_sensitive",
      state: "insufficient_authority",
      acceptedSourceCount: 0,
      independentSourceCount: 0,
      authorityClasses: [],
      authorityStatus: "missing",
      acceptedSources: [],
      dimensions: {
        acceptedSupportingRecords: 0,
        independentPublishers: 0,
        sourceProvenanceClasses: [],
        authorityAdequate: false,
        freshness: "not_applicable",
        contradiction: "none",
        safetySensitive: true,
        breadthMatch: true,
      },
      gaps: ["Stronger authority is required."],
      recommendedNextAction: "research",
      researchPlan: null,
    },
    attached: [],
    policyClass: "safety_sensitive",
  });
}

test("claim coverage semantics: direct, partial, context_only, none, and contradicts", () => {
  const direct = evaluateClaimCoverage({ claimText: SAFETY_CLAIM, passage: DIRECT_SAFETY_PASSAGE, safetySensitive: true });
  assert.equal(direct.state, "direct");
  assert.equal(claimCoverageIsSufficientForSupport(direct.state, true), true);

  const context = evaluateClaimCoverage({ claimText: SAFETY_CLAIM, passage: GENERIC_SAFETY_PASSAGE, safetySensitive: true });
  assert.equal(context.state, "context_only");
  assert.equal(claimCoverageIsSufficientForSupport(context.state, true), false);

  const none = evaluateClaimCoverage({
    claimText: SAFETY_CLAIM,
    passage: "The museum gift shop sells postcards and seasonal calendars near the lobby.",
    safetySensitive: true,
  });
  assert.equal(none.state, "none");

  const contradict = evaluateClaimCoverage({
    claimText: "Independent operators may not perform electrical repairs.",
    passage: "Independent operators may perform electrical repairs without a license.",
    safetySensitive: true,
  });
  assert.equal(contradict.state, "contradicts");
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("A: high-authority generic safety language does not SUPPORT, advance, or auto-submit", () => {
  const coverage = evaluateClaimCoverage({ claimText: SAFETY_CLAIM, passage: GENERIC_SAFETY_PASSAGE, safetySensitive: true });
  assert.notEqual(coverage.state, "direct");
  assert.ok(coverage.state === "context_only" || coverage.state === "none");
  const candidate = assessedHit();
  assert.equal(candidate.authorityClass, "government_regulatory");
  assert.equal(candidate.authorityAdequate, true);
  assert.notEqual(candidate.relationship, "supports");
  assert.notEqual(candidate.claimCoverage, "direct");
  assert.notEqual(candidate.policyAdvancement, "advances_authority");
  assert.notEqual(candidate.policyAdvancement, "advances_independence");
  assert.equal(candidate.proposedForReview, false);
  assert.equal(candidateQualifiesForCorpusSubmission(candidate), false);
  assert.equal(classifyCandidateRelationship(GENERIC_SAFETY_PASSAGE, SAFETY_CLAIM), "relevant");
});

test("B: semantically overlapping unrelated software article is not SUPPORTS and does not submit", () => {
  const candidate = assessedHit({
    canonicalUrl: "https://www.software-lab.example/unsafe-permissions",
    title: "Unsafe permission behavior in agents",
    publisher: "Software Lab",
    sourceType: "editorial",
    retrievedText: SOFTWARE_PASSAGE,
  });
  assert.notEqual(candidate.relationship, "supports");
  assert.ok(candidate.claimCoverage === "none" || candidate.claimCoverage === "context_only");
  assert.equal(candidateQualifiesForCorpusSubmission(candidate), false);
});

test("C: high-authority wrong subject fails coverage", () => {
  const candidate = assessedHit({
    canonicalUrl: "https://www.transit.example.gov/authorized-personnel",
    retrievedText: WRONG_SUBJECT_PASSAGE,
  });
  assert.equal(candidate.authorityClass, "government_regulatory");
  assert.notEqual(candidate.relationship, "supports");
  assert.notEqual(candidate.claimCoverage, "direct");
  assert.equal(candidateQualifiesForCorpusSubmission(candidate), false);
});

test("D: genuine direct support from an authoritative technical source", () => {
  const candidate = assessedHit({
    canonicalUrl: "https://www.docs.example.gov/qualified-electrical-service",
    title: "Qualified servicing requirement",
    retrievedText: DIRECT_SAFETY_PASSAGE,
  });
  assert.equal(candidate.claimCoverage, "direct");
  assert.equal(candidate.relationship, "supports");
  assert.equal(candidate.authorityAdequate, true);
  const advancement = classifyPolicyAdvancement({
    independenceCluster: candidate.independenceCluster,
    authorityClass: candidate.authorityClass,
    authorityAdequate: true,
    relationship: candidate.relationship,
    claimCoverage: candidate.claimCoverage,
    gap: { ...gapForSafety(), strongerAuthorityRequired: true },
  });
  assert.equal(advancement, "advances_authority");
  assert.equal(candidateQualifiesForCorpusSubmission({ ...candidate, policyAdvancement: advancement }), true);
});

test("generalization: the same mechanism distinguishes adjacent vocabulary across domains", () => {
  const equipment = evaluateClaimCoverage({
    claimText: SAFETY_CLAIM,
    passage: GENERIC_SAFETY_PASSAGE,
    safetySensitive: true,
  });
  const equipmentDirect = evaluateClaimCoverage({
    claimText: SAFETY_CLAIM,
    passage: DIRECT_SAFETY_PASSAGE,
    safetySensitive: true,
  });
  assert.notEqual(equipment.state, "direct");
  assert.equal(equipmentDirect.state, "direct");

  const foodClaim = "Sliced tomatoes must be held below 41°F after prep.";
  const foodDirect = evaluateClaimCoverage({
    claimText: foodClaim,
    passage: "Ready-to-eat sliced tomatoes must be held below 41°F after preparation.",
    safetySensitive: true,
  });
  const foodAdjacent = evaluateClaimCoverage({
    claimText: foodClaim,
    passage: "This refrigeration document discusses temperature control in general kitchen practice.",
    safetySensitive: true,
  });
  assert.equal(foodDirect.state, "direct");
  assert.notEqual(foodAdjacent.state, "direct");

  const saasClaim = "Managers must not share employee SSNs in email.";
  const saasDirect = evaluateClaimCoverage({
    claimText: saasClaim,
    passage: "Managers must not share employee SSNs in email under any circumstance.",
  });
  const saasAdjacent = evaluateClaimCoverage({
    claimText: saasClaim,
    passage: SOFTWARE_PASSAGE,
  });
  assert.equal(saasDirect.state, "direct");
  assert.notEqual(saasAdjacent.state, "direct");

  const complianceClaim = "Employers must retain payroll records for 4 years.";
  const complianceDirect = evaluateClaimCoverage({
    claimText: complianceClaim,
    passage: "Employers must retain payroll records for 4 years after the records are made.",
  });
  const complianceAdjacent = evaluateClaimCoverage({
    claimText: complianceClaim,
    passage: "Personnel take immediate actions to prevent or correct unsafe situations.",
  });
  assert.equal(complianceDirect.state, "direct");
  assert.notEqual(complianceAdjacent.state, "direct");

  const compareClaim = "Dishwasher A has higher rack capacity than dishwasher B.";
  const compareDirect = evaluateClaimCoverage({
    claimText: compareClaim,
    passage: "Independent lab measurements show dishwasher A has higher rack capacity than dishwasher B.",
  });
  const compareAdjacent = evaluateClaimCoverage({
    claimText: compareClaim,
    passage: "This listing mentions capacity, racks, and dishwashers in promotional copy.",
  });
  assert.equal(compareDirect.state, "direct");
  assert.notEqual(compareAdjacent.state, "direct");
});

test("adversarial coverage matrix", () => {
  const zero = assessedHit();
  assert.equal(zero.authorityAdequate, true);
  assert.notEqual(zero.claimCoverage, "direct");
  assert.equal(candidateQualifiesForCorpusSubmission(zero), false);

  const partial = evaluateClaimCoverage({
    claimText: SAFETY_CLAIM,
    passage: "Operators must not attempt electrical repairs on energized equipment.",
    safetySensitive: true,
  });
  assert.ok(partial.state === "partial" || partial.state === "direct");
  if (partial.state === "partial") {
    assert.equal(claimCoverageIsSufficientForSupport(partial.state, true), false);
  }

  const weakDirect = assessedHit({
    canonicalUrl: "https://www.kitchen-blog.example/repairs",
    publisher: "Kitchen Blog",
    sourceType: "editorial",
    retrievedText: DIRECT_SAFETY_PASSAGE,
  });
  assert.equal(weakDirect.claimCoverage, "direct");
  assert.equal(weakDirect.authorityAdequate, false);
  assert.equal(candidateQualifiesForCorpusSubmission(weakDirect), false);

  const adequateDirect = assessedHit({
    canonicalUrl: "https://www.docs.example.gov/qualified-service-2",
    retrievedText: DIRECT_SAFETY_PASSAGE,
  });
  assert.equal(adequateDirect.claimCoverage, "direct");
  assert.equal(adequateDirect.authorityAdequate, true);

  const nounsWrongRelation = evaluateClaimCoverage({
    claimText: SAFETY_CLAIM,
    passage: GENERIC_SAFETY_PASSAGE,
    safetySensitive: true,
  });
  assert.equal(nounsWrongRelation.relationMatched, false);
  assert.notEqual(nounsWrongRelation.state, "direct");

  const relationWrongSubject = evaluateClaimCoverage({
    claimText: SAFETY_CLAIM,
    passage: WRONG_SUBJECT_PASSAGE,
    safetySensitive: true,
  });
  assert.notEqual(relationWrongSubject.state, "direct");

  const numberClaim = "Hold sliced tomatoes below 41°F.";
  assert.notEqual(evaluateClaimCoverage({ claimText: numberClaim, passage: "Hold sliced tomatoes below safe temperature.", safetySensitive: true }).state, "direct");
  assert.notEqual(evaluateClaimCoverage({ claimText: numberClaim, passage: "Hold sliced tomatoes below 0°F.", safetySensitive: true }).state, "direct");
  assert.notEqual(evaluateClaimCoverage({ claimText: numberClaim, passage: "Hold sliced tomatoes below 41°C.", safetySensitive: true }).state, "direct");
  assert.equal(evaluateClaimCoverage({ claimText: numberClaim, passage: "Hold sliced tomatoes below 41°F after prep.", safetySensitive: true }).state, "direct");

  const safetyPartial = evaluateClaimCoverage({
    claimText: SAFETY_CLAIM,
    passage: "Operators should avoid unsafe repairs until a technician arrives.",
    safetySensitive: true,
  });
  if (safetyPartial.state === "partial") {
    assert.equal(claimCoverageIsSufficientForSupport(safetyPartial.state, true), false);
  }
});

test("coverage failure cannot advance sufficiency or auto-submit, and economics cannot affect coverage", () => {
  const candidate = assessedHit();
  const sufficiency = wouldSatisfyPolicyIfAccepted({
    claim: { id: "sgo:claim:safety-boundary", claimText: SAFETY_CLAIM, safetySensitive: true, policyClass: "safety_sensitive" },
    attached: [],
    proposed: [{ ...candidate, proposedForReview: true, relationship: "supports", claimCoverage: "context_only" }],
  });
  assert.notEqual(sufficiency.state, "supported");
  assert.equal(candidateQualifiesForCorpusSubmission({
    ...candidate,
    proposedForReview: true,
    policyAdvancement: "advances_authority",
    claimCoverage: "context_only",
  }), false);
  assert.throws(() => evaluateClaimCoverage({
    claimText: SAFETY_CLAIM,
    passage: DIRECT_SAFETY_PASSAGE,
    economics: { commission: 12 },
  }), /econom/i);
  assert.match(candidate.scopeLimitations, /not accepted evidence|insufficient/i);
});

test("duplicate exact URL is remembered for the same claim and remains usable for another claim", () => {
  const url = "https://www.docs.example.gov/general-safety";
  const memory = buildResearchMemory({
    packageId: "pkg-a",
    claimId: "claim-safety",
    policyGap: "insufficient_authority",
    runs: [{
      packageId: "pkg-a",
      claimId: "claim-safety",
      evidenceRequestId: null,
      plan: { evidenceGap: { unresolvedPolicyGap: "insufficient_authority" } },
      finishedAt: new Date().toISOString(),
      candidates: [{
        canonicalUrl: url,
        independenceCluster: "publisher:example government regulator",
        relationship: "relevant",
        retrievalStatus: "ok",
        authorityAdequate: true,
        authorityClass: "government_regulatory",
        sourceClass: "regulatory_document",
        policyAdvancement: "relevant_no_policy_gain",
        claimCoverage: "context_only",
        discoveredAt: new Date().toISOString(),
      }],
    }],
  });
  const skipped = evaluateMemorySkip({ url, memory });
  assert.equal(skipped.skip, true);
  assert.equal(skipped.skipReason, "insufficient_claim_coverage");
  const otherClaim = buildResearchMemory({
    packageId: "pkg-a",
    claimId: "claim-temperature",
    policyGap: "insufficient_authority",
    runs: [{
      packageId: "pkg-a",
      claimId: "claim-safety",
      evidenceRequestId: null,
      plan: { evidenceGap: { unresolvedPolicyGap: "insufficient_authority" } },
      finishedAt: new Date().toISOString(),
      candidates: [{
        canonicalUrl: url,
        independenceCluster: "publisher:example government regulator",
        relationship: "relevant",
        retrievalStatus: "ok",
        authorityAdequate: true,
        authorityClass: "government_regulatory",
        sourceClass: "regulatory_document",
        claimCoverage: "context_only",
        discoveredAt: new Date().toISOString(),
      }],
    }],
  });
  assert.equal(evaluateMemorySkip({ url, memory: otherClaim }).skip, false);
});

test("authority-only advancement is blocked without claim coverage", () => {
  const advancement = classifyPolicyAdvancement({
    independenceCluster: "publisher:example government regulator",
    authorityClass: "government_regulatory",
    authorityAdequate: true,
    relationship: "relevant",
    claimCoverage: "context_only",
    gap: { ...gapForSafety(), strongerAuthorityRequired: true },
  });
  assert.equal(advancement, "relevant_no_policy_gain");
});

test("operator summary reports coverage rejections without treating them as awaiting review", () => {
  const summary = buildOperatorSummary({
    packageId: "sgo:package:example",
    hasPackage: true,
    proposalCount: 4,
    claimCount: 8,
    currentFingerprint: "x",
    plan: { packageFingerprint: "x", state: "acknowledged", items: [], rawProposalIds: [] },
    openTasks: [],
    verifiedFactCount: 0,
    unresolvedContradiction: false,
    awaitingCorpusReviewCount: 0,
    insufficientClaimCoverageCount: 3,
    researchRunCount: 1,
    researchInProgress: false,
    unresearchedGapCount: 2,
    contentAuthorized: false,
    packageApproved: false,
    state: "research_incomplete",
  });
  assert.equal(summary.awaitingCorpusReviewCount, 0);
  assert.match(summary.researchStatus, /3 authoritative sources rejected for insufficient claim coverage/);
  assert.doesNotMatch(summary.researchStatus, /awaiting corpus review/);
});

test("production claim-coverage rules contain no case-specific names", async () => {
  const files = [
    "app/growth/social/claim-coverage.ts",
    "app/lib/research/passage-match.ts",
    "app/growth/social/candidate-discovery.ts",
    "app/growth/social/evidence-gap-research.ts",
    "db/social-operator-repository.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /California|CPUC|docs\.cpuc|Anthropic|OSHA|commercial-freezer-running-warm/i);
    assert.doesNotMatch(source, /Siemens|Generac|Cummins|Caterpillar/);
  }
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /Relevant: \{topical\}/);
  assert.match(ui, /Coverage: \{coverage\}/);
  assert.doesNotMatch(ui, /relationship\.toUpperCase\(\)/);
});
