# Bounded evidence research

Chef Gringo does not have unrestricted live web research. Stage 8 added a truthful capability model, a culinary source hierarchy, URL safety, and a small repository of on-file evidence. Stage 9 adds a governed corpus library for **curated retrieval**. See `docs/GOVERNED_CORPUS.md`.

## Capability levels

- `knowledge_only` — model and curated practice knowledge; no retrieved evidence
- `repository_evidence` — verified or identified evidence already stored in Chef Gringo
- `curated_corpus_retrieval` — accepted library chunks retrieved; not a live web search
- `bounded_research_plan` — a research plan was generated; sources were not fetched
- `bounded_research_complete` — bounded retrieval and validation actually completed
- `research_unavailable` — required provider or evidence is unavailable

A plan is never labeled completed research. Curated corpus retrieval is never described as live web research. Public answers must not say Chef Gringo searched, verified, or found sources unless live retrieval and validation occurred.

Live retrieval is disabled (`LIVE_RESEARCH_ENABLED = false`). Cloudflare AI Search is scaffolded, not exercised.

## What the recovered engine actually does

The 2026-08-10 bounded-research engine:

- creates typed research requirements for equipment cases
- builds at most three queries
- ranks at most five **injected** candidates
- applies authority tiers and exact-model matching
- writes an audit trail of inclusions, exclusions, and stop conditions
- does **not** perform network retrieval

Assessing supplied candidates is not live research. Capability for that path is `repository_evidence` or `bounded_research_plan`, never `bounded_research_complete`.

## Source hierarchy

See `app/lib/research/source-policy.ts`. Blogs, videos, forums, affiliate pages, AI-generated pages, and retailer copy may be leads and must not silently become high-authority evidence.

## Persistence

Stage 9 adds additive corpus tables (`drizzle/0006_corpus_governance.sql`). Existing knowledge-core `sources` rows are unchanged. Research jobs store a query hash, not the raw public question.

## Public versus internal

- Public Ask Chef Gringo: concise labels, claim-linked citations, compact “Sources used” only when curated retrieval actually occurred.
- Internal: `/admin/marketplace/research` behind `requireMarketplaceAdministrator`, including the governed source library. Not in public navigation.
