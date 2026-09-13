import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SqliteD1Adapter, applyMigrations } from "../../tests/helpers/sqlite-d1.mjs";
import { auditCorpus, formatAudit } from "../../app/lib/research/corpus-audit.ts";
import { requireCorpusTarget } from "../../app/lib/research/corpus-import.ts";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const next = process.argv[index + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
}

async function main() {
  const target = requireCorpusTarget(typeof arg("--target") === "string" ? arg("--target") : undefined);
  const dbPath = typeof arg("--db-path") === "string" ? resolve(String(arg("--db-path"))) : resolve(".data/corpus-local.sqlite");
  await mkdir(dirname(dbPath), { recursive: true });
  const db = new SqliteD1Adapter(dbPath);
  await applyMigrations(db);
  const report = await auditCorpus(db, { target, manifestVersionExpected: true });
  const json = arg("--json");
  console.log(json ? JSON.stringify(report, null, 2) : formatAudit(report));
  db.close();
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
