import type { CorpusHit } from "./corpus-types.ts";

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

export const IMPORT_MANIFEST = [
  {
    id: "evidence:usda-fsis:ground-beef-160f",
    url: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
    status: "identified_not_retrieved",
    notes: "Do not mark accepted until an administrator fetches and reviews the official chart.",
  },
  {
    id: "evidence:thermoworks:thermapen-one-response",
    url: "https://www.thermoworks.com/products/thermapen-one",
    status: "identified_not_retrieved",
    notes: "Manufacturer page remains catalog/repository evidence. Live fetch is off.",
  },
  {
    id: "evidence:florida-dbpr:hotels-restaurants",
    url: "https://www.myfloridalicense.com/DBPR/hotels-restaurants/",
    status: "identified_not_retrieved",
    notes: "Agency landing page is identified. Statute text was not retrieved.",
  },
  {
    id: "evidence:practice:mirepoix",
    url: null,
    status: "practice_repository",
    notes: "Chef Gringo authored practice. May be uploaded as a practice note and accepted after review.",
  },
];
