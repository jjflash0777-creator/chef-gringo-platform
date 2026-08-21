# Bounded evidence research

Chef Gringo does not have unrestricted live web research. Stage 8 adds a truthful capability model, a culinary source hierarchy, URL safety, and a small repository of on-file evidence that Ask Chef Gringo can cite.

## Capability levels

- `knowledge_only` — model and curated practice knowledge; no retrieved evidence
- `repository_evidence` — verified or identified evidence already stored in Chef Gringo
- `bounded_research_plan` — a research plan was generated; sources were not fetched
- `bounded_research_complete` — bounded retrieval and validation actually completed
- `research_unavailable` — required provider or evidence is unavailable

A plan is never labeled completed research. Public answers must not say Chef Gringo searched, verified, or found sources unless retrieval and validation occurred.

Live retrieval is disabled (`LIVE_RESEARCH_ENABLED = false`). There is no search-provider adapter and no crawler.

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

No additive D1 migration in this stage. Research jobs, uploaded source bodies, and user questions are not stored. Existing knowledge-core `sources` rows are unchanged. Retention: in-memory / fixture only; nothing to delete.

## Public versus internal

- Public Ask Chef Gringo: concise labels, claim-linked citations, limitation language. No audit trail, overrides, rejected-source bodies, or planned-query dumps.
- Internal: `/admin/marketplace/research` behind `requireMarketplaceAdministrator`. `BoundedResearchPanel` is not on the homepage.
