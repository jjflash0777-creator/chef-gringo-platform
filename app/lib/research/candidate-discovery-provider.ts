/**
 * Provider boundary for bounded candidate discovery.
 * Evidence policy must not import a vendor SDK through this module.
 */

export type DiscoveredDocumentHit = {
  canonicalUrl: string;
  title: string;
  publisher: string;
  sourceType: string;
  publishedDate?: string | null;
  retrievedText: string;
  provenanceMethod: "test_fixture" | "live_fetch";
  query: string;
  resultUrl?: string;
  retrievalStatus?: "ok" | "blocked" | "timeout" | "oversized" | "unextractable" | "failed";
  excerptLocator?: string | null;
};

export type CandidateSearchRequest = {
  query: string;
  maximumHits: number;
  startedAtMs: number;
  maximumRuntimeMs: number;
};

export type CandidateDiscoveryProvider = {
  id: string;
  kind: "fixture" | "live";
  search(request: CandidateSearchRequest): Promise<DiscoveredDocumentHit[]>;
};
