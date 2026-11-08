import assert from "node:assert/strict";
import test from "node:test";
import {
  DOWNLOAD_PRODUCTS,
  formatDownloadPrice,
  getDownloadProduct,
} from "../app/lib/downloads.ts";
import {
  createDownloadToken,
  verifyDownloadToken,
} from "../app/lib/payments/downloadTokens.ts";
import {
  createStripeCheckoutSession,
  retrieveStripeCheckoutSession,
} from "../app/lib/payments/stripeCheckout.ts";
import { stripeSignatureForTest } from "../app/lib/payments/stripeWebhook.ts";
import {
  getDownloadOrderBySession,
  recordDownloadOrder,
} from "../db/download-orders-repository.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const LINK_SECRET = "test-download-link-secret";
const WEBHOOK_SECRET = "whsec_downloads_test_secret";

function clearStorefrontEnv() {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_DOWNLOADS_WEBHOOK_SECRET;
  delete process.env.DOWNLOAD_LINK_SECRET;
}

async function withDatabase(run, extraEnv = {}) {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db, ...extraEnv };
  try {
    await run(db);
  } finally {
    delete globalThis.__CHEF_GRINGO_ENV__;
    db.close();
  }
}

function fakeR2Bucket(objects) {
  return {
    async get(key) {
      const bytes = objects[key];
      if (!bytes) return null;
      return {
        body: null,
        httpMetadata: { contentType: "application/octet-stream" },
        async arrayBuffer() {
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      };
    },
    async put() {},
    async delete() {},
  };
}

test("catalog carries the four approved products at the approved prices", () => {
  assert.equal(DOWNLOAD_PRODUCTS.length, 4);
  const expected = {
    "kitchen-reference-chart-set": 3500,
    "healthcare-kitchen-starter-pack": 3900,
    "recipe-calculator": 9900,
    "foodservice-schedule-pack": 3900,
  };
  for (const [id, priceCents] of Object.entries(expected)) {
    const product = getDownloadProduct(id);
    assert.ok(product, `missing product ${id}`);
    assert.equal(product.priceCents, priceCents);
    assert.equal(product.currency, "USD");
    assert.ok(product.files.length >= 1, `${id} needs at least one delivery file`);
  }
  assert.equal(formatDownloadPrice(getDownloadProduct("recipe-calculator")), "$99");
  assert.equal(formatDownloadPrice(getDownloadProduct("kitchen-reference-chart-set")), "$35");
  const keys = DOWNLOAD_PRODUCTS.flatMap((product) => product.files.map((file) => file.r2Key));
  assert.equal(new Set(keys).size, keys.length, "R2 keys must be unique across the catalog");
  for (const key of keys) assert.ok(key.startsWith("downloads/"), `unexpected R2 key ${key}`);
});

test("download tokens round-trip and reject tampering, wrong secrets, and expiry", async () => {
  const now = 1_800_000_000;
  const token = await createDownloadToken({
    secret: LINK_SECRET,
    orderId: "order_abc",
    productId: "recipe-calculator",
    nowSeconds: now,
    ttlSeconds: 600,
  });
  const ok = await verifyDownloadToken({ secret: LINK_SECRET, token, nowSeconds: now + 60 });
  assert.equal(ok.ok, true);
  assert.equal(ok.payload.orderId, "order_abc");
  assert.equal(ok.payload.productId, "recipe-calculator");
  assert.equal(ok.payload.exp, now + 600);

  const expired = await verifyDownloadToken({ secret: LINK_SECRET, token, nowSeconds: now + 601 });
  assert.deepEqual(expired, { ok: false, reason: "expired" });

  const wrongSecret = await verifyDownloadToken({ secret: "another-secret", token, nowSeconds: now });
  assert.deepEqual(wrongSecret, { ok: false, reason: "bad-signature" });

  const [prefix, payloadPart, signaturePart] = token.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ orderId: "order_abc", productId: "foodservice-schedule-pack", exp: now + 600 })).toString("base64url");
  const forged = await verifyDownloadToken({ secret: LINK_SECRET, token: `${prefix}.${forgedPayload}.${signaturePart}`, nowSeconds: now });
  assert.deepEqual(forged, { ok: false, reason: "bad-signature" });
  assert.ok(payloadPart.length > 0);

  const malformed = await verifyDownloadToken({ secret: LINK_SECRET, token: "not-a-token", nowSeconds: now });
  assert.deepEqual(malformed, { ok: false, reason: "malformed" });
});

test("checkout route fails closed without STRIPE_SECRET_KEY and rejects unknown products", { concurrency: false }, async () => {
  clearStorefrontEnv();
  const route = await import("../app/api/downloads/checkout/route.ts");
  const status = await route.GET();
  assert.deepEqual(await status.json(), { checkoutConfigured: false, deliveryConfigured: false });

  const unconfigured = await route.POST(new Request("http://localhost/api/downloads/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: "recipe-calculator" }),
  }));
  assert.equal(unconfigured.status, 503);

  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  try {
    const unknown = await route.POST(new Request("http://localhost/api/downloads/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: "not-a-product" }),
    }));
    assert.equal(unknown.status, 400);
  } finally {
    clearStorefrontEnv();
  }
});

test("checkout session is created with inline price data from the catalog", { concurrency: false }, async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fixture";
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url: String(url), init };
    return Response.json({ id: "cs_test_fixture", url: "https://checkout.stripe.com/c/pay/cs_test_fixture" });
  };
  try {
    const route = await import("../app/api/downloads/checkout/route.ts");
    const response = await route.POST(new Request("https://chefgringo.com/api/downloads/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: "healthcare-kitchen-starter-pack" }),
    }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { url: "https://checkout.stripe.com/c/pay/cs_test_fixture" });
    assert.equal(captured.url, "https://api.stripe.com/v1/checkout/sessions");
    const params = new URLSearchParams(captured.init.body);
    assert.equal(params.get("mode"), "payment");
    assert.equal(params.get("line_items[0][price_data][unit_amount]"), "3900");
    assert.equal(params.get("line_items[0][price_data][currency]"), "usd");
    assert.equal(params.get("metadata[product_id]"), "healthcare-kitchen-starter-pack");
    assert.equal(params.get("success_url"), "https://chefgringo.com/downloads/success?session_id={CHECKOUT_SESSION_ID}");
    assert.equal(params.get("cancel_url"), "https://chefgringo.com/downloads/cancel");
    assert.match(captured.init.headers.authorization, /^Bearer sk_test_fixture$/);
  } finally {
    globalThis.fetch = originalFetch;
    clearStorefrontEnv();
  }
});

test("stripe adapter retrieves and normalizes a session; bad ids never reach the API", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return Response.json({
      id: "cs_test_retrieve",
      payment_status: "paid",
      amount_total: 9900,
      currency: "usd",
      payment_intent: "pi_test",
      metadata: { product_id: "recipe-calculator" },
      customer_details: { email: "buyer@example.com" },
    });
  };
  const session = await retrieveStripeCheckoutSession({ secretKey: "sk_test_fixture", sessionId: "cs_test_retrieve", fetchImpl });
  assert.equal(session.payment_status, "paid");
  assert.equal(session.customerEmail, "buyer@example.com");
  assert.equal(session.metadata.product_id, "recipe-calculator");
  await assert.rejects(
    () => retrieveStripeCheckoutSession({ secretKey: "sk_test_fixture", sessionId: "../admin", fetchImpl }),
    /not valid/,
  );
  assert.equal(calls, 1);

  const created = await createStripeCheckoutSession({
    secretKey: "sk_test_fixture",
    productId: "recipe-calculator",
    productName: "Recipe Calculator",
    productDescription: "Workbook",
    amountCents: 9900,
    currency: "USD",
    successUrl: "https://chefgringo.com/downloads/success?session_id={CHECKOUT_SESSION_ID}",
    cancelUrl: "https://chefgringo.com/downloads/cancel",
    fetchImpl: async () => Response.json({ id: "cs_test_created", url: "https://checkout.stripe.com/c/pay/cs_test_created" }),
  });
  assert.equal(created.id, "cs_test_created");
});

test("order recording validates against the catalog and is idempotent per session", { concurrency: false }, async () => withDatabase(async (db) => {
  const input = {
    productId: "kitchen-reference-chart-set",
    buyerEmail: "Buyer@Example.com",
    amountTotal: 3500,
    currency: "usd",
    checkoutSessionId: "cs_test_order",
    paymentIntentId: "pi_test_order",
    paidAt: "2026-11-07T12:00:00.000Z",
  };
  const first = await recordDownloadOrder(db, input);
  assert.equal(first.buyerEmail, "buyer@example.com");
  assert.equal(first.status, "paid");
  const second = await recordDownloadOrder(db, input);
  assert.equal(second.id, first.id);
  assert.equal((await getDownloadOrderBySession(db, "cs_test_order")).id, first.id);

  await assert.rejects(() => recordDownloadOrder(db, { ...input, checkoutSessionId: "cs_test_other", amountTotal: 3400 }), /does not match the catalog price/);
  await assert.rejects(() => recordDownloadOrder(db, { ...input, checkoutSessionId: "cs_test_other", productId: "nope" }), /unknown product/);
  await assert.rejects(() => recordDownloadOrder(db, { ...input, checkoutSessionId: "cs_test_other", buyerEmail: "not-an-email" }), /valid buyer email/);
}));

function signedWebhookBody(overrides = {}) {
  const created = Math.floor(Date.now() / 1000);
  const session = {
    id: "cs_test_webhook",
    client_reference_id: "kitchen-reference-chart-set",
    payment_status: "paid",
    amount_total: 3500,
    currency: "usd",
    payment_intent: "pi_test_webhook",
    metadata: { product_id: "kitchen-reference-chart-set" },
    customer_details: { email: "webhook-buyer@example.com" },
    ...overrides,
  };
  return { created, body: JSON.stringify({ id: "evt_test_download", type: "checkout.session.completed", created, data: { object: session } }) };
}

test("downloads webhook records a paid order once, and rejects tampering", { concurrency: false }, async () => withDatabase(async (db) => {
  process.env.STRIPE_DOWNLOADS_WEBHOOK_SECRET = WEBHOOK_SECRET;
  try {
    const route = await import("../app/api/downloads/webhook/route.ts");
    const { created, body } = signedWebhookBody();
    const signature = await stripeSignatureForTest(WEBHOOK_SECRET, created, body);
    const headers = { "stripe-signature": `t=${created},v1=${signature}` };

    const rejected = await route.POST(new Request("http://localhost/api/downloads/webhook", {
      method: "POST",
      headers: { "stripe-signature": `t=${created},v1=bad` },
      body,
    }));
    assert.equal(rejected.status, 400);
    assert.equal(await getDownloadOrderBySession(db, "cs_test_webhook"), null);

    const accepted = await route.POST(new Request("http://localhost/api/downloads/webhook", { method: "POST", headers, body }));
    assert.equal(accepted.status, 200);
    const order = await getDownloadOrderBySession(db, "cs_test_webhook");
    assert.equal(order.productId, "kitchen-reference-chart-set");
    assert.equal(order.buyerEmail, "webhook-buyer@example.com");
    assert.equal(order.amountTotal, 3500);

    const redelivered = await route.POST(new Request("http://localhost/api/downloads/webhook", { method: "POST", headers, body }));
    assert.equal(redelivered.status, 200);
    assert.equal((await getDownloadOrderBySession(db, "cs_test_webhook")).id, order.id);

    const wrongAmount = signedWebhookBody({ id: "cs_test_wrong_amount", amount_total: 100 });
    const wrongSignature = await stripeSignatureForTest(WEBHOOK_SECRET, wrongAmount.created, wrongAmount.body);
    const refused = await route.POST(new Request("http://localhost/api/downloads/webhook", {
      method: "POST",
      headers: { "stripe-signature": `t=${wrongAmount.created},v1=${wrongSignature}` },
      body: wrongAmount.body,
    }));
    assert.equal(refused.status, 400);
    assert.equal(await getDownloadOrderBySession(db, "cs_test_wrong_amount"), null);
  } finally {
    clearStorefrontEnv();
  }
}));

test("file delivery serves private bytes only to a valid token with a matching paid order", { concurrency: false }, async () => {
  const pdfBytes = new TextEncoder().encode("%PDF-fixture-chart-set");
  const bucket = fakeR2Bucket({
    "downloads/kitchen-reference-chart-set/kitchen-reference-chart-set.pdf": pdfBytes,
  });
  await withDatabase(async (db) => {
    process.env.DOWNLOAD_LINK_SECRET = LINK_SECRET;
    try {
      const order = await recordDownloadOrder(db, {
        productId: "kitchen-reference-chart-set",
        buyerEmail: "buyer@example.com",
        amountTotal: 3500,
        currency: "USD",
        checkoutSessionId: "cs_test_delivery",
        paymentIntentId: "pi_test_delivery",
        paidAt: "2026-11-07T12:00:00.000Z",
      });
      const route = await import("../app/api/downloads/file/route.ts");
      const token = await createDownloadToken({ secret: LINK_SECRET, orderId: order.id, productId: order.productId });
      const deliver = (query) => route.GET(new Request(`http://localhost/api/downloads/file?${query}`));

      const ok = await deliver(`token=${encodeURIComponent(token)}&file=chart-set-pdf`);
      assert.equal(ok.status, 200);
      assert.equal(ok.headers.get("content-disposition"), 'attachment; filename="kitchen-reference-chart-set.pdf"');
      assert.equal(new TextDecoder().decode(await ok.arrayBuffer()), "%PDF-fixture-chart-set");

      const wrongFile = await deliver(`token=${encodeURIComponent(token)}&file=recipe-calculator-xlsx`);
      assert.equal(wrongFile.status, 404);

      const forged = await deliver(`token=${encodeURIComponent(token.slice(0, -2))}xx&file=chart-set-pdf`);
      assert.equal(forged.status, 401);

      const expiredToken = await createDownloadToken({
        secret: LINK_SECRET,
        orderId: order.id,
        productId: order.productId,
        nowSeconds: 1_000_000,
        ttlSeconds: 60,
      });
      const expired = await deliver(`token=${encodeURIComponent(expiredToken)}&file=chart-set-pdf`);
      assert.equal(expired.status, 410);

      const ghostToken = await createDownloadToken({ secret: LINK_SECRET, orderId: "order_missing", productId: order.productId });
      const ghost = await deliver(`token=${encodeURIComponent(ghostToken)}&file=chart-set-pdf`);
      assert.equal(ghost.status, 403);
    } finally {
      clearStorefrontEnv();
    }
  }, { CAMPAIGN_ASSETS: bucket });
});

test("file delivery fails closed when signing is unconfigured or the object is missing", { concurrency: false }, async () => {
  clearStorefrontEnv();
  const route = await import("../app/api/downloads/file/route.ts");
  const unconfigured = await route.GET(new Request("http://localhost/api/downloads/file?token=x&file=chart-set-pdf"));
  assert.equal(unconfigured.status, 503);

  await withDatabase(async (db) => {
    process.env.DOWNLOAD_LINK_SECRET = LINK_SECRET;
    try {
      const order = await recordDownloadOrder(db, {
        productId: "recipe-calculator",
        buyerEmail: "buyer@example.com",
        amountTotal: 9900,
        currency: "USD",
        checkoutSessionId: "cs_test_missing_object",
        paymentIntentId: null,
        paidAt: "2026-11-07T12:00:00.000Z",
      });
      const token = await createDownloadToken({ secret: LINK_SECRET, orderId: order.id, productId: order.productId });
      const missing = await route.GET(new Request(`http://localhost/api/downloads/file?token=${encodeURIComponent(token)}&file=recipe-calculator-xlsx`));
      assert.equal(missing.status, 503);
    } finally {
      clearStorefrontEnv();
    }
  }, { CAMPAIGN_ASSETS: fakeR2Bucket({}) });
});

test("confirmation and cancel pages stay no-index and the success page verifies with Stripe server-side", async () => {
  const { readFile } = await import("node:fs/promises");
  const [success, cancel] = await Promise.all([
    readFile(new URL("../app/downloads/success/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/downloads/cancel/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(success, /index: false/);
  assert.match(cancel, /index: false/);
  assert.match(success, /retrieveStripeCheckoutSession/);
  assert.match(success, /recordDownloadOrder/);
  assert.match(success, /hello@chefgringo\.com/);
  assert.match(cancel, /nothing was charged/i);
});
