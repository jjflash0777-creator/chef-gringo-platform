# Chef Gringo — Current State

Last updated: 2026-09-08

## Canonical branch

- Branch: `canonical/chef-gringo`
- Canonical baseline commit: `0b33b3b3a86ae0be5bd516e33363142edfac3066`
- Baseline message: `feat: wire curated Chef Gringo imagery across homepage`
- Phase 3 design-system consolidation is already in this lineage at `d6f357e23a703d8f05863a44f0ae6fd53319eca0`.
- Phase 4 homepage and curated-image work descend from Phase 3. Do not reapply Phase 3.
- GitHub `main` remains a legacy default branch and is behind the canonical lineage. Do not move it until deployment branch behavior is verified.

## Validation

Most recent confirmed full suite in this workstream:

- lint: passed before Phase 4 image-final integration
- typecheck: passed before Phase 4 image-final integration
- build: passed before Phase 4 image-final integration
- tests: 651 passed / 0 failed

The exact canonical image-final commit should be revalidated after any cleanup change before it is considered the new validated baseline.

## Production architecture

- Next.js App Router + React 19
- vinext / Vite runtime
- Cloudflare Worker
- OpenAI Sites control plane
- Cloudflare D1 via binding `DB`
- Drizzle ORM and numbered SQL migrations
- server-side Marketplace/admin authorization

## Live / important systems

- Ask Chef Gringo
- Culinary Pulse
- Marketplace
- Product Harvest / marketplace research scripts
- commercial-event tracking
- Partner Hunt
- Revenue Operations
- Growth Queue
- research/evidence pipeline
- publication/performance tracking
- newsletter / Loops adapter
- contextual affiliate/referral routes

## Current commercial reality

Known wired commercial routes include ThermoWorks/Impact and Kitchen OS. Account-side status, conversions, commissions, payout terms, and current eligibility still require direct verification before new reconciliation infrastructure is built.

## Current blockers

1. Verify production/deployment relationship to GitHub `main` before moving default/trunk refs.
2. Resolve stale Partner Hunt analytics status messaging so founder UI reflects actual D1 persistence capability.
3. Verify active affiliate/referral account status and real economics.
4. Prove one complete click → conversion → commission loop before generalizing revenue automation.
5. Remove confirmed dead/example/duplicate files without disturbing dormant-but-intentional architecture.

## Current priorities

1. Repository hygiene and dead-file audit.
2. Partner Hunt truth/status correction.
3. ThermoWorks/Impact and Kitchen OS account verification.
4. One-channel revenue reconciliation proof.
5. Founder dashboard only after source-of-truth data is proven.

## Visual assets — preserve

Canonical curated image library:

- `public/brand/editorial/hero-kitchen.jpg`
- `public/brand/editorial/operator-intelligence.jpg`
- `public/brand/editorial/cooking-line.jpg`
- `public/brand/editorial/dish-pit.jpg`
- `public/brand/editorial/refrigeration.jpg`
- `public/brand/editorial/repair-replace.jpg`
- `public/brand/editorial/food-truck.jpg`
- `public/brand/editorial/senior-living.jpg`
- `public/brand/editorial/prep-station.jpg`
- `public/brand/editorial/empty-kitchen.jpg`

Do not return the homepage to a tiny repeated placeholder image pool.

## Do not rebuild or remove casually

- Phase 3 design system
- D1 / Drizzle architecture or migration history
- admin authorization
- Ask Chef Gringo runtime
- Culinary Pulse data flow
- Marketplace evidence/commercial separation
- Partner Hunt / Revenue Operations / Growth Queue
- research/evidence governance
- curated brand imagery
- dormant-but-intentional security/provider abstractions called out in `AGENTS.md`

## Branch disposition

- `canonical/chef-gringo` — ACTIVE CANONICAL
- `chatgpt/phase4-images-final` — source tip now represented by canonical
- `chatgpt/phase4-homepage-v1` — superseded
- `chatgpt/live-editorial-home-v1` — Phase 3 ancestor, superseded
- `chatgpt/validated-baseline-20260908` — archive checkpoint
- `chatgpt/pre-phase3-backup-20260908` — archive checkpoint
- `chatgpt/phase3-auto-apply` — do not merge; temporary workflow-only divergence
- `main` — legacy default; do not treat as current product state

## Session-end protocol

After every meaningful implementation, update this file with:

- date
- branch
- commit
- what changed
- validation result
- known issues
- next action
- new assets/integrations
- revenue impact
