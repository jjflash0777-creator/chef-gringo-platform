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

Disposition: REMOVE to prevent future agents from reading two conflicting project-state files.

## Updated misleading documentation

### `AGENTS.md`

Updated to direct agents to the canonical current-state document and reflect the current migration chain rather than the old early-migration description.

### `README.md`

Replaced the obsolete “Foundation Sprint 01” framing with the current Chef Gringo architecture, validation order, canonical-state rule, and maintenance safeguards.

## Keep for now pending proof

### `app/home/editorial-images.ts`
### `public/images/editorial/commercial-kitchen-prep.jpg`
### `public/images/editorial/restaurant-kitchen-service.jpg`

These are legacy editorial assets superseded on the homepage by `public/brand/editorial/*`, but they should not be deleted until repository-wide reference validation proves no non-homepage route or test still consumes them.

### `docs/ENGINEERING_HANDOFF.md`

Large and partly stale, but contains institutional history. Keep until the useful operational content is either migrated into canonical docs or proven obsolete.

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

1. Prove whether the legacy `editorial-images.ts` registry and two old Unsplash files have any remaining runtime/test references.
2. Classify old docs as KEEP / ARCHIVE / REMOVE after migrating any still-authoritative facts.
3. Audit root and scripts directories for generated one-shot, demo, or abandoned tooling.
4. Audit public assets for exact duplicates and unused legacy imagery.
5. Run full lint → typecheck → build → test after the next deletion batch before any merge into canonical.
