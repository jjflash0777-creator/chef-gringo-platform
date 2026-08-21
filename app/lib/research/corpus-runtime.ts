import { fixtureHitsFromManifest } from "./corpus-import.ts";
import { localCorpusEnabled, corpusRetrievalEnabled, aiSearchInstanceId } from "./flags.ts";
import { createLocalRetriever, createUnavailableRetriever, type CorpusRetriever } from "./retriever.ts";
import { getD1Binding } from "../../../db/index.ts";
import type { D1DatabaseLike } from "../../../db/index.ts";

export function resolveAssistantRetriever(explicit?: CorpusRetriever): CorpusRetriever | undefined {
  if (explicit) return explicit;
  if (!localCorpusEnabled() && !corpusRetrievalEnabled()) return undefined;
  if (corpusRetrievalEnabled() && aiSearchInstanceId()) {
    return createUnavailableRetriever("Cloudflare AI Search is scaffolded and is not contacted in this stage.");
  }
  let db: D1DatabaseLike | undefined;
  try {
    db = getD1Binding();
  } catch {
    db = undefined;
  }
  const seed = fixtureHitsFromManifest();
  const inner = createLocalRetriever(seed);
  if (!db) return inner;
  return {
    id: "local",
    health: () => inner.health(),
    search: (query, options) => inner.search(query, { ...options, db }),
  };
}
