import { getDownloadProduct } from "../app/lib/downloads.ts";
import type { D1DatabaseLike } from "./index.ts";

/**
 * Paid /downloads orders (D1 table `download_orders`).
 *
 * An order is recorded only from a verified payment: the Stripe webhook
 * (signature-checked) or the confirmation page's server-side session
 * retrieval. Recording is idempotent on the Stripe Checkout session id —
 * Stripe redelivers webhooks, and the buyer can refresh the confirmation
 * page; neither may create a second order.
 */

export type DownloadOrder = {
  id: string;
  productId: string;
  buyerEmail: string;
  amountTotal: number;
  currency: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId: string | null;
  status: "paid" | "refunded";
  paidAt: string;
  createdAt: string;
  updatedAt: string;
};

type DownloadOrderRow = {
  id: string;
  product_id: string;
  buyer_email: string;
  amount_total: number;
  currency: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  status: "paid" | "refunded";
  paid_at: string;
  created_at: string;
  updated_at: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createDownloadOrderId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `order_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function toOrder(row: DownloadOrderRow): DownloadOrder {
  return {
    id: row.id,
    productId: row.product_id,
    buyerEmail: row.buyer_email,
    amountTotal: row.amount_total,
    currency: row.currency,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ORDER_COLUMNS =
  "id, product_id, buyer_email, amount_total, currency, stripe_checkout_session_id, stripe_payment_intent_id, status, paid_at, created_at, updated_at";

export async function getDownloadOrderBySession(
  db: D1DatabaseLike,
  checkoutSessionId: string,
): Promise<DownloadOrder | null> {
  const row = await db
    .prepare(`SELECT ${ORDER_COLUMNS} FROM download_orders WHERE stripe_checkout_session_id = ?`)
    .bind(checkoutSessionId)
    .first<DownloadOrderRow>();
  return row ? toOrder(row) : null;
}

export async function getDownloadOrderById(
  db: D1DatabaseLike,
  orderId: string,
): Promise<DownloadOrder | null> {
  const row = await db
    .prepare(`SELECT ${ORDER_COLUMNS} FROM download_orders WHERE id = ?`)
    .bind(orderId)
    .first<DownloadOrderRow>();
  return row ? toOrder(row) : null;
}

export async function recordDownloadOrder(
  db: D1DatabaseLike,
  input: {
    productId: string;
    buyerEmail: string;
    amountTotal: number;
    currency: string;
    checkoutSessionId: string;
    paymentIntentId: string | null;
    paidAt: string;
  },
): Promise<DownloadOrder> {
  const product = getDownloadProduct(input.productId);
  if (!product) throw new Error("Download order references an unknown product.");
  const email = input.buyerEmail.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new Error("Download order is missing a valid buyer email.");
  if (input.amountTotal !== product.priceCents) {
    throw new Error("Download order amount does not match the catalog price.");
  }
  if (input.currency.toUpperCase() !== product.currency) {
    throw new Error("Download order currency does not match the catalog.");
  }
  if (!/^cs_[A-Za-z0-9_]+$/.test(input.checkoutSessionId)) {
    throw new Error("Download order is missing a valid Stripe checkout session id.");
  }

  const existing = await getDownloadOrderBySession(db, input.checkoutSessionId);
  if (existing) return existing;

  const order: DownloadOrder = {
    id: createDownloadOrderId(),
    productId: product.id,
    buyerEmail: email,
    amountTotal: input.amountTotal,
    currency: product.currency,
    stripeCheckoutSessionId: input.checkoutSessionId,
    stripePaymentIntentId: input.paymentIntentId,
    status: "paid",
    paidAt: input.paidAt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db
    .prepare(
      `INSERT INTO download_orders (${ORDER_COLUMNS})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(stripe_checkout_session_id) DO NOTHING`,
    )
    .bind(
      order.id,
      order.productId,
      order.buyerEmail,
      order.amountTotal,
      order.currency,
      order.stripeCheckoutSessionId,
      order.stripePaymentIntentId,
      order.status,
      order.paidAt,
      order.createdAt,
      order.updatedAt,
    )
    .run();
  // A concurrent webhook + confirmation-page write can race the insert;
  // the session row that won is the order of record either way.
  const recorded = await getDownloadOrderBySession(db, input.checkoutSessionId);
  if (!recorded) throw new Error("Download order could not be recorded.");
  return recorded;
}
