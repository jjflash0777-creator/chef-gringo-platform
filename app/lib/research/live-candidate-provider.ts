import { extractReadableContent } from "./chunker.ts";
import { fetchGovernedDocument, type GovernedFetch } from "./fetch-document.ts";
import { RESEARCH_LIMITS } from "./limits.ts";
import type { CandidateDiscoveryProvider, CandidateSearchRequest, DiscoveredDocumentHit } from "./candidate-discovery-provider.ts";
import { canonicalizeSearchHit, createConfiguredLiveSearchClient, defaultLiveFetch, type LiveSearchClient } from "./live-search-client.ts";
import { LIVE_CANDIDATE_DISCOVERY_PROVIDER_ID } from "../../growth/social/candidate-discovery-capability.ts";

function remainingMs(startedAtMs: number, maximumRuntimeMs: number) {
  return Math.max(0, maximumRuntimeMs - (Date.now() - startedAtMs));
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
      const budget = remainingMs(request.startedAtMs, request.maximumRuntimeMs);
      if (budget <= 0) return [];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.min(budget, RESEARCH_LIMITS.maximumRuntimeMs));
      try {
        const cap = Math.min(Math.max(0, request.maximumHits), RESEARCH_LIMITS.maximumCandidates);
        const rawHits = await search.search(request.query, cap, controller.signal);
        const accepted: DiscoveredDocumentHit[] = [];
        const seenUrl = new Set<string>();
        const ranked = [...rawHits].sort((left, right) => {
          const leftHost = (() => { try { return new URL(left.url).hostname; } catch { return ""; } })();
          const rightHost = (() => { try { return new URL(right.url).hostname; } catch { return ""; } })();
          const score = (host: string, title: string) => {
            if (/\.gov$|\.mil$/.test(host.replace(/^www\./, ""))) return 0;
            if (/affiliate|deals|coupon/.test(`${host} ${title}`.toLowerCase())) return 2;
            return 1;
          };
          return score(leftHost, left.title) - score(rightHost, right.title);
        });
        for (const hit of ranked) {
          if (accepted.length >= cap) break;
          if (remainingMs(request.startedAtMs, request.maximumRuntimeMs) <= 0) break;
          const normalized = canonicalizeSearchHit(hit);
          if (!normalized.safety.ok || !normalized.canonicalUrl) {
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
          if (seenUrl.has(normalized.canonicalUrl)) continue;
          seenUrl.add(normalized.canonicalUrl);
          const hostname = normalized.safety.hostname ?? "";
          const sourceType = classifyLiveSourceType({ hostname, url: normalized.canonicalUrl, title: hit.title });
          const fetched = await fetchGovernedDocument(normalized.canonicalUrl, fetchImpl, {
            maxHops: 3,
            signal: controller.signal,
          });
          if (!fetched.ok || !fetched.text) {
            const status = fetched.issues.includes("timeout")
              ? "timeout"
              : fetched.issues.includes("oversized")
                ? "oversized"
                : fetched.issues.includes("unsafe_protocol") || fetched.issues.includes("private_network") || fetched.issues.includes("credentials_in_url") || fetched.issues.includes("redirect_to_blocked")
                  ? "blocked"
                  : "failed";
            accepted.push({
              canonicalUrl: normalized.canonicalUrl,
              title: hit.title,
              publisher: publisherFromHost(hostname),
              sourceType,
              retrievedText: "",
              provenanceMethod: "live_fetch",
              query: request.query,
              resultUrl: hit.url,
              retrievalStatus: status,
              excerptLocator: null,
            });
            continue;
          }
          if (looksLikePdf(fetched.contentType, fetched.text)) {
            accepted.push({
              canonicalUrl: fetched.finalUrl ?? normalized.canonicalUrl,
              title: hit.title,
              publisher: publisherFromHost(hostname),
              sourceType,
              retrievedText: "",
              provenanceMethod: "live_fetch",
              query: request.query,
              resultUrl: hit.url,
              retrievalStatus: "unextractable",
              excerptLocator: null,
            });
            continue;
          }
          const readable = extractReadableContent({ mimeType: fetched.contentType ?? "text/html", text: fetched.text });
          if (!readable.text || garbled(readable.text)) {
            accepted.push({
              canonicalUrl: fetched.finalUrl ?? normalized.canonicalUrl,
              title: hit.title,
              publisher: publisherFromHost(hostname),
              sourceType,
              retrievedText: "",
              provenanceMethod: "live_fetch",
              query: request.query,
              resultUrl: hit.url,
              retrievalStatus: "unextractable",
              excerptLocator: null,
            });
            continue;
          }
          accepted.push({
            canonicalUrl: fetched.finalUrl ?? normalized.canonicalUrl,
            title: hit.title || publisherFromHost(hostname),
            publisher: publisherFromHost(hostname),
            sourceType,
            retrievedText: readable.text,
            provenanceMethod: "live_fetch",
            query: request.query,
            resultUrl: hit.url,
            retrievalStatus: "ok",
            excerptLocator: readable.flags.htmlPresent ? "html:stripped" : "body",
          });
        }
        return accepted;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
