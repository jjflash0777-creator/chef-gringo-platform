import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SqliteD1Adapter, applyMigrations } from "../../tests/helpers/sqlite-d1.mjs";
import { assertTargetAllowsWrite, importAuthoritativeCorpus, requireCorpusTarget } from "../../app/lib/research/corpus-import.ts";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const next = process.argv[index + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
}

async function main() {
  const target = requireCorpusTarget(typeof arg("--target") === "string" ? arg("--target") : undefined);
  const dryRun = Boolean(arg("--dry-run"));
  const attestExcerpts = Boolean(arg("--attest-excerpts"));
  const reviewer = typeof arg("--reviewer") === "string" ? arg("--reviewer") : process.env.CHEF_GRINGO_CORPUS_REVIEWER_EMAIL;
  assertTargetAllowsWrite(target, dryRun);

  if (target === "preview" && !dryRun) {
    console.log(JSON.stringify({
      ok: false,
      target,
      note: "Preview remote execution is prepared but not run from this command unless CHEF_GRINGO_PREVIEW_D1_CONFIRM is set. No production resource is targeted. Use local durable SQLite for this stage.",
    }, null, 2));
    process.exit(0);
  }

  const dbPath = typeof arg("--db-path") === "string"
    ? resolve(String(arg("--db-path")))
    : resolve(".data/corpus-local.sqlite");
  await mkdir(dirname(dbPath), { recursive: true });
  const db = new SqliteD1Adapter(dbPath);
  await applyMigrations(db);
  const result = await importAuthoritativeCorpus(db, undefined, {
    target,
    dryRun,
    attestExcerpts,
    reviewerEmail: typeof reviewer === "string" ? reviewer : undefined,
  });
  console.log(JSON.stringify({ ...result, dbPath: dryRun ? null : dbPath, secretsPrinted: false }, null, 2));
  db.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
