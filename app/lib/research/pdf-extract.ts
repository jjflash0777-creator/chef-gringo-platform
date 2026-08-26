/**
 * Bounded PDF text extraction for live candidate discovery.
 * Uses unpdf's serverless PDF.js build. No OCR, no canvas rendering, no JS eval.
 * Extracted page text is evidence data only; quotations must be exact substrings.
 */

import { getDocumentProxy, getMeta } from "unpdf";
import { RESEARCH_LIMITS } from "./limits.ts";
import { matchClaimPassages } from "./passage-match.ts";
import { bytesLookLikePdf } from "./pdf-detect.ts";

export type PdfExtractFailure =
  | "malformed"
  | "timeout"
  | "empty_text"
  | "unreadable"
  | "page_limit"
  | null;

export type PdfExtractResult = {
  ok: boolean;
  text: string;
  totalPages: number;
  pagesInspected: number;
  pagesWithMatches: number;
  extractedChars: number;
  metadataTitle: string | null;
  metadataAuthor: string | null;
  failureReason: PdfExtractFailure;
};

export type PdfExtractRequest = {
  bytes: Uint8Array;
  claimOrQuestion?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  maximumPages?: number;
  maximumChars?: number;
  maximumPassages?: number;
};

const TOOL_AUTHOR = /\b(adobe|acrobat|microsoft|word|writer|chrome|safari|preview|quartz|itext|reportlab|pdftk|ghostscript|libreoffice)\b/i;

function asPrintable(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\u0000/g, "").trim();
  return trimmed || null;
}

function identifiableAuthor(value: string | null) {
  if (!value) return null;
  if (TOOL_AUTHOR.test(value)) return null;
  if (value.length < 3 || value.length > 80) return null;
  return value;
}

function pageBlock(pageNumber: number, text: string) {
  return `[page ${pageNumber}]\n\n${text.trim()}`;
}

function raceTimeout<T>(work: Promise<T>, timeoutMs: number, signal?: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const fail = (name: "TimeoutError" | "AbortError", message: string) => {
      const error = new Error(message);
      error.name = name;
      reject(error);
    };
    if (signal?.aborted) {
      fail("AbortError", "PDF parse aborted");
      return;
    }
    const timer = setTimeout(() => fail("TimeoutError", "PDF parse timeout"), timeoutMs);
    const onAbort = () => fail("AbortError", "PDF parse aborted");
    signal?.addEventListener("abort", onAbort, { once: true });
    work.then(resolve, reject).finally(() => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    });
  });
}

export async function extractBoundedPdfText(input: PdfExtractRequest): Promise<PdfExtractResult> {
  const empty = {
    ok: false,
    text: "",
    totalPages: 0,
    pagesInspected: 0,
    pagesWithMatches: 0,
    extractedChars: 0,
    metadataTitle: null as string | null,
    metadataAuthor: null as string | null,
    failureReason: "malformed" as PdfExtractFailure,
  };
  if (input.signal?.aborted) return { ...empty, failureReason: "timeout" };
  if (!bytesLookLikePdf(input.bytes)) return { ...empty, failureReason: "malformed" };
  const data = Uint8Array.from(input.bytes);
  const timeoutMs = input.timeoutMs ?? RESEARCH_LIMITS.maximumPdfParseMs;
  const maximumPages = input.maximumPages ?? RESEARCH_LIMITS.maximumPdfPages;
  const maximumChars = input.maximumChars ?? RESEARCH_LIMITS.maximumPdfExtractedTextChars;
  const maximumPassages = input.maximumPassages ?? RESEARCH_LIMITS.maximumPdfPassages;

  try {
    return await raceTimeout((async () => {
      const pdf = await getDocumentProxy(data, {
        isOffscreenCanvasSupported: false,
        disableAutoFetch: true,
        disableStream: true,
        stopAtErrors: true,
        verbosity: 0,
        isEvalSupported: false,
      } as NonNullable<Parameters<typeof getDocumentProxy>[1]> & { isEvalSupported?: boolean });
      try {
        const meta = await getMeta(pdf).catch(() => null);
        const info = (meta?.info ?? {}) as Record<string, unknown>;
        const metadataTitle = asPrintable(info.Title);
        const metadataAuthor = identifiableAuthor(asPrintable(info.Author) ?? asPrintable(info.Creator));
        const totalPages = Number(pdf.numPages) || 0;
        if (totalPages <= 0) return { ...empty, failureReason: "empty_text" };
        const inspect = Math.min(totalPages, Math.max(0, maximumPages));
        const blocks: string[] = [];
        let pagesWithMatches = 0;
        let pagesInspected = 0;
        for (let pageNumber = 1; pageNumber <= inspect; pageNumber += 1) {
          if (input.signal?.aborted) return { ...empty, totalPages, metadataTitle, metadataAuthor, failureReason: "timeout" };
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => (item && typeof item === "object" && "str" in item ? String((item as { str: string }).str) : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .replace(/\u0000/g, "")
            .trim();
          page.cleanup();
          pagesInspected += 1;
          if (!pageText) continue;
          const block = pageBlock(pageNumber, pageText);
          const next = blocks.length ? `${blocks.join("\n\n")}\n\n${block}` : block;
          if (next.length > maximumChars) {
            const remaining = maximumChars - (blocks.join("\n\n").length + (blocks.length ? 2 : 0));
            if (remaining > 40) blocks.push(block.slice(0, remaining).trim());
            break;
          }
          blocks.push(block);
          if (input.claimOrQuestion) {
            const match = matchClaimPassages(block, input.claimOrQuestion);
            if (match.excerpt) pagesWithMatches += 1;
            if (pagesWithMatches >= maximumPassages) break;
          }
        }
        const text = blocks.join("\n\n").trim();
        if (!text) return { ...empty, totalPages, pagesInspected, metadataTitle, metadataAuthor, failureReason: "empty_text" };
        return {
          ok: true,
          text,
          totalPages,
          pagesInspected,
          pagesWithMatches,
          extractedChars: text.length,
          metadataTitle,
          metadataAuthor,
          failureReason: null,
        };
      } finally {
        try {
          await pdf.cleanup();
        } catch {
          /* ignore */
        }
      }
    })(), timeoutMs, input.signal);
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError" || /timeout|aborted/i.test(error.message));
    return { ...empty, failureReason: timedOut ? "timeout" : "malformed" };
  }
}

/** Test-only fixture encoder. Produces a valid one-font PDF with uncompressed text. */
export function encodeSimplePdf(pages: string[], metadata: { title?: string; author?: string } = {}) {
  const objects: string[] = [];
  const pageCount = Math.max(1, pages.length);
  const fontId = 3 + pageCount * 2;
  const infoId = fontId + 1;
  const catalogId = 1;
  const pagesId = 2;
  const pageIds = Array.from({ length: pageCount }, (_, index) => 3 + index * 2);
  const contentIds = pageIds.map((id) => id + 1);
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const contentStreams = pages.map((text) => {
    const line = `BT /F1 12 Tf 72 720 Td (${escape(text.slice(0, 500))}) Tj ET`;
    return `<< /Length ${line.length} >>\nstream\n${line}\nendstream`;
  });
  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  for (let index = 0; index < pageCount; index += 1) {
    objects[pageIds[index]!] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[index]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
    objects[contentIds[index]!] = contentStreams[index] ?? `<< /Length 0 >>\nstream\n\nendstream`;
  }
  objects[fontId] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  const info: string[] = [];
  if (metadata.title) info.push(`/Title (${escape(metadata.title)})`);
  if (metadata.author) info.push(`/Author (${escape(metadata.author)})`);
  objects[infoId] = `<< ${info.join(" ")} >>`;
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id <= infoId; id += 1) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefAt = body.length;
  body += `xref\n0 ${infoId + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let id = 1; id <= infoId; id += 1) {
    body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${infoId + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}
