import type { CandidateDiscoveryProvider, CandidateSearchRequest, DiscoveredDocumentHit } from "./candidate-discovery-provider.ts";
import { CANDIDATE_DISCOVERY_PROVIDER_ID } from "../../growth/social/candidate-discovery-capability.ts";

/**
 * Deterministic on-file hits. Structurally equivalent to a manufacturer
 * capacity/headroom gap (primary manufacturer + same-publisher page +
 * independent manufacturer + affiliate lead + contradiction). Brand names
 * here are fixtures only and are not production policy.
 */
const FIXTURE_CATALOG: Array<Omit<DiscoveredDocumentHit, "query"> & { tags: string[] }> = [
  {
    canonicalUrl: "https://www.northwind-power.example/technical/operating-headroom",
    title: "Northwind Power Systems operating headroom bulletin",
    publisher: "Northwind Power Systems",
    sourceType: "manufacturer_documentation",
    publishedDate: "2024-03-01",
    provenanceMethod: "test_fixture",
    retrievedText: "Northwind Power Systems technical bulletin: standby generators should be sized with operating headroom above continuous running load. Under these conditions, recommended operating headroom is evidenced from the connected-load calculation, not a sales buffer.",
    tags: ["manufacturer", "technical", "headroom", "generator", "manual"],
  },
  {
    canonicalUrl: "https://www.northwind-power.example/accessories/transfer-notes",
    title: "Northwind Power Systems accessory transfer notes",
    publisher: "Northwind Power Systems",
    sourceType: "manufacturer_documentation",
    publishedDate: "2024-04-12",
    provenanceMethod: "test_fixture",
    retrievedText: "Northwind Power Systems accessory guide restates the same manufacturer sizing notes. This second Northwind page does not constitute independent corroboration of operating headroom.",
    tags: ["manufacturer", "technical", "headroom", "accessory", "manual"],
  },
  {
    canonicalUrl: "https://www.peakload-deals.example/buy-bigger-generators",
    title: "PeakLoad Deals: buy a bigger generator",
    publisher: "PeakLoad Deals",
    sourceType: "affiliate_page",
    publishedDate: "2025-01-08",
    provenanceMethod: "test_fixture",
    retrievedText: "PeakLoad Deals is an affiliate blog. Buy a bigger generator today. Commission and EPC claims are marketing copy and are not technical evidence for operating headroom.",
    tags: ["affiliate", "blog", "generator", "editorial"],
  },
  {
    canonicalUrl: "https://www.harbor-industrial.example/application-notes/headroom",
    title: "Harbor Industrial Power application note on operating headroom",
    publisher: "Harbor Industrial Power",
    sourceType: "manufacturer_documentation",
    publishedDate: "2023-11-20",
    provenanceMethod: "test_fixture",
    retrievedText: "Harbor Industrial Power application note: recommended operating headroom should be evidenced from independent load analysis. Under these conditions, technically appropriate headroom is documented separately from any single manufacturer's marketing buffer.",
    tags: ["manufacturer", "technical", "headroom", "independent", "manual", "generator"],
  },
  {
    canonicalUrl: "https://www.harbor-industrial.example/safety/headroom-limits",
    title: "Harbor Industrial Power safety bulletin on blanket headroom rules",
    publisher: "Harbor Industrial Power",
    sourceType: "manufacturer_documentation",
    publishedDate: "2023-12-02",
    provenanceMethod: "test_fixture",
    retrievedText: "Harbor Industrial Power safety bulletin: recommended operating headroom should never be treated as a universal rule. This document contradicts blanket headroom recommendations without a site-specific study.",
    tags: ["manufacturer", "safety", "headroom", "contradicts"],
  },
  {
    canonicalUrl: "https://www.osha.gov/example/portable-generator-placement",
    title: "OSHA portable generator outdoor placement guidance",
    publisher: "Occupational Safety and Health Administration",
    sourceType: "regulatory_document",
    publishedDate: "2022-06-15",
    provenanceMethod: "test_fixture",
    retrievedText: "Occupational safety technical bulletin: portable generator carbon monoxide exposure requires outdoor placement. Manufacturer manuals alone are not a substitute for this government guidance.",
    tags: ["government", "regulatory", "osha", "safety", "generator", "site.gov"],
  },
];

function queryTokens(query: string) {
  return query.toLowerCase().replace(/['"]/g, " ").split(/[^a-z0-9.]+/).filter((token) => token.length >= 4);
}

function excludedSitesFromQuery(query: string) {
  return [...query.matchAll(/-site:([a-z0-9.-]+)/gi)].map((match) => match[1].toLowerCase());
}

const OPERATOR_TOKENS = new Set([
  "filetype",
  "pdf",
  "site.gov",
  "site.edu",
  "independent",
  "recognized",
  "professional",
  "organization",
  "application",
  "engineering",
  "guide",
  "standard",
  "manual",
]);

function hitMatchesQuery(hit: (typeof FIXTURE_CATALOG)[number], query: string) {
  const excluded = excludedSitesFromQuery(query);
  if (excluded.length) {
    try {
      const host = new URL(hit.canonicalUrl).hostname.replace(/^www\./, "").toLowerCase();
      if (excluded.some((domain) => host === domain || host.endsWith(`.${domain}`))) return false;
    } catch {
      /* keep matching on tokens */
    }
  }
  const haystack = `${hit.title} ${hit.publisher} ${hit.retrievedText} ${hit.tags.join(" ")} ${hit.canonicalUrl}`.toLowerCase();
  const tokens = queryTokens(query).filter((token) => !token.startsWith("site") && !OPERATOR_TOKENS.has(token));
  if (!tokens.length) return false;
  if (tokens.includes("site.gov") || query.includes("site:.gov")) {
    return hit.tags.includes("site.gov") || hit.sourceType === "regulatory_document";
  }
  if (query.includes("site:.edu")) {
    return hit.tags.includes("site.edu") || /\.edu\//.test(hit.canonicalUrl);
  }
  return tokens.some((token) => haystack.includes(token));
}

export const fixtureCandidateProvider: CandidateDiscoveryProvider = {
  id: CANDIDATE_DISCOVERY_PROVIDER_ID,
  kind: "fixture",
  async search(request: CandidateSearchRequest) {
    if (Date.now() - request.startedAtMs > request.maximumRuntimeMs) return [];
    const matches = FIXTURE_CATALOG.filter((hit) => hitMatchesQuery(hit, request.query));
    return matches.slice(0, Math.max(0, request.maximumHits)).map((hit) => ({
      canonicalUrl: hit.canonicalUrl,
      title: hit.title,
      publisher: hit.publisher,
      sourceType: hit.sourceType,
      publishedDate: hit.publishedDate,
      retrievedText: hit.retrievedText,
      provenanceMethod: hit.provenanceMethod,
      query: request.query,
    }));
  },
};

export function fixtureRetrievedTextForUrl(canonicalUrl: string) {
  return FIXTURE_CATALOG.find((hit) => hit.canonicalUrl === canonicalUrl)?.retrievedText ?? null;
}
