import { looksLikeDecompressionBomb } from "./content-safety.ts";
import { RESEARCH_LIMITS } from "./limits.ts";
import { looksLikePdf, urlLooksLikePdf, contentTypeLooksLikePdf } from "./pdf-detect.ts";
import { validateRedirectChain, validateSourcePayload, validateSourceUrl, type UrlSafetyIssue } from "./url-safety.ts";

export type FetchHop = { url: string; status: number; location?: string | null; contentType?: string | null; body?: string };

export type GovernedFetch = (url: string, init?: { method?: string; redirect?: RequestRedirect; signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export type GovernedDocumentResult = {
  ok: boolean;
  issues: UrlSafetyIssue[];
  text: string | null;
  contentType: string | null;
  finalUrl: string | null;
  hops: string[];
  rawBytes: number;
  pdfDetected: boolean;
};

function fail(issues: UrlSafetyIssue[], extra: Partial<GovernedDocumentResult> = {}): GovernedDocumentResult {
  return {
    ok: false,
    issues,
    text: null,
    contentType: extra.contentType ?? null,
    finalUrl: extra.finalUrl ?? null,
    hops: extra.hops ?? [],
    rawBytes: extra.rawBytes ?? 0,
    pdfDetected: extra.pdfDetected ?? false,
  };
}

export async function fetchGovernedDocument(url: string, fetchImpl: GovernedFetch, options: { maxHops?: number; signal?: AbortSignal } = {}): Promise<GovernedDocumentResult> {
  const start = validateSourceUrl(url);
  if (!start.ok) return fail(start.issues);
  const hops: string[] = [];
  let current = start.canonicalUrl ?? url;
  const maxHops = options.maxHops ?? 3;
  const maxDownload = RESEARCH_LIMITS.maximumDownloadBytes;
  for (let i = 0; i <= maxHops; i += 1) {
    if (options.signal?.aborted) return fail(["timeout"], { hops });
    let response: Awaited<ReturnType<GovernedFetch>>;
    try {
      response = await fetchImpl(current, { method: "GET", redirect: "manual", signal: options.signal });
    } catch (error) {
      if (options.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
        return fail(["timeout"], { hops });
      }
      throw error;
    }
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const absolute = new URL(location, current).toString();
      hops.push(absolute);
      const chain = validateRedirectChain(url, hops);
      if (!chain.ok) return fail(chain.issues, { hops });
      current = chain.finalUrl ?? absolute;
      continue;
    }
    const contentType = response.headers.get("content-type") ?? "text/plain";
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > maxDownload) {
      return fail(["oversized"], { contentType, finalUrl: current, hops, rawBytes: declared });
    }
    const payload = validateSourcePayload({ contentType, byteLength: 0, maxBytes: maxDownload });
    const pdfHint = urlLooksLikePdf(current) || contentTypeLooksLikePdf(contentType);
    if (!payload.ok && payload.issues.includes("unsupported_content_type") && !pdfHint) {
      return fail(payload.issues, { contentType, finalUrl: current, hops });
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const pdfDetected = looksLikePdf({ url: current, contentType, bytes });
    const size = validateSourcePayload({
      contentType: pdfDetected ? "application/pdf" : contentType,
      byteLength: buffer.byteLength,
      maxBytes: maxDownload,
    });
    if (!size.ok && size.issues.includes("oversized")) {
      return fail(["oversized"], { contentType, finalUrl: current, hops, rawBytes: buffer.byteLength, pdfDetected });
    }
    if (pdfDetected) {
      return {
        ok: true,
        issues: [],
        text: "",
        contentType,
        finalUrl: current,
        hops,
        rawBytes: buffer.byteLength,
        pdfDetected: true,
      };
    }
    if (!size.ok) return fail(size.issues, { contentType, finalUrl: current, hops, rawBytes: buffer.byteLength });
    const encoded = new TextDecoder().decode(buffer);
    const compressed = Number(response.headers.get("content-length") || buffer.byteLength);
    if (looksLikeDecompressionBomb({ compressedBytes: compressed, uncompressedBytes: encoded.length })) {
      return fail(["oversized"], { contentType, finalUrl: current, hops, rawBytes: buffer.byteLength });
    }
    return {
      ok: true,
      issues: [],
      text: encoded,
      contentType,
      finalUrl: current,
      hops,
      rawBytes: buffer.byteLength,
      pdfDetected: false,
    };
  }
  return fail(["redirect_to_blocked"]);
}
