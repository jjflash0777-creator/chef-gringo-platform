import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { DOWNLOAD_PRODUCTS } from "../app/lib/downloads.ts";
import {
  decryptDownloadPayload,
  encryptDownloadPayload,
  parseDownloadBundleKey,
} from "../app/lib/download-bundles/decrypt.ts";
import {
  getDownloadBundle,
  resolveBundledDownloadBytes,
} from "../app/lib/download-bundles/index.ts";
import { DOWNLOAD_BUNDLES } from "../app/lib/download-bundles/manifest.ts";
import { createDownloadToken } from "../app/lib/payments/downloadTokens.ts";
import { recordDownloadOrder } from "../db/download-orders-repository.ts";
import { applyMigrations, SqliteD1Adapter } from "./helpers/sqlite-d1.mjs";

const LINK_SECRET = "test-download-link-secret";
const TEST_KEY = randomBytes(32).toString("base64");
const WRONG_KEY = randomBytes(32).toString("base64");
const CHART_SET_KEY = "downloads/kitchen-reference-chart-set/kitchen-reference-chart-set.pdf";

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

test("bundle payloads round-trip through the delivery crypto to the exact original bytes", async () => {
  const plaintext = new TextEncoder().encode("%PDF-fixture — bundle round trip ✓");
  const payload = await encryptDownloadPayload(TEST_KEY, plaintext);
  const decrypted = await decryptDownloadPayload(TEST_KEY, payload);
  assert.deepEqual(decrypted, plaintext);

  // The resolver the delivery route calls must produce the same bytes
  // from a manifest entry, and fail closed (null) without a usable key.
  const bundles = {
    "downloads/fixture/fixture.pdf": { payload, contentType: "application/pdf", fileName: "fixture.pdf" },
  };
  assert.deepEqual(await resolveBundledDownloadBytes("downloads/fixture/fixture.pdf", TEST_KEY, bundles), plaintext);
  assert.equal(await resolveBundledDownloadBytes("downloads/fixture/fixture.pdf", undefined, bundles), null);
  assert.equal(await resolveBundledDownloadBytes("downloads/fixture/fixture.pdf", "", bundles), null);
  assert.equal(await resolveBundledDownloadBytes("downloads/fixture/missing.pdf", TEST_KEY, bundles), null);
});

test("a wrong bundle key or a tampered payload fails closed, never bytes", async () => {
  const plaintext = new TextEncoder().encode("paid content");
  const payload = await encryptDownloadPayload(TEST_KEY, plaintext);

  await assert.rejects(() => decryptDownloadPayload(WRONG_KEY, payload));
  const bundles = {
    "downloads/fixture/fixture.pdf": { payload, contentType: "application/pdf", fileName: "fixture.pdf" },
  };
  assert.equal(await resolveBundledDownloadBytes("downloads/fixture/fixture.pdf", WRONG_KEY, bundles), null);

  const tamperedBytes = Buffer.from(payload, "base64");
  tamperedBytes[tamperedBytes.length - 1] ^= 0xff;
  const tampered = {
    "downloads/fixture/fixture.pdf": {
      payload: tamperedBytes.toString("base64"),
      contentType: "application/pdf",
      fileName: "fixture.pdf",
    },
  };
  assert.equal(await resolveBundledDownloadBytes("downloads/fixture/fixture.pdf", TEST_KEY, tampered), null);

  assert.throws(() => parseDownloadBundleKey(randomBytes(16).toString("base64")), /32 bytes/);
  assert.throws(() => parseDownloadBundleKey("not base64 at all!!!"), /32 bytes|not valid base64/);
});

test("the bundle manifest contains exactly the catalog's files with matching types and names", () => {
  const catalogFiles = DOWNLOAD_PRODUCTS.flatMap((product) => product.files);
  assert.deepEqual(
    Object.keys(DOWNLOAD_BUNDLES).sort(),
    catalogFiles.map((file) => file.r2Key).sort(),
  );
  for (const file of catalogFiles) {
    const entry = getDownloadBundle(file.r2Key);
    assert.ok(entry, `missing bundle for ${file.r2Key}`);
    assert.equal(entry.contentType, file.contentType, `content type drift for ${file.r2Key}`);
    assert.equal(entry.fileName, file.fileName, `filename drift for ${file.r2Key}`);
    const payloadBytes = Buffer.from(entry.payload, "base64");
    assert.ok(payloadBytes.length > 28, `bundle payload for ${file.r2Key} is too short to be IV + tag + content`);
    // Ciphertext must not be the plaintext file format showing through.
    assert.notEqual(payloadBytes.subarray(0, 4).toString("latin1"), "%PDF");
  }
  assert.equal(getDownloadBundle("downloads/not-a-product/nope.pdf"), null);
});

test("file delivery falls back to the R2 object when the bundle cannot be decrypted", { concurrency: false }, async () => {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  const fixtureBytes = new TextEncoder().encode("%PDF-fixture-chart-set");
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db, CAMPAIGN_ASSETS: fakeR2Bucket({ [CHART_SET_KEY]: fixtureBytes }) };
  process.env.DOWNLOAD_LINK_SECRET = LINK_SECRET;
  process.env.DOWNLOAD_BUNDLE_KEY = WRONG_KEY;
  try {
    const order = await recordDownloadOrder(db, {
      productId: "kitchen-reference-chart-set",
      buyerEmail: "buyer@example.com",
      amountTotal: 3500,
      currency: "USD",
      checkoutSessionId: "cs_test_bundle_fallback",
      paymentIntentId: "pi_test_bundle_fallback",
      paidAt: "2026-11-08T12:00:00.000Z",
    });
    const route = await import("../app/api/downloads/file/route.ts");
    const token = await createDownloadToken({ secret: LINK_SECRET, orderId: order.id, productId: order.productId });
    const response = await route.GET(new Request(`http://localhost/api/downloads/file?token=${encodeURIComponent(token)}&file=chart-set-pdf`));
    assert.equal(response.status, 200);
    assert.equal(new TextDecoder().decode(await response.arrayBuffer()), "%PDF-fixture-chart-set");
  } finally {
    delete process.env.DOWNLOAD_LINK_SECRET;
    delete process.env.DOWNLOAD_BUNDLE_KEY;
    delete globalThis.__CHEF_GRINGO_ENV__;
    db.close();
  }
});

test("file delivery still fails closed with the honest 503 when the bundle key is wrong and no object exists", { concurrency: false }, async () => {
  const db = new SqliteD1Adapter();
  await applyMigrations(db);
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db, CAMPAIGN_ASSETS: fakeR2Bucket({}) };
  process.env.DOWNLOAD_LINK_SECRET = LINK_SECRET;
  process.env.DOWNLOAD_BUNDLE_KEY = WRONG_KEY;
  try {
    const order = await recordDownloadOrder(db, {
      productId: "recipe-calculator",
      buyerEmail: "buyer@example.com",
      amountTotal: 9900,
      currency: "USD",
      checkoutSessionId: "cs_test_bundle_fail_closed",
      paymentIntentId: null,
      paidAt: "2026-11-08T12:00:00.000Z",
    });
    const route = await import("../app/api/downloads/file/route.ts");
    const token = await createDownloadToken({ secret: LINK_SECRET, orderId: order.id, productId: order.productId });
    const response = await route.GET(new Request(`http://localhost/api/downloads/file?token=${encodeURIComponent(token)}&file=recipe-calculator-xlsx`));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      message: "That file is still being prepared. Email hello@chefgringo.com and we'll send it directly.",
    });
  } finally {
    delete process.env.DOWNLOAD_LINK_SECRET;
    delete process.env.DOWNLOAD_BUNDLE_KEY;
    delete globalThis.__CHEF_GRINGO_ENV__;
    db.close();
  }
});
