import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";

class PreparedStatementAdapter {
  constructor(database, query, values = []) {
    this.database = database;
    this.query = query;
    this.values = values;
  }

  bind(...values) {
    return new PreparedStatementAdapter(this.database, this.query, values);
  }

  async first() {
    return this.database.prepare(this.query).get(...this.values) || null;
  }

  async all() {
    return { results: this.database.prepare(this.query).all(...this.values), success: true };
  }

  async raw() {
    return this.database.prepare(this.query).all(...this.values).map((row) => Object.values(row));
  }

  async run() {
    const statement = this.database.prepare(this.query);
    if (/\bRETURNING\b/i.test(this.query)) return { results: statement.all(...this.values), success: true };
    const result = statement.run(...this.values);
    return { results: [], success: true, meta: { changes: result.changes, lastRowId: result.lastInsertRowid } };
  }
}

export class SqliteD1Adapter {
  constructor(path = ":memory:") {
    this.path = path;
    this.database = new DatabaseSync(path);
    this.database.exec("PRAGMA foreign_keys = ON");
  }

  prepare(query) {
    return new PreparedStatementAdapter(this.database, query);
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}

export async function applyMigrations(adapter, migrationPaths = [
  new URL("../../drizzle/0000_wide_white_tiger.sql", import.meta.url),
  new URL("../../drizzle/0001_early_punisher.sql", import.meta.url),
  new URL("../../drizzle/0002_seed_iddsi_pilot.sql", import.meta.url),
  new URL("../../drizzle/0003_validate_iddsi_pilot_evidence.sql", import.meta.url),
  new URL("../../drizzle/0004_warm_naoko.sql", import.meta.url),
  new URL("../../drizzle/0005_black_ikaris.sql", import.meta.url),
  new URL("../../drizzle/0006_corpus_governance.sql", import.meta.url),
  new URL("../../drizzle/0007_corpus_preview_readiness.sql", import.meta.url),
  new URL("../../drizzle/0008_social_growth_operator.sql", import.meta.url),
  new URL("../../drizzle/0009_social_publications.sql", import.meta.url),
  new URL("../../drizzle/0010_social_publication_hardening.sql", import.meta.url),
]) {
  for (const path of migrationPaths) {
    const sql = await readFile(path, "utf8");
    for (const statement of sql.split("--> statement-breakpoint").map((value) => value.trim()).filter(Boolean)) {
      try {
        adapter.database.exec(statement);
      } catch (error) {
        if (!/already exists|duplicate column name/i.test(String(error))) throw error;
      }
    }
  }
}
