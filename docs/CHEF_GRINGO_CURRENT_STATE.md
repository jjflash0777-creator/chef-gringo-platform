# Chef Gringo — Current State

Last updated: 2026-09-08

## Canonical branch

- Branch: `canonical/chef-gringo`
- Canonical baseline commit: `0b33b3b3a86ae0be5bd516e33363142edfac3066`
- Baseline message: `feat: wire curated Chef Gringo imagery across homepage`
- Phase 3 design-system consolidation is already in this lineage at `d6f357e23a703d8f05863a44f0ae6fd53319eca0`.
- Phase 4 homepage and curated-image work descend from Phase 3. Do not reapply Phase 3.
- GitHub `main` remains a legacy default branch and is behind the canonical lineage. Do not move it until deployment branch behavior is verified.

## Active maintenance branch

- `cleanup/repository-hygiene-20260908`
- Repository hygiene pass #1 validated with 651 tests passed / 0 failed.
- Pass #2 removed the superseded legacy two-image editorial registry/assets and is awaiting full lint → typecheck → build → test validation before promotion.

## Validation

Most recent cleanup-branch validation supplied by founder:

- tests: 651 passed / 0 failed
- full suite completed successfully after repository-hygiene pass #1

Before promoting the current cleanup branch into canonical, run in order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm test`

## Production architecture

- Next.js App Router + React 19
- vinext / Vite runtime
- Cloudflare Worker
- OpenAI Sites control plane
- Cloudflare D1 via binding `DB`
- Drizzle ORM and numbered SQL migrations through `0021`
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

## Commercial relationships and pipeline

### Active / approved

- Toast — active referral relationship; `/go/toast` reference campaign exists.
- ThermoWorks — approved 2026-08-31; Impact referral/tracked links are wired in the repo.
- BLUETTI — approved/onboarded 2026-09-01; affiliate attribution link supplied by founder.
- Kitchen OS — active referral relationship.
- Chef's Deal — active commercial-kitchen-equipment affiliate relationship.

Important: active/approved program status does not equal verified current earnings. Current payout economics, cookie windows, paid-media rules, network-side conversions, commissions, and payment status still require current account verification before building generalized reconciliation infrastructure.

### Submitted / negotiation stage

- 7shifts — application submitted.
- Restaurant365 — direct partner/referral outreach; intro-call stage.
- Renogy — application submitted 2026-08-31.
- Jackery — application submitted 2026-08-31.
- EcoFlow — application submitted 2026-08-31.
- Restoke — application submitted 2026-08-31.
- Kitxens — application submitted 2026-08-31.
- Veno App — application submitted 2026-08-31.
- Vozly — partnership/affiliate inquiry submitted 2026-08-31.

Do not convert submitted or outreach-stage programs to APPROVED without new evidence.

## Commercial operating rules

- Main Chef Gringo site = intelligence + trust + decisions.
- Campaign pages = marketing + conversion, with disclosure and fit checks preserved.
- Customer value / recommendation quality must stay structurally separate from commission economics.
- No fake savings, conversion claims, or revenue assumptions.
- Pause indiscriminate affiliate accumulation once a category has adequate coverage; prioritize execution, measurement, and partner quality.

## Current blockers

1. Validate repository-hygiene pass #2.
2. Verify production/deployment relationship to GitHub `main` before moving default/trunk refs.
3. Resolve stale Partner Hunt analytics status messaging so founder UI reflects actual D1 persistence capability.
4. Verify current partner economics and actual account-side conversions/commissions.
5. Prove one complete click → conversion → commission loop on one active partner before generalizing revenue automation.

## Current priorities

1. Finish repository hygiene and validate it.
2. Partner Hunt truth/status correction.
3. Verify ThermoWorks/Impact first, then other active partners.
4. One-channel revenue reconciliation proof.
5. Founder dashboard expansion only after source-of-truth revenue data is proven.

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

The superseded legacy registry `app/home/editorial-images.ts` and its two old `/public/images/editorial/*` Unsplash files were removed in cleanup pass #2 after no remaining code-search references were found. Do not restore that two-image fallback system.

## Repository hygiene completed so far

- removed isolated `examples/d1` Notes demo/schema
- removed duplicate obsolete project-state ledger after migrating useful commercial history
- removed obsolete two-image editorial registry and two superseded images
- updated README and AGENTS guidance so future agents start from canonical project state
- documented cleanup decisions in `docs/CLEANUP_AUDIT.md`

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
- campaign landing-page specs unless explicitly superseded

## Branch disposition

- `canonical/chef-gringo` — ACTIVE CANONICAL
- `cleanup/repository-hygiene-20260908` — ACTIVE CLEANUP / validation branch
- `chatgpt/phase4-images-final` — source tip represented by canonical
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
