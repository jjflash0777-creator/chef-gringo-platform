import type { CulinaryDomain } from "./source-policy.ts";
import type { ResearchCapability } from "./capability.ts";

const BLOCKED = /question|prompt|body|filename|location|lat|lng|medical|diet|diagnos|credential|token|authorization|api[_-]?key/i;

export type CorpusAnalyticsEvent = {
  retrievalAttempted: boolean;
  capability: ResearchCapability | "curated_corpus_retrieval";
  sourceCount: number;
  evidenceDomain: CulinaryDomain | null;
  cache: "hit" | "miss";
  durationBucket: string;
  code: string;
};

const sink: CorpusAnalyticsEvent[] = [];

export function recordCorpusAnalytics(event: CorpusAnalyticsEvent & Record<string, unknown>) {
  const safe = Object.fromEntries(Object.entries(event).filter(([key]) => !BLOCKED.test(key))) as CorpusAnalyticsEvent;
  sink.push(safe);
  return safe;
}

export function readCorpusAnalytics() {
  return [...sink];
}

export function resetCorpusAnalytics() {
  sink.length = 0;
}
