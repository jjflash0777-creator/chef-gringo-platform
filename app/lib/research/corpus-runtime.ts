import { localCorpusEnabled, corpusRetrievalEnabled, aiSearchInstanceId } from "./flags.ts";
import { createLocalRetriever, createUnavailableRetriever, type CorpusRetriever } from "./retriever.ts";
import { getD1Binding } from "../../../db/index.ts";

export function resolveAssistantRetriever(explicit?: CorpusRetriever): CorpusRetriever | undefined {
  if (explicit) return explicit;
  if (!localCorpusEnabled() && !corpusRetrievalEnabled()) return undefined;
  if (corpusRetrievalEnabled() && aiSearchInstanceId()) {
    return createUnavailableRetriever("Cloudflare AI Search is scaffolded and is not contacted in this stage.");
  }
  try {
    const db = getD1Binding();
    const inner = createLocalRetriever();
    return {
      id: "local",
      health: () => inner.health(),
      search: (query, options) => inner.search(query, { ...options, db }),
    };
  } catch {
    return undefined;
  }
}
