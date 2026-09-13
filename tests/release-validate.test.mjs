import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  HERO_IMAGE_PATH,
  LEGACY_MVP_SITES_PROJECT_ID,
  PRODUCTION_SITE_URL,
  PRODUCTION_SITES_PROJECT_ID,
  extractHomepageMarkers,
  validateRelease,
} from "../scripts/release-validate.mjs";

const root = path.resolve(import.meta.dirname, "..");

test("canonical metadata does not point every route at the homepage", async () => {
  const [rootLayout, thermoworksPage] = await Promise.all([
    readFile(path.join(root, "app/layout.tsx"), "utf8"),
    readFile(path.join(root, "app/go/thermoworks/page.tsx"), "utf8"),
  ]);

  assert.doesNotMatch(
    rootLayout,
    /alternates\s*:\s*\{\s*canonical\s*:\s*["']\/["']/,
  );
  assert.match(
    thermoworksPage,
    /canonical\s*:\s*["']\/go\/thermoworks["']/,
  );
});

test("release constants identify production vs legacy MVP Sites projects", () => {
  assert.equal(PRODUCTION_SITES_PROJECT_ID, "appgprj_6a88d56167a08191bb0c358e41fd62f6");
  assert.equal(LEGACY_MVP_SITES_PROJECT_ID, "appgprj_6a66280686748191931a0ed1cbde7a20");
  assert.equal(PRODUCTION_SITE_URL, "https://chefgringo.com");
  assert.equal(HERO_IMAGE_PATH, "/brand/editorial/hero-kitchen.jpg");
});

test("homepage markers include hero image and current copy anchors", () => {
  const markers = extractHomepageMarkers(
    'Know More. Waste Less. Hospitality intelligence that ends in action. Food, kitchens, equipment, costs, health, and hospitality',
    `heroKitchen: { src: "${HERO_IMAGE_PATH}" }`,
  );
  assert.ok(markers.includes(HERO_IMAGE_PATH));
  assert.ok(markers.includes("Know More. Waste Less."));
});

test("release validate rejects staging environment for production packaging", async () => {
  const result = await validateRelease({
    NEXT_PUBLIC_SITE_URL: PRODUCTION_SITE_URL,
    CHEF_GRINGO_ENVIRONMENT: "staging",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => /staging/i.test(item)));
});

test("release validate requires production site URL", async () => {
  const result = await validateRelease({
    NEXT_PUBLIC_SITE_URL: "https://example.com",
    CHEF_GRINGO_ENVIRONMENT: "production",
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.includes("NEXT_PUBLIC_SITE_URL")));
});
