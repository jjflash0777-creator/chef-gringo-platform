# Governed knowledge ingestion and retrieval

Chef Gringo now distinguishes three capabilities that must not be collapsed:

1. **Repository knowledge** (`repository_evidence`) — curated Stage 8 records stored with the application. A URL on file is identification, not a retrieved document.
2. **Curated corpus retrieval** (`curated_corpus_retrieval`) — documents deliberately accepted into Chef Gringo’s controlled library, reviewed, and indexed. This is not live web research.
3. **Live bounded web research** (`bounded_research_complete`) — fresh external retrieval, fetch, validation, and acceptance. **Not enabled.** `LIVE_RESEARCH_ENABLED` remains `false`. A generated plan is never completed research.

## Capability matrix

| Capability | What happened | Public wording |
|---|---|---|
| `knowledge_only` | Practice or judgment; no retrieved source | No retrieval label |
| `repository_evidence` | On-file repository item | Sources already on file. Did not search the live web. |
| `curated_corpus_retrieval` | Accepted library chunks retrieved | Retrieved from Chef Gringo’s accepted knowledge library. Not a live web search. |
| `bounded_research_plan` | Queries planned | Plan generated. Sources were not fetched. |
| `bounded_research_complete` | External retrieval + fetch + validation + acceptance | Never emitted in this stage |
| `research_unavailable` | Missing evidence or provider | Conservative answer |

## Source hierarchy

Unchanged from Stage 8 (`app/lib/research/source-policy.ts`):

- Food safety prefers FDA, USDA FSIS, CDC, and applicable official agencies.
- Nutrition prefers USDA, NIH, FDA, and scoped clinical authorities.
- Equipment prefers exact manufacturer manuals and official specification sheets.
- Licensing prefers official jurisdictional agencies and statutes.
- Culinary technique may use accepted primary practice sources.
- Commercial claims require official program terms.

Blogs, retailer pages, affiliates, and AI-written pages remain leads, never accepted authority.

## Ingestion approval lifecycle

`submitted` → `fetching` → `parsed` → `awaiting_review` → `accepted` or `rejected`. Accepted sources may later become `stale` or `superseded`. Failures are `failed`.

A URL alone is never accepted evidence. Production exposure is false until an administrator accepts a version that has extracted text, a checksum, and chunks.

Supported inputs: approved HTTPS URL (when fetch is enabled and a fetcher is injected), uploaded `text/plain`, `text/markdown`, `text/html`, and PDF **only with a human transcription**. DOCX is rejected: no maintained parser is installed.

The pipeline is not a crawler. It does not follow site links, bypass authentication, robots, paywalls, or publisher restrictions.

## Persistence decision

Existing knowledge-core `sources` / `workflow_sources` tables stay untouched. They model workflow claim-links with a coarse verification flag. Stage 9 adds additive corpus tables in `drizzle/0006_corpus_governance.sql`:

- `corpus_documents`
- `corpus_document_versions`
- `corpus_chunks`
- `corpus_ingestion_jobs`
- `corpus_research_jobs` (stores `query_hash`, never the raw public question)
- `corpus_research_job_evidence`
- `corpus_citations`
- `corpus_retrieval_cache`
- `corpus_audit_events`

## Retention

- Retrieval cache expires after 60 seconds (`CORPUS_LIMITS.cacheTtlMs`).
- Rejected version extracted text is cleared on reject.
- Ingestion jobs can be purged by created-at (`purgeOldIngestionJobs`).
- Public questions are not stored.

## Cloudflare AI Search

**Not exercised in this stage.** Runtime audit:

- Worker `Env` currently binds `ASSETS`, `DB`, and `IMAGES` only.
- `.openai/hosting.json` declares D1 `DB` and `r2: null`. Production configuration was not changed.
- Installed `wrangler` is `4.92.0` (AI Search namespace bindings require `>= 4.68.1`).
- `@cloudflare/vite-plugin` is `1.37.1`. Local Wrangler config in `vite.config.ts` injects D1 only.
- The current API is `ai_search` / `ai_search_namespaces` with `env.AI_SEARCH.get(instanceId).search({ query, ai_search_options })` returning `chunks`. **Do not use** the legacy `env.AI.autorag()` API.

Required future setup (do not apply until founder-authorized):

1. Create an AI Search instance in the Cloudflare dashboard (this can be a paid resource — not created here).
2. Add a namespace binding. Example Wrangler fragment (not present in production hosting):

```jsonc
{
  "ai_search_namespaces": [
    {
      "binding": "AI_SEARCH",
      "namespace": "default"
    }
  ]
}
```

3. Set `CHEF_GRINGO_AI_SEARCH_INSTANCE` to the instance id.
4. Set `CHEF_GRINGO_CORPUS_RETRIEVAL_ENABLED=true` only after accepted documents are indexed and metadata (`sourceId`, `sourceVersion`, `ingestionStatus=accepted`, `productionExposure=true`) is present on chunks. Unreviewed remote chunks must not appear in public answers.
5. Sites control plane must inject the binding. Do not overwrite `.openai/hosting.json` blindly.

Until that exists, `createCloudflareRetriever(null, null)` and `resolveCorpusRetriever()` return the unavailable adapter. Local tests use `createLocalRetriever`.

## Feature flags (default off)

See `.env.example`. Names only:

- `CHEF_GRINGO_CORPUS_RETRIEVAL_ENABLED`
- `CHEF_GRINGO_CORPUS_INGEST_FETCH_ENABLED`
- `CHEF_GRINGO_AI_SEARCH_INSTANCE`
- `CHEF_GRINGO_CORPUS_DAILY_REQUEST_CEILING`

## Cost and reliability

Query/result bounds, 8s timeout, cache keyed by normalized query + corpus fingerprint, in-process daily ceiling, bounded retries (`CORPUS_LIMITS.maximumRetries`), circuit breaker after three consecutive failures, skip empty/abusive prompts, skip retrieval on clarification turns. Errors never include provider tokens.

## Production evidence status

These Stage 8 records remain **identified / on-file**. They were **not** live-fetched in this environment and are **not** accepted corpus evidence:

- USDA FSIS ground-beef temperature chart
- Thermapen ONE manufacturer page
- Florida DBPR Hotels and Restaurants landing page

Mirepoix remains Chef Gringo professional practice. An administrator may upload the practice note, review it, and accept it. Until then it is repository knowledge, not curated-corpus retrieval.

Exact administrator steps: `/admin/marketplace/research` → Governed source library → paste official text or enable fetch later → review extracted chunks → Accept for production. Never mark a URL-only row accepted.

## What remains before live research can be enabled

1. Founder authorization and a real search/fetch provider (paid resources are out of scope here).
2. Redirect-safe fetch of each candidate, MIME/size validation, human review, and acceptance.
3. `LIVE_RESEARCH_ENABLED` flipped only after those steps exist in production.
4. Public copy that says “searched” only when `bounded_research_complete` is actually emitted.

## Local unavailable behavior

Tests and local development never call Cloudflare. Feature flags default off, so Ask Chef Gringo continues to use repository evidence. Inject `createLocalRetriever(hits)` in tests for corpus retrieval.
