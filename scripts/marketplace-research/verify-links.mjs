import { marketplaceCatalog } from "../../app/marketplace/catalog.ts";

const urls = [...new Set(marketplaceCatalog.products.flatMap((item) => [
  ...item.evidence.map((source) => source.url),
  ...item.merchants.map((merchant) => merchant.url),
  item.image.referenceUrl,
]))];

const results = [];
for (const url of urls) {
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(12_000), headers: { "user-agent": "ChefGringo-CatalogQA/1.0" } });
    results.push({ url, status: response.status, ok: response.status < 400 || response.status === 403 || response.status === 429 });
  } catch (error) {
    results.push({ url, status: 0, ok: null, error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify(results, null, 2));
if (results.some((item) => item.ok === false)) process.exitCode = 1;
