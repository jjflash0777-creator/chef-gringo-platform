import { marketplaceCatalog } from "../../app/marketplace/catalog.ts";
import { DEFAULT_BUDGET, runHarvest } from "./pipeline.mjs";

const result = runHarvest(marketplaceCatalog, DEFAULT_BUDGET);

console.log(JSON.stringify({
  harvestId: result.harvestId,
  agents: result.agents,
  candidates: result.candidates,
  rejected: result.rejected,
  published: result.published.map(({ id, recommendationScore }) => ({ id, recommendationScore })),
  stoppedBecause: result.stoppedBecause,
}, null, 2));

if (result.rejected.length || result.published.length !== marketplaceCatalog.products.length) {
  process.exitCode = 1;
}
