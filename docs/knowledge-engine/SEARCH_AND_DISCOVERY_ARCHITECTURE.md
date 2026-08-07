# Search and Discovery Architecture

## Phase 1

`CuratedLocalSearchAdapter` performs case-insensitive lexical matching over entity titles, summaries, types, and tags. A small intent map connects selected natural-language questions to curated concepts. Results retain entity identity, matched terms, and score, then group by entity type.

The UI has four explicit states: untouched, loading, no result, and grouped results. Unknown queries are not answered speculatively.

## Evolution path

1. Add a repository-backed lexical index.
2. Add embeddings through `SemanticSearchAdapter`.
3. Merge, deduplicate, and rerank results using stable entity IDs.
4. Add grounded answers through `GroundedAnswerAdapter`, requiring supporting entity IDs and source URLs.
5. Evaluate retrieval quality, citation coverage, abstention, freshness, and mode appropriateness before release.

Search remains provider-neutral. Provider SDK objects, credentials, and raw model output must not enter domain entities or components.

## Analytics and privacy

Phase 1 emits event names and limited product context through the existing analytics bridge. Search content should be reviewed before any future analytics vendor receives raw queries. Do not send dietary, account, or precise-location data without an explicit product and privacy decision.
