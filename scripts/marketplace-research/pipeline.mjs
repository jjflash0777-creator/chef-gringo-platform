export const AGENTS = Object.freeze([
  "marketplace-director",
  "product-scout",
  "product-evidence-researcher",
  "commercial-kitchen-expert",
  "senior-living-specialist",
  "price-merchant-researcher",
  "affiliate-researcher",
  "editorial-agent",
  "catalog-qa-agent",
]);

export const DEFAULT_BUDGET = Object.freeze({
  maxCandidates: 40,
  maxSourcesPerCandidate: 4,
  maxModelCalls: 80,
  maxExpensiveModelCalls: 18,
  maxRetries: 2,
  timeoutMs: 120_000,
});

export function modelForTask(task, env = process.env) {
  const higherReasoning = new Set(["comparison", "operator-analysis", "adaptive-context", "final-editorial", "qa-dispute"]);
  const tier = higherReasoning.has(task) ? "reasoning" : "economy";
  return {
    tier,
    provider: env.MARKETPLACE_MODEL_PROVIDER || (env.OLLAMA_BASE_URL ? "ollama" : "manual-review"),
    model: tier === "reasoning" ? env.MARKETPLACE_REASONING_MODEL || null : env.MARKETPLACE_ECONOMY_MODEL || null,
  };
}

export function recommendationScore(scores) {
  const editorial = { ...scores };
  delete editorial.affiliateCommission;
  const values = Object.values(editorial).filter((value) => Number.isFinite(value));
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function qaProduct(product) {
  const failures = [];
  if (!product.id || !product.name || !product.model) failures.push("identity-incomplete");
  if (!product.workflowId) failures.push("workflow-missing");
  if (!product.evidence?.length) failures.push("evidence-missing");
  if (!product.evidence?.some((source) => source.type === "manufacturer") && product.evidenceStrength !== "moderate") failures.push("primary-source-missing");
  if (!product.merchants?.length) failures.push("merchant-missing");
  if (!product.editorial?.bestFor || !product.editorial?.why || !product.editorial?.tradeoff) failures.push("editorial-incomplete");
  if (!product.image?.referenceUrl) failures.push("image-provenance-missing");
  if (Object.hasOwn(product.scores || {}, "affiliateCommission")) failures.push("affiliate-score-contamination");
  return failures;
}

export function runHarvest(catalog, budget = DEFAULT_BUDGET) {
  const started = Date.now();
  const candidates = catalog.products.slice(0, budget.maxCandidates);
  const seen = new Set();
  const rejected = [];
  const published = [];
  for (const product of candidates) {
    if (Date.now() - started > budget.timeoutMs) break;
    const duplicateKey = `${product.manufacturer}|${product.model}`.toLowerCase();
    const failures = qaProduct(product);
    if (seen.has(duplicateKey)) failures.push("duplicate-product");
    seen.add(duplicateKey);
    if (failures.length) rejected.push({ id: product.id, failures });
    else published.push({ ...product, recommendationScore: recommendationScore(product.scores) });
  }
  return {
    harvestId: catalog.harvest.id,
    agents: AGENTS,
    budget,
    candidates: candidates.length,
    rejected,
    published,
    stoppedBecause: candidates.length >= budget.maxCandidates && catalog.products.length > budget.maxCandidates ? "candidate-budget" : null,
  };
}
