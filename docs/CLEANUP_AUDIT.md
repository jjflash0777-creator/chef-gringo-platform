# Chef Gringo Repository Cleanup Audit

Started: 2026-09-08
Canonical source: `canonical/chef-gringo`

## Rule

Delete only files proven to be example-only, generated/transient, superseded, or actively misleading. Preserve dormant-but-intentional architecture, migrations, tests, security code, research systems, revenue systems, and curated brand assets.

## Confirmed safe removals

### `examples/d1/`

Reason: isolated demo Notes app/schema. It is not part of the Chef Gringo product architecture, production routes, D1 schema, or package scripts. `AGENTS.md` explicitly treats `examples/` as outside typecheck and documents the actual production D1 architecture under `db/`, `worker/`, and `drizzle/`.

Files:
- `examples/d1/app/api/notes/route.ts`
- `examples/d1/db/schema.ts`

Disposition: REMOVE on cleanup branch, then full validation.

## Keep for now pending proof

### `app/home/editorial-images.ts`
### `public/images/editorial/commercial-kitchen-prep.jpg`
### `public/images/editorial/restaurant-kitchen-service.jpg`

These are legacy editorial assets superseded on the homepage by `public/brand/editorial/*`, but they should not be deleted until repository-wide reference validation proves no non-homepage route or test still consumes them.

### Old docs

Several handoff/architecture docs contain stale statements. Prefer updating or clearly marking stale sections over deleting institutional history until a canonical replacement has absorbed the useful content.

## Never clean as "unused" without explicit proof

- `app/chatgpt-auth.ts`
- `app/knowledge/integrations/contracts.ts`
- `db/**`
- `drizzle/**`
- `worker/**`
- `build/sites-vite-plugin.ts`
- `app/growth/social/**`
- admin tools
- revenue operations
- research/evidence code
- curated `public/brand/editorial/**`
- tests
