export const CORPUS_MANIFEST_VERSION = "11.0.0";

export const PROVENANCE_METHODS = [
  "live_fetch",
  "founder_uploaded_document",
  "manually_verified_excerpt",
  "repository_practice",
  "test_fixture",
  "metadata_only",
] as const;

export type ProvenanceMethod = typeof PROVENANCE_METHODS[number];

export const PUBLIC_PROVENANCE = new Set<ProvenanceMethod>([
  "live_fetch",
  "founder_uploaded_document",
  "manually_verified_excerpt",
  "repository_practice",
]);

export const CORPUS_TARGETS = ["local", "preview", "production"] as const;
export type CorpusTarget = typeof CORPUS_TARGETS[number];

export type ProvenanceRecord = {
  method: ProvenanceMethod;
  claimScope: string[];
  requiresAttestation: boolean;
  exactModel?: string | null;
};

/** Honest Stage 11 overlay. Stage 10 public fixtures were not live-fetched. */
export const STAGE11_PROVENANCE: Record<string, ProvenanceRecord> = {
  "corpus:usda-fsis-safe-temps": { method: "manually_verified_excerpt", claimScope: ["ground_beef_temp", "poultry_temp", "fish_temp"], requiresAttestation: true },
  "corpus:usda-fsis-thawing": { method: "manually_verified_excerpt", claimScope: ["thawing"], requiresAttestation: true },
  "corpus:usda-fsis-danger-zone": { method: "manually_verified_excerpt", claimScope: ["leftover_time", "danger_zone"], requiresAttestation: true },
  "corpus:fda-food-code-tcs": { method: "manually_verified_excerpt", claimScope: ["tcs_cooling", "hot_hold", "cold_hold"], requiresAttestation: true },
  "corpus:fda-major-allergens": { method: "manually_verified_excerpt", claimScope: ["allergens", "cross_contact"], requiresAttestation: true },
  "corpus:cdc-four-steps": { method: "manually_verified_excerpt", claimScope: ["cross_contamination", "four_steps"], requiresAttestation: true },
  "corpus:fda-cleaning-sanitizing": { method: "manually_verified_excerpt", claimScope: ["cleaning_sanitizing"], requiresAttestation: true },
  "corpus:usda-fooddata-central": { method: "manually_verified_excerpt", claimScope: ["fooddata_central"], requiresAttestation: true },
  "corpus:dietary-guidelines-2020": { method: "manually_verified_excerpt", claimScope: ["dietary_guidelines"], requiresAttestation: true },
  "corpus:fda-nutrition-facts": { method: "manually_verified_excerpt", claimScope: ["nutrition_facts"], requiresAttestation: true },
  "corpus:iddsi-level-5": { method: "manually_verified_excerpt", claimScope: ["iddsi_level_5"], requiresAttestation: true },
  "corpus:iddsi-level-4": { method: "manually_verified_excerpt", claimScope: ["iddsi_level_4"], requiresAttestation: true },
  "corpus:florida-dbpr-hotels-restaurants": { method: "manually_verified_excerpt", claimScope: ["florida_dbpr"], requiresAttestation: true },
  "corpus:florida-cottage-food": { method: "manually_verified_excerpt", claimScope: ["florida_cottage_food"], requiresAttestation: true },
  "corpus:florida-dor-sales-tax": { method: "manually_verified_excerpt", claimScope: ["florida_sales_tax"], requiresAttestation: true },
  "corpus:sarasota-county-food": { method: "metadata_only", claimScope: [], requiresAttestation: false },
  "corpus:practice-mirepoix": { method: "repository_practice", claimScope: ["practice_mirepoix"], requiresAttestation: false },
  "corpus:practice-emulsion": { method: "repository_practice", claimScope: ["practice_emulsion"], requiresAttestation: false },
  "corpus:practice-stock-sauce": { method: "repository_practice", claimScope: ["practice_stock"], requiresAttestation: false },
  "corpus:practice-yield-cost": { method: "repository_practice", claimScope: ["food_cost", "ep_yield", "recipe_scaling"], requiresAttestation: false },
  "corpus:thermoworks-thermapen-one": { method: "manually_verified_excerpt", claimScope: ["thermapen_one_spec"], requiresAttestation: true, exactModel: "Thermapen ONE" },
  "corpus:comark-pdt300-datasheet": { method: "metadata_only", claimScope: [], requiresAttestation: false, exactModel: "PDT300" },
  "corpus:waring-wsb50-spec": { method: "manually_verified_excerpt", claimScope: ["waring_wsb50"], requiresAttestation: true, exactModel: "WSB50" },
  "corpus:globe-sp20": { method: "manually_verified_excerpt", claimScope: ["globe_sp20"], requiresAttestation: true, exactModel: "SP20" },
  "corpus:hobart-hl200": { method: "manually_verified_excerpt", claimScope: ["hobart_hl200"], requiresAttestation: true, exactModel: "HL200" },
  "corpus:osha-restaurant-young-workers": { method: "manually_verified_excerpt", claimScope: ["osha_restaurant"], requiresAttestation: true },
  "corpus:fda-seafood-raw": { method: "manually_verified_excerpt", claimScope: ["seafood_safety"], requiresAttestation: true },
  "corpus:fda-egg-safety": { method: "manually_verified_excerpt", claimScope: ["egg_safety"], requiresAttestation: true },
  "corpus:nih-ods-orientation": { method: "metadata_only", claimScope: [], requiresAttestation: false },
  "corpus:thermapen-one-pdf-manual": { method: "metadata_only", claimScope: [], requiresAttestation: false, exactModel: "Thermapen ONE" },
  "corpus:stale-cold-hold-45f": { method: "test_fixture", claimScope: ["cold_hold_stale"], requiresAttestation: false },
};

export function provenanceFor(id: string): ProvenanceRecord {
  return STAGE11_PROVENANCE[id] ?? { method: "metadata_only", claimScope: [], requiresAttestation: false };
}

export function claimTagsForQuestion(question: string) {
  const text = question.toLowerCase();
  const tags: string[] = [];
  if (/ground beef|hamburger/.test(text)) tags.push("ground_beef_temp");
  if (/thaw|defrost|counter/.test(text)) tags.push("thawing");
  if (/cool|leftover|danger zone/.test(text)) tags.push("leftover_time", "tcs_cooling", "danger_zone");
  if (/allergen|cross-contact/.test(text)) tags.push("allergens", "cross_contact");
  if (/sanitiz|cleaning vs/.test(text)) tags.push("cleaning_sanitizing");
  if (/iddsi level 5/.test(text)) tags.push("iddsi_level_5");
  if (/iddsi level 4/.test(text)) tags.push("iddsi_level_4");
  if (/sarasota/.test(text)) tags.push("sarasota_county");
  else if (/florida|dbpr|cottage/.test(text)) tags.push("florida_dbpr", "florida_cottage_food", "florida_sales_tax");
  if (/thermapen/.test(text)) tags.push("thermapen_one_spec");
  if (/food cost|edible.?portion|scale/.test(text)) tags.push("food_cost", "ep_yield", "recipe_scaling");
  if (/mirepoix/.test(text)) tags.push("practice_mirepoix");
  if (/cold.?hold|hot.?hold|tcs food|135|41/.test(text)) tags.push("hot_hold", "cold_hold", "tcs_cooling");
  return [...new Set(tags)];
}
