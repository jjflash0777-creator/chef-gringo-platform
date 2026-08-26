/**
 * Deterministic HTML-to-text extraction. Does not execute JavaScript or crawl.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "\u2013",
  mdash: "\u2014",
  deg: "\u00b0",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
  hellip: "\u2026",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
};

const DROP_BLOCKS = "script|style|noscript|svg|iframe|object|embed|template|canvas|form";
const CHROME_BLOCKS = "nav|footer|aside";

function decodeEntity(raw: string) {
  if (raw[0] === "#") {
    const hex = raw[1] === "x" || raw[1] === "X";
    const value = Number.parseInt(hex ? raw.slice(2) : raw.slice(1), hex ? 16 : 10);
    if (!Number.isFinite(value) || value < 0) return "";
    try {
      return String.fromCodePoint(value);
    } catch {
      return "";
    }
  }
  return NAMED_ENTITIES[raw.toLowerCase()] ?? "";
}

export function decodeHtmlEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => decodeEntity(entity) || `&${entity};`);
}

function dropTagBlocks(html: string, names: string) {
  return html.replace(new RegExp(`<(${names})\\b[^>]*>[\\s\\S]*?<\\/\\1>`, "gi"), " ");
}

function dropUnclosed(html: string, names: string) {
  return html.replace(new RegExp(`<(${names})\\b[^>]*>[\\s\\S]*$`, "gi"), " ");
}

function innerOf(html: string, names: string) {
  const match = html.match(new RegExp(`<(${names})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, "i"));
  return match?.[2] ?? null;
}

function rewriteBlocks(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n")
    .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, "\n# $2\n")
    .replace(/<\/(p|div|section|article|blockquote|li|tr|h[1-6]|br)>/gi, "\n")
    .replace(/<(p|div|section|article|blockquote|li|tr)\b[^>]*>/gi, "\n");
}

export function extractHtmlArticleText(html: string) {
  let work = html.replace(/<!--[\s\S]*?-->/g, " ");
  work = dropTagBlocks(work, DROP_BLOCKS);
  work = dropUnclosed(work, DROP_BLOCKS);
  const hasMain = /<(main|article)\b/i.test(work);
  work = dropTagBlocks(work, hasMain ? `${CHROME_BLOCKS}|header` : CHROME_BLOCKS);
  const focused = innerOf(work, "article") ?? innerOf(work, "main") ?? work;
  const rewritten = rewriteBlocks(focused);
  const withoutTags = rewritten.replace(/<[^>]+>/g, " ");
  const decoded = decodeHtmlEntities(withoutTags).replace(/\u0000/g, "");
  return decoded
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function capExtractedText(text: string, maximumChars: number) {
  if (text.length <= maximumChars) return text;
  const slice = text.slice(0, maximumChars);
  const boundary = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
  return (boundary >= Math.floor(maximumChars * 0.6) ? slice.slice(0, boundary + 1) : slice).trim();
}
