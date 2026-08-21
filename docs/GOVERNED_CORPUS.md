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

- `CHEF_GRINGO_LOCAL_CORPUS_ENABLED` — local/dev Ask may retrieve the accepted fixture corpus without Cloudflare
- `CHEF_GRINGO_CORPUS_RETRIEVAL_ENABLED`
- `CHEF_GRINGO_CORPUS_INGEST_FETCH_ENABLED`
- `CHEF_GRINGO_AI_SEARCH_INSTANCE`
- `CHEF_GRINGO_CORPUS_DAILY_REQUEST_CEILING`

## Cost and reliability

Query/result bounds, 8s timeout, cache keyed by normalized query + corpus fingerprint, in-process daily ceiling, bounded retries (`CORPUS_LIMITS.maximumRetries`), circuit breaker after three consecutive failures, skip empty/abusive prompts, skip retrieval on clarification turns. Errors never include provider tokens.

## Stage 10 activated corpus

Manifest version **10.0.0**. Import command:

```bash
npm run corpus:import
```

That command applies migrations to an **in-memory** D1 adapter, ingests fixtures through the Stage 9 governed path, accepts public rows, marks the contradiction fixture stale, and re-runs to prove checksum idempotency. It does not write production, does not store downloaded binaries, and does not contact Cloudflare.

### Review procedure

1. Every manifest row is ingested or recorded unavailable with an exact reason.
2. Extracted chunks are reviewed in `/admin/marketplace/research`.
3. Accept only rows with extracted text, checksum, and locators. A URL-only row must never be accepted.
4. Mark stale when a newer official revision supersedes the excerpt.
5. Limited/clinical boundaries stay in the excerpt (IDDSI is a name, not an order).

### Refresh schedule

- Food safety (FSIS/FDA/CDC excerpts): 180 days
- Florida agency identity: 90 days
- Equipment exact-model specs: 90–180 days
- Practice notes: 365 days

### Citation and copyright

- Public answers cite short excerpts plus the official HTTPS URL when one exists.
- Full copyrighted manuals and storefront HTML are not stored.
- U.S. government works are short excerpts, not the full Food Code or Dietary Guidelines PDFs.
- IDDSI descriptors include the official link and a non-prescription boundary.
- Analytics store query hashes and counts, never source bodies or public questions.

### Curated retrieval vs live research

Curated corpus retrieval reads accepted library chunks. It is not a live web search. `LIVE_RESEARCH_ENABLED` remains false. `bounded_research_complete` is still impossible.

### Production-eligible sources (fixture-backed excerpts)

Live HTTPS GET of FSIS and CDC returned Akamai 403 in this environment. FDA HTML HEAD returned 200; the full page was not stored. Florida DBPR HEAD redirected to `www2.myfloridalicense.com`. Activated evidence is therefore **Stage 9 ingest of short, provenance-labeled excerpts**, not URL-only rows and not a recursive crawl.

Public-eligible fixture ids include USDA FSIS temperatures, thawing, and leftover danger-zone timing; FDA Food Code TCS cooling/holding; FDA major allergens; CDC four steps; cleaning vs sanitizing; FoodData Central orientation; Dietary Guidelines identity; Nutrition Facts orientation; IDDSI Levels 4 and 5; Florida DBPR, FDACS cottage food, and DOR sales-tax orientation; Chef Gringo practice notes (mirepoix, emulsions, stocks, yield/cost); Thermapen ONE catalog specs; Waring WSB50, Globe SP20, Hobart HL200 catalog specs; OSHA restaurant-hazard orientation; FDA seafood and egg safety.

### Unavailable or failed (kept visible)

- Sarasota County ordinances — not retrieved; statewide rules must not be generalized
- NIH ODS fact sheets — not fetched; no invented supplement doses
- Comark PDT300 manufacturer PDF — binary parser not enabled
- Thermapen ONE official PDF manual — not isolated from copyrighted storefront HTML
- Full FDA Food Code PDF and full Dietary Guidelines PDF — not stored; short excerpts only

### Domain coverage and blind spots

Covered: U.S. food-safety charts and TCS process cooling; allergen names; IDDSI naming; Florida agency identity; exact-model specs already in the catalog; cost/yield formulas without industry averages.

Blind spots: county law, current Florida cottage-food dollar caps, live harvest-area maps, nutrient values from FoodData Central, manufacturer PDF manuals, current street prices, clinical diet orders.

### Exact remaining Cloudflare activation steps

Unchanged from Stage 9: do not create the paid AI Search resource until founder-authorized. Then create the instance, add an `AI_SEARCH` namespace binding without blindly overwriting `.openai/hosting.json`, set `CHEF_GRINGO_AI_SEARCH_INSTANCE`, index only accepted `productionExposure` chunks, and enable `CHEF_GRINGO_CORPUS_RETRIEVAL_ENABLED`. Local Ask can already retrieve fixtures with `CHEF_GRINGO_LOCAL_CORPUS_ENABLED=true` and no Cloudflare.

### Benchmark

`app/lib/research/corpus-benchmark.ts` version 10.0.0, 60+ questions. Tests compare Stage 8 repository-only Ask with Stage 10 curated retrieval. Improvement is scored on citation coverage, unsupported-claim handling, unnecessary retrieval, safety, and commercial separation — not on “retrieval occurred.” Subjective prose stays on the human review worksheet in that file.

## What remains before live research can be enabled

1. Founder authorization and a real search/fetch provider (paid resources are out of scope here).
2. Redirect-safe fetch of each candidate, MIME/size validation, human review, and acceptance of full current official documents where legally allowed.
3. `LIVE_RESEARCH_ENABLED` flipped only after those steps exist in production.
4. Public copy that says “searched” only when `bounded_research_complete` is actually emitted.

## Local behavior

Flags default off, so production Ask stays on Stage 8 repository evidence until local corpus or Cloudflare retrieval is explicitly enabled. Public Ask never falls back to in-memory fixtures. Cloudflare is never contacted.

## Stage 11 preview activation (prepared, not deployed)

Do not put real D1 ids, tokens, or reviewer emails in git. Do not modify production bindings. Do not create Cloudflare AI Search.

### Required preview D1 binding

The Worker already binds `DB` from `.openai/hosting.json`. Preview hosting must use a **preview D1 database**, never the production Sites D1. Confirm the preview database name in the control plane before any import. This repository does not store that id.

### Required feature flags (preview env, names only)

- `CHEF_GRINGO_LOCAL_CORPUS_ENABLED=true` — Ask may retrieve accepted D1 rows.
- `CHEF_GRINGO_CORPUS_RETRIEVAL_ENABLED=false` — keep Cloudflare retrieval off.
- `CHEF_GRINGO_CORPUS_INGEST_FETCH_ENABLED=false` — no live fetch.
- `MARKETPLACE_ADMIN_EMAILS` — allowlist for corpus admin APIs (Sites `oai-authenticated-user-email`).
- `CHEF_GRINGO_CORPUS_REVIEWER_EMAIL` — named reviewer for excerpt attestation.

Instant disable: set `CHEF_GRINGO_LOCAL_CORPUS_ENABLED=false` (or `unexpose` accepted rows). Retrieval stops without deleting D1.

### Commands

```bash
# Migrations are applied by the durable import helper for local SQLite.
npm run corpus:import -- --target local --dry-run
npm run corpus:import -- --target local --attest-excerpts --reviewer reviewer@example.com
npm run corpus:import -- --target preview --dry-run
npm run corpus:import -- --target production --dry-run
# Production writes are refused. Preview writes require CHEF_GRINGO_PREVIEW_D1_CONFIRM=I_UNDERSTAND_PREVIEW and still do not target production.
npm run corpus:audit -- --target local
npm run corpus:smoke
```

Confirm the fingerprint from `corpus:audit` / admin dashboard after import. Restart local preview and re-run `corpus:audit` to prove persistence (`.data/corpus-local.sqlite`).

Verify no production resource is targeted: every command requires `--target`; production without `--dry-run` exits nonzero; preview import prints a refusal unless the confirm env is set; `.openai/hosting.json` was not changed.

### PDF / founder-uploaded documents

No Worker-safe PDF parser is installed (`pdfjs-dist` / `unpdf` were considered and not added: large Worker bundle, unvalidated in this runtime). Founder-uploaded PDFs require a page-labeled transcription (`[page N]`). Do not commit copyrighted PDFs. Raw files are not publicly served.

### Provenance honesty

Stage 10 `fixture` labels are gone. Production-eligible methods: `live_fetch`, `founder_uploaded_document`, `manually_verified_excerpt`, `repository_practice`. `test_fixture` can never be public. `metadata_only` is not evidence. Unattested Stage 10 government/manufacturer excerpts stay `awaiting_review` until a named reviewer attests.

