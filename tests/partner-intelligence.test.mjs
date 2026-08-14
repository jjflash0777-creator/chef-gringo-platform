import assert from "node:assert/strict";
import test from "node:test";
import { marketplaceCatalog } from "../app/marketplace/catalog.ts";
import { adaptCatalogToIntelligence } from "../app/marketplace/intelligence/catalog-adapter.ts";
import { canTransitionResearch, challengeRecommendation } from "../app/marketplace/intelligence/lifecycle.ts";
import { calculateCommercialOpportunityScore, calculateRecommendationScore } from "../app/marketplace/intelligence/scoring.ts";
import { validateIntelligenceRecord } from "../app/marketplace/intelligence/validation.ts";

const records = adaptCatalogToIntelligence(marketplaceCatalog.products);

test("all 100 Product Harvest records adapt to valid intelligence contracts", () => {
  assert.equal(records.length, 100);
  assert.deepEqual(records.flatMap(validateIntelligenceRecord), []);
  assert.equal(new Set(records.map((record) => record.productId)).size, 100);
});

test("adapter preserves provenance, retrieval dates, offers, and unresolved questions", () => {
  records.forEach((record, index) => {
    const original = marketplaceCatalog.products[index];
    assert.equal(record.evidenceClaims[0].sourceUrl, original.evidence[0].url);
    assert.equal(record.evidenceClaims[0].retrievedAt, original.evidence[0].checked);
    assert.equal(record.offers[0].priceContext, original.price.context);
    assert.deepEqual(record.unresolvedQuestions, original.unresolvedQuestions);
  });
});

test("editorial and commercial score inputs are structurally isolated", () => {
  const editorial = records[0].recommendationScorecard.components;
  const baseline = calculateRecommendationScore(editorial);
  assert.throws(() => calculateRecommendationScore({ ...editorial, commissionPotential: 100 }), /editorial components only/i);
  assert.throws(() => calculateCommercialOpportunityScore({ commissionPotential: 100, cookieDuration: null, recurringRevenue: null, averageOrderValue: null, directPartnershipPotential: null, integrationQuality: null, workflowFit: 0 }), /commercial components only/i);
  assert.equal(calculateRecommendationScore(editorial), baseline);
});

test("commercial scoring is honest when terms are unknown", () => {
  const commercial = records.flatMap((record) => record.commercialOpportunityScorecards);
  assert.ok(commercial.length > 0);
  assert.ok(commercial.every((scorecard) => scorecard.score === null));
  assert.equal(calculateCommercialOpportunityScore({ commissionPotential: 80, cookieDuration: 60, recurringRevenue: null, averageOrderValue: null, directPartnershipPotential: 70, integrationQuality: null }), 70);
});

test("validation rejects missing provenance, dates, landed-cost assumptions, and uncontrolled relationships", () => {
  const invalid = structuredClone(records[0]);
  invalid.evidenceClaims[0].sourceUrl = "http://invalid.example";
  invalid.evidenceClaims[0].retrievedAt = "unknown";
  invalid.offers[0].estimatedLandedCost = { lowCents: 100, expectedCents: 90, highCents: 80, currency: "USD", destinationCountry: "US", assumptions: [] };
  invalid.relationships.push({ id: "bad", fromId: "a", toId: "b", subjectType: "product", relationshipType: "sponsored_winner", rationale: "", confidence: "low", verificationStatus: "unverified", evidenceClaimIds: [], observedAt: "unknown" });
  const failures = validateIntelligenceRecord(invalid);
  for (const expected of ["evidence-provenance-invalid", "evidence-retrieval-date-invalid", "landed-cost-assumptions-missing", "landed-cost-range-invalid", "relationship-type-invalid", "relationship-evidence-incomplete"]) assert.ok(failures.includes(expected), expected);
});

test("research lifecycle permits ordered progress and an explicit challenge loop", () => {
  assert.equal(canTransitionResearch("discover", "resolve_identity"), true);
  assert.equal(canTransitionResearch("verify", "compare"), false);
  assert.equal(canTransitionResearch("monitor", "challenge"), true);
  assert.equal(canTransitionResearch("learn", "discover"), false);
});

test("challenge operation appends history and never mutates the prior recommendation", () => {
  const original = records[0].recommendationScorecard;
  const challenged = challengeRecommendation(original, { id: "challenge:1", createdAt: "2026-08-08", reason: "New durability evidence conflicts with the current assessment.", outcome: "confidence_reduced" });
  const rejected = challengeRecommendation(challenged, { id: "challenge:2", createdAt: "2026-08-09", reason: "The conflict cannot be resolved with current evidence.", outcome: "rejected" });
  assert.equal(original.status, "active");
  assert.equal(original.challenges.length, 0);
  assert.equal(challenged.status, "challenged");
  assert.equal(challenged.confidence, "moderate");
  assert.equal(challenged.challenges[0].previousScore, original.score);
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.revision, 3);
  assert.equal(rejected.challenges.length, 2);
});
