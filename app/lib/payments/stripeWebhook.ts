const encoder = new TextEncoder();
const MAX_AGE_SECONDS = 300;

export type StripeCheckoutCompleted = {
  id: string;
  type: "checkout.session.completed";
  created: number;
  data: { object: {
    id: string;
    client_reference_id: string | null;
    payment_status: string;
    amount_total: number | null;
    currency: string | null;
    payment_intent: string | null;
  } };
};

function parseSignature(header: string) {
  const parts = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) throw new Error("Stripe signature header is invalid.");
  return { timestamp, signatures };
}

function timingSafeHexEqual(left: string, right: string) {
  if (!/^[a-f0-9]+$/i.test(left) || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export async function stripeSignatureForTest(secret: string, timestamp: number, body: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeWebhook(body: string, signatureHeader: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret.startsWith("whsec_")) throw new Error("Stripe webhook signing secret is not configured.");
  const { timestamp, signatures } = parseSignature(signatureHeader);
  const timestampNumber = Number(timestamp);
  if (Math.abs(nowSeconds - timestampNumber) > MAX_AGE_SECONDS) throw new Error("Stripe webhook timestamp is outside the accepted window.");
  const expected = await stripeSignatureForTest(secret, timestampNumber, body);
  if (!signatures.some((signature) => timingSafeHexEqual(signature, expected))) throw new Error("Stripe webhook signature verification failed.");
  const event = JSON.parse(body) as { id?: unknown; type?: unknown; created?: unknown; data?: { object?: unknown } };
  if (typeof event.id !== "string" || event.type !== "checkout.session.completed" || typeof event.created !== "number" || !event.data?.object) throw new Error("Unsupported Stripe event.");
  return event as StripeCheckoutCompleted;
}
