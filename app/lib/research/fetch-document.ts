import { looksLikeDecompressionBomb } from "./content-safety.ts";
import { RESEARCH_LIMITS } from "./limits.ts";
import { validateRedirectChain, validateSourcePayload, validateSourceUrl } from "./url-safety.ts";

export type FetchHop = { url: string; status: number; location?: string | null; contentType?: string | null; body?: string };

export type GovernedFetch = (url: string, init?: { method?: string; redirect?: RequestRedirect }) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export async function fetchGovernedDocument(url: string, fetchImpl: GovernedFetch, options: { maxHops?: number } = {}) {
  const start = validateSourceUrl(url);
  if (!start.ok) return { ok: false as const, issues: start.issues, text: null, contentType: null, finalUrl: null, hops: [] as string[] };
  const hops: string[] = [];
  let current = start.canonicalUrl ?? url;
  const maxHops = options.maxHops ?? 3;
  for (let i = 0; i <= maxHops; i += 1) {
    const response = await fetchImpl(current, { method: "GET", redirect: "manual" });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const absolute = new URL(location, current).toString();
      hops.push(absolute);
      const chain = validateRedirectChain(url, hops);
      if (!chain.ok) return { ok: false as const, issues: chain.issues, text: null, contentType: null, finalUrl: null, hops };
      current = chain.finalUrl ?? absolute;
      continue;
    }
    const contentType = response.headers.get("content-type") ?? "text/plain";
    const payload = validateSourcePayload({ contentType, byteLength: 0 });
    if (!payload.ok && payload.issues.includes("unsupported_content_type")) {
      return { ok: false as const, issues: payload.issues, text: null, contentType, finalUrl: current, hops };
    }
    const buffer = await response.arrayBuffer();
    const encoded = new TextDecoder().decode(buffer);
    const size = validateSourcePayload({ contentType, byteLength: buffer.byteLength });
    if (!size.ok) return { ok: false as const, issues: size.issues, text: null, contentType, finalUrl: current, hops };
    const compressed = Number(response.headers.get("content-length") || buffer.byteLength);
    if (looksLikeDecompressionBomb({ compressedBytes: compressed, uncompressedBytes: encoded.length })) {
      return { ok: false as const, issues: ["oversized"] as const, text: null, contentType, finalUrl: current, hops };
    }
    if (encoded.length > RESEARCH_LIMITS.maximumSourceBytes) {
      return { ok: false as const, issues: ["oversized"] as const, text: null, contentType, finalUrl: current, hops };
    }
    return { ok: true as const, issues: [] as const, text: encoded, contentType, finalUrl: current, hops };
  }
  return { ok: false as const, issues: ["redirect_to_blocked"] as const, text: null, contentType: null, finalUrl: null, hops };
}
