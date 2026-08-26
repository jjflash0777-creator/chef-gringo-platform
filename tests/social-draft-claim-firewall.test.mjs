import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SOCIAL_PUBLISH_AVAILABLE,
  applyDraftClaimFirewall,
  asResearchQuestion,
  assessClaimSufficiency,
  buildContentIntelligence,
  buildDecisionDna,
  buildEvidenceGapRadar,
  classifyDraftStatement,
  everyRemainingAssertiveStatementIsAuthorized,
  hedgesDoNotAuthorize,
  statementBroadensClaim,
  transformUnsupportedStatement,
} from "../app/growth/social/index.ts";

const LEAK = "Food truck operators can size a generator more accurately by calculating their real running wattage, accounting for equipment startup loads, and adding reasonable operating headroom.";
const ACCEPTED = "Generator sizing should account for running and startup electrical requirements.";
const RUNNING = "Running electrical load is the sum of continuous connected loads.";
const EVIDENCE = { kind: "corpus_document", id: "corpus:acme-running-load" };

function snapshot(overrides = {}) {
  return {
    ref: EVIDENCE,
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
    ...overrides,
  };
}

function inputFromAssessments(assessments, extra = {}) {
  const opportunity = {
    id: "sgo:opportunity:demo",
    slug: "demo",
    problem: extra.problem ?? "Operators guess generator size from informal advice.",
    audience: extra.audience ?? "independent_operator",
    usefulnessTest: extra.usefulnessTest ?? "They keep a written load list before buying.",
    productId: extra.productId ?? null,
    workflowId: extra.workflowId ?? null,
    partnerOpportunityId: extra.partnerOpportunityId ?? null,
    status: "selected",
  };
  const pkg = {
    id: "sgo:package:demo",
    slug: "demo",
    opportunityId: opportunity.id,
    thesis: extra.thesis ?? LEAK,
    usefulnessTest: extra.usefulnessTest ?? opportunity.usefulnessTest,
    commercialPosture: extra.commercialPosture ?? "none",
    status: "drafted",
  };
  const claims = assessments.map((item) => ({
    id: item.claimId,
    packageId: pkg.id,
    claimText: item.claimText,
    safetySensitive: item.safetySensitive,
    evidence: snapshot().ref,
    evidenceRefs: [snapshot().ref],
  }));
  const decisionDna = buildDecisionDna({
    packageId: pkg.id,
    problem: opportunity.problem,
    audience: opportunity.audience,
    thesis: pkg.thesis,
    commercialPosture: pkg.commercialPosture,
    claims,
    claimAssessments: assessments,
    unresolvedQuestions: extra.unresolvedQuestions ?? ["How much reserve capacity is appropriate?"],
    publicationAuthorized: false,
    historicalCanApprove: true,
  });
  return {
    opportunity,
    package: pkg,
    intelligence: {
      packageId: pkg.id,
      policyVersion: "evidence-intelligence-v1",
      historicalApprovalGateSeparate: true,
      historicalCanApprove: true,
      intelligenceAuthorityReady: decisionDna.intelligenceAuthority === "ready",
      autonomyReadiness: decisionDna.autonomyReadiness,
      claimAssessments: assessments,
      radar: buildEvidenceGapRadar({ claimAssessments: assessments, requestItems: [] }),
      decisionDna,
    },
    liveCandidates: extra.liveCandidates ?? [],
    events: extra.events ?? [],
  };
}

function blockedBrief(overrides = {}) {
  return {
    packageId: "sgo:package:demo",
    opportunityId: "sgo:opportunity:demo",
    primaryUserProblem: "Operators guess generator size from informal advice.",
    targetAudience: "independent_operator",
    searchIntent: "practical_guidance",
    contentThesis: LEAK,
    verifiedFacts: [],
    claimsMustNotMake: [],
    unresolvedQuestions: ["How much reserve capacity is appropriate?"],
    contradictions: [],
    recommendedFormat: "chefgringo_article",
    recommendedCta: "none",
    commercialRelevance: "No commercial CTA",
    confidence: "blocked",
    evidenceReadiness: "not_ready",
    contentReadiness: "blocked",
    recommendationReadiness: "not_ready",
    liveDiscoveryIsNotEvidence: true,
    ...overrides,
  };
}

function readyBrief(claimText = ACCEPTED) {
  return blockedBrief({
    contentThesis: "Explain generator sizing from accepted electrical requirements.",
    confidence: "ready",
    evidenceReadiness: "ready",
    contentReadiness: "drafting_allowed",
    recommendationReadiness: "ready",
    verifiedFacts: [{
      claimId: "sgo:claim:sizing",
      claimText,
      evidenceRefs: [EVIDENCE],
      sufficiency: "supported",
    }],
  });
}

const noCommercial = {
  route: "no_commercial_cta",
  helpsUserProblem: false,
  reason: "No commercial CTA. A paid or partner route would not materially help this user problem.",
  cta: "none",
  destinationPath: "/learn",
  spending: false,
  partnerOutreach: false,
};

function fire(copy, brief = blockedBrief(), route = noCommercial) {
  return applyDraftClaimFirewall({ copy, brief, route });
}

test("unsupported declarative statement mislabeled non-factual is caught", () => {
  const result = fire(LEAK);
  assert.equal(classifyDraftStatement(LEAK), "recommendation_advice");
  assert.equal(result.copy.includes("can size a generator more accurately"), false);
  assert.equal(result.copy.includes("adding reasonable operating headroom"), false);
  assert.ok(result.claimFirewall.traces.some((item) => item.action === "transformed" || item.action === "removed"));
  assert.equal(result.claimFirewall.traces.some((item) => item.authorized && item.action === "kept" && item.classification === "recommendation_advice"), false);
  assert.equal(everyRemainingAssertiveStatementIsAuthorized(result.copy, blockedBrief(), noCommercial), true);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("unsupported recommendation is caught", () => {
  const statement = "Food truck operators should add reasonable generator headroom.";
  assert.equal(classifyDraftStatement(statement), "recommendation_advice");
  const result = fire(statement);
  assert.doesNotMatch(result.copy, /should add reasonable generator headroom/i);
  assert.match(result.copy, /How much reserve capacity is appropriate after running and startup demand are calculated\?/);
  assert.equal(result.claimFirewall.traces[0]?.authorized, false);
});

test("adding may/could does not automatically authorize an unsupported claim", () => {
  const hedged = "Food truck operators may add reasonable generator headroom.";
  const could = "Startup loads could require a larger generator.";
  assert.equal(hedgesDoNotAuthorize(hedged), true);
  assert.equal(classifyDraftStatement(hedged), "recommendation_advice");
  assert.equal(classifyDraftStatement(could), "factual_claim");
  const result = fire(`${hedged} ${could}`);
  assert.doesNotMatch(result.copy, /\bmay add reasonable generator headroom/i);
  assert.doesNotMatch(result.copy, /\bcould require a larger generator/i);
  assert.doesNotMatch(result.copy, /\bmay\b.*headroom/i);
});

test("unsupported statement can be transformed into a question or research framing", () => {
  const advice = transformUnsupportedStatement("Food truck operators should add reasonable generator headroom.", "recommendation_advice");
  assert.equal(advice.text, "How much reserve capacity is appropriate after running and startup demand are calculated?");
  assert.equal(classifyDraftStatement(advice.text), "hypothesis_question");
  const causal = transformUnsupportedStatement("Startup loads require a larger generator.", "factual_claim");
  assert.match(causal.text, /Chef Gringo is still verifying how startup demand should affect generator sizing/);
  assert.equal(classifyDraftStatement(causal.text), "hypothesis_question");
  const question = asResearchQuestion(LEAK);
  assert.match(question, /\?$/);
  assert.notEqual(classifyDraftStatement(question), "recommendation_advice");
  assert.notEqual(classifyDraftStatement(question), "factual_claim");
});

test("accepted factual statement retains claim and evidence trace", () => {
  const brief = readyBrief(RUNNING);
  const result = fire(RUNNING, brief);
  const kept = result.claimFirewall.traces.find((item) => item.action === "kept");
  assert.equal(kept?.authorized, true);
  assert.equal(kept?.classification, "factual_claim");
  assert.deepEqual(kept?.claimIds, ["sgo:claim:sizing"]);
  assert.deepEqual(kept?.evidenceRefs, [EVIDENCE]);
  assert.match(result.copy, /Running electrical load is the sum of continuous connected loads/);
  assert.equal(result.claimFirewall.factualStatementsAuthorized, 1);
});

test("statement broader than accepted claim is rejected", () => {
  const broadened = "A 20% reserve always prevents generator problems.";
  assert.equal(statementBroadensClaim(broadened, ACCEPTED), true);
  const wrapped = `${ACCEPTED} A 20% reserve always prevents generator problems.`;
  const result = fire(wrapped, readyBrief());
  assert.doesNotMatch(result.copy, /20%/);
  assert.doesNotMatch(result.copy, /always prevents generator problems/i);
  assert.ok(result.claimFirewall.traces.some((item) => item.text.includes("20%") && item.authorized === false));
});

test("unsupported number, universal, safety, and savings/performance claims are blocked", () => {
  const result = fire([
    "A 20% reserve is required.",
    "This method always works in every kitchen.",
    "This setup is safe and shock-proof.",
    "This generator is certified to save $400 a year.",
  ].join(" "));
  assert.doesNotMatch(result.copy, /20%/);
  assert.doesNotMatch(result.copy, /\balways works in every kitchen\b/i);
  assert.doesNotMatch(result.copy, /shock-proof/i);
  assert.doesNotMatch(result.copy, /certified to save \$400/i);
  assert.ok(result.claimFirewall.traces.every((item) => (
    item.classification !== "factual_claim" && item.classification !== "recommendation_advice"
  ) || item.authorized === false || item.action !== "kept"));
});

test("contradiction blocks recommendation", () => {
  const brief = readyBrief();
  brief.contradictions = ["Accepted sources disagree on headroom."];
  brief.recommendationReadiness = "not_ready";
  const result = fire("Operators should buy a larger generator based on accepted evidence.", brief);
  assert.doesNotMatch(result.copy, /should buy a larger generator/i);
  assert.equal(result.claimFirewall.recommendationsAuthorized, 0);
  assert.equal(result.claimFirewall.status, "blocked");
});

test("live discovery candidate cannot authorize prose", () => {
  const brief = blockedBrief({
    claimsMustNotMake: [{
      claimId: "live-candidate:0",
      claimText: "https://www.vendor.example/surge-myth.pdf",
      reason: "Live discovery candidates are not evidence until corpus review accepts them.",
    }],
  });
  const result = fire("https://www.vendor.example/surge-myth.pdf proves a portable generator must include undocumented surge headroom of 40%.", brief);
  assert.doesNotMatch(result.copy, /40%/);
  assert.doesNotMatch(result.copy, /vendor\.example/);
  assert.equal(result.claimFirewall.factualStatementsAuthorized, 0);
  assert.equal(result.claimFirewall.recommendationsAuthorized, 0);
});

test("no-commercial route cannot leak commercial CTA", () => {
  const result = fire("Request a specified quote (/marketplace). Compare using the verified facts on Chef Gringo (/marketplace/compare).", blockedBrief(), noCommercial);
  assert.match(result.copy, /No commercial CTA/);
  assert.doesNotMatch(result.copy, /request a specified quote/i);
  assert.doesNotMatch(result.copy, /compare using the verified facts/i);
  assert.doesNotMatch(result.copy, /\/marketplace/);
});

test("blocked package can still generate useful non-assertive content", () => {
  const unsupported = assessClaimSufficiency({
    claim: { id: "sgo:claim:guess", claimText: "Generators must be twenty percent oversized for every kitchen.", safetySensitive: false },
    records: [snapshot({ ingestionStatus: "awaiting_review", validationStatus: "relevant" })],
  });
  const workspace = buildContentIntelligence(inputFromAssessments([unsupported], {
    problem: LEAK,
    thesis: LEAK,
  }));
  assert.equal(workspace.brief.verifiedFacts.length, 0);
  assert.ok(workspace.drafts.length >= 1);
  for (const draft of workspace.drafts) {
    assert.doesNotMatch(draft.copy, /can size a generator more accurately/i);
    assert.doesNotMatch(draft.copy, /adding reasonable operating headroom/i);
    assert.doesNotMatch(draft.copy, /twenty percent oversized/i);
    assert.match(draft.copy, /No purchase or product recommendation is authorized|Chef Gringo is investigating|Questions to investigate|still verifying|What still needs to be verified|Evidence is still incomplete/i);
    assert.equal(draft.recommendationBlocked, true);
    assert.equal(draft.claimFirewall.status, "blocked");
    assert.notEqual(draft.copy.trim(), "");
    assert.equal(everyRemainingAssertiveStatementIsAuthorized(draft.copy, workspace.brief, workspace.commercialRoute), true);
  }
  assert.equal(workspace.commercialRoute.route, "no_commercial_cta");
  assert.equal(workspace.publishingEnabled, false);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});

test("every remaining factual or recommendational sentence is authorized and traced", () => {
  const supported = assessClaimSufficiency({
    claim: { id: "sgo:claim:sizing", claimText: ACCEPTED, safetySensitive: false },
    records: [snapshot()],
  });
  const workspace = buildContentIntelligence(inputFromAssessments([supported], {
    problem: "Operators guess generator size from informal advice.",
    thesis: "Explain generator sizing from accepted electrical requirements.",
  }));
  assert.ok(workspace.drafts.length >= 1);
  for (const draft of workspace.drafts) {
    assert.equal(everyRemainingAssertiveStatementIsAuthorized(draft.copy, workspace.brief, workspace.commercialRoute), true);
    for (const trace of draft.statementTrace) {
      if ((trace.classification === "factual_claim" || trace.classification === "recommendation_advice") && trace.action === "kept") {
        assert.equal(trace.authorized, true);
        assert.ok(trace.claimIds.length > 0);
        assert.ok(trace.evidenceRefs.length > 0);
      }
    }
    assert.ok(draft.claimFirewall);
    assert.ok(["passed", "blocked", "transformed"].includes(draft.claimFirewall.status));
  }
});

test("Draft Studio no longer reports no factual statements while declarative advice remains", async () => {
  const ui = await readFile(new URL("../app/admin/growth/GrowthQueue.tsx", import.meta.url), "utf8");
  assert.match(ui, /Claim Firewall/);
  assert.match(ui, /Factual statements authorized/);
  assert.match(ui, /Recommendations authorized/);
  assert.match(ui, /Statements transformed\/removed/);
  assert.doesNotMatch(ui, /Trace: \{draft\.segments\.filter/);
  assert.doesNotMatch(ui, /no factual statements/);
  const firewall = await readFile(new URL("../app/growth/social/draft-claim-firewall.ts", import.meta.url), "utf8");
  assert.doesNotMatch(firewall, /openai|anthropic|llm|gpt-/i);
  assert.equal(SOCIAL_PUBLISH_AVAILABLE, false);
});
