import { extractReadableContent } from "./chunker.ts";
import {
  emptyExtractionDiagnostics,
  type CandidateExtractionDiagnostics,
} from "./extraction-diagnostics.ts";
import { fetchGovernedDocument, type GovernedFetch } from "./fetch-document.ts";
import { capExtractedText } from "./html-extract.ts";
import { RESEARCH_LIMITS } from "./limits.ts";
import { looksLikePdf } from "./pdf-detect.ts";
import { extractBoundedPdfText, type PdfExtractResult } from "./pdf-extract.ts";
import type { CandidateDiscoveryProvider, CandidateSearchRequest, DiscoveredDocumentHit } from "./candidate-discovery-provider.ts";
import { canonicalizeSearchHit, createConfiguredLiveSearchClient, defaultLiveFetch, asLiveSearchOutcome, type LiveSearchClient } from "./live-search-client.ts";
import { LIVE_CANDIDATE_DISCOVERY_PROVIDER_ID } from "../../growth/social/candidate-discovery-capability.ts";
import {
  LIVE_DOCUMENT_FETCH_CONCURRENCY,
  LIVE_PDF_MIN_BUDGET_MS,
  recordLiveExclusion,
} from "./live-retrieval-diagnostics.ts";

function remainingMs(startedAtMs: number, maximumRuntimeMs: number) {
  return Math.max(0, maximumRuntimeMs - (Date.now() - startedAtMs));
}

async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const limit = Math.max(1, concurrency);
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

function publisherFromHost(hostname: string) {
  const base = hostname.replace(/^www\./, "").split(".")[0] ?? hostname;
  return base.replace(/[-_]+/g, " ").replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function publisherKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function publishersLookDistinct(author: string, hostPublisher: string) {
  const a = publisherKey(author);
  const h = publisherKey(hostPublisher);
  if (!a || !h || a === h) return false;
  if (a.includes(h) || h.includes(a)) return false;
  return true;
}

const TECHNICAL_DOCUMENTATION = /\b(owner'?s?\s+manual|service\s+manual|installation\s+manual|user\s+manual|operator'?s?\s+manual|datasheet|data[\s-]?sheet|spec[\s-]?sheet|specifications?|application[\s-]?notes?|application[\s-]?guides?|installation[\s-]?guides?|technical\s+bulletins?|product\s+bulletins?|installation\s+instructions?)\b/i;
const EDITORIAL_EDUCATION = /\b(understanding|what\s+is|how\s+to|learn|explainer|faq|blog|education|sizing\s+guide|buyer'?s?\s+guide|complete\s+guide|ultimate\s+guide)\b/i;
const DISTRIBUTOR = /\b(distributor|wholesale|dealer|supply-house|supplyhouse|reseller)\b/i;
const RECOGNIZED_ORG = /\b(ieee\.org|nfpa\.org|asme\.org|iec\.ch|ul\.com|ansi\.org|ashrae\.org|sae\.org)\b/i;

export function classifyLiveSourceDetails(input: {
  hostname: string;
  url: string;
  title: string;
  metadataTitle?: string | null;
  metadataAuthor?: string | null;
}) {
  const host = input.hostname.replace(/^www\./, "").toLowerCase();
  const hay = `${host} ${input.url} ${input.title} ${input.metadataTitle ?? ""} ${input.metadataAuthor ?? ""}`.toLowerCase();
  const hostPublisher = publisherFromHost(input.hostname);
  const authorPublisher = input.metadataAuthor?.trim() || null;
  const hostedOem = Boolean(authorPublisher && publishersLookDistinct(authorPublisher, hostPublisher));
  if (host.endsWith(".gov") || host.endsWith(".mil") || host.includes(".gov.")) {
    return { sourceType: "regulatory_document", publisher: hostPublisher };
  }
  if (host.endsWith(".edu")) return { sourceType: "educational_institution", publisher: hostPublisher };
  if (RECOGNIZED_ORG.test(hay)) return { sourceType: "professional_organization_guidance", publisher: hostPublisher };
  if (/affiliate|deals|coupon|shop-now|sponsored/.test(hay)) return { sourceType: "affiliate_page", publisher: hostPublisher };
  if (/\b(forum|medium\.com|wordpress|substack)\b/.test(hay)) return { sourceType: "editorial", publisher: hostPublisher };
  const technical = TECHNICAL_DOCUMENTATION.test(hay);
  const editorial = EDITORIAL_EDUCATION.test(hay);
  const distributor = DISTRIBUTOR.test(hay) || hostedOem;
  if (technical) {
    return {
      sourceType: distributor ? "distributor_documentation" : "manufacturer_documentation",
      publisher: authorPublisher ?? hostPublisher,
    };
  }
  if (editorial) {
    return {
      sourceType: distributor ? "distributor_editorial" : "manufacturer_editorial",
      publisher: hostPublisher,
    };
  }
  if (distributor) return { sourceType: "distributor_editorial", publisher: hostPublisher };
  return { sourceType: "manufacturer_editorial", publisher: hostPublisher };
}

export function classifyLiveSourceType(input: {
  hostname: string;
  url: string;
  title: string;
  metadataTitle?: string | null;
  metadataAuthor?: string | null;
}) {
  return classifyLiveSourceDetails(input).sourceType;
}

function garbled(text: string) {
  if (!text.trim()) return true;
  const printable = text.replace(/[\s\w.,;:'"!?()/-]/g, "");
  return text.length >= 40 && printable.length / text.length > 0.35;
}

function extractionOf(input: Partial<CandidateExtractionDiagnostics>): CandidateExtractionDiagnostics {
  return { ...emptyExtractionDiagnostics(), ...input };
}

function utf8Bytes(text: string) {
  return new TextEncoder().encode(text).length;
}

export function createLiveCandidateProvider(options: {
  search?: LiveSearchClient;
  fetchImpl?: GovernedFetch;
  extractPdf?: (input: Parameters<typeof extractBoundedPdfText>[0]) => Promise<PdfExtractResult>;
} = {}): CandidateDiscoveryProvider {
  const fetchImpl = options.fetchImpl ?? defaultLiveFetch();
  const search = options.search ?? createConfiguredLiveSearchClient(fetchImpl);
  const extractPdf = options.extractPdf ?? extractBoundedPdfText;
  return {
    id: LIVE_CANDIDATE_DISCOVERY_PROVIDER_ID,
    kind: "live",
    async search(request: CandidateSearchRequest) {
      const account = request.account;
      const budget = remainingMs(request.startedAtMs, request.maximumRuntimeMs);
      if (budget <= 0) {
        if (account) account.queriesSkippedForRuntime += 1;
        return [];
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(budget, RESEARCH_LIMITS.maximumRuntimeMs));
      try {
        const fetchCap = Math.min(
          Math.max(0, request.maximumFetches ?? request.maximumHits),
          RESEARCH_LIMITS.maximumUrlAttemptsPerQuery,
          RESEARCH_LIMITS.maximumUrlAttempts,
        );
        const cap = Math.min(Math.max(0, request.maximumHits), RESEARCH_LIMITS.maximumSearchHitsPerQuery);
        if (account) account.providerCallCount += 1;
        let outcome;
        try {
          outcome = asLiveSearchOutcome(await search.search(request.query, cap, controller.signal));
        } catch (error) {
          const aborted = controller.signal.aborted || (error instanceof Error && error.name === "AbortError");
          if (aborted) {
            if (account) {
              recordLiveExclusion(account, {
                url: null,
                title: null,
                query: request.query,
                stage: "runtime",
                reason: "Provider search aborted by the research runtime bound.",
                retrievalStatus: "timeout",
                countStatus: true,
              });
            }
            return [];
          }
          throw error;
        }
        if (account) {
          account.rawResultCount += outcome.rawResultCount;
          account.normalizedHitCount += outcome.hits.length;
          if (outcome.parseFailed) {
            recordLiveExclusion(account, {
              url: null,
              title: null,
              query: request.query,
              stage: "provider",
              reason: "Provider response was not JSON.",
              retrievalStatus: null,
            });
          } else if (outcome.rawResultCount === 0) {
            recordLiveExclusion(account, {
              url: null,
              title: null,
              query: request.query,
              stage: "provider",
              reason: "Provider returned no web results.",
              retrievalStatus: null,
            });
          }
        }
        const accepted: DiscoveredDocumentHit[] = [];
        const seenUrl = new Set<string>();
        const ranked = [...outcome.hits].sort((left, right) => {
          const leftHost = (() => { try { return new URL(left.url).hostname; } catch { return ""; } })();
          const rightHost = (() => { try { return new URL(right.url).hostname; } catch { return ""; } })();
          const score = (host: string, title: string) => {
            if (/\.gov$|\.mil$/.test(host.replace(/^www\./, ""))) return 0;
            if (/affiliate|deals|coupon/.test(`${host} ${title}`.toLowerCase())) return 2;
            return 1;
          };
          return score(leftHost, left.title) - score(rightHost, right.title);
        });
        type FetchJob = {
          hit: (typeof ranked)[number];
          canonicalUrl: string;
          hostname: string;
          sourceType: string;
        };
        const fetchQueue: FetchJob[] = [];
        for (const hit of ranked) {
          if (fetchQueue.length >= fetchCap) break;
          const normalized = canonicalizeSearchHit(hit);
          if (!normalized.safety.ok || !normalized.canonicalUrl) {
            if (account) {
              account.blockedCount += 1;
              recordLiveExclusion(account, {
                url: hit.url,
                title: hit.title,
                query: request.query,
                stage: "url_policy",
                reason: `URL rejected: ${normalized.safety.issues.join(", ") || "unsafe"}.`,
                retrievalStatus: "blocked",
              });
            }
            accepted.push({
              canonicalUrl: hit.url,
              title: hit.title,
              publisher: "unknown",
              sourceType: "user_submitted",
              retrievedText: "",
              provenanceMethod: "live_fetch",
              query: request.query,
              resultUrl: hit.url,
              retrievalStatus: "blocked",
              excerptLocator: null,
              extraction: extractionOf({ passageMissReason: "retrieval_unusable" }),
            });
            continue;
          }
          if (account) account.urlSafeCount += 1;
          if (seenUrl.has(normalized.canonicalUrl)) {
            if (account) {
              recordLiveExclusion(account, {
                url: normalized.canonicalUrl,
                title: hit.title,
                query: request.query,
                stage: "dedupe",
                reason: "Duplicate canonical URL in this query.",
                retrievalStatus: null,
              });
            }
            continue;
          }
          seenUrl.add(normalized.canonicalUrl);
          if (account) account.deduplicatedCount += 1;
          fetchQueue.push({
            hit,
            canonicalUrl: normalized.canonicalUrl,
            hostname: normalized.safety.hostname ?? "",
            sourceType: classifyLiveSourceType({
              hostname: normalized.safety.hostname ?? "",
              url: normalized.canonicalUrl,
              title: hit.title,
            }),
          });
        }
        const fetchedHits = await mapPool(fetchQueue, LIVE_DOCUMENT_FETCH_CONCURRENCY, async (job) => {
          if (remainingMs(request.startedAtMs, request.maximumRuntimeMs) <= 0) {
            if (account) {
              recordLiveExclusion(account, {
                url: job.canonicalUrl,
                title: job.hit.title,
                query: request.query,
                stage: "runtime",
                reason: "Runtime exhausted before retrieval.",
                retrievalStatus: "timeout",
                countStatus: true,
              });
            }
            return {
              canonicalUrl: job.canonicalUrl,
              title: job.hit.title,
              publisher: publisherFromHost(job.hostname),
              sourceType: job.sourceType,
              retrievedText: "",
              provenanceMethod: "live_fetch" as const,
              query: request.query,
              resultUrl: job.hit.url,
              retrievalStatus: "timeout" as const,
              excerptLocator: null,
              extraction: extractionOf({ passageMissReason: "retrieval_unusable" }),
            };
          }
          if (account) {
            account.retrievalAttemptedCount += 1;
            account.urlAttemptCount += 1;
          }
          const fetched = await fetchGovernedDocument(job.canonicalUrl, fetchImpl, {
            maxHops: 3,
            signal: controller.signal,
          });
          if (!fetched.ok || (!fetched.text && !fetched.pdfDetected)) {
            const status = fetched.issues.includes("timeout")
              ? "timeout" as const
              : fetched.issues.includes("oversized")
                ? "oversized" as const
                : fetched.issues.includes("unsafe_protocol") || fetched.issues.includes("private_network") || fetched.issues.includes("credentials_in_url") || fetched.issues.includes("redirect_to_blocked")
                  ? "blocked" as const
                  : "failed" as const;
            if (account) {
              if (fetched.pdfDetected) account.pdfDetectedCount += 1;
              recordLiveExclusion(account, {
                url: job.canonicalUrl,
                title: job.hit.title,
                query: request.query,
                stage: status === "timeout" ? "runtime" : "retrieval",
                reason: `Retrieval ${status}: ${fetched.issues.join(", ") || status}.`,
                retrievalStatus: status,
                countStatus: true,
              });
            }
            return {
              canonicalUrl: job.canonicalUrl,
              title: job.hit.title,
              publisher: publisherFromHost(job.hostname),
              sourceType: job.sourceType,
              retrievedText: "",
              provenanceMethod: "live_fetch" as const,
              query: request.query,
              resultUrl: job.hit.url,
              retrievalStatus: status,
              excerptLocator: null,
              extraction: extractionOf({
                contentType: fetched.contentType,
                rawBytes: fetched.rawBytes,
                pdfDetected: fetched.pdfDetected,
                pdfBytes: fetched.rawBytes,
                passageMissReason: "retrieval_unusable",
              }),
            };
          }
          const pdf = fetched.pdfDetected || looksLikePdf({
            url: fetched.finalUrl ?? job.canonicalUrl,
            contentType: fetched.contentType,
            bytes: fetched.bytes ?? fetched.text,
          });
          if (pdf) {
            if (account) account.pdfDetectedCount += 1;
            const remaining = remainingMs(request.startedAtMs, request.maximumRuntimeMs);
            if (!fetched.bytes || remaining < LIVE_PDF_MIN_BUDGET_MS) {
              if (account) {
                account.pdfUnextractableCount += 1;
                recordLiveExclusion(account, {
                  url: fetched.finalUrl ?? job.canonicalUrl,
                  title: job.hit.title,
                  query: request.query,
                  stage: remaining < LIVE_PDF_MIN_BUDGET_MS ? "runtime" : "extraction",
                  reason: remaining < LIVE_PDF_MIN_BUDGET_MS
                    ? "PDF parse skipped because the remaining research budget is too small."
                    : "PDF bytes were not available for bounded extraction.",
                  retrievalStatus: remaining < LIVE_PDF_MIN_BUDGET_MS ? "timeout" : "unextractable",
                  countStatus: true,
                });
              }
              return {
                canonicalUrl: fetched.finalUrl ?? job.canonicalUrl,
                title: job.hit.title,
                publisher: publisherFromHost(job.hostname),
                sourceType: job.sourceType,
                retrievedText: "",
                provenanceMethod: "live_fetch" as const,
                query: request.query,
                resultUrl: job.hit.url,
                retrievalStatus: remaining < LIVE_PDF_MIN_BUDGET_MS ? "timeout" as const : "unextractable" as const,
                excerptLocator: null,
                extraction: extractionOf({
                  contentType: fetched.contentType,
                  rawBytes: fetched.rawBytes,
                  extractionMethod: "pdf_unsupported",
                  pdfDetected: true,
                  pdfBytes: fetched.rawBytes,
                  passageMissReason: remaining < LIVE_PDF_MIN_BUDGET_MS ? "pdf_timeout" : "pdf_unsupported",
                  parserFailureReason: remaining < LIVE_PDF_MIN_BUDGET_MS ? "timeout" : "malformed",
                }),
              };
            }
            const parsed = await extractPdf({
              bytes: fetched.bytes,
              claimOrQuestion: request.claimOrQuestion,
              signal: controller.signal,
              timeoutMs: Math.min(RESEARCH_LIMITS.maximumPdfParseMs, remaining),
            });
            if (!parsed.ok || garbled(parsed.text)) {
              if (account) {
                account.pdfUnextractableCount += 1;
                recordLiveExclusion(account, {
                  url: fetched.finalUrl ?? job.canonicalUrl,
                  title: job.hit.title,
                  query: request.query,
                  stage: parsed.failureReason === "timeout" ? "runtime" : "extraction",
                  reason: `PDF extraction failed: ${parsed.failureReason || "unreadable"}.`,
                  retrievalStatus: parsed.failureReason === "timeout" ? "timeout" : "unextractable",
                  countStatus: true,
                });
              }
              return {
                canonicalUrl: fetched.finalUrl ?? job.canonicalUrl,
                title: job.hit.title,
                publisher: publisherFromHost(job.hostname),
                sourceType: job.sourceType,
                retrievedText: "",
                provenanceMethod: "live_fetch" as const,
                query: request.query,
                resultUrl: job.hit.url,
                retrievalStatus: parsed.failureReason === "timeout" ? "timeout" as const : "unextractable" as const,
                excerptLocator: null,
                extraction: extractionOf({
                  contentType: fetched.contentType,
                  rawBytes: fetched.rawBytes,
                  extractionMethod: "pdf_unsupported",
                  pdfDetected: true,
                  pdfBytes: fetched.rawBytes,
                  pagesInspected: parsed.pagesInspected,
                  pagesWithMatches: parsed.pagesWithMatches,
                  passageMissReason: parsed.failureReason === "timeout" ? "pdf_timeout" : "pdf_unsupported",
                  parserFailureReason: parsed.failureReason,
                }),
              };
            }
            const classified = classifyLiveSourceDetails({
              hostname: job.hostname,
              url: fetched.finalUrl ?? job.canonicalUrl,
              title: job.hit.title,
              metadataTitle: parsed.metadataTitle,
              metadataAuthor: parsed.metadataAuthor,
            });
            if (account) {
              account.pdfParsedCount += 1;
              account.retrievalSuccessCount += 1;
            }
            return {
              canonicalUrl: fetched.finalUrl ?? job.canonicalUrl,
              title: job.hit.title || classified.publisher,
              publisher: classified.publisher,
              sourceType: classified.sourceType,
              retrievedText: parsed.text,
              provenanceMethod: "live_fetch" as const,
              query: request.query,
              resultUrl: job.hit.url,
              retrievalStatus: "ok" as const,
              excerptLocator: parsed.pagesInspected ? "page:1" : "body",
              independencePublisher: classified.publisher,
              extraction: extractionOf({
                contentType: fetched.contentType,
                rawBytes: fetched.rawBytes,
                extractedChars: parsed.extractedChars,
                extractedBytes: utf8Bytes(parsed.text),
                extractionMethod: "pdf_text",
                pdfDetected: true,
                pdfBytes: fetched.rawBytes,
                pagesInspected: parsed.pagesInspected,
                pagesWithMatches: parsed.pagesWithMatches,
              }),
            };
          }
          const readable = extractReadableContent({ mimeType: fetched.contentType ?? "text/html", text: fetched.text ?? "" });
          const retained = capExtractedText(readable.text, RESEARCH_LIMITS.maximumExtractedTextChars);
          const method = readable.flags.htmlPresent ? "html_article" as const : "plaintext" as const;
          if (!retained || garbled(retained)) {
            if (account) {
              recordLiveExclusion(account, {
                url: fetched.finalUrl ?? job.canonicalUrl,
                title: job.hit.title,
                query: request.query,
                stage: "extraction",
                reason: "Retrieved bytes were empty or unreadable after extraction.",
                retrievalStatus: "unextractable",
                countStatus: true,
              });
            }
            return {
              canonicalUrl: fetched.finalUrl ?? job.canonicalUrl,
              title: job.hit.title,
              publisher: publisherFromHost(job.hostname),
              sourceType: job.sourceType,
              retrievedText: "",
              provenanceMethod: "live_fetch" as const,
              query: request.query,
              resultUrl: job.hit.url,
              retrievalStatus: "unextractable" as const,
              excerptLocator: null,
              extraction: extractionOf({
                contentType: fetched.contentType,
                rawBytes: fetched.rawBytes,
                extractedChars: retained.length,
                extractedBytes: utf8Bytes(retained),
                extractionMethod: method,
                passageMissReason: "unreadable_after_extraction",
              }),
            };
          }
          if (account) account.retrievalSuccessCount += 1;
          return {
            canonicalUrl: fetched.finalUrl ?? job.canonicalUrl,
            title: job.hit.title || publisherFromHost(job.hostname),
            publisher: publisherFromHost(job.hostname),
            sourceType: job.sourceType,
            retrievedText: retained,
            provenanceMethod: "live_fetch" as const,
            query: request.query,
            resultUrl: job.hit.url,
            retrievalStatus: "ok" as const,
            excerptLocator: readable.flags.htmlPresent ? "html:article" : "body",
            extraction: extractionOf({
              contentType: fetched.contentType,
              rawBytes: fetched.rawBytes,
              extractedChars: retained.length,
              extractedBytes: utf8Bytes(retained),
              extractionMethod: method,
            }),
          };
        });
        accepted.push(...fetchedHits);
        return accepted;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
