import type { CulinaryDomain } from "./source-policy.ts";
import type { CorpusHit } from "./corpus-types.ts";
import { sha256Hex, normalizeQuery } from "./checksum.ts";
import { corpusDailyRequestCeiling, corpusRetrievalEnabled, aiSearchInstanceId } from "./flags.ts";
import { RESEARCH_LIMITS } from "./limits.ts";
import type { D1DatabaseLike } from "../../../db/index.ts";
import { corpusFingerprint, getCache, insertResearchJob, insertResearchJobEvidence, publicSearchIndex, setCache } from "../../../db/corpus-repository.ts";
import { recordCorpusAnalytics } from "./analytics.ts";

export type CorpusRetriever = {
  id: "local" | "unavailable" | "cloudflare-ai-search";
  health(): Promise<{ ok: boolean; reason: string; remoteExercised: boolean }>;
  search(query: string, options?: RetrievalOptions): Promise<CorpusHit[]>;
};

export type RetrievalOptions = {
  domain?: CulinaryDomain;
  limit?: number;
  timeoutMs?: number;
  minimumScore?: number;
  db?: D1DatabaseLike;
};

const DOMAIN_BOOST: Partial<Record<CulinaryDomain, CulinaryDomain[]>> = {
  food_safety_public_health: ["food_safety_public_health"],
  nutrition_therapeutic_diets: ["nutrition_therapeutic_diets", "food_safety_public_health"],
  equipment: ["equipment"],
  business_licensing: ["business_licensing"],
  culinary_technique: ["culinary_technique"],
  commercial_claims: ["commercial_claims"],
};

let consecutiveFailures = 0;
let dailyCount = 0;
let dailyStamp = "";

export function resetRetrievalControls() {
  consecutiveFailures = 0;
  dailyCount = 0;
  dailyStamp = "";
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function budgetOk() {
  const stamp = todayStamp();
  if (dailyStamp !== stamp) {
    dailyStamp = stamp;
    dailyCount = 0;
  }
  if (dailyCount >= corpusDailyRequestCeiling()) return false;
  dailyCount += 1;
  return true;
}

function circuitOpen() {
  return consecutiveFailures >= 3;
}

function scoreHit(query: string, hit: CorpusHit, domain?: CulinaryDomain) {
  const terms = normalizeQuery(query).split(" ").filter((term) => term.length > 2);
  const hay = `${hit.title} ${hit.excerpt} ${hit.publisher}`.toLowerCase();
  const overlap = terms.filter((term) => hay.includes(term)).length;
  let score = terms.length ? overlap / terms.length : 0;
  if (domain && DOMAIN_BOOST[domain]?.includes(hit.domain)) score += 0.15;
  if (hit.authorityTier === 1) score += 0.1;
  return Math.min(1, score);
}

export function evidenceSupportsQuestion(excerpt: string, question: string) {
  const terms = normalizeQuery(question).split(" ").filter((term) => term.length > 3);
  const hay = excerpt.toLowerCase();
  return terms.some((term) => hay.includes(term));
}

export function createUnavailableRetriever(reason = "Curated corpus retrieval is not configured."): CorpusRetriever {
  return {
    id: "unavailable",
    async health() {
      return { ok: false, reason, remoteExercised: false };
    },
    async search() {
      return [];
    },
  };
}

export function createLocalRetriever(seed: CorpusHit[] = []): CorpusRetriever {
  return {
    id: "local",
    async health() {
      return { ok: true, reason: "Deterministic local corpus retriever.", remoteExercised: false };
    },
    async search(query, options = {}) {
      if (!shouldRetrieve(query)) return [];
      if (circuitOpen() || !budgetOk()) return [];
      const limit = Math.min(options.limit ?? 4, RESEARCH_LIMITS.maximumEvidenceItems);
      const minimum = options.minimumScore ?? 0.2;
      let rows = seed;
      if (options.db) rows = await publicSearchIndex(options.db);
      const ranked = rows
        .map((hit) => ({ ...hit, score: scoreHit(query, hit, options.domain) }))
        .filter((hit) => hit.ingestionStatus === "accepted" && hit.productionExposure && hit.score >= minimum)
        .filter((hit) => evidenceSupportsQuestion(hit.excerpt, query))
        .sort((left, right) => right.score - left.score || left.authorityTier - right.authorityTier)
        .slice(0, limit);
      consecutiveFailures = 0;
      return ranked;
    },
  };
}

export type AiSearchBinding = {
  get(id: string): {
    search(input: {
      query?: string;
      messages?: Array<{ role: string; content: string }>;
      ai_search_options?: { retrieval?: { max_num_results?: number; match_threshold?: number } };
    }): Promise<{ chunks?: Array<{ id?: string; text?: string; score?: number; filename?: string; metadata?: Record<string, unknown> }> }>;
  };
};

export function createCloudflareRetriever(binding: AiSearchBinding | null | undefined, instanceId: string | null): CorpusRetriever {
  if (!binding || !instanceId) return createUnavailableRetriever("Cloudflare AI Search binding or instance id is not configured.");
  return {
    id: "cloudflare-ai-search",
    async health() {
      return { ok: true, reason: "AI Search binding present. Remote search is not exercised unless corpus retrieval is enabled.", remoteExercised: false };
    },
    async search(query, options = {}) {
      if (!corpusRetrievalEnabled() || !shouldRetrieve(query)) return [];
      if (circuitOpen() || !budgetOk()) return [];
      const started = Date.now();
      try {
        const result = await Promise.race([
          binding.get(instanceId).search({
            query,
            ai_search_options: {
              retrieval: {
                max_num_results: Math.min(options.limit ?? 4, RESEARCH_LIMITS.maximumEvidenceItems),
                match_threshold: options.minimumScore ?? 0.2,
              },
            },
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("timeout")), options.timeoutMs ?? RESEARCH_LIMITS.maximumRuntimeMs);
          }),
        ]);
        consecutiveFailures = 0;
        recordCorpusAnalytics({
          retrievalAttempted: true,
          capability: "curated_corpus_retrieval",
          sourceCount: result.chunks?.length ?? 0,
          evidenceDomain: options.domain ?? null,
          cache: "miss",
          durationBucket: durationBucket(Date.now() - started),
          code: "ok",
        });
        return (result.chunks ?? []).map((chunk, index) => ({
          sourceId: String(chunk.metadata?.sourceId ?? chunk.filename ?? `remote:${index}`),
          sourceVersion: String(chunk.metadata?.sourceVersion ?? "unknown"),
          chunkId: String(chunk.id ?? `remote-chunk:${index}`),
          title: String(chunk.metadata?.title ?? chunk.filename ?? "Untitled"),
          publisher: String(chunk.metadata?.publisher ?? "Unknown"),
          authorityTier: 3,
          canonicalUrl: typeof chunk.metadata?.url === "string" ? chunk.metadata.url : null,
          excerpt: (chunk.text ?? "").slice(0, 400),
          heading: null,
          locator: null,
          score: chunk.score ?? 0,
          lastValidatedAt: null,
          productionExposure: false,
          domain: options.domain ?? "culinary_technique",
          jurisdiction: null,
          publishedDate: null,
          fixture: false,
          ingestionStatus: "awaiting_review",
        }));
      } catch {
        consecutiveFailures += 1;
        recordCorpusAnalytics({
          retrievalAttempted: true,
          capability: "research_unavailable",
          sourceCount: 0,
          evidenceDomain: options.domain ?? null,
          cache: "miss",
          durationBucket: durationBucket(Date.now() - started),
          code: "unavailable",
        });
        return [];
      }
    },
  };
}

export function resolveCorpusRetriever(options: { localHits?: CorpusHit[]; binding?: AiSearchBinding | null } = {}): CorpusRetriever {
  if (!corpusRetrievalEnabled()) return createUnavailableRetriever("CHEF_GRINGO_CORPUS_RETRIEVAL_ENABLED is off.");
  const env = (globalThis as typeof globalThis & { __CHEF_GRINGO_ENV__?: { AI_SEARCH?: AiSearchBinding } }).__CHEF_GRINGO_ENV__;
  if (options.binding || env?.AI_SEARCH) return createCloudflareRetriever(options.binding ?? env?.AI_SEARCH, aiSearchInstanceId());
  if (options.localHits) return createLocalRetriever(options.localHits);
  return createLocalRetriever();
}

export function shouldRetrieve(query: string) {
  const text = query.trim();
  if (text.length < 8) return false;
  if (/https?:\/\/|buy now|crypto|password|api[_-]?key/i.test(text) && text.length < 20) return false;
  return true;
}

export function durationBucket(ms: number) {
  if (ms < 50) return "0-50ms";
  if (ms < 200) return "50-200ms";
  if (ms < 1000) return "200-1000ms";
  return "1000ms+";
}

export async function retrieveWithCache(retriever: CorpusRetriever, query: string, options: RetrievalOptions = {}) {
  const started = Date.now();
  const db = options.db;
  const normalized = normalizeQuery(query);
  const queryHash = await sha256Hex(normalized);
  if (db) {
    const corpusVersion = await corpusFingerprint(db);
    const cacheKey = await sha256Hex(`${queryHash}|${corpusVersion}|${options.domain ?? ""}`);
    const cached = await getCache(db, cacheKey);
    if (cached) {
      recordCorpusAnalytics({ retrievalAttempted: true, capability: "curated_corpus_retrieval", sourceCount: cached.length, evidenceDomain: options.domain ?? null, cache: "hit", durationBucket: durationBucket(Date.now() - started), code: "ok" });
      return { hits: cached, cacheHit: true, queryHash };
    }
    const hits = await retriever.search(query, options);
    await setCache(db, cacheKey, corpusVersion, hits, 60_000);
    const jobId = `rjob:${crypto.randomUUID()}`;
    await insertResearchJob(db, { id: jobId, queryHash, evidenceDomain: options.domain ?? null, capability: hits.length ? "curated_corpus_retrieval" : "research_unavailable", sourceCount: hits.length, cacheHit: false, durationMs: Date.now() - started, errorCode: null });
    await insertResearchJobEvidence(db, jobId, hits);
    recordCorpusAnalytics({ retrievalAttempted: true, capability: hits.length ? "curated_corpus_retrieval" : "research_unavailable", sourceCount: hits.length, evidenceDomain: options.domain ?? null, cache: "miss", durationBucket: durationBucket(Date.now() - started), code: "ok" });
    return { hits, cacheHit: false, queryHash };
  }
  const hits = await retriever.search(query, options);
  recordCorpusAnalytics({ retrievalAttempted: true, capability: hits.length ? "curated_corpus_retrieval" : "research_unavailable", sourceCount: hits.length, evidenceDomain: options.domain ?? null, cache: "miss", durationBucket: durationBucket(Date.now() - started), code: "ok" });
  return { hits, cacheHit: false, queryHash };
}
