import assert from "node:assert/strict";
import test from "node:test";
import { DECISION_BRIEF_POLICY_VERSION, getDecisionBriefRequest } from "../db/decision-brief-repository.ts";
import { stripeSignatureForTest } from "../app/lib/payments/stripeWebhook.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

async function withDatabase(run) {
  const db = new SqliteD1Adapter(); await applyMigrations(db);
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db };
  try { await run(db); } finally { delete globalThis.__CHEF_GRINGO_ENV__; db.close(); }
}

test("intake returns a case-bound sandbox checkout without subscribing by default", { concurrency: false }, async () => withDatabase(async (db) => {
  process.env.DECISION_BRIEF_CHECKOUT_URL = "https://buy.stripe.com/test_eVq6oHbMI9gLfSrdTSdMI00";
  delete process.env.EARLY_ACCESS_TOKEN; delete process.env.EMAIL_SUBSCRIBE_TOKEN;
  const route = await import("../app/api/decision-briefs/route.ts");
  const response = await route.POST(new Request("http://localhost/api/decision-briefs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "buyer@example.com", firstName: "Buyer", equipmentType: "Fryer", problemSummary: "The fryer will not maintain temperature during service.", urgency: "soon", marketingConsent: false }) }));
  assert.equal(response.status, 201);
  const result = await response.json();
  const checkout = new URL(result.checkoutUrl);
  assert.equal(checkout.hostname, "buy.stripe.com");
  assert.equal(checkout.searchParams.get("client_reference_id"), result.caseId);
  assert.equal(checkout.searchParams.get("prefilled_email"), "buyer@example.com");
  assert.equal((await getDecisionBriefRequest(db, result.caseId)).status, "awaiting_payment");
}));

test("signed Stripe completion marks the exact $99 case paid and rejects tampering", { concurrency: false }, async () => withDatabase(async (db) => {
  process.env.DECISION_BRIEF_CHECKOUT_URL = "https://buy.stripe.com/test_eVq6oHbMI9gLfSrdTSdMI00";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  const intake = await import("../app/api/decision-briefs/route.ts");
  const intakeResponse = await intake.POST(new Request("http://localhost/api/decision-briefs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "paid@example.com", firstName: "Paid", equipmentType: "Prep table", problemSummary: "The prep table compressor is short cycling and warming during service.", urgency: "urgent", marketingConsent: false, policyVersion: DECISION_BRIEF_POLICY_VERSION }) }));
  const { caseId } = await intakeResponse.json();
  const created = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ id: "evt_test_paid", type: "checkout.session.completed", created, data: { object: { id: "cs_test_paid", client_reference_id: caseId, payment_status: "paid", amount_total: 9900, currency: "usd", payment_intent: "pi_test_paid" } } });
  const signature = await stripeSignatureForTest(process.env.STRIPE_WEBHOOK_SECRET, created, body);
  const webhook = await import("../app/api/payment-webhooks/stripe/route.ts");
  const rejected = await webhook.POST(new Request("http://localhost/api/payment-webhooks/stripe", { method: "POST", headers: { "stripe-signature": `t=${created},v1=bad` }, body }));
  assert.equal(rejected.status, 400);
  assert.equal((await getDecisionBriefRequest(db, caseId)).status, "awaiting_payment");
  const accepted = await webhook.POST(new Request("http://localhost/api/payment-webhooks/stripe", { method: "POST", headers: { "stripe-signature": `t=${created},v1=${signature}` }, body }));
  assert.equal(accepted.status, 200);
  assert.equal((await getDecisionBriefRequest(db, caseId)).status, "paid");
}));

test("decision brief pages remain no-index and founder queue remains protected", async () => {
  const { readFile } = await import("node:fs/promises");
  const files = await Promise.all(["../app/services/repair-or-replace/page.tsx", "../app/services/repair-or-replace/confirmation/page.tsx", "../app/admin/revenue/decision-briefs/page.tsx"].map((path) => readFile(new URL(path, import.meta.url), "utf8")));
  files.forEach((source) => assert.match(source, /index: false/));
  assert.match(files[2], /requireMarketplaceAdministrator/);
  assert.match(files[1], /does not prove payment|confirms the redirect—not payment/);
});
