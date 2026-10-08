import { readFile } from "node:fs/promises";
import { runAssistant } from "../../app/lib/ai/assistant-service.ts";
import { getChefGringoAiConfig } from "../../app/lib/ai/chefGringoRuntime.ts";

const benchmark = JSON.parse(await readFile(new URL("../../tests/fixtures/intelligence-benchmark-v1.json", import.meta.url), "utf8"));

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const domain = argValue("--domain");
const limitRaw = argValue("--limit");
const limit = limitRaw ? Number(limitRaw) : null;
const allowLocalOllama = process.argv.includes("--allow-local-ollama");
const selected = benchmark.cases
  .filter((c) => !domain || c.domain === domain)
  .slice(0, Number.isFinite(limit) && limit > 0 ? limit : undefined);

function requestOf(c) {
  return {
    question: c.question,
    conversation: [],
    photo: c.domain === "vision_required"
      ? { name: "benchmark-photo.jpg", mimeType: "image/jpeg", sizeBytes: 1000 }
      : null,
    location: null,
    budget: null,
    operatingContext: null,
    dietaryContext: null,
    source: "benchmark-live",
  };
}

function includesAny(text, needles = []) {
  const lower = text.toLowerCase();
  return needles.length === 0 || needles.some((needle) => lower.includes(String(needle).toLowerCase()));
}

function excludesAll(text, needles = []) {
  const lower = text.toLowerCase();
  return needles.every((needle) => !lower.includes(String(needle).toLowerCase()));
}

const config = getChefGringoAiConfig();

async function preflightRuntime() {
  if (!config) {
    return {
      ok: false,
      reason: "No Chef Gringo AI runtime is configured.",
      model: null,
      source: null,
    };
  }

  if (config.source === "local_ollama" && !allowLocalOllama) {
    return {
      ok: false,
      reason: "Live quality benchmarking requires an explicitly configured CHEF_GRINGO_AI_BASE_URL and CHEF_GRINGO_AI_MODEL. Local Ollama is development-only unless --allow-local-ollama is passed intentionally.",
      model: config.model,
      source: config.source,
    };
  }

  if (config.source === "local_ollama") {
    try {
      const response = await fetch(`${config.baseUrl}/models`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) {
        return {
          ok: false,
          reason: `Local Ollama responded with HTTP ${response.status}.`,
          model: config.model,
          source: config.source,
        };
      }
    } catch {
      return {
        ok: false,
        reason: "Local Ollama is not reachable at 127.0.0.1:11434.",
        model: config.model,
        source: config.source,
      };
    }
  }

  const undersized = /(?:^|[:_-])1b(?:$|[:_-])/i.test(config.model);
  return {
    ok: true,
    reason: undersized
      ? "Runtime is reachable, but this 1B-class model is a plumbing smoke target only."
      : "Runtime is reachable.",
    model: config.model,
    source: config.source,
    qualityWarning: undersized,
  };
}

const preflight = await preflightRuntime();
if (!preflight.ok) {
  process.stdout.write(JSON.stringify({
    benchmarkVersion: benchmark.version,
    mode: "live",
    aborted: true,
    runtime: preflight,
    caseCount: 0,
    pass: 0,
    fail: 0,
    note: "No answer-quality score was produced because the AI runtime was unavailable.",
  }, null, 2) + "\n");
  process.exit(2);
}

const rows = [];

for (const c of selected) {
  const started = Date.now();
  const response = await runAssistant(requestOf(c));
  const combined = [response.answer, response.explanation, response.clarifyingQuestion]
    .filter(Boolean)
    .join("\n");
  const row = {
    id: c.id,
    domain: c.domain,
    question: c.question,
    expectedIntent: c.expectedIntent,
    actualIntent: response.intent,
    expectedStatus: c.expectedStatus,
    actualStatus: response.status,
    intentPass: (c.acceptableIntents ?? [c.expectedIntent]).includes(response.intent),
    statusPass: response.status === c.expectedStatus,
    includePass: includesAny(combined, c.mustIncludeAny),
    excludePass: excludesAll(combined, c.mustNotInclude),
    safetyCritical: Boolean(c.safetyCritical),
    confidence: response.confidence,
    researchCapability: response.researchCapability,
    sourceCount: response.sourcesUsed?.length ?? 0,
    commercialShown: Boolean(response.commercial?.routes?.length),
    durationMs: Date.now() - started,
    errorCode: response.error?.code ?? null,
    answer: response.answer,
    clarifyingQuestion: response.clarifyingQuestion ?? null,
  };
  row.pass = row.intentPass && row.statusPass && row.includePass && row.excludePass && response.status !== "error";
  rows.push(row);
}

const byDomain = Object.values(rows.reduce((acc, row) => {
  const bucket = acc[row.domain] ??= { domain: row.domain, total: 0, pass: 0, fail: 0, safetyFailures: 0 };
  bucket.total += 1;
  if (row.pass) bucket.pass += 1; else bucket.fail += 1;
  if (row.safetyCritical && !row.pass) bucket.safetyFailures += 1;
  return acc;
}, {}));

const failed = rows.filter((row) => !row.pass);
const result = {
  benchmarkVersion: benchmark.version,
  mode: "live",
  runtime: { configured: true, model: config.model, source: config.source, qualityWarning: Boolean(preflight.qualityWarning), note: preflight.reason },
  caseCount: rows.length,
  pass: rows.length - failed.length,
  fail: failed.length,
  safetyCriticalFailures: failed.filter((row) => row.safetyCritical).length,
  byDomain,
  failures: failed,
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
