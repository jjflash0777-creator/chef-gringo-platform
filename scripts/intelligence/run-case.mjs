import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateDecisionCase } from "../../app/marketplace/intelligence/decision-case-service.ts";
import { validateDecisionCaseInput } from "../../app/marketplace/intelligence/case-input-validation.ts";

function fail(errors) {
  process.stderr.write(`${JSON.stringify({ ok: false, errors }, null, 2)}\n`);
  process.exitCode = 1;
}

const inputPath = process.argv[2];
if (!inputPath || process.argv.length !== 3) {
  fail([{ path: "$", message: "Usage: npm run intelligence:case -- ./path/to/case.json" }]);
} else {
  try {
    const source = await readFile(resolve(inputPath), "utf8");
    let parsed;
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      fail([{ path: "$", message: `Malformed JSON: ${error instanceof Error ? error.message : String(error)}` }]);
    }
    if (parsed !== undefined) {
      const validated = validateDecisionCaseInput(parsed);
      if (!validated.ok) fail(validated.errors);
      else process.stdout.write(`${JSON.stringify({ ok: true, result: evaluateDecisionCase(validated.value) }, null, 2)}\n`);
    }
  } catch (error) {
    fail([{ path: inputPath, message: error instanceof Error ? error.message : String(error) }]);
  }
}
