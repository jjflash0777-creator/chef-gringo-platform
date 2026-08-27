import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { RESEARCH_LIMITS } from "../app/lib/research/limits.ts";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  assessClaimSufficiency,
  buildEvidenceGapFeedback,
  buildExecutableResearchPlan,
  candidateConsumesAssessedCapacity,
  classifyPolicyAdvancement,
  evaluatePreRetrievalExclusion,
  exclusionSiteTerms,
  executeBoundedCandidateDiscovery,
  executablePlanFromClaimAssessment,
  rankCandidateAssessments,
  wouldSatisfyPolicyIfAccepted,
} from "../app/growth/social/index.ts";

const CLAIM_TEXT = "Recommended operating headroom should be evidenced under these conditions.";
const CLAIM = {
  id: "sgo:claim:running-and-startup-loads",
  claimText: CLAIM_TEXT,
  safetySensitive: false,
  policyClass: "broad_technical",
};

function acceptedManufacturer(overrides = {}) {
  return {
    ref: { kind: "corpus_document", id: overrides.id ?? "corpus:acme-running-load" },
    exists: true,
    title: "Running load excerpt",
    publisher: overrides.publisher ?? "Acme Generator Co",
    canonicalUrl: overrides.canonicalUrl ?? "https://www.acme.example/manuals/running-load",
    sourceType: "manufacturer_documentation",
    provenanceMethod: "founder_uploaded_document",
    ingestionStatus: "accepted",
    validationStatus: "claim_supporting",
    productionExposure: true,
    underlyingDocumentId: overrides.id ?? "corpus:acme-running-load",
    ...overrides,
  };
}

function candidate(overrides = {}) {
  return {
    canonicalUrl: "https://www.harbor-industrial.example/application-notes/headroom",
    title: "Harbor Industrial Power application note",
    publisher: "Harbor Industrial Power",
    sourceClass: "manufacturer_documentation",
    provenance: "test_fixture",
    independenceCluster: "publisher:harbor industrial power",
    excerpts: [{ text: CLAIM_TEXT, start: 0, end: CLAIM_TEXT.length }],
    relationship: "supports",
    scopeLimitations: "Fixture.",
    authorityClass: "manufacturer_technical",
    authorityAdequate: true,
    freshness: "current",
    rankScore: 0,
    reasonSelected: null,
    reasonExcluded: null,
    proposedForReview: false,
    query: "q",
    retrievedChecksum: "x",
    publishedDate: "2024-01-01",
    ...overrides,
  };
}

function assessmentFor(records) {
  return assessClaimSufficiency({ claim: CLAIM, records });
}

test("accepted publisher is excluded from the corroboration query", () => {
  const attached = [acceptedManufacturer()];
  const assessment = assessmentFor(attached);
  assert.equal(assessment.state, "needs_independent_corroboration");
  const plan = executablePlanFromClaimAssessment(assessment, attached);
  assert.ok(plan);
  assert.ok(plan.queries.some((query) => query.includes("-site:acme.example")));
  assert.ok(plan.evidenceGap.excludedRegistrableDomains.includes("acme.example"));
  assert.ok(plan.evidenceGap.excludedPublisherClusters.some((item) => item.includes("acme")));
  assert.equal(plan.queries.length <= RESEARCH_LIMITS.maximumQueries, true);
  assert.ok(plan.queries[0].includes("filetype:pdf"));
  assert.ok(plan.queries[0].includes("independent"));
  assert.ok(plan.queries[0].includes("manual"));
  assert.ok(plan.queryPlans[0].authorityPath === "independent_technical_pdf");
  assert.ok(plan.queries.some((query) => query.includes("site:.gov")));
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("no manufacturer names are hard-coded in production research logic", async () => {
  const files = [
    "app/growth/social/authoritative-source-targeting.ts",
    "app/growth/social/research-memory.ts",
    "app/growth/social/evidence-gap-research.ts",
    "app/growth/social/research-planner.ts",
    "app/growth/social/candidate-discovery.ts",
    "app/growth/social/claim-coverage.ts",
    "app/lib/research/live-candidate-provider.ts",
    "app/lib/research/candidate-discovery-provider.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(siemens|cummins|caterpillar|kohler|generac)\b/i);
  }
});

test("rediscovered accepted publisher does not consume scarce assessed-candidate capacity when safely identifiable", async () => {
  const attached = [acceptedManufacturer()];
  const assessment = assessmentFor(attached);
  const plan = executablePlanFromClaimAssessment(assessment, attached);
  let searches = 0;
  const provider = {
    id: "gap-capacity",
    kind: "fixture",
    async search() {
      searches += 1;
      if (searches === 1) {
        return Array.from({ length: 5 }, (_, index) => ({
          canonicalUrl: `https://www.acme.example/repeat-${index}`,
          title: "Acme Generator Co repeat bulletin",
          publisher: "Acme Generator Co",
          sourceType: "manufacturer_documentation",
          publishedDate: "2024-01-01",
          retrievedText: `${CLAIM_TEXT} This is the same manufacturer already counted.`,
          provenanceMethod: "test_fixture",
          query: "q",
        }));
      }
      return [{
        canonicalUrl: "https://www.harbor-industrial.example/application-notes/headroom",
        title: "Harbor Industrial Power application note",
        publisher: "Harbor Industrial Power",
        sourceType: "manufacturer_documentation",
        publishedDate: "2024-01-01",
        retrievedText: `${CLAIM_TEXT} Independent manufacturer application note.`,
        provenanceMethod: "test_fixture",
        query: "q",
      }];
    },
  };
  const result = await executeBoundedCandidateDiscovery({ plan, claim: CLAIM, attached, provider });
  assert.ok(searches >= 2, "query 2 should run because already-counted hits must not fill the assessed cap");
  const harbor = result.candidates.find((item) => item.publisher === "Harbor Industrial Power");
  assert.ok(harbor);
  assert.equal(candidateConsumesAssessedCapacity({
    policyAdvancement: "already_counted",
    retrievalStatus: "ok",
  }), false);
});

test("independent technical source outranks same-publisher source", () => {
  const gap = buildEvidenceGapFeedback({
    assessment: assessmentFor([acceptedManufacturer()]),
    attached: [acceptedManufacturer()],
  });
  const ranked = rankCandidateAssessments({
    candidates: [
      candidate({
        canonicalUrl: "https://www.acme.example/another",
        publisher: "Acme Generator Co",
        independenceCluster: "publisher:acme generator co",
      }),
      candidate(),
    ],
    existingClusters: gap.acceptedIndependenceClusters,
    gap,
  });
  assert.equal(ranked[0].publisher, "Harbor Industrial Power");
  assert.equal(ranked[0].policyAdvancement, "advances_independence");
  assert.equal(ranked[1].policyAdvancement, "already_counted");
});

test("editorial source cannot outrank a policy-advancing technical source", () => {
  const gap = buildEvidenceGapFeedback({
    assessment: assessmentFor([acceptedManufacturer()]),
    attached: [acceptedManufacturer()],
  });
  const ranked = rankCandidateAssessments({
    candidates: [
      candidate({
        canonicalUrl: "https://www.kitchen-blog.example/generator-calculator",
        title: "Blog calculator",
        publisher: "Kitchen Blog",
        sourceClass: "editorial",
        independenceCluster: "publisher:kitchen blog",
        relationship: "relevant",
        authorityClass: "editorial",
        authorityAdequate: false,
      }),
      candidate(),
    ],
    existingClusters: gap.acceptedIndependenceClusters,
    gap,
  });
  assert.equal(ranked[0].publisher, "Harbor Industrial Power");
  assert.equal(ranked[1].policyAdvancement, "insufficient_authority");
});

test("government source can advance authority", () => {
  const gap = buildEvidenceGapFeedback({
    assessment: assessmentFor([acceptedManufacturer()]),
    attached: [acceptedManufacturer()],
  });
  const ranked = rankCandidateAssessments({
    candidates: [
      candidate(),
      candidate({
        canonicalUrl: "https://www.osha.gov/publications/portable-generators",
        title: "OSHA portable generator guidance",
        publisher: "Occupational Safety and Health Administration",
        sourceClass: "regulatory_document",
        independenceCluster: "publisher:occupational safety and health administration",
        authorityClass: "government_regulatory",
        authorityAdequate: true,
      }),
    ],
    existingClusters: gap.acceptedIndependenceClusters,
    gap,
  });
  const government = ranked.find((item) => item.authorityClass === "government_regulatory");
  assert.equal(government?.policyAdvancement, "advances_authority");
  assert.ok((government?.rankScore ?? 0) > 0);
});

test("contradiction plan prioritizes independent resolution", () => {
  const conflicted = assessClaimSufficiency({
    claim: CLAIM,
    records: [
      acceptedManufacturer(),
      {
        ...acceptedManufacturer({
          id: "corpus:northwind-headroom",
          publisher: "Northwind Power Co",
          canonicalUrl: "https://www.northwind-power.example/docs/headroom",
        }),
        validationStatus: "contradicted",
      },
    ],
  });
  assert.equal(conflicted.state, "conflicted");
  const plan = executablePlanFromClaimAssessment(conflicted, [acceptedManufacturer()]);
  assert.ok(plan);
  assert.match(plan.queries[0], /independent/);
  assert.ok(plan.evidenceGap.contradictions.length);
  const advancement = classifyPolicyAdvancement({
    independenceCluster: "publisher:harbor industrial power",
    authorityClass: "manufacturer_technical",
    authorityAdequate: true,
    relationship: "contradicts",
    gap: plan.evidenceGap,
  });
  assert.equal(advancement, "resolves_contradiction");
});

test("pre-retrieval exclusion is conservative and uncertain publishers are still retrieved", () => {
  const gap = buildEvidenceGapFeedback({
    assessment: assessmentFor([acceptedManufacturer()]),
    attached: [acceptedManufacturer()],
  });
  const counted = evaluatePreRetrievalExclusion({
    url: "https://www.acme.example/manuals/repeat",
    title: "Acme Generator Co copy",
    gap,
  });
  assert.equal(counted?.exclude, true);
  assert.equal(counted?.advancement, "already_counted");
  const uncertain = evaluatePreRetrievalExclusion({
    url: "https://lms.contoso-training.example/mod/resource/view.php?id=44",
    title: "Shared course packet",
    gap,
  });
  assert.equal(uncertain, null);
  const affiliate = evaluatePreRetrievalExclusion({
    url: "https://www.peakload-deals.example/buy-now",
    title: "Affiliate coupon deals",
    gap,
  });
  assert.equal(affiliate?.exclude, true);
});

test("hypothetical sufficiency stops search before later queries", async () => {
  const attached = [acceptedManufacturer()];
  const assessment = assessmentFor(attached);
  const plan = executablePlanFromClaimAssessment(assessment, attached);
  let searches = 0;
  const provider = {
    id: "gap-stop",
    kind: "fixture",
    async search() {
      searches += 1;
      return [{
        canonicalUrl: "https://www.harbor-industrial.example/application-notes/headroom",
        title: "Harbor Industrial Power application note",
        publisher: "Harbor Industrial Power",
        sourceType: "manufacturer_documentation",
        publishedDate: "2024-01-01",
        retrievedText: `${CLAIM_TEXT} Independent manufacturer application note.`,
        provenanceMethod: "test_fixture",
        query: "q",
      }];
    },
  };
  const result = await executeBoundedCandidateDiscovery({ plan, claim: CLAIM, attached, provider });
  assert.equal(searches, 1);
  assert.equal(result.queriesExecuted.length, 1);
  assert.match(result.stopReason, /would satisfy Evidence Intelligence policy/);
  const preview = wouldSatisfyPolicyIfAccepted({
    claim: CLAIM,
    attached,
    proposed: result.candidates.filter((item) => item.proposedForReview),
  });
  assert.equal(preview.state, "supported");
});

test("research caps remain 3 queries, 10 URL attempts, 5 assessed candidates, and 8 seconds", () => {
  assert.equal(RESEARCH_LIMITS.maximumQueries, 3);
  assert.equal(RESEARCH_LIMITS.maximumUrlAttempts, 10);
  assert.equal(RESEARCH_LIMITS.maximumCandidates, 5);
  assert.equal(RESEARCH_LIMITS.maximumRuntimeMs, 8_000);
  const plan = buildExecutableResearchPlan({
    claimOrQuestion: CLAIM_TEXT,
    policyClass: "broad_technical",
    reason: "Independent corroboration is required.",
  });
  assert.equal(plan.maximumQueries, 3);
  assert.equal(plan.maximumCandidateDocuments, 5);
  assert.equal(plan.maximumRuntimeMs, 8_000);
  assert.ok(plan.queries.length <= 3);
});

test("economics cannot influence advancement or ranking, and live candidates are not accepted evidence", () => {
  const gap = buildEvidenceGapFeedback({
    assessment: assessmentFor([acceptedManufacturer()]),
    attached: [acceptedManufacturer()],
  });
  assert.throws(() => rankCandidateAssessments({
    candidates: [candidate()],
    existingClusters: gap.acceptedIndependenceClusters,
    gap,
    economics: { commission: 40, epc: 2, payout: 9, sponsorship: "yes" },
  }), /commercial economics/);
  assert.equal(gap.liveCandidatesAreNotAcceptedEvidence, true);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("Growth Queue surfaces gap-aware research diagnostics and does not publish", async () => {
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /Remaining policy gap/);
  assert.match(ui, /Accepted publishers/);
  assert.match(ui, /Publishers excluded/);
  assert.match(ui, /Authority classes still needed/);
  assert.match(ui, /Authoritative source paths planned/);
  assert.match(ui, /Cross-run memory/);
  assert.match(ui, /Prior URLs skipped/);
  assert.match(ui, /new_candidate/);
  assert.match(ui, /seen_before/);
  assert.match(ui, /memory_skipped/);
  assert.doesNotMatch(ui, />Publish</);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
  const sites = exclusionSiteTerms(buildEvidenceGapFeedback({
    assessment: assessmentFor([acceptedManufacturer()]),
    attached: [acceptedManufacturer()],
  }));
  assert.deepEqual(sites, ["-site:acme.example"]);
});
