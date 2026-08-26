import type { GovernedFetch } from "./fetch-document.ts";

export type LiveSearchHit = {
  url: string;
  title: string;
  snippet?: string;
};

export type LiveSearchOutcome = {
  hits: LiveSearchHit[];
  rawResultCount: number;
  parseFailed?: boolean;
};

export type LiveSearchClient = {
  search(query: string, limit: number, signal?: AbortSignal): Promise<LiveSearchHit[] | LiveSearchOutcome>;
};

export type FetchLike = GovernedFetch | ((url: string, init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}>);
