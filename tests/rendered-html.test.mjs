import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  LOOPS_CONTACTS_UPDATE_ENDPOINT,
  LOOPS_PROVIDER_METHOD,
  toLoopsContact,
} from "../app/lib/engagement/loopsAdapter.ts";
import { interestOptions, POLICY_VERSION, validateWaitlist } from "../app/lib/waitlist.mjs";

const validWaitlist = {
  firstName: "Ana",
  email: "ana@example.com",
  role: "Barista",
  interest: interestOptions[5],
  consentMarketing: "true",
};

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

test("waitlist validates every required field including consent", () => {
  const errors = validateWaitlist({});
  assert.deepEqual(Object.keys(errors).sort(), ["consentMarketing", "email", "firstName", "interest", "role"]);
  assert.equal(errors.consentMarketing, "Agree to receive early-access updates before joining.");
  assert.deepEqual(validateWaitlist(validWaitlist), {});
});

test("loops adapter maps waitlist contact fields to Loops payload shape", () => {
  const payload = toLoopsContact({
    firstName: " Ana ",
    email: " ANA@Example.com ",
    role: " Line cook ",
    interest: interestOptions[0],
    policyVersion: POLICY_VERSION,
  });
  assert.deepEqual(payload, {
    email: "ana@example.com",
    firstName: "Ana",
    subscribed: true,
    source: "chef-gringo-foundation-sprint-01",
    role: "Line cook",
    interest: interestOptions[0],
    consentMarketing: true,
    policyVersion: POLICY_VERSION,
  });
});

test("waitlist endpoint exposes honest validation and unconfigured error states", async () => {
  const { POST } = await import("../app/api/early-access/route.ts");
  const invalid = await POST(new Request("http://localhost/api/early-access", { method: "POST", body: JSON.stringify({}) }));
  assert.equal(invalid.status, 400);
  const unavailable = await POST(new Request("http://localhost/api/early-access", {
    method: "POST",
    body: JSON.stringify(validWaitlist),
  }));
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).message, /not connected/i);
});

test("waitlist endpoint uses Loops update-or-create request shape", async () => {
  const originalFetch = globalThis.fetch;
  const originalEndpoint = process.env.EARLY_ACCESS_ENDPOINT;
  const originalToken = process.env.EARLY_ACCESS_TOKEN;

  process.env.EARLY_ACCESS_ENDPOINT = LOOPS_CONTACTS_UPDATE_ENDPOINT;
  process.env.EARLY_ACCESS_TOKEN = "test-loops-key";

  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), LOOPS_CONTACTS_UPDATE_ENDPOINT);
      assert.equal(init?.method, LOOPS_PROVIDER_METHOD);
      assert.match(String(init?.headers?.authorization), /Bearer test-loops-key/);
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body, toLoopsContact({
        firstName: validWaitlist.firstName,
        email: validWaitlist.email,
        role: validWaitlist.role,
        interest: validWaitlist.interest,
        policyVersion: POLICY_VERSION,
      }));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    const { POST } = await import("../app/api/early-access/route.ts");
    const success = await POST(new Request("http://localhost/api/early-access", {
      method: "POST",
      body: JSON.stringify(validWaitlist),
    }));
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEndpoint === undefined) delete process.env.EARLY_ACCESS_ENDPOINT;
    else process.env.EARLY_ACCESS_ENDPOINT = originalEndpoint;
    if (originalToken === undefined) delete process.env.EARLY_ACCESS_TOKEN;
    else process.env.EARLY_ACCESS_TOKEN = originalToken;
  }
});

test("waitlist endpoint forwards Loops payload and handles provider outcomes", async () => {
  const originalFetch = globalThis.fetch;
  const originalEndpoint = process.env.EARLY_ACCESS_ENDPOINT;
  const originalToken = process.env.EARLY_ACCESS_TOKEN;
  const originalNodeEnv = process.env.NODE_ENV;

  process.env.EARLY_ACCESS_ENDPOINT = LOOPS_CONTACTS_UPDATE_ENDPOINT;
  process.env.EARLY_ACCESS_TOKEN = "test-loops-key";
  process.env.NODE_ENV = "production";

  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(String(url), LOOPS_CONTACTS_UPDATE_ENDPOINT);
      assert.equal(init?.method, LOOPS_PROVIDER_METHOD);
      assert.match(String(init?.headers?.authorization), /Bearer test-loops-key/);
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body, toLoopsContact({
        firstName: validWaitlist.firstName,
        email: validWaitlist.email,
        role: validWaitlist.role,
        interest: validWaitlist.interest,
        policyVersion: POLICY_VERSION,
      }));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    const { POST } = await import("../app/api/early-access/route.ts");
    const success = await POST(new Request("http://localhost/api/early-access", {
      method: "POST",
      body: JSON.stringify(validWaitlist),
    }));
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), { ok: true });

    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });
    const failure = await POST(new Request("http://localhost/api/early-access", {
      method: "POST",
      body: JSON.stringify(validWaitlist),
    }));
    assert.equal(failure.status, 502);
    assert.match((await failure.json()).message, /couldn’t complete signup/i);

    process.env.EARLY_ACCESS_ENDPOINT = "https://app.loops.so/api/v1/contacts/create";
    const blocked = await POST(new Request("http://localhost/api/early-access", {
      method: "POST",
      body: JSON.stringify(validWaitlist),
    }));
    assert.equal(blocked.status, 502);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEndpoint === undefined) delete process.env.EARLY_ACCESS_ENDPOINT;
    else process.env.EARLY_ACCESS_ENDPOINT = originalEndpoint;
    if (originalToken === undefined) delete process.env.EARLY_ACCESS_TOKEN;
    else process.env.EARLY_ACCESS_TOKEN = originalToken;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test("success, error, analytics, and responsive navigation states are implemented", async () => {
  const [form, analytics, css] = await Promise.all([
    readFile(new URL("../app/components/WaitlistForm.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AnalyticsBridge.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(form, /setStatus\("success"\)/);
  assert.match(form, /setStatus\("error"\)/);
  assert.match(form, /early_access_submitted/);
  assert.match(form, /consentMarketing/);
  assert.match(form, /You’re on the early-access list\. We’ll keep the emails useful\./);
  assert.doesNotMatch(form, /check your inbox|confirm your email|confirmation email/i);
  assert.match(form, /waitlist_failed/);
  assert.match(analytics, /typeof window === "undefined"/);
  assert.match(css, /@media \(max-width:700px\)[\s\S]*nav \{[\s\S]*flex-wrap:wrap/);
  assert.doesNotMatch(css, /nav\s*\{\s*display:none/);
});
