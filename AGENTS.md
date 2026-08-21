# AGENTS.md

Chef Gringo platform — Next.js App Router + React 19, but built and run with **vinext**
(Vite-based Next runtime) on a **Cloudflare Worker**, deployed via the OpenAI Sites
control plane. Not a normal `next dev`/`next build` project — `next.config.ts` is empty.

## Commands (run in this order for validation)

```bash
npm run lint        # eslint (ignores dist/, .next/, build/)
npm run typecheck   # tsc -p tsconfig.typecheck.json
npm run build       # vinext build -> dist/server/index.js
npm test            # node --test, requires an up-to-date build first
```

- `npm test` does NOT build for you. `tests/rendered-html.test.mjs` and
  `tests/marketplace.test.mjs` import `dist/server/index.js`, so run `npm run build`
  before `npm test` or those two suites fail.
- Focused suites: `npm run test:migrations` (knowledge-core "migrations apply cleanly");
  `node --test tests/knowledge-core.test.mjs` for DB/domain logic.
- `npm run dev` / `npm run build` / `npm run start` all go through vinext + Wrangler.
  Wrangler/Miniflare state lives in ignored `.wrangler/`.

## Testing quirks

- Plain Node's built-in test runner (`node --test`), no vitest/jest. Node >=22.13 with
  type stripping: tests import `.ts` sources directly (e.g. `../app/lib/...ts`).
- D1-backed tests use `tests/helpers/sqlite-d1.mjs` — an in-memory `node:sqlite`
  adapter implementing the D1 prepared-statement interface. It is assigned via
  `globalThis.__CHEF_GRINGO_ENV__ = { DB: db }`; migrations are applied from
  `drizzle/*.sql` with `applyMigrations(db)`.
- `db/`, `worker/`, `build/`, `examples/` are excluded from typecheck
  (`tsconfig.typecheck.json`). Validate changes there with the production build + tests,
  not typecheck. `db/` and `worker/` ARE linted.

## Database (Drizzle + Cloudflare D1, SQLite)

- Real schema + migrations exist (`db/schema.ts`, `drizzle/0000..0003`), covering
  marketplace, knowledge-core, and revenue operations (26 tables). Migrations are generated code: run
  `npm run db:generate`, inspect the SQL, commit intentionally.
- `db/index.ts` `getDb()` reads `globalThis.__CHEF_GRINGO_ENV__.DB` — set by the Worker
  at runtime, and by tests via the sqlite adapter.
- `.openai/hosting.json` has `"d1": "DB"`: **D1 IS bound.** DB-backed APIs (marketplace
  workflows, commercial events) write for real wherever that binding is injected, so treat
  writes as durable. The public `/marketplace` page still renders with no DB dependency.

## Marketplace & knowledge-core authorization

- All mutating marketplace/knowledge-core API routes enforce **server-side** admin auth:
  `requireMarketplaceAdministrator()` (`app/marketplace-authorization.ts`) reads the
  Sites-injected `oai-authenticated-user-email` header and checks the allowlist
  `MARKETPLACE_ADMIN_EMAILS` (env). No admin gate may rely on client-side checks.
  Tests assert 401 (unauthenticated) / 403 (non-admin) / 201/200 (allowlisted).

## Architecture map

- `app/` — App Router routes: marketing pages, `/discover`, `/knowledge`, `/marketplace`,
  `/admin/marketplace`, `/api/*` (early-access, subscribe, marketplace products/workflows).
- `app/knowledge/` — knowledge engine: `domain/` (types, seed, recipe), `search/`,
  `integrations/contracts.ts`. Keep provider SDK types OUT of the domain layer.
- `db/` — D1 Drizzle factory, schema, `knowledge-core-repository.ts` (workflow CRUD +
  transitions + quality gates).
- `worker/index.ts` — Worker entry + `/_vinext/image` optimization with width allowlist.
- `build/sites-vite-plugin.ts` — build-only packaging of `.openai/hosting.json` +
  migrations into `dist/.openai`; excluded from lint AND typecheck.
- `scripts/marketplace-research/` — harvest pipeline (`npm run marketplace:harvest`,
  `marketplace:verify-links`).
- `tests/` — node --test suites (unit, rendered Worker, D1/migrations, authorization).
- `docs/` — `SYSTEM_ARCHITECTURE.md` (permanent blueprint), `ENGINEERING_HANDOFF.md`
  (ops handbook — read it first). Some handoff sections are stale (e.g. it calls
  `db/schema.ts` empty; search/email sections describe older states). Trust executable
  source when docs conflict.

## Enforced conventions (from the constitution + handoff)

- **Honesty is a product requirement**: real empty/unavailable/error states, never
  fabricate data to make a UI look complete. Unconfigured provider => honest 503.
- **Provider neutrality**: every external service sits behind an adapter
  (`app/lib/engagement/loopsAdapter.ts`); no vendor types in domain entities.
- **Deterministic tools** (recipe scaler, shopping list) are unit-tested logic — LLMs
  never perform the arithmetic.
- Knowledge IDs: `entity_type:slug` (e.g. `dish:carbonara`). Verification states:
  seeded -> source-ready -> reviewed -> verified. Clinical/nutrition domains need
  qualified review before `verified`. Sources support specific claims.
- Do not remove dormant-but-intentional code (`app/chatgpt-auth.ts` — keep its
  open-redirect defenses; `integrations/contracts.ts`) without a documented decision.
- Secrets: server-side env only; `.env` is gitignored, `.env.example` holds names only.
  Never commit tokens/keys. Honeypots on forms; no rate limiting yet.
- Branches: `codex/<scope>`; commits: conventional, imperative (`feat: ...`).

## Deployment (Sites control plane)

- `.openai/hosting.json` holds the opaque Sites `project_id` (production-sensitive) and
  D1/R2 binding declarations. Never overwrite it blindly for a preview.
- No CI/CD yet; deployment is a manually authorized Sites version promotion. Never
  deploy feature branches to production without explicit founder authorization.
