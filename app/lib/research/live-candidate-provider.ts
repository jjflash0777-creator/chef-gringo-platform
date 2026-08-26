import { extractReadableContent } from "./chunker.ts";
import { fetchGovernedDocument, type GovernedFetch } from "./fetch-document.ts";
import { RESEARCH_LIMITS } from "./limits.ts";
import type { CandidateDiscoveryProvider, CandidateSearchRequest, DiscoveredDocumentHit } from "./candidate-discovery-provider.ts";
import { canonicalizeSearchHit, createConfiguredLiveSearchClient, defaultLiveFetch, asLiveSearchOutcome, type LiveSearchClient } from "./live-search-client.ts";
import { LIVE_CANDIDATE_DISCOVERY_PROVIDER_ID } from "../../growth/social/candidate-discovery-capability.ts";
import {
  LIVE_DOCUMENT_FETCH_CONCURRENCY,
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

export function classifyLiveSourceType(input: { hostname: string; url: string; title: string }) {
  const host = input.hostname.replace(/^www\./, "").toLowerCase();
  const hay = `${host} ${input.url} ${input.title}`.toLowerCase();
  if (host.endsWith(".gov") || host.endsWith(".mil") || host.includes(".gov.")) return "regulatory_document";
  if (/affiliate|deals|coupon|shop-now|sponsored/.test(hay)) return "affiliate_page";
  if (/\b(blog|forum|medium\.com|wordpress|substack)\b/.test(hay)) return "editorial";
  if (/\b(manual|datasheet|spec|technical|application note|bulletin)\b/.test(hay)) return "manufacturer_documentation";
  return "professional_practice";
}

function looksLikePdf(contentType: string | null, bytes: string) {
  const type = (contentType ?? "").toLowerCase();
  return type.includes("application/pdf") || bytes.startsWith("%PDF");
}

function garbled(text: string) {
  if (!text.trim()) return true;
  const printable = text.replace(/[\s\w.,;:'"!?()/-]/g, "");
  return text.length >= 40 && printable.length / text.length > 0.35;
}

export function createLiveCandidateProvider(options: {
  search?: LiveSearchClient;
  fetchImpl?: GovernedFetch;
} = {}): CandidateDiscoveryProvider {
  const fetchImpl = options.fetchImpl ?? defaultLiveFetch();
  const search = options.search ?? createConfiguredLiveSearchClient(fetchImpl);
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
        const cap = Math.min(Math.max(0, request.maximumHits), RESEARCH_LIMITS.maximumCandidates);
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
          if (accepted.length + fetchQueue.length >= cap) break;
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
            };
          }
          if (account) account.retrievalAttemptedCount += 1;
          const fetched = await fetchGovernedDocument(job.canonicalUrl, fetchImpl, {
            maxHops: 3,
            signal: controller.signal,
          });
          if (!fetched.ok || !fetched.text) {
            const status = fetched.issues.includes("timeout")
              ? "timeout" as const
              : fetched.issues.includes("oversized")
                ? "oversized" as const
                : fetched.issues.includes("unsafe_protocol") || fetched.issues.includes("private_network") || fetched.issues.includes("credentials_in_url") || fetched.issues.includes("redirect_to_blocked")
                  ? "blocked" as const
                  : "failed" as const;
            if (account) {
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
            };
          }
          if (looksLikePdf(fetched.contentType, fetched.text)) {
            if (account) {
              recordLiveExclusion(account, {
                url: fetched.finalUrl ?? job.canonicalUrl,
                title: job.hit.title,
                query: request.query,
                stage: "extraction",
                reason: "PDF retrieval is not extractable in this bounded adapter.",
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
            };
          }
          const readable = extractReadableContent({ mimeType: fetched.contentType ?? "text/html", text: fetched.text });
          if (!readable.text || garbled(readable.text)) {
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
            };
          }
          if (account) account.retrievalSuccessCount += 1;
          return {
            canonicalUrl: fetched.finalUrl ?? job.canonicalUrl,
            title: job.hit.title || publisherFromHost(job.hostname),
            publisher: publisherFromHost(job.hostname),
            sourceType: job.sourceType,
            retrievedText: readable.text,
            provenanceMethod: "live_fetch" as const,
            query: request.query,
            resultUrl: job.hit.url,
            retrievalStatus: "ok" as const,
            excerptLocator: readable.flags.htmlPresent ? "html:stripped" : "body",
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
