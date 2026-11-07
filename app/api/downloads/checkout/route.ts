import { getDownloadProduct } from "../../../lib/downloads.ts";
import { createStripeCheckoutSession } from "../../../lib/payments/stripeCheckout.ts";

/**
 * /downloads checkout.
 *
 * GET reports whether checkout and delivery are connected (booleans only —
 * never secret values) so the page can show an honest state instead of a
 * dead button. POST creates a Stripe Checkout Session with inline price
 * data from the code catalog and returns its hosted URL. Without
 * STRIPE_SECRET_KEY the route fails closed with a 503, following the same
 * env-gating honesty pattern as /api/subscribe.
 */

export async function GET() {
  return Response.json({
    checkoutConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    deliveryConfigured: Boolean(process.env.DOWNLOAD_LINK_SECRET),
  });
}

export async function POST(request: Request) {
  let payload: { productId?: unknown };
  try {
    payload = (await request.json()) as { productId?: unknown };
  } catch {
    return Response.json({ message: "Choose a product to check out." }, { status: 400 });
  }
  const product = typeof payload.productId === "string" ? getDownloadProduct(payload.productId) : null;
  if (!product) {
    return Response.json({ message: "That product is not in the downloads catalog." }, { status: 400 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return Response.json(
      { message: "Checkout is being connected. Join Field Notes below and you'll hear the moment it opens." },
      { status: 503 },
    );
  }

  const origin = new URL(request.url).origin;
  try {
    const session = await createStripeCheckoutSession({
      secretKey,
      productId: product.id,
      productName: product.name,
      productDescription: product.stripeDescription,
      amountCents: product.priceCents,
      currency: product.currency,
      successUrl: `${origin}/downloads/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/downloads/cancel`,
    });
    return Response.json({ url: session.url });
  } catch {
    return Response.json(
      { message: "Checkout could not be started. Please try again in a moment." },
      { status: 502 },
    );
  }
}
