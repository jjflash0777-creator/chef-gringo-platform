import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { interestOptions, validateWaitlist } from "../app/lib/waitlist.mjs";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("landing page renders its positioning and major CTAs", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Build Your Future in Hospitality/);
  assert.match(html, /Join Early Access/);
  assert.match(html, /Explore the Vision/);
  assert.match(html, /Learn[\s\S]*Work[\s\S]*Lead[\s\S]*Build/);
});

test("all launch navigation routes render and internal links resolve", async () => {
  for (const route of ["/", "/discover", "/knowledge/dishes/carbonara", "/about", "/vision", "/early-access", "/privacy", "/terms"]) {
    const response = await render(route);
    assert.equal(response.status, 200, route);
  }
  const html = await (await render()).text();
  const hrefs = [...html.matchAll(/href="(\/[^"#?]*)"/g)]
    .map((match) => match[1])
    .filter((href) => !href.startsWith("/assets/"));
  for (const href of new Set(hrefs)) {
    const response = await render(href);
    assert.equal(response.status, 200, `broken internal link: ${href}`);
  }
});

test("knowledge routes expose discovery and Carbonara content", async () => {
  const discover = await (await render("/discover")).text();
  assert.match(discover, /What do you want to understand/);
  const carbonara = await (await render("/knowledge/dishes/carbonara")).text();
  assert.match(carbonara, /Original Chef Gringo reference recipe/);
  assert.match(carbonara, /Beginner[\s\S]*Home Cook[\s\S]*Professional/);
  assert.match(carbonara, /Knowledge boundary/);
});

test("waitlist validates every required field", () => {
  const errors = validateWaitlist({});
  assert.deepEqual(Object.keys(errors).sort(), ["email", "firstName", "interest", "role"]);
  assert.deepEqual(validateWaitlist({ firstName: "Ana", email: "ana@example.com", role: "Barista", interest: interestOptions[5] }), {});
});

test("waitlist endpoint exposes honest validation and unconfigured error states", async () => {
  const { POST } = await import("../app/api/early-access/route.ts");
  const invalid = await POST(new Request("http://localhost/api/early-access", { method: "POST", body: JSON.stringify({}) }));
  assert.equal(invalid.status, 400);
  const unavailable = await POST(new Request("http://localhost/api/early-access", {
    method: "POST",
    body: JSON.stringify({ firstName: "Ana", email: "ana@example.com", role: "Barista", interest: interestOptions[5] }),
  }));
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).message, /not connected/i);
});

test("success, error, analytics, and responsive navigation states are implemented", async () => {
  const [form, analytics, css] = await Promise.all([
    readFile(new URL("../app/components/WaitlistForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AnalyticsBridge.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(form, /setStatus\("success"\)/);
  assert.match(form, /setStatus\("error"\)/);
  assert.match(form, /waitlist_submitted/);
  assert.match(form, /waitlist_failed/);
  assert.match(analytics, /typeof window === "undefined"/);
  assert.match(css, /@media \(max-width:700px\)[\s\S]*nav \{[\s\S]*flex-wrap:wrap/);
  assert.doesNotMatch(css, /nav\s*\{\s*display:none/);
});
