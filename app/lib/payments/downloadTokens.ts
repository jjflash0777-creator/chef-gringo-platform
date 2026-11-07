/**
 * Expiring, product-scoped download tokens for paid /downloads orders.
 *
 * A token proves "this order paid for this product" without exposing the
 * order or the private file locations. Format:
 *   cgdl1.<base64url payload JSON>.<base64url HMAC-SHA256>
 * The payload is { orderId, productId, exp } — no email, no file key.
 * The signature key is the server-only DOWNLOAD_LINK_SECRET env var.
 * Tokens are minted on the post-checkout confirmation page and verified
 * by /api/downloads/file on every download; 72 hours by default.
 */

export const DOWNLOAD_TOKEN_TTL_SECONDS = 72 * 60 * 60;
const TOKEN_PREFIX = "cgdl1";

const encoder = new TextEncoder();

export type DownloadTokenPayload = {
  orderId: string;
  productId: string;
  /** Expiry, unix seconds. */
  exp: number;
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

function timingSafeBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index++) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

export async function createDownloadToken(args: {
  secret: string;
  orderId: string;
  productId: string;
  nowSeconds?: number;
  ttlSeconds?: number;
}): Promise<string> {
  if (!args.secret) throw new Error("Download link signing is not configured.");
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  const payload: DownloadTokenPayload = {
    orderId: args.orderId,
    productId: args.productId,
    exp: now + (args.ttlSeconds ?? DOWNLOAD_TOKEN_TTL_SECONDS),
  };
  const payloadPart = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signed = `${TOKEN_PREFIX}.${payloadPart}`;
  const signature = await hmac(args.secret, signed);
  return `${signed}.${base64UrlEncode(signature)}`;
}

export type DownloadTokenVerification =
  | { ok: true; payload: DownloadTokenPayload }
  | { ok: false; reason: "malformed" | "bad-signature" | "expired" };

export async function verifyDownloadToken(args: {
  secret: string;
  token: string;
  nowSeconds?: number;
}): Promise<DownloadTokenVerification> {
  if (!args.secret) throw new Error("Download link signing is not configured.");
  const parts = args.token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return { ok: false, reason: "malformed" };
  let payload: DownloadTokenPayload;
  let signature: Uint8Array;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as DownloadTokenPayload;
    signature = base64UrlDecode(parts[2]);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof payload?.orderId !== "string" || !payload.orderId
    || typeof payload?.productId !== "string" || !payload.productId
    || typeof payload?.exp !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }
  const expected = await hmac(args.secret, `${TOKEN_PREFIX}.${parts[1]}`);
  if (!timingSafeBytesEqual(signature, expected)) return { ok: false, reason: "bad-signature" };
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}
