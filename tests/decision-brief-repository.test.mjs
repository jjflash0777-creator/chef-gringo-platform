import assert from "node:assert/strict";
import test from "node:test";
import {
  createDecisionBriefRequest,
  DECISION_BRIEF_POLICY_VERSION,
  listDecisionBriefRequests,
  markDecisionBriefPaid,
  validateDecisionBriefInput,
} from "../db/decision-brief-repository.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const input = (overrides = {}) => ({ email: "Operator@Example.com", firstName: "Casey", equipmentType: "Reach-in cooler", problemSummary: "The cabinet is holding at 49°F and the condenser is not starting.", urgency: "urgent", marketingConsent: false, policyVersion: DECISION_BRIEF_POLICY_VERSION, ...overrides });

async function database() { const db = new SqliteD1Adapter(); await applyMigrations(db); return db; }

test("decision brief intake validates, normalizes, and starts unpaid", async () => {
  const db = await database();
  try {
    const brief = await createDecisionBriefRequest(db, input());
    assert.match(brief.id, /^brief_[a-f0-9]{32}$/);
    assert.equal(brief.email, "operator@example.com");
    assert.equal(brief.status, "awaiting_payment");
    assert.equal(brief.amountCents, 9900);
    assert.equal(brief.currency, "USD");
    assert.equal(brief.marketingConsent, false);
  } finally { db.close(); }
});

test("decision brief intake rejects weak or stale submissions", () => {
  assert.throws(() => validateDecisionBriefInput(input({ email: "bad" })), /valid email/);
  assert.throws(() => validateDecisionBriefInput(input({ problemSummary: "broken" })), /20 characters/);
  assert.throws(() => validateDecisionBriefInput(input({ policyVersion: "old" })), /current service terms/);
});

test("only a matching verified payment transition can mark a request paid", async () => {
  const db = await database();
  try {
    const brief = await createDecisionBriefRequest(db, input());
    await assert.rejects(() => markDecisionBriefPaid(db, { caseId: brief.id, checkoutSessionId: "cs_test_bad", paymentIntentId: null, amountTotal: 9800, currency: "usd", paidAt: new Date().toISOString() }), /amount or currency/);
    const paid = await markDecisionBriefPaid(db, { caseId: brief.id, checkoutSessionId: "cs_test_good", paymentIntentId: "pi_test_good", amountTotal: 9900, currency: "usd", paidAt: "2026-08-17T00:00:00.000Z" });
    assert.equal(paid.status, "paid");
    assert.equal(paid.stripeCheckoutSessionId, "cs_test_good");
    assert.equal((await listDecisionBriefRequests(db))[0].status, "paid");
  } finally { db.close(); }
});
