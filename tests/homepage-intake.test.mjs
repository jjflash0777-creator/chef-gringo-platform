import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateHomepageRequest, homepageIntentPrompts } from "../app/home/intake.ts";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const component = await readFile(new URL("../app/components/HomepageIntake.tsx", import.meta.url), "utf8");

test("homepage has one canonical question and intake in its first-view hero", () => {
  assert.match(page, /What are you working on\?/);
  assert.equal((page.match(/<HomepageIntake/g) ?? []).length, 1);
  assert.doesNotMatch(page.match(/<section className="cg-home-hero">([\s\S]*?)<\/section>/)?.[1] ?? "", /entry-door|industrial-window|ask-modes/);
});

test("blank input exposes validation and every submit has visible state", () => {
  assert.match(component, /if \(!request\.trim\(\)\)/);
  assert.match(component, /setViewState\("validation"\)/);
  assert.match(component, /setViewState\("loading"\)/);
  assert.match(component, /setViewState\("result"\)/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /role="alert"/);
});

test("intent examples populate the canonical input and map to honest capabilities", () => {
  assert.deepEqual(homepageIntentPrompts.map(({ label }) => label), ["Find equipment", "Compare software", "Check a repair", "Lower a cost", "Grow the business"]);
  assert.match(component, /setRequest\(value\)/);
  assert.equal(evaluateHomepageRequest("I need a 20-quart mixer for a restaurant bakery with a $4,000 budget.").href, "/marketplace");
  assert.equal(evaluateHomepageRequest("I need more customers for slow weekday dinner service.").href, "/#grow");
  assert.equal(evaluateHomepageRequest("I want to learn the proper technique for carbonara.").href, "/discover");
});

test("repair and software requests fail honestly when evidence or capability is incomplete", () => {
  assert.equal(evaluateHomepageRequest("My mixer is broken.").state, "follow_up");
  assert.equal(evaluateHomepageRequest("I need to compare software.").state, "follow_up");
  assert.equal(evaluateHomepageRequest("Compare my current POS contract, monthly processing costs, required integrations, and support terms.").state, "unsupported");
});

test("hero uses the required CTA, trust language, keyboard behavior, and no false research states", () => {
  assert.match(component, /Tell Chef Gringo/);
  assert.match(page, /Recommendations are based on operator value—not commission/);
  assert.match(component, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(component, /homepage_hero/);
  assert.doesNotMatch(`${page}\n${component}`, /browsing now|live research|agents working|AI is thinking|progress percentage/i);
});
