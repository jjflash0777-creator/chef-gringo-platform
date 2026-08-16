import assert from "node:assert/strict";
import test from "node:test";
import { buildCommercialIntelligence, detectCommercialIntent } from "../app/lib/ai/commercialIntelligence.ts";
import { toLoopsNewsletterContact, toLoopsNewsletterSignupEvent } from "../app/lib/engagement/loopsAdapter.ts";

test("commercial intent requires both an action signal and a routable subject", () => {
  assert.equal(detectCommercialIntent("How do I make marinara?").commercialEligible, false);
  assert.equal(detectCommercialIntent("I need a better thermometer to buy").workflowId, "better-thermometer");
  assert.equal(detectCommercialIntent("Compare commercial mixers for a bakery").kind, "compare");
});

test("product routing uses published catalog evidence and preserves unresolved facts", () => {
  const intelligence = buildCommercialIntelligence("Compare the best commercial mixer to buy");
  assert.equal(intelligence.intent.commercialEligible, true);
  assert.equal(intelligence.routes.length, 3);
  for (const route of intelligence.routes) {
    assert.equal(route.workflowId, "commercial-mixer");
    assert.match(route.evidenceUrl, /^https:/);
    assert.ok(route.evidenceCheckedAt);
    assert.ok(route.unresolvedQuestions.length);
    assert.match(route.disclosure, /No verified affiliate relationship/);
  }
});

test("commercial opportunity cannot rerank editorial workflow scores", () => {
  const routes = buildCommercialIntelligence("Which commercial mixer is best?").routes;
  assert.deepEqual(routes.map((route) => route.productId), ["hobart-hl200", "globe-sp20", "varimixer-kodiak20"]);
});

test("Loops signup event carries first-party segmentation context", () => {
  const payload = toLoopsNewsletterSignupEvent({ email: "operator@example.com", source: "guided_start", policyVersion: "2026-08-01", commercialProfile: { intentKind: "compare", workflowId: "commercial-mixer", confidence: "high" }, attribution: { source: "youtube", medium: "video", campaignId: "mixer-test", landingPage: "/start" } });
  assert.equal(payload.eventProperties.commercialWorkflow, "commercial-mixer");
  assert.equal(payload.eventProperties.acquisitionSource, "youtube");
  assert.equal(payload.eventProperties.acquisitionCampaign, "mixer-test");
  const contact = toLoopsNewsletterContact({ email: "operator@example.com", source: "guided_start", policyVersion: "2026-08-01", commercialProfile: { intentKind: "compare", workflowId: "commercial-mixer", confidence: "high" }, attribution: { source: "youtube", medium: "video", campaignId: "mixer-test", landingPage: "/start" } });
  assert.equal(contact.commercialIntent, "compare");
  assert.equal(contact.commercialWorkflow, "commercial-mixer");
  assert.equal(contact.acquisitionCampaign, "mixer-test");
});
