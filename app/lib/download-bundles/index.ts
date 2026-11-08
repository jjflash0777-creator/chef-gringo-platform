/**
 * Encrypted download bundles: the delivery source for /downloads files.
 *
 * Each catalog file (app/lib/downloads.ts) has one bundle entry keyed by
 * its stable downloads/<product>/<file> key. The route resolves bytes
 * through here after its token + paid-order checks; any failure — no
 * entry, no DOWNLOAD_BUNDLE_KEY, a bad key, a tampered payload —
 * returns null so the caller can fall back to its fail-closed path.
 * Plaintext product files are never committed; see
 * scripts/encrypt-download-bundles.mjs for how payloads are produced.
 */
import { decryptDownloadPayload } from "./decrypt.ts";
import { DOWNLOAD_BUNDLES, type DownloadBundleEntry } from "./manifest.ts";

export type { DownloadBundleEntry };

export function getDownloadBundle(key: string): DownloadBundleEntry | null {
  return DOWNLOAD_BUNDLES[key] ?? null;
}

/**
 * Decrypt the bundle for `key` to the original file bytes, or null when
 * the bundle cannot be produced for any reason. `bundles` is injectable
 * so tests can exercise this exact code path with fixture payloads.
 */
export async function resolveBundledDownloadBytes(
  key: string,
  keyBase64: string | undefined,
  bundles: Readonly<Record<string, DownloadBundleEntry>> = DOWNLOAD_BUNDLES,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const entry = bundles[key];
  if (!entry || !keyBase64) return null;
  try {
    return await decryptDownloadPayload(keyBase64, entry.payload);
  } catch {
    return null;
  }
}
