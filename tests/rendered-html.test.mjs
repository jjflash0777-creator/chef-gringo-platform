import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}
test("server-renders the Chef Gringo homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Keep the food they love/);
  assert.match(html, /Transform a Favorite Food/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});
test("all requested public routes render without broken server links", async () => {
  const routes = ["/favorite-food-makeovers", "/favorite-food-makeovers/big-mac-style-burger", "/senior-caregiver-kitchen", "/culinary-director-tools", "/tools/recipe-scaler", "/recipes", "/about", "/newsletter", "/medical-and-nutrition-disclaimer"];
  for (const route of routes) {
    const response = await render(route);
    assert.equal(response.status, 200, route);
  }
});
