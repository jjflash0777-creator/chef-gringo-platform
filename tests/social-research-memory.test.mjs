import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { RESEARCH_LIMITS } from "../app/lib/research/limits.ts";
import { createLiveCandidateProvider } from "../app/lib/research/live-candidate-provider.ts";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  assessClaimSufficiency,
  buildAuthoritativeQueryPlans,
  buildEvidenceGapFeedback,
  buildExecutableResearchPlan,
  buildResearchMemory,
  candidateConsumesAssessedCapacity,
  classifySearchSurface,
  compareSearchSurfaces,
  editorialDomainsToDemote,
  evaluateMemorySkip,
  executeBoundedCandidateDiscovery,
  executablePlanFromClaimAssessment,
  queryPlansAreDiverse,
  RESEARCH_MEMORY_RETRY_HORIZON_MS,
  searchSurfaceDiscoveryScore,
} from "../app/growth/social/index.ts";

const CLAIM_TEXT = "Recommended operating headroom should be evidenced under these conditions.";
const CLAIM = {
  id: "sgo:claim:running-and-startup-loads",
  claimText: CLAIM_TEXT,
  safetySensitive: false,
  policyClass: "broad_technical",
};

function acceptedManufacturer() {
  return {
    ref: { kind: "corpus_document", id: "corpus:acme-running-load" },
    exists: true,
    title: "Running load excerpt",
    publisher: "Acme Generator Co",
    canonicalUrl: "https://www.acme.example/manuals/running-load",
    sourceType: "manufacturer_documentation",
    provenanceMethod: "founder_uploaded_document",
    ingestionStatus: "accepted",
    validationStatus: "claim_supporting",
    productionExposure: true,
    underlyingDocumentId: "corpus:acme-running-load",
  };
}

function memoryCandidate(overrides = {}) {
  return {
    canonicalUrl: "https://www.editorial.example/blog/calculator",
    independenceCluster: "publisher:editorial example",
    relationship: "irrelevant",
    retrievalStatus: "ok",
    authorityAdequate: false,
    authorityClass: "editorial",
    sourceClass: "editorial",
    policyAdvancement: "insufficient_authority",
    discoveredAt: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

function priorRun(overrides = {}) {
  return {
    packageId: "pkg-a",
    claimId: "claim-a",
    evidenceRequestId: null,
    plan: { evidenceGap: { unresolvedPolicyGap: "needs_independent_corroboration" } },
    finishedAt: "2026-08-20T00:00:00.000Z",
    candidates: [memoryCandidate()],
    ...overrides,
  };
}

function harborHit(query = "q") {
  return {
    canonicalUrl: "https://www.harbor-industrial.example/application-notes/headroom",
    title: "Harbor Industrial Power application note",
    publisher: "Harbor Industrial Power",
    sourceType: "manufacturer_documentation",
    publishedDate: "2024-01-01",
    retrievedText: `${CLAIM_TEXT} Independent manufacturer application note.`,
    provenanceMethod: "test_fixture",
    query,
  };
}

test("authoritative PDF/manual, government, and education query paths are gap-aware and brand-free", async () => {
  const attached = [acceptedManufacturer()];
  const assessment = assessClaimSufficiency({ claim: CLAIM, records: attached });
  const corroboration = executablePlanFromClaimAssessment(assessment, attached);
  assert.ok(corroboration);
  assert.equal(corroboration.queries.length, 3);
  assert.ok(queryPlansAreDiverse(corroboration.queryPlans));
  assert.equal(corroboration.queryPlans[0].authorityPath, "independent_technical_pdf");
  assert.ok(corroboration.queryPlans[0].query.includes("filetype:pdf"));
  assert.ok(corroboration.queryPlans[0].query.includes("manual"));
  assert.ok(corroboration.queryPlans[1].query.includes("engineering guide") || corroboration.queryPlans[1].query.includes("professional standard"));
  assert.equal(corroboration.queryPlans[2].authorityPath, "government_regulatory");
  assert.ok(corroboration.queryPlans[2].query.includes("site:.gov"));
  assert.equal(new Set(corroboration.queryPlans.map((item) => item.authorityPath)).size, 3);

  const authorityGap = buildEvidenceGapFeedback({
    assessment: { ...assessment, state: "insufficient_authority", gaps: ["Stronger authority is required."] },
    attached,
    policyClass: "broad_technical",
  });
  const authorityPlans = buildAuthoritativeQueryPlans({
    claimOrQuestion: CLAIM_TEXT,
    policyClass: "broad_technical",
    gap: { ...authorityGap, unresolvedPolicyGap: "insufficient_authority", strongerAuthorityRequired: true },
  });
  assert.equal(authorityPlans[0].authorityPath, "government_regulatory");
  assert.ok(authorityPlans[0].query.includes("site:.gov"));
  assert.ok(authorityPlans.some((item) => item.authorityPath === "education_technical" && item.query.includes("site:.edu")));
  assert.ok(queryPlansAreDiverse(authorityPlans));

  const files = [
    "app/growth/social/evidence-gap-research.ts",
    "app/growth/social/authoritative-source-targeting.ts",
    "app/growth/social/research-memory.ts",
    "app/growth/social/research-planner.ts",
    "app/growth/social/candidate-discovery.ts",
    "app/lib/research/live-candidate-provider.ts",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\b(siemens|cummins|caterpillar|kohler|generac)\b/i);
  }
});

test("surface ranking is discovery-only and demotes editorial pages without raising authority", () => {
  const manual = classifySearchSurface("https://www.vendor.example/manuals/headroom.pdf", "Operating headroom application guide");
  const government = classifySearchSurface("https://www.energy.gov/pages/headroom", "Agency technical page");
  const education = classifySearchSurface("https://engineering.university.edu/research/headroom-study.pdf", "Load calculation lecture");
  const blog = classifySearchSurface("https://www.kitchen-blog.example/generator-calculator", "Best generator size calculator");
  assert.equal(manual.surface, "official_pdf_manual");
  assert.equal(government.surface, "government_technical");
  assert.equal(education.surface, "education_technical");
  assert.equal(blog.surface, "commercial_editorial");
  assert.ok(manual.discoveryPriority > blog.discoveryPriority);
  assert.ok(government.discoveryPriority > blog.discoveryPriority);
  const ordered = [
    { url: "https://www.kitchen-blog.example/generator-calculator", title: "Best generator size calculator" },
    { url: "https://www.vendor.example/manuals/headroom.pdf", title: "Operating headroom application guide" },
  ].sort((left, right) => compareSearchSurfaces(left, right));
  assert.ok(ordered[0].url.endsWith(".pdf"));
  assert.throws(() => searchSurfaceDiscoveryScore({
    url: "https://www.vendor.example/manuals/headroom.pdf",
    title: "Manual",
    economics: { commission: 12, epc: 4 },
  }), /commercial economics/);
});

test("prior blocked, irrelevant, and insufficient-authority exact URLs are skipped and do not consume capacity", async () => {
  const attached = [acceptedManufacturer()];
  const assessment = assessClaimSufficiency({ claim: CLAIM, records: attached });
  const plan = executablePlanFromClaimAssessment(assessment, attached);
  const memory = buildResearchMemory({
    packageId: "pkg-a",
    claimId: CLAIM.id,
    evidenceRequestId: null,
    policyGap: "needs_independent_corroboration",
    runs: [priorRun({
      packageId: "pkg-a",
      claimId: CLAIM.id,
      candidates: [
        memoryCandidate({
          canonicalUrl: "https://www.blocked.example/old",
          retrievalStatus: "blocked",
          relationship: "irrelevant",
        }),
        memoryCandidate({
          canonicalUrl: "https://www.noise.example/blog",
          retrievalStatus: "ok",
          relationship: "irrelevant",
          policyAdvancement: "relevant_no_policy_gain",
        }),
        memoryCandidate({
          canonicalUrl: "https://www.weak.example/article",
          retrievalStatus: "ok",
          relationship: "relevant",
          authorityAdequate: false,
          policyAdvancement: "insufficient_authority",
        }),
      ],
    })],
  });
  let searches = 0;
  const provider = {
    id: "memory-skip",
    kind: "fixture",
    async search() {
      searches += 1;
      return [
        {
          canonicalUrl: "https://www.blocked.example/old",
          title: "Blocked again",
          publisher: "Blocked",
          sourceType: "editorial",
          publishedDate: "2024-01-01",
          retrievedText: "This body must not be treated as a new retrieval.",
          provenanceMethod: "test_fixture",
          query: "q",
        },
        {
          canonicalUrl: "https://www.noise.example/blog",
          title: "Irrelevant again",
          publisher: "Noise",
          sourceType: "editorial",
          publishedDate: "2024-01-01",
          retrievedText: "Irrelevant blog copy.",
          provenanceMethod: "test_fixture",
          query: "q",
        },
        {
          canonicalUrl: "https://www.weak.example/article",
          title: "Weak authority again",
          publisher: "Weak",
          sourceType: "editorial",
          publishedDate: "2024-01-01",
          retrievedText: `${CLAIM_TEXT} editorial recap.`,
          provenanceMethod: "test_fixture",
          query: "q",
        },
        harborHit(),
      ];
    },
  };
  const result = await executeBoundedCandidateDiscovery({
    plan,
    claim: CLAIM,
    attached,
    provider,
    memory,
  });
  const skipped = result.candidates.filter((item) => item.memoryState === "memory_skipped");
  assert.equal(skipped.length, 3);
  assert.ok(skipped.every((item) => item.memorySkipReason));
  assert.equal(candidateConsumesAssessedCapacity({
    memoryState: "memory_skipped",
    retrievalStatus: "ok",
  }), false);
  const harbor = result.candidates.find((item) => item.canonicalUrl.includes("harbor-industrial"));
  assert.ok(harbor);
  assert.equal(harbor.memoryState, "new_candidate");
  assert.ok(searches >= 1);
  assert.ok(result.plan.researchMemorySummary.skippableUrlCount >= 3);
});

test("timeout may be retried and is marked seen_before", async () => {
  const attached = [acceptedManufacturer()];
  const plan = executablePlanFromClaimAssessment(
    assessClaimSufficiency({ claim: CLAIM, records: attached }),
    attached,
  );
  const timedOut = "https://www.harbor-industrial.example/application-notes/headroom";
  const memory = buildResearchMemory({
    packageId: "pkg-a",
    claimId: CLAIM.id,
    policyGap: "needs_independent_corroboration",
    runs: [priorRun({
      packageId: "pkg-a",
      claimId: CLAIM.id,
      candidates: [memoryCandidate({
        canonicalUrl: timedOut,
        retrievalStatus: "timeout",
        relationship: "irrelevant",
        authorityClass: "manufacturer_technical",
        sourceClass: "manufacturer_documentation",
        independenceCluster: "publisher:harbor industrial power",
      })],
    })],
  });
  const decision = evaluateMemorySkip({ url: timedOut, memory });
  assert.equal(decision.skip, false);
  assert.equal(decision.retryReason, "prior_timeout");
  const result = await executeBoundedCandidateDiscovery({
    plan,
    claim: CLAIM,
    attached,
    memory,
    provider: {
      id: "timeout-retry",
      kind: "fixture",
      async search() {
        return [harborHit()];
      },
    },
  });
  const harbor = result.candidates.find((item) => item.canonicalUrl === timedOut);
  assert.ok(harbor);
  assert.equal(harbor.memoryState, "seen_before");
  assert.equal(harbor.memoryRetryReason, "prior_timeout");
  assert.notEqual(harbor.memoryState, "memory_skipped");
});

test("one weak editorial page does not blacklist the domain; a new manual can still be retrieved", async () => {
  const attached = [acceptedManufacturer()];
  const plan = executablePlanFromClaimAssessment(
    assessClaimSufficiency({ claim: CLAIM, records: attached }),
    attached,
  );
  const memory = buildResearchMemory({
    packageId: "pkg-a",
    claimId: CLAIM.id,
    policyGap: "needs_independent_corroboration",
    runs: [priorRun({
      packageId: "pkg-a",
      claimId: CLAIM.id,
      candidates: [
        memoryCandidate({
          canonicalUrl: "https://www.mixed-source.example/blog/calculator",
          independenceCluster: "publisher:mixed source",
        }),
        memoryCandidate({
          canonicalUrl: "https://www.mixed-source.example/seo/roundup",
          independenceCluster: "publisher:mixed source",
        }),
      ],
    })],
  });
  assert.ok(editorialDomainsToDemote(memory).includes("mixed-source.example"));
  const singleWeak = buildResearchMemory({
    packageId: "pkg-a",
    claimId: CLAIM.id,
    policyGap: "needs_independent_corroboration",
    runs: [priorRun({
      packageId: "pkg-a",
      claimId: CLAIM.id,
      candidates: [memoryCandidate({
        canonicalUrl: "https://www.once-weak.example/blog/calculator",
        independenceCluster: "publisher:once weak",
      })],
    })],
  });
  assert.equal(editorialDomainsToDemote(singleWeak).includes("once-weak.example"), false);
  const newManual = "https://www.mixed-source.example/manuals/headroom.pdf";
  assert.equal(evaluateMemorySkip({ url: newManual, memory }).skip, false);
  assert.equal(evaluateMemorySkip({ url: newManual, memory }).memoryState, "new_candidate");
  const result = await executeBoundedCandidateDiscovery({
    plan,
    claim: CLAIM,
    attached,
    memory,
    provider: {
      id: "new-manual",
      kind: "fixture",
      async search() {
        return [{
          canonicalUrl: newManual,
          title: "Mixed Source operating headroom manual",
          publisher: "Mixed Source",
          sourceType: "manufacturer_documentation",
          publishedDate: "2024-01-01",
          retrievedText: `${CLAIM_TEXT} Independent manufacturer application note.`,
          provenanceMethod: "test_fixture",
          query: "q",
        }];
      },
    },
  });
  const manual = result.candidates.find((item) => item.canonicalUrl === newManual);
  assert.ok(manual);
  assert.equal(manual.memoryState, "new_candidate");
  assert.notEqual(manual.memoryState, "memory_skipped");
});

test("prior same-publisher URL does not consume retrieval budget", async () => {
  const attached = [acceptedManufacturer()];
  const plan = executablePlanFromClaimAssessment(
    assessClaimSufficiency({ claim: CLAIM, records: attached }),
    attached,
  );
  const countedUrl = "https://www.acme.example/manuals/repeat";
  const memory = buildResearchMemory({
    packageId: "pkg-a",
    claimId: CLAIM.id,
    policyGap: "needs_independent_corroboration",
    runs: [priorRun({
      packageId: "pkg-a",
      claimId: CLAIM.id,
      candidates: [memoryCandidate({
        canonicalUrl: countedUrl,
        independenceCluster: "publisher:acme generator co",
        relationship: "supports",
        authorityAdequate: true,
        authorityClass: "manufacturer_technical",
        sourceClass: "manufacturer_documentation",
        policyAdvancement: "already_counted",
        retrievalStatus: "ok",
      })],
    })],
  });
  const fetched = [];
  const result = await executeBoundedCandidateDiscovery({
    plan,
    claim: CLAIM,
    attached,
    memory,
    provider: {
      id: "same-publisher-budget",
      kind: "fixture",
      async search() {
        return [
          {
            canonicalUrl: countedUrl,
            title: "Acme repeat",
            publisher: "Acme Generator Co",
            sourceType: "manufacturer_documentation",
            publishedDate: "2024-01-01",
            retrievedText: `${CLAIM_TEXT} Same manufacturer.`,
            provenanceMethod: "test_fixture",
            query: "q",
          },
          harborHit(),
        ];
      },
    },
  });
  const counted = result.candidates.find((item) => item.canonicalUrl === countedUrl);
  assert.ok(counted);
  assert.equal(counted.memoryState, "memory_skipped");
  assert.equal(candidateConsumesAssessedCapacity({
    memoryState: counted.memoryState,
    policyAdvancement: counted.policyAdvancement,
    preRetrievalExcluded: counted.extraction?.preRetrievalExcluded,
    retrievalStatus: counted.retrievalStatus,
  }), false);
  assert.equal(fetched.length, 0);
  const harbor = result.candidates.find((item) => item.publisher === "Harbor Industrial Power");
  assert.ok(harbor);
  assert.equal(harbor.memoryState, "new_candidate");
});

test("research memory is scoped to package, claim, and gap with no cross-case contamination", () => {
  const memory = buildResearchMemory({
    packageId: "pkg-a",
    claimId: "claim-a",
    evidenceRequestId: null,
    policyGap: "needs_independent_corroboration",
    runs: [
      priorRun({
        packageId: "pkg-a",
        claimId: "claim-a",
        candidates: [memoryCandidate({ canonicalUrl: "https://www.in-scope.example/doc" })],
      }),
      priorRun({
        packageId: "pkg-b",
        claimId: "claim-a",
        candidates: [memoryCandidate({ canonicalUrl: "https://www.other-package.example/doc" })],
      }),
      priorRun({
        packageId: "pkg-a",
        claimId: "claim-b",
        candidates: [memoryCandidate({ canonicalUrl: "https://www.other-claim.example/doc" })],
      }),
      priorRun({
        packageId: "pkg-a",
        claimId: "claim-a",
        plan: { evidenceGap: { unresolvedPolicyGap: "insufficient_authority" } },
        candidates: [memoryCandidate({ canonicalUrl: "https://www.other-gap.example/doc" })],
      }),
    ],
  });
  assert.deepEqual(memory.attemptedUrls, ["https://www.in-scope.example/doc"]);
  assert.equal(evaluateMemorySkip({ url: "https://www.other-package.example/doc", memory }).skip, false);
  assert.equal(evaluateMemorySkip({ url: "https://www.other-claim.example/doc", memory }).skip, false);
  assert.equal(evaluateMemorySkip({ url: "https://www.other-gap.example/doc", memory }).skip, false);
  assert.equal(evaluateMemorySkip({ url: "https://www.in-scope.example/doc", memory }).skip, true);
  assert.ok(!JSON.stringify(memory).includes("<html"));
  assert.ok(!Object.keys(memory).includes("retrievedText"));
});

test("live provider skips remembered URLs before fetch and still retrieves a new manual", async () => {
  const attached = [acceptedManufacturer()];
  const plan = executablePlanFromClaimAssessment(
    assessClaimSufficiency({ claim: CLAIM, records: attached }),
    attached,
  );
  const blocked = "https://www.blocked.example/old";
  const manual = "https://www.harbor-industrial.example/application-notes/headroom.pdf";
  const memory = buildResearchMemory({
    packageId: "pkg-a",
    claimId: CLAIM.id,
    policyGap: "needs_independent_corroboration",
    runs: [priorRun({
      packageId: "pkg-a",
      claimId: CLAIM.id,
      candidates: [memoryCandidate({
        canonicalUrl: blocked,
        retrievalStatus: "blocked",
      })],
    })],
  });
  const fetched = [];
  const provider = createLiveCandidateProvider({
    search: {
      async search() {
        return [
          { url: blocked, title: "Old blocked page" },
          { url: manual, title: "Harbor Industrial Power application guide" },
        ];
      },
    },
    fetchImpl: async (url) => {
      fetched.push(String(url));
      const body = `<html><body><h1>Harbor Industrial Power</h1><p>${CLAIM_TEXT} Independent manufacturer application note.</p></body></html>`;
      const bytes = new TextEncoder().encode(body);
      return {
        status: 200,
        headers: {
          get(name) {
            return name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : String(bytes.byteLength);
          },
        },
        text: async () => body,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      };
    },
  });
  const result = await executeBoundedCandidateDiscovery({
    plan,
    claim: CLAIM,
    attached,
    provider,
    memory,
  });
  assert.ok(!fetched.includes(blocked));
  assert.ok(fetched.some((url) => url.startsWith(manual) || url === manual));
  assert.ok((result.diagnostics?.priorUrlsSkipped ?? 0) >= 1 || (result.diagnostics?.memorySkippedCount ?? 0) >= 1);
  assert.ok((result.diagnostics?.memoryUrlAttemptsSaved ?? 0) >= 1 || (result.diagnostics?.urlAttemptsSaved ?? 0) >= 1);
  assert.equal(RESEARCH_LIMITS.maximumQueries, 3);
  assert.equal(RESEARCH_LIMITS.maximumUrlAttempts, 10);
  assert.equal(RESEARCH_LIMITS.maximumCandidates, 5);
  assert.equal(RESEARCH_LIMITS.maximumRuntimeMs, 8_000);
  assert.ok(result.candidates.every((item) => item.proposedForReview === false || item.scopeLimitations.includes("Not accepted evidence") || item.provenance === "live_fetch"));
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("retry horizon can reopen a previously blocked URL", () => {
  const url = "https://www.blocked.example/old";
  const memory = buildResearchMemory({
    packageId: "pkg-a",
    claimId: "claim-a",
    policyGap: "needs_independent_corroboration",
    runs: [priorRun({
      candidates: [memoryCandidate({
        canonicalUrl: url,
        retrievalStatus: "blocked",
        discoveredAt: "2026-01-01T00:00:00.000Z",
      })],
    })],
  });
  assert.equal(evaluateMemorySkip({ url, memory, now: Date.parse("2026-01-02T00:00:00.000Z") }).skip, true);
  const later = evaluateMemorySkip({
    url,
    memory,
    now: Date.parse("2026-01-01T00:00:00.000Z") + RESEARCH_MEMORY_RETRY_HORIZON_MS + 1,
  });
  assert.equal(later.skip, false);
  assert.equal(later.retryReason, "retry_horizon_elapsed");
});

test("economics cannot affect ranking or memory, live candidates are not evidence, and publishing stays off", () => {
  assert.throws(() => buildResearchMemory({
    packageId: "pkg-a",
    claimId: "claim-a",
    policyGap: "needs_independent_corroboration",
    runs: [],
    economics: { commission: 9, epc: 2, payout: 1 },
  }), /commercial economics/);
  const plan = buildExecutableResearchPlan({
    claimOrQuestion: CLAIM_TEXT,
    policyClass: "broad_technical",
    reason: "Independent corroboration is required.",
  });
  assert.equal(plan.maximumQueries, 3);
  assert.equal(plan.maximumCandidateDocuments, 5);
  assert.equal(plan.maximumRuntimeMs, 8_000);
  assert.ok(plan.queries.length <= 3);
  assert.equal(plan.evidenceGap.liveCandidatesAreNotAcceptedEvidence, true);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("Growth Queue surfaces authoritative paths, memory, and candidate memory states", async () => {
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /Authoritative source paths planned/);
  assert.match(ui, /Cross-run memory/);
  assert.match(ui, /Prior URLs skipped/);
  assert.match(ui, /New URLs assessed/);
  assert.match(ui, /new_candidate/);
  assert.match(ui, /seen_before/);
  assert.match(ui, /memory_skipped/);
  assert.doesNotMatch(ui, />Publish</);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});
