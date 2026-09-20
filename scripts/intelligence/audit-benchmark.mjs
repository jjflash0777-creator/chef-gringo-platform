import { readFile } from "node:fs/promises";
import { classifyIntent } from "../../app/lib/ai/assistant-intents.ts";
import { clarificationFor } from "../../app/lib/ai/assistant-clarification.ts";

const benchmark = JSON.parse(await readFile(new URL("../../tests/fixtures/intelligence-benchmark-v1.json", import.meta.url), "utf8"));

function requestOf(c) {
  return { question: c.question, conversation: [], photo: null, location: null, budget: null, operatingContext: null, dietaryContext: null, source: "benchmark" };
}

const rows = benchmark.cases.map((c) => {
  const request = requestOf(c);
  const actualIntent = classifyIntent(request);
  const clarification = clarificationFor(actualIntent, request);
  const actualStatus = clarification.needed ? "needs_clarification" : "answered";
  return {
    id: c.id,
    domain: c.domain,
    expectedIntent: c.expectedIntent,
    actualIntent,
    expectedStatus: c.expectedStatus,
    actualStatus,
    routingPass: actualIntent === c.expectedIntent,
    clarificationPass: actualStatus === c.expectedStatus,
    safetyCritical: Boolean(c.safetyCritical),
  };
});

const routingFailures = rows.filter((r) => !r.routingPass);
const clarificationFailures = rows.filter((r) => !r.clarificationPass);
const safetyRoutingFailures = rows.filter((r) => r.safetyCritical && !r.routingPass);

process.stdout.write(JSON.stringify({
  benchmarkVersion: benchmark.version,
  caseCount: rows.length,
  domainCount: new Set(rows.map((r) => r.domain)).size,
  routingPass: rows.length - routingFailures.length,
  routingFail: routingFailures.length,
  clarificationPass: rows.length - clarificationFailures.length,
  clarificationFail: clarificationFailures.length,
  safetyRoutingFail: safetyRoutingFailures.length,
  routingFailures,
  clarificationFailures,
}, null, 2) + "\n");
