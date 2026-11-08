/**
 * AES-256-GCM encryption for the /downloads file bundles.
 *
 * The product files ship inside this repo as ciphertext only: each
 * payload module under ./payloads holds one file encrypted with the
 * server-only DOWNLOAD_BUNDLE_KEY env var (base64, 32 bytes). The key
 * is never committed; without it the payloads are noise and delivery
 * fails closed. Payload layout, base64-encoded:
 *
 *   IV (12 random bytes) || ciphertext || GCM tag (16 bytes)
 *
 * WebCrypto's AES-GCM encrypt/decrypt already appends and expects the
 * tag at the end of the ciphertext, so only the IV needs a prefix.
 * scripts/encrypt-download-bundles.mjs produces payloads in exactly
 * this format with Node's crypto; this module is the runtime half.
 */

const IV_BYTES = 12;
const KEY_BYTES = 32;
const GCM_TAG_BYTES = 16;

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Decode(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** Decode and validate the base64 bundle key. Throws unless it is exactly 32 bytes. */
export function parseDownloadBundleKey(keyBase64: string): Uint8Array<ArrayBuffer> {
  let keyBytes: Uint8Array<ArrayBuffer>;
  try {
    keyBytes = base64Decode(keyBase64.trim());
  } catch {
    throw new Error("DOWNLOAD_BUNDLE_KEY is not valid base64.");
  }
  if (keyBytes.length !== KEY_BYTES) {
    throw new Error(`DOWNLOAD_BUNDLE_KEY must decode to ${KEY_BYTES} bytes, got ${keyBytes.length}.`);
  }
  return keyBytes;
}

async function importBundleKey(keyBase64: string, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", parseDownloadBundleKey(keyBase64), { name: "AES-GCM" }, false, usages);
}

/** Encrypt one file's bytes into a stored payload (base64 of IV || ciphertext || tag). */
export async function encryptDownloadPayload(keyBase64: string, plaintext: Uint8Array): Promise<string> {
  const key = await importBundleKey(keyBase64, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new Uint8Array(plaintext);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const payload = new Uint8Array(IV_BYTES + sealed.length);
  payload.set(iv, 0);
  payload.set(sealed, IV_BYTES);
  return base64Encode(payload);
}

/**
 * Decrypt a stored payload back to the original file bytes.
 * Throws on a wrong key, a malformed payload, or any tampering —
 * callers that must fail closed should catch and treat it as "no file".
 */
export async function decryptDownloadPayload(keyBase64: string, payloadBase64: string): Promise<Uint8Array<ArrayBuffer>> {
  const payload = base64Decode(payloadBase64);
  if (payload.length <= IV_BYTES + GCM_TAG_BYTES) {
    throw new Error("Download bundle payload is too short to be valid.");
  }
  const key = await importBundleKey(keyBase64, ["decrypt"]);
  const iv = payload.slice(0, IV_BYTES);
  const sealed = payload.slice(IV_BYTES);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, sealed);
  return new Uint8Array(plaintext);
}
