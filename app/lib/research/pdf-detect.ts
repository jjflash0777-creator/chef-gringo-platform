/**
 * Bounded PDF detection. No parser or OCR lives here — binary PDFs are
 * unextractable leads until a human transcribes them.
 */

function pathnameOf(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return url.split("?")[0]?.toLowerCase() ?? "";
  }
}

export function urlLooksLikePdf(url: string | null | undefined) {
  const path = pathnameOf(url);
  return path.endsWith(".pdf") || path.includes(".pdf/");
}

export function contentTypeLooksLikePdf(contentType: string | null | undefined) {
  const type = (contentType ?? "").split(";")[0].trim().toLowerCase();
  return type === "application/pdf" || type === "application/x-pdf" || type.endsWith("+pdf");
}

export function bytesLookLikePdf(bytes: Uint8Array | string | null | undefined) {
  if (!bytes) return false;
  if (typeof bytes === "string") {
    const head = bytes.replace(/^\uFEFF/, "").trimStart().slice(0, 5);
    return head.startsWith("%PDF");
  }
  let index = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) index = 3;
  while (index < bytes.length && (bytes[index] === 0x20 || bytes[index] === 0x09 || bytes[index] === 0x0d || bytes[index] === 0x0a)) {
    index += 1;
  }
  return bytes[index] === 0x25
    && bytes[index + 1] === 0x50
    && bytes[index + 2] === 0x44
    && bytes[index + 3] === 0x46;
}

export function looksLikePdf(input: {
  url?: string | null;
  contentType?: string | null;
  bytes?: Uint8Array | string | null;
}) {
  return urlLooksLikePdf(input.url)
    || contentTypeLooksLikePdf(input.contentType)
    || bytesLookLikePdf(input.bytes);
}
