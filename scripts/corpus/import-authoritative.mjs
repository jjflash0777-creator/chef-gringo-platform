import { SqliteD1Adapter, applyMigrations } from "../../tests/helpers/sqlite-d1.mjs";
import { importAuthoritativeCorpus } from "../../app/lib/research/corpus-import.ts";

async function main() {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  const first = await importAuthoritativeCorpus(db);
  const second = await importAuthoritativeCorpus(db);
  console.log(JSON.stringify({ first, second, note: "In-memory D1 only. Does not write production. Cloudflare was not contacted." }, null, 2));
  db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
