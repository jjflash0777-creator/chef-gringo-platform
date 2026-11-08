/**
 * Minimal Stripe Checkout adapter for the /downloads storefront.
 *
 * Follows the house pattern for external providers (see the Loops adapter):
 * plain HTTPS calls from the Worker, no vendor SDK, no vendor types leaking
 * into domain code. Checkout Sessions are created with inline `price_data`
 * from the code catalog (app/lib/downloads.ts), so the founder never has to
 * hand-create products or prices in the Stripe dashboard — the catalog in
 * code is the price source of truth.
 */

const STRIPE_API_BASE = "https://api.stripe.com/v1";
const PROVIDER_TIMEOUT_MS = 10000;

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  payment_status: string | null;
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | null;
  metadata: Record<string, string>;
  customerEmail: string | null;
};

type FetchImpl = typeof fetch;

function formBody(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

function toSession(raw: unknown): StripeCheckoutSession {
  const session = (raw ?? {}) as {
    id?: unknown;
    url?: unknown;
    payment_status?: unknown;
    amount_total?: unknown;
    currency?: unknown;
    payment_intent?: unknown;
    metadata?: unknown;
    customer_details?: { email?: unknown } | null;
    customer_email?: unknown;
  };
  if (typeof session.id !== "string" || !session.id.startsWith("cs_")) {
    throw new Error("Stripe returned an unexpected checkout session.");
  }
  const metadata: Record<string, string> = {};
  if (session.metadata && typeof session.metadata === "object") {
    for (const [key, value] of Object.entries(session.metadata as Record<string, unknown>)) {
      if (typeof value === "string") metadata[key] = value;
    }
  }
  const detailEmail = session.customer_details?.email;
  return {
    id: session.id,
    url: typeof session.url === "string" ? session.url : null,
    payment_status: typeof session.payment_status === "string" ? session.payment_status : null,
    amount_total: typeof session.amount_total === "number" ? session.amount_total : null,
    currency: typeof session.currency === "string" ? session.currency : null,
    payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
    metadata,
    customerEmail:
      typeof detailEmail === "string" && detailEmail ? detailEmail
      : typeof session.customer_email === "string" && session.customer_email ? session.customer_email
      : null,
  };
}

async function stripeRequest(
  secretKey: string,
  path: string,
  init: { method: "GET" | "POST"; body?: string },
  fetchImpl: FetchImpl,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(`${STRIPE_API_BASE}${path}`, {
      method: init.method,
      headers: {
        authorization: `Bearer ${secretKey}`,
        ...(init.body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      },
      body: init.body,
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch (error) {
    console.warn("Downloads Stripe request failed", {
      method: init.method,
      stage: "transport",
      timedOut: error instanceof Error && error.name === "TimeoutError",
    });
    throw new Error("Stripe could not be reached. Please try again.");
  }
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const stripeError = (payload as { error?: { type?: unknown; code?: unknown } } | null)?.error;
    const requestId = response.headers.get("request-id");
    const safeIdentifier = (value: unknown) =>
      typeof value === "string" && /^[a-z_]{1,64}$/.test(value) ? value : undefined;
    console.warn("Downloads Stripe request failed", {
      method: init.method,
      stage: "stripe_response",
      status: response.status,
      type: safeIdentifier(stripeError?.type),
      code: safeIdentifier(stripeError?.code),
      requestId: requestId && /^req_[A-Za-z0-9]{1,64}$/.test(requestId) ? requestId : undefined,
    });
    throw new Error("Stripe rejected the request. Please try again.");
  }
  return payload;
}

export async function createStripeCheckoutSession(args: {
  secretKey: string;
  productId: string;
  productName: string;
  productDescription: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  fetchImpl?: FetchImpl;
}): Promise<StripeCheckoutSession> {
  const body = formBody({
    mode: "payment",
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    client_reference_id: args.productId,
    "metadata[product_id]": args.productId,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": args.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(args.amountCents),
    "line_items[0][price_data][product_data][name]": args.productName,
    "line_items[0][price_data][product_data][description]": args.productDescription,
  });
  const raw = await stripeRequest(args.secretKey, "/checkout/sessions", { method: "POST", body }, args.fetchImpl ?? fetch);
  const session = toSession(raw);
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return session;
}

export async function retrieveStripeCheckoutSession(args: {
  secretKey: string;
  sessionId: string;
  fetchImpl?: FetchImpl;
}): Promise<StripeCheckoutSession> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(args.sessionId)) {
    throw new Error("That checkout session id is not valid.");
  }
  const raw = await stripeRequest(
    args.secretKey,
    `/checkout/sessions/${encodeURIComponent(args.sessionId)}`,
    { method: "GET" },
    args.fetchImpl ?? fetch,
  );
  return toSession(raw);
}
