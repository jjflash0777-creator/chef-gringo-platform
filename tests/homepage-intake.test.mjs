import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateHomepageRequest, homepageIntentPrompts } from "../app/home/intake.ts";
import { deriveActionTerminals } from "../app/lib/ai/actionEngine.ts";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const component = await readFile(new URL("../app/components/HomepageIntake.tsx", import.meta.url), "utf8");
const handler = await readFile(new URL("../app/lib/ai/chef-gringo-http.ts", import.meta.url), "utf8");
const route = await readFile(new URL("../app/api/chef-gringo/route.ts", import.meta.url), "utf8");
const runtime = await readFile(new URL("../app/lib/ai/chefGringoRuntime.ts", import.meta.url), "utf8");
const service = await readFile(new URL("../app/lib/ai/assistant-service.ts", import.meta.url), "utf8");

test("homepage keeps one canonical hospitality intake", () => {
  assert.match(page, /What are you working on\?/);
  assert.equal((page.match(/<HomepageIntake/g) ?? []).length, 1);
  assert.doesNotMatch(page, /entry-door|industrial-window|ask-modes/);
});

test("blank input exposes validation and every submit has visible state", () => {
  assert.match(component, /if \(!prompt\)/);
  assert.match(component, /setViewState\("validation"\)/);
  assert.match(component, /setViewState\("loading"\)/);
  assert.match(component, /setViewState\("result"\)/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /role="alert"/);
});

test("homepage uses the canonical assistant contract and keeps the investigation path", () => {
  assert.match(component, /fetch\("\/api\/chef-gringo"/);
  assert.match(component, /conversation: conversation\.slice\(-8\)/);
  assert.match(component, /supportsRealInvestigation/);
  assert.match(component, /createInvestigationCase/);
  assert.match(component, /Chef Gringo is thinking/);
  assert.match(component, /Help me make marinara/);
  assert.match(component, /cg-msg-user/);
  assert.match(component, /cg-msg-chef/);
});

test("AI route is server-side, bounded, and does not expose provider credentials", () => {
  assert.match(route, /handleChefGringoPost/);
  assert.match(handler, /45000/);
  assert.doesNotMatch(handler, /CHEF_GRINGO_AI_API_KEY/);
  assert.match(runtime, /CHEF_GRINGO_AI_API_KEY/);
  assert.match(runtime, /authorization = `Bearer/);
  assert.match(runtime, /http:\/\/127\.0\.0\.1:11434\/v1/);
  assert.match(runtime, /gemma3:1b/);
  assert.match(service, /12000|QUESTION_MAX_CHARS/);
});

test("system prompt answers ordinary culinary questions instead of demanding detail", () => {
  assert.match(service, /help me make marinara/i);
  assert.match(service, /What's mirepoix/i);
  assert.match(service, /Ask a follow-up only when the missing detail materially changes the answer/);
});

test("cooking questions still produce canonical action terminals with three quality lanes", () => {
  const actions = deriveActionTerminals("Help me make marinara", "Start with tomatoes, olive oil, garlic, and basil.");
  const mission = actions.find((action) => action.kind === "cooking_mission");
  assert.ok(mission);
  assert.equal(mission.commercialEligible, false);
  assert.equal(mission.commercialRouteVerified, false);
  assert.deepEqual(mission.choices?.map((choice) => choice.label), ["Budget Smart", "Premium Pantry", "Bring Italy to the Table"]);
  assert.ok(actions.some((action) => action.kind === "shopping_list"));
});

test("intent examples remain available as fallback shortcuts", () => {
  assert.deepEqual(homepageIntentPrompts.map(({ label }) => label), ["Find equipment", "Compare software", "Check a repair", "Lower a cost", "Grow the business"]);
  assert.match(component, /setRequest\(value\)/);
  assert.equal(evaluateHomepageRequest("I need a 20-quart mixer for a restaurant bakery with a $4,000 budget.").href, "/marketplace");
  assert.equal(evaluateHomepageRequest("I need more customers for slow weekday dinner service.").href, "/#grow");
  assert.equal(evaluateHomepageRequest("I want to learn the proper technique for carbonara.").href, "/discover");
});

test("commercial and evidence claims remain outside generic AI authority", () => {
  assert.match(service, /Never invent citations, prices, affiliate relationships/);
  assert.match(component, /Related products on file/);
  assert.match(component, /cg-assistant-commercial/);
});
