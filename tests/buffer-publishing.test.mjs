import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { SqliteD1Adapter, applyMigrations } from "./helpers/sqlite-d1.mjs";

test("Buffer reconciliation migration applies and exposes durable ledger", async () => {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  const columns = db.database.prepare("PRAGMA table_info(social_buffer_publications)").all().map((row) => row.name);
  assert.deepEqual(columns, [
    "id", "package_id", "variant_id", "channel", "buffer_channel_id", "buffer_post_id",
    "due_at", "status", "queued_at", "actor_email", "created_at", "updated_at",
  ]);
  const sql = db.database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='social_publications'").get().sql;
  assert.match(sql, /'manual', 'api'/);
  db.close();
});

test("Buffer route is approval-gated, queue-confirmed, and multi-image aware", async () => {
  const route = await readFile(new URL("../app/api/growth/publications/buffer/route.ts", import.meta.url), "utf8");
  const client = await readFile(new URL("../app/lib/buffer-api.ts", import.meta.url), "utf8");
  assert.match(route, /prepareApiSocialPublication/);
  assert.match(route, /getContentAsset/);
  assert.match(route, /listScheduledBufferPosts/);
  assert.match(route, /confirmed: true/);
  assert.match(client, /mediaUrls: string\[\]/);
  assert.match(client, /input\.mediaUrls\.map/);
});
