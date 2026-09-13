import type { CorpusHit } from "./corpus-types.ts";
import { AUTHORITATIVE_MANIFEST, CORPUS_MANIFEST_VERSION } from "./corpus-manifest.ts";

/** Deterministic local library. Not live web retrieval. Fixtures are labeled. */

export const LOCAL_CORPUS_HITS: CorpusHit[] = [
  {
    sourceId: "corpus:chef-gringo-mirepoix-practice",
    sourceVersion: "corpus:chef-gringo-mirepoix-practice:v1",
    chunkId: "corpus:chef-gringo-mirepoix-practice:v1:c1",
    title: "Mirepoix as Chef Gringo professional practice",
    publisher: "Chef Gringo",
    authorityTier: 2,
    canonicalUrl: null,
    excerpt: "Mirepoix is a flavor base of onion, carrot, and celery, commonly two parts onion to one part each carrot and celery, cooked gently in fat without browning.",
    heading: "Mirepoix",
    locator: "heading:Mirepoix",
    score: 0,
    lastValidatedAt: "2026-08-21T00:00:00.000Z",
    productionExposure: true,
    domain: "culinary_technique",
    jurisdiction: null,
    publishedDate: null,
    fixture: true,
    ingestionStatus: "accepted",
  },
  {
    sourceId: "corpus:test-usda-fsis-ground-beef",
    sourceVersion: "corpus:test-usda-fsis-ground-beef:v1",
    chunkId: "corpus:test-usda-fsis-ground-beef:v1:c1",
    title: "USDA FSIS safe-temperature transcription (test fixture)",
    publisher: "USDA Food Safety and Inspection Service",
    authorityTier: 1,
    canonicalUrl: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
    excerpt: "Ground Meat and Meat Mixtures, Beef: 160°F (71.1°C). This is an administrator-supplied transcription for tests, not a live fetch of the FSIS chart.",
    heading: "Ground beef",
    locator: "heading:Ground beef",
    score: 0,
    lastValidatedAt: "2026-08-21T00:00:00.000Z",
    productionExposure: true,
    domain: "food_safety_public_health",
    jurisdiction: "United States",
    publishedDate: null,
    fixture: true,
    ingestionStatus: "accepted",
  },
];

export const IMPORT_MANIFEST = AUTHORITATIVE_MANIFEST.map((entry) => ({
  id: entry.id,
  url: entry.canonicalUrl,
  status: entry.productionEligibility,
  notes: entry.unavailableReason ?? entry.reviewNotes,
}));

export const ACTIVATED_CORPUS_VERSION = CORPUS_MANIFEST_VERSION;
