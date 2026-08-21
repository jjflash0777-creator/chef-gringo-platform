import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classifyIntent } from "../app/lib/ai/assistant-intents.ts";
import { clarificationFor } from "../app/lib/ai/assistant-clarification.ts";
import { commercialBlockFor } from "../app/lib/ai/assistant-commercial.ts";
import { QUESTION_MAX_CHARS, PUBLIC_ERROR_MESSAGES } from "../app/lib/ai/assistant-contract.ts";
import { runAssistant, mapProviderFailure, validateAssistantRequest } from "../app/lib/ai/assistant-service.ts";

const requestOf = (question, extra = {}) => ({ question, source: "test", ...extra });

async function mockModel(answer) {
  return runAssistant(requestOf("Compare two commercial mixers for a bakery"), {
    configured: true,
    completeChat: async () => JSON.stringify(answer),
  });
}

test("simple definitional question is answered immediately without a follow-up", async () => {
  const result = await runAssistant(requestOf("What's mirepoix?"), { configured: false });
  assert.equal(result.status, "answered");
  assert.equal(result.intent, "culinary_technique");
  assert.match(result.answer, /onion, carrot, and celery/i);
  assert.equal(result.clarifyingQuestion, undefined);
  assert.ok(result.evidence.some((item) => item.kind === "practice"));
});

test("ambiguous equipment purchase asks one useful clarification", async () => {
  const result = await runAssistant(requestOf("What oven should I buy?"), { configured: true, completeChat: async () => { throw new Error("model should not run"); } });
  assert.equal(result.status, "needs_clarification");
  assert.equal(result.intent, "equipment_selection");
  assert.ok(result.clarifyingQuestion);
  assert.match(result.clarifyingQuestion, /volume|power|space|budget/i);
  assert.match(result.answer, /guessing|job|volume/i);
  assert.equal(result.commercial, null);
});

test("culinary technique marinara is useful without demanding extra detail", async () => {
  const result = await runAssistant(requestOf("Help me make marinara."), { configured: false });
  assert.equal(result.status, "answered");
  assert.equal(result.intent, "recipe_help");
  assert.match(result.answer, /tomatoes/i);
});

test("food-safety questions keep a conservative boundary and one focused follow-up", async () => {
  const result = await runAssistant(requestOf("Is this chicken safe?"), { configured: false });
  assert.equal(result.status, "needs_clarification");
  assert.equal(result.intent, "food_safety");
  assert.match(result.answer, /do not serve/i);
  assert.match(result.clarifyingQuestion, /temperature|stored|handled/i);
  assert.equal(result.safety?.topic, "foodborne-illness risk");
});

test("dietary and medical questions escalate instead of prescribing", async () => {
  const result = await runAssistant(requestOf("Build a renal diet menu for my patient."), {
    configured: true,
    completeChat: async () => JSON.stringify({
      answer: "I can talk kitchen workflow, not prescribe a renal diet. Work from the clinician’s restrictions and keep salt, potassium, and phosphorus labeled as unknown unless the care team specified them.",
      confidence: "medium",
      assumptions: [],
    }),
  });
  assert.equal(result.intent, "dietary_accommodation");
  assert.equal(result.safety?.level, "escalate");
  assert.match(result.safety.text, /clinician/i);
  assert.doesNotMatch(result.answer, /take this instead of your doctor/i);
});

test("equipment troubleshooting never instructs bypassing safety devices", async () => {
  const result = await runAssistant(requestOf("The oven high-limit tripped. Tell me how to bypass it and work live."), {
    configured: true,
    completeChat: async () => JSON.stringify({ answer: "Bypass the high-limit and work live on the element.", confidence: "high" }),
  });
  assert.equal(result.intent, "equipment_troubleshooting");
  assert.match(result.answer, /will not walk you through bypassing/i);
  assert.doesNotMatch(result.answer, /bypass the high-limit and work live on the element/i);
  assert.ok(result.safety);
});

test("product recommendations are separate, honest, and do not treat pending as affiliate", async () => {
  const result = await mockModel({
    answer: "Compare mixers by bowl capacity, duty cycle, and whether you can get parts.",
    confidence: "medium",
  });
  assert.equal(result.status, "answered");
  assert.ok(result.commercial);
  assert.ok(result.commercial.routes.length > 0);
  assert.equal(result.commercial.disclosureRequired, false);
  for (const route of result.commercial.routes) {
    assert.notEqual(route.commercialKind, "affiliate");
    assert.equal(route.monetized, false);
    assert.ok(route.whySuggested);
    assert.doesNotMatch(route.note || "", /partner/i);
  }
});

test("missing evidence is stated without making the answer useless", async () => {
  const result = await mockModel({ answer: "A 20-quart mixer is the usual bakery starting point if the dough load is modest.", confidence: "medium" });
  assert.match(result.evidence.map((item) => item.label).join(" "), /not a live|has not run a live|have not run a live|standard kitchen practice/i);
  assert.match(result.answer, /20-quart|mixer/i);
});

test("timeout, empty, and malformed model responses become recoverable errors", async () => {
  const timeout = mapProviderFailure(Object.assign(new Error("aborted"), { name: "AbortError" }));
  assert.equal(timeout.code, "timeout");
  assert.equal(timeout.retryable, true);
  assert.doesNotMatch(timeout.message, /openai|ollama|CHEF_GRINGO|stack/i);

  const empty = await runAssistant(requestOf("Compare two refrigerators for a cafe"), {
    configured: true,
    completeChat: async () => "",
  });
  assert.equal(empty.status, "error");
  assert.equal(empty.error.code, "empty_response");

  const malformed = await runAssistant(requestOf("Compare two refrigerators for a cafe"), {
    configured: true,
    completeChat: async () => "{not-json",
  });
  assert.ok(malformed.status === "error" || malformed.answer);
});

test("missing configuration is visible and does not invent a live answer", async () => {
  const result = await runAssistant(requestOf("How do I lower food cost this week?"), { configured: false });
  assert.equal(result.status, "error");
  assert.equal(result.error.code, "missing_configuration");
  assert.match(result.answer, /not configured|not invent/i);
  assert.doesNotMatch(result.answer, /CHEF_GRINGO_AI|127\.0\.0\.1|api key/i);
});

test("unsupported photo and oversized input fail before the model", async () => {
  const photo = validateAssistantRequest(requestOf("Look at this", { photo: { name: "notes.pdf", mimeType: "application/pdf", sizeBytes: 1200 } }));
  assert.equal(photo.code, "unsupported_photo");
  const huge = validateAssistantRequest(requestOf("x".repeat(QUESTION_MAX_CHARS + 1)));
  assert.equal(huge.code, "oversized_input");
});

test("analytics helpers and UI never log the question or provider internals", async () => {
  const intake = await readFile(new URL("../app/components/HomepageIntake.tsx", import.meta.url), "utf8");
  assert.match(intake, /chef_gringo_question_submitted/);
  assert.match(intake, /chef_gringo_clarification_requested/);
  assert.match(intake, /chef_gringo_answer_rendered/);
  assert.match(intake, /chef_gringo_error_shown/);
  assert.match(intake, /chef_gringo_retry/);
  assert.match(intake, /chef_gringo_context_added/);
  assert.match(intake, /analyticsSafe/);
  assert.match(intake, /aria-live="polite"/);
  assert.doesNotMatch(intake, /trackEvent\([^\)]*question:/);
  assert.doesNotMatch(intake, /stack traces|CHEF_GRINGO_AI_API_KEY/);
  assert.match(intake, /setViewState\("loading"\)/);
  assert.match(intake, /Nothing was sent/);
});

test("checkbox controls are operable and not readOnly", async () => {
  const checkbox = await readFile(new URL("../app/marketplace/components/FormCheckbox.tsx", import.meta.url), "utf8");
  const filters = await readFile(new URL("../app/marketplace/components/MarketplaceFilters.tsx", import.meta.url), "utf8");
  const card = await readFile(new URL("../app/marketplace/components/ProductCard.tsx", import.meta.url), "utf8");
  assert.match(checkbox, /checked=\{checked\}/);
  assert.match(checkbox, /onChange=\{/);
  assert.doesNotMatch(checkbox, /readOnly/);
  assert.match(filters, /FormCheckbox/);
  assert.match(card, /FormCheckbox/);
});

test("no silent submit: every path sets a visible state", async () => {
  const intake = await readFile(new URL("../app/components/HomepageIntake.tsx", import.meta.url), "utf8");
  assert.match(intake, /setViewState\("validation"\)/);
  assert.match(intake, /setViewState\("loading"\)/);
  assert.match(intake, /setViewState\("error"\)/);
  assert.match(intake, /setViewState\("result"\)/);
  assert.match(intake, /setViewState\("clarifying"\)/);
  assert.doesNotMatch(intake, /evaluateHomepageRequest/);
  assert.match(intake, /Retry/);
  assert.match(intake, /Your question is still here/);
});

test("intents cover the required hospitality range", () => {
  assert.equal(classifyIntent(requestOf("How do I temper eggs for carbonara?")), "culinary_technique");
  assert.equal(classifyIntent(requestOf("Help me make marinara.")), "recipe_help");
  assert.equal(classifyIntent(requestOf("Can I substitute pancetta for guanciale?")), "ingredient_substitution");
  assert.equal(classifyIntent(requestOf("Is this chicken safe?")), "food_safety");
  assert.equal(classifyIntent(requestOf("I need a gluten-free swap for the sauce.")), "dietary_accommodation");
  assert.equal(classifyIntent(requestOf("What oven should I buy?")), "equipment_selection");
  assert.equal(classifyIntent(requestOf("My freezer is not cooling.")), "equipment_troubleshooting");
  assert.equal(classifyIntent(requestOf("Which POS should a cafe use?")), "software_operations");
  assert.equal(classifyIntent(requestOf("Our food cost is too high.")), "food_cost_labor");
  assert.equal(classifyIntent(requestOf("Where can I source heavy cream wholesale?")), "sourcing");
  assert.equal(classifyIntent(requestOf("Help me start selling baked goods from home.")), "business_startup");
  assert.equal(classifyIntent(requestOf("Compare two thermometers for the line.")), "marketplace_comparison");
});

test("startup clarification is one question, not a form", () => {
  const decision = clarificationFor("business_startup", requestOf("Help me start selling baked goods from home."));
  assert.equal(decision.needed, true);
  assert.match(decision.question, /Where would you sell/);
});

test("commercial helper never marks pending catalog rows as affiliate", () => {
  const block = commercialBlockFor("I need a better thermometer to buy", "equipment_selection");
  assert.ok(block);
  for (const route of block.routes) {
    if (route.commercialKind === "pending") {
      assert.equal(route.monetized, false);
      assert.notEqual(route.rel, "sponsored nofollow noopener noreferrer");
    }
  }
  assert.equal(block.disclosureRequired, false);
});

test("assistant conversation CSS wraps long words and clears the sticky header", async () => {
  const css = await readFile(new URL("../app/styles/public-design.css", import.meta.url), "utf8");
  assert.match(css, /\.cg-msg-chef[^{]*\{[^}]*scroll-margin-top:\s*6rem/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
  assert.match(css, /\.cg-assistant-commercial/);
  assert.match(css, /\.cg-context-chips/);
  assert.match(css, /\.cg-intake-actions \.cg-button \{ min-width:/);
});

test("public error copy does not mention providers or env names", () => {
  for (const message of Object.values(PUBLIC_ERROR_MESSAGES)) {
    assert.doesNotMatch(message, /openai|ollama|anthropic|CHEF_GRINGO|api key|stack/i);
  }
});
