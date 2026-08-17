import { markDecisionBriefPaid } from "../../../../db/decision-brief-repository.ts";
import { getD1Binding } from "../../../../db/index.ts";
import { verifyStripeWebhook } from "../../../lib/payments/stripeWebhook.ts";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const signature = request.headers.get("stripe-signature") || "";
  const body = await request.text();
  try {
    const event = await verifyStripeWebhook(body, signature, secret);
    const session = event.data.object;
    if (session.payment_status !== "paid") throw new Error("Stripe checkout session is not paid.");
    if (typeof session.amount_total !== "number" || !session.currency) throw new Error("Stripe checkout session is missing payment totals.");
    await markDecisionBriefPaid(getD1Binding(), {
      caseId: session.client_reference_id || "",
      checkoutSessionId: session.id,
      paymentIntentId: session.payment_intent,
      amountTotal: session.amount_total,
      currency: session.currency,
      paidAt: new Date(event.created * 1000).toISOString(),
    });
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook rejected.";
    return Response.json({ error: message }, { status: /binding.*unavailable/i.test(message) ? 503 : 400 });
  }
}
