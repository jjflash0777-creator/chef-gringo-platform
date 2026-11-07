import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { PARTNER_SHOWCASE } from "../app/lib/partners.ts";
import { PUBLISHED_RECIPES, newYorkDayNumber, recipeOfTheDay } from "../app/lib/recipe-registry.ts";

const publicFile = (path) => new URL(`../public${path}`, import.meta.url);

test("recipe registry is a real shelf: unique recipes, every image on disk", async () => {
  assert.ok(PUBLISHED_RECIPES.length >= 5);
  const hrefs = new Set(PUBLISHED_RECIPES.map((recipe) => recipe.href));
  assert.equal(hrefs.size, PUBLISHED_RECIPES.length);
  for (const recipe of PUBLISHED_RECIPES) {
    assert.ok(recipe.title.length > 0, recipe.href);
    assert.ok(recipe.hook.length > 0, recipe.href);
    assert.ok(recipe.imageAlt.length > 0, recipe.href);
    await access(publicFile(recipe.image));
  }
});

test("lighter-angle notes stay rare and belong to recipes whose framing supports them", () => {
  const angled = PUBLISHED_RECIPES.filter((recipe) => recipe.lighterAngle);
  assert.ok(angled.length >= 1 && angled.length <= 2);
  // Hollandaise is an emulsion of yolk and butter; it never carries a
  // health angle on this site.
  assert.equal(PUBLISHED_RECIPES.find((recipe) => recipe.href === "/recipes/hollandaise")?.lighterAngle, undefined);
});

test("recipe of the day is stable within a New York day and advances at midnight Eastern", () => {
  // 2026-11-07 is EST (UTC-5): 04:59:59Z is still Nov 7 in New York;
  // 05:00:00Z is Nov 8.
  const beforeMidnight = new Date("2026-11-08T04:59:59Z");
  const afterMidnight = new Date("2026-11-08T05:00:00Z");
  assert.equal(newYorkDayNumber(afterMidnight) - newYorkDayNumber(beforeMidnight), 1);

  const morning = recipeOfTheDay(new Date("2026-11-07T14:00:00Z"));
  const evening = recipeOfTheDay(new Date("2026-11-08T01:30:00Z"));
  assert.equal(morning, evening);

  const today = recipeOfTheDay(beforeMidnight);
  const tomorrow = recipeOfTheDay(afterMidnight);
  const nextIndex = (PUBLISHED_RECIPES.indexOf(today) + 1) % PUBLISHED_RECIPES.length;
  assert.equal(tomorrow, PUBLISHED_RECIPES[nextIndex]);
});

test("the rotation covers the whole pool evenly across one cycle", () => {
  const start = new Date("2026-11-02T17:00:00Z");
  const seen = new Set();
  for (let day = 0; day < PUBLISHED_RECIPES.length; day += 1) {
    seen.add(recipeOfTheDay(new Date(start.getTime() + day * 86_400_000)).href);
  }
  assert.equal(seen.size, PUBLISHED_RECIPES.length);
});

test("every partner card carries imagery, and local imagery exists on disk", async () => {
  assert.equal(PARTNER_SHOWCASE.length, 7);
  for (const partner of PARTNER_SHOWCASE) {
    assert.ok(partner.image.length > 0, partner.name);
    assert.ok(partner.imageAlt.length > 0, partner.name);
    if (partner.imageKind === "editorial") {
      assert.ok(partner.image.startsWith("/"), partner.name);
      await access(publicFile(partner.image));
    } else {
      // Affiliate creative is the partner's own asset as delivered
      // through Impact — the same endpoints the /go pages run.
      assert.match(partner.image, /^https:\/\/a\.impactradius-go\.com\/display-ad\//, partner.name);
    }
  }
});
