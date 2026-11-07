import { recordDownloadOrder } from "../../../../db/download-orders-repository.ts";
import { getD1Binding } from "../../../../db/index.ts";
import { getDownloadProduct } from "../../../lib/downloads.ts";
import { verifyStripeWebhook } from "../../../lib/payments/stripeWebhook.ts";

/**
 * Stripe webhook for /downloads orders — the source of truth for a paid
 * order. Uses its own signing secret (STRIPE_DOWNLOADS_WEBHOOK_SECRET):
 * in Stripe, every webhook endpoint gets a distinct secret, and this one
 * must not be shared with the decision-brief endpoint.
 *
 * On a signature-verified checkout.session.completed with payment_status
 * "paid", the order is recorded in D1 (idempotent on the session id).
 * The confirmation page also records the same order after its own
 * server-side session check, so a slow webhook never strands a buyer.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_DOWNLOADS_WEBHOOK_SECRET || "";
  const signature = request.headers.get("stripe-signature") || "";
  const body = await request.text();
  try {
    const event = await verifyStripeWebhook(body, signature, secret);
    const session = event.data.object;
    if (session.payment_status !== "paid") throw new Error("Stripe checkout session is not paid.");
    if (typeof session.amount_total !== "number" || !session.currency) {
      throw new Error("Stripe checkout session is missing payment totals.");
    }
    const productId = session.metadata?.product_id || "";
    const product = getDownloadProduct(productId);
    if (!product) throw new Error("Stripe checkout session references an unknown product.");
    const buyerEmail = session.customer_details?.email || session.customer_email || "";
    if (!buyerEmail) throw new Error("Stripe checkout session is missing the buyer email.");
    await recordDownloadOrder(getD1Binding(), {
      productId: product.id,
      buyerEmail,
      amountTotal: session.amount_total,
      currency: session.currency,
      checkoutSessionId: session.id,
      paymentIntentId: session.payment_intent,
      paidAt: new Date(event.created * 1000).toISOString(),
    });
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook rejected.";
    return Response.json({ error: message }, { status: /binding.*unavailable/i.test(message) ? 503 : 400 });
  }
}
