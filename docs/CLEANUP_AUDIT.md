# Chef Gringo Repository Cleanup Audit

Started: 2026-09-08
Canonical source: `canonical/chef-gringo`
Cleanup branch: `cleanup/repository-hygiene-20260908`

## Rule

Delete only files proven to be example-only, generated/transient, superseded, or actively misleading. Preserve dormant-but-intentional architecture, migrations, tests, security code, research systems, revenue systems, and curated brand assets.

## Confirmed safe removals

### `examples/d1/`

Reason: isolated demo Notes app/schema. It is not part of the Chef Gringo product architecture, production routes, D1 schema, or package scripts. `AGENTS.md` documents the actual production D1 architecture under `db/`, `worker/`, and `drizzle/`.

Removed files:
- `examples/d1/app/api/notes/route.ts`
- `examples/d1/db/schema.ts`

Validation after pass #1: 651 tests passed / 0 failed.

### `docs/CHEF-GRINGO-PROJECT-STATE.md`

Reason: superseded duplicate source-of-truth file. It pointed to an obsolete rescue branch and duplicated project-state responsibility with `docs/CHEF_GRINGO_CURRENT_STATE.md`.

Before removal, useful commercial history and partner status were migrated into the canonical state document, including Toast, ThermoWorks, BLUETTI, Kitchen OS, Chef's Deal, and submitted partner applications. Git history preserves the removed ledger if historical detail is ever needed.

Disposition: REMOVED to prevent future agents from reading two conflicting project-state files.

### Legacy two-image editorial registry and assets

Removed:
- `app/home/editorial-images.ts`
- `public/images/editorial/commercial-kitchen-prep.jpg`
- `public/images/editorial/restaurant-kitchen-service.jpg`

Reason: the current homepage and Culinary Pulse use `app/home/brand-images.ts` and the curated `public/brand/editorial/**` library. Repository code search found no remaining references to `editorialImages`, `commercial-kitchen-prep`, or `restaurant-kitchen-service`. The current `app/page.tsx` and `app/components/CulinaryPulse.tsx` both import `brandImages` directly.

Effect: removes the obsolete two-image source that previously caused visual repetition and eliminates roughly 878 KB of superseded image payload from the repository.

Validation required after pass #2 before promotion into canonical.

## Updated misleading documentation

### `AGENTS.md`

Updated to direct agents to the canonical current-state document and reflect the current migration chain rather than the old early-migration description.

### `README.md`

Replaced the obsolete “Foundation Sprint 01” framing with the current Chef Gringo architecture, validation order, canonical-state rule, and maintenance safeguards.

## Root / scripts audit

Current `scripts/` contains active functional tooling only:
- `affiliate-worker/`
- `corpus/`
- `intelligence/`
- `marketplace-research/`
- `viewport-audit.mjs`
- `viewport-shots.mjs`

No Phase 3/Phase 4 one-shot migration scripts remain in the active cleanup lineage. Viewport scripts are retained as useful visual-regression tooling rather than treated as dead code.

## Keep / classify carefully

### `docs/ENGINEERING_HANDOFF.md`

Large and partly stale, but contains institutional history. Keep until useful operational content is migrated or proven obsolete. It is not authoritative for current state; `docs/CHEF_GRINGO_CURRENT_STATE.md` is.

### `docs/PENDING_COMMERCIAL_PROGRAMS.md`

KEEP. This is not the founder partner pipeline. It documents catalog records whose stored affiliate status remains `unknown`, with `app/marketplace/pending-programs.ts` as canonical data. It protects against accidentally treating unverified catalog relationships as active partners.

### Other historical design / launch docs

Keep until each is classified as specification, historical record, or superseded implementation note. Do not bulk-delete documentation simply because it is old.

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

## Next cleanup targets

1. Classify remaining historical docs as KEEP / HISTORICAL / REMOVE without losing approved business decisions.
2. Audit public assets beyond the curated editorial library for exact duplicates and unused legacy files.
3. Audit route/component reachability for truly abandoned public experiments.
4. Resolve stale Partner Hunt analytics status after repository hygiene is stable.
5. Run full lint → typecheck → build → test before any merge into canonical.
