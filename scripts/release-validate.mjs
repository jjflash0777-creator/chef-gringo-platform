#!/usr/bin/env node
/**
 * Pre-promotion release validation for the live Chef Gringo Sites project.
 * Does not deploy and does not mutate Sites environment variables.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const PRODUCTION_SITES_PROJECT_ID = "appgprj_6a88d56167a08191bb0c358e41fd62f6";
export const LEGACY_MVP_SITES_PROJECT_ID = "appgprj_6a66280686748191931a0ed1cbde7a20";
export const PRODUCTION_SITE_URL = "https://chefgringo.com";
export const HERO_IMAGE_PATH = "/brand/editorial/hero-kitchen.jpg";

const HOMEPAGE_SOURCE = join(ROOT, "app", "page.tsx");
const BRAND_IMAGES_SOURCE = join(ROOT, "app", "home", "brand-images.ts");
const HOSTING_SOURCE = join(ROOT, ".openai", "hosting.json");
const DIST_HOSTING = join(ROOT, "dist", ".openai", "hosting.json");
const DIST_FINGERPRINT = join(ROOT, "dist", ".openai", "build-fingerprint.json");
const DIST_SERVER = join(ROOT, "dist", "server");

function fail(message) {
  console.error(`release-validate: ${message}`);
  process.exitCode = 1;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function gitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
}

export function extractHomepageMarkers(pageSource, brandSource) {
  const markers = new Set();
  if (brandSource.includes(HERO_IMAGE_PATH)) markers.add(HERO_IMAGE_PATH);
  const headline = pageSource.match(/Know More\. Waste Less\./);
  if (headline) markers.add(headline[0]);
  const kicker = pageSource.match(/Hospitality intelligence that ends in action\./);
  if (kicker) markers.add(kicker[0]);
  const support = pageSource.match(/Food, kitchens, equipment, costs, health, and hospitality/);
  if (support) markers.add(support[0]);
  return [...markers];
}

export async function hashHomepageSources() {
  const page = await readFile(HOMEPAGE_SOURCE, "utf8");
  const brand = await readFile(BRAND_IMAGES_SOURCE, "utf8");
  return createHash("sha256").update(page).update("\n").update(brand).digest("hex");
}

async function collectPackagedText(dir) {
  const chunks = [];
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      if (!/\.(js|mjs|css|html|json)$/i.test(entry.name)) continue;
      chunks.push(await readFile(path, "utf8"));
    }
  }
  await walk(dir);
  return chunks.join("\n");
}

export async function validateRelease(env = process.env) {
  const errors = [];
  const notes = [];

  if (!(await exists(HOSTING_SOURCE))) {
    errors.push("Missing .openai/hosting.json");
    return { ok: false, errors, notes };
  }

  const hosting = JSON.parse(await readFile(HOSTING_SOURCE, "utf8"));
  if (hosting.project_id !== PRODUCTION_SITES_PROJECT_ID) {
    errors.push(
      `hosting.json project_id must be production ${PRODUCTION_SITES_PROJECT_ID}; found ${hosting.project_id}`,
    );
  }
  if (hosting.project_id === LEGACY_MVP_SITES_PROJECT_ID) {
    errors.push("hosting.json still points at the legacy MVP Sites project");
  }
  if (hosting.d1 !== "DB") {
    errors.push(`production hosting.json must bind d1 to "DB"; found ${JSON.stringify(hosting.d1)}`);
  }

  const siteUrl = (env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (siteUrl !== PRODUCTION_SITE_URL) {
    errors.push(`NEXT_PUBLIC_SITE_URL must be ${PRODUCTION_SITE_URL}; found ${siteUrl || "(unset)"}`);
  }

  const environment = (env.CHEF_GRINGO_ENVIRONMENT || "").trim().toLowerCase();
  if (environment === "staging") {
    errors.push("production release cannot use CHEF_GRINGO_ENVIRONMENT=staging");
  }

  if (!(await exists(DIST_HOSTING)) || !(await exists(DIST_FINGERPRINT)) || !(await exists(DIST_SERVER))) {
    errors.push("dist is incomplete; run npm run build before release:validate");
    return { ok: false, errors, notes };
  }

  const packagedHosting = JSON.parse(await readFile(DIST_HOSTING, "utf8"));
  if (packagedHosting.project_id !== PRODUCTION_SITES_PROJECT_ID) {
    errors.push(`packaged hosting.json project_id mismatch: ${packagedHosting.project_id}`);
  }

  const fingerprint = JSON.parse(await readFile(DIST_FINGERPRINT, "utf8"));
  const head = gitHead();
  const sourceHash = await hashHomepageSources();
  if (fingerprint.commitSha !== head) {
    errors.push(
      `stale dist: fingerprint commit ${fingerprint.commitSha} does not match HEAD ${head}`,
    );
  }
  if (fingerprint.sitesProjectId !== PRODUCTION_SITES_PROJECT_ID) {
    errors.push(`fingerprint sitesProjectId mismatch: ${fingerprint.sitesProjectId}`);
  }
  if (fingerprint.homepageSourceHash !== sourceHash) {
    errors.push("stale dist: packaged homepage source hash does not match current app/page.tsx + brand-images.ts");
  }
  if (fingerprint.environment === "staging") {
    errors.push("fingerprint environment cannot be staging for production packaging");
  }

  const pageSource = await readFile(HOMEPAGE_SOURCE, "utf8");
  const brandSource = await readFile(BRAND_IMAGES_SOURCE, "utf8");
  const markers = extractHomepageMarkers(pageSource, brandSource);
  if (!markers.includes(HERO_IMAGE_PATH)) {
    errors.push("source homepage brand images no longer reference hero-kitchen.jpg");
  }

  const packaged = await collectPackagedText(DIST_SERVER);
  if (!packaged.includes(HERO_IMAGE_PATH)) {
    errors.push(`packaged homepage/server output missing ${HERO_IMAGE_PATH}`);
  }
  for (const marker of markers) {
    if (!packaged.includes(marker)) {
      errors.push(`packaged output missing current homepage copy marker: ${marker}`);
    }
  }

  const fingerprintStat = await stat(DIST_FINGERPRINT);
  const pageStat = await stat(HOMEPAGE_SOURCE);
  if (fingerprintStat.mtimeMs + 1000 < pageStat.mtimeMs) {
    errors.push("stale dist: homepage source is newer than packaged fingerprint");
  }

  notes.push(`production project ${PRODUCTION_SITES_PROJECT_ID}`);
  notes.push(`legacy MVP project ${LEGACY_MVP_SITES_PROJECT_ID} (not production)`);
  notes.push(`fingerprint commit ${fingerprint.commitSha}`);
  notes.push(`builtAt ${fingerprint.builtAt}`);
  return { ok: errors.length === 0, errors, notes };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const result = await validateRelease();
  for (const note of result.notes) console.log(`release-validate: ${note}`);
  if (!result.ok) {
    for (const error of result.errors) fail(error);
    process.exit(1);
  }
  console.log("release-validate: ok");
}
