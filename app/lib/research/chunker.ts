import { inspectEvidenceContent, stripUnsafeMarkup } from "./content-safety.ts";

const MAX_CHUNK_CHARS = 800;

export type DraftChunk = {
  ordinal: number;
  heading: string | null;
  locator: string | null;
  excerpt: string;
  tokenEstimate: number;
};

function headingFrom(line: string) {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  return match ? match[2].trim() : null;
}

function locatorFor(block: string, heading: string | null, fallback: string) {
  const page = block.match(/\[page\s+(\d+)\]/i);
  if (page) return `page:${page[1]}`;
  if (heading) return `heading:${heading}`;
  return fallback;
}

export function extractReadableContent(input: { mimeType: string; text: string }) {
  const mime = input.mimeType.split(";")[0].trim().toLowerCase();
  let text = input.text;
  if (mime === "text/html") text = stripUnsafeMarkup(text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, "\n# $2\n"));
  const flags = inspectEvidenceContent(text);
  const envelope = flags.htmlPresent ? stripUnsafeMarkup(text) : text.replace(/\u0000/g, "");
  return {
    text: envelope.replace(/\r\n/g, "\n").trim(),
    flags,
  };
}

export function chunkExtractedText(text: string): DraftChunk[] {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const chunks: DraftChunk[] = [];
  let heading: string | null = null;
  let buffer = "";
  const flush = (source: string) => {
    const excerpt = buffer.trim();
    if (!excerpt) return;
    chunks.push({
      ordinal: chunks.length + 1,
      heading,
      locator: locatorFor(excerpt, heading, source),
      excerpt: excerpt.replace(/\[page\s+\d+\]/ig, "").trim().slice(0, MAX_CHUNK_CHARS),
      tokenEstimate: Math.ceil(excerpt.length / 4),
    });
    buffer = "";
  };
  for (const block of blocks) {
    const nextHeading = headingFrom(block.split("\n")[0] ?? "");
    if (nextHeading) {
      flush(heading ? `heading:${heading}` : "body");
      heading = nextHeading;
      buffer = block.replace(/^#{1,6}\s+/, "");
      continue;
    }
    if ((buffer + "\n\n" + block).length > MAX_CHUNK_CHARS) flush(heading ? `heading:${heading}` : `paragraph:${chunks.length + 1}`);
    buffer = buffer ? `${buffer}\n\n${block}` : block;
  }
  flush(heading ? `heading:${heading}` : chunks.length ? `paragraph:${chunks.length + 1}` : "body");
  return chunks.length ? chunks : [{ ordinal: 1, heading: null, locator: locatorFor(text, null, "body"), excerpt: text.replace(/\[page\s+\d+\]/ig, "").trim().slice(0, MAX_CHUNK_CHARS), tokenEstimate: Math.ceil(Math.min(text.length, MAX_CHUNK_CHARS) / 4) }];
}
