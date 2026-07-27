import assert from "node:assert/strict";
import test from "node:test";
import { SqliteD1Adapter, applyMigrations } from "./helpers/sqlite-d1.mjs";

const route = await import("../app/api/marketplace/workflows/[id]/route.ts");

function request(email, body) {
  const headers = { "content-type": "application/json" };
  if (email) headers["oai-authenticated-user-email"] = email;
  return new Request("http://localhost/api/marketplace/workflows/iddsi-level-4-pureed-meals-senior-living", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

test("workflow API rejects unauthenticated and unauthorized writes and accepts authorized editors", async () => {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db };
  process.env.CHEF_GRINGO_EDITOR_EMAILS = "editor@example.com:editor";
  const context = { params: Promise.resolve({ id: "iddsi-level-4-pureed-meals-senior-living" }) };

  const unauthenticated = await route.PATCH(request(null, { workflow: { summary: "No" }, reason: "No" }), context);
  assert.equal(unauthenticated.status, 401);
  const unauthorized = await route.PATCH(request("viewer@example.com", { workflow: { summary: "No" }, reason: "No" }), context);
  assert.equal(unauthorized.status, 403);
  const authorized = await route.PATCH(request("editor@example.com", { workflow: { summary: "Authorized revision" }, reason: "Test authorization boundary" }), context);
  assert.equal(authorized.status, 200);
  const body = await authorized.json();
  assert.equal(body.workflow.summary, "Authorized revision");
  assert.ok(body.history.some((event) => event.action === "workflow_updated"));

  delete globalThis.__CHEF_GRINGO_ENV__;
  delete process.env.CHEF_GRINGO_EDITOR_EMAILS;
  db.close();
});
