# Chef Gringo — Current State

Last updated: 2026-09-08

## Canonical branch

- Branch: `canonical/chef-gringo`
- Canonical commit: `e1a68356821beb3b12bc512505bf0875164cc1b6`
- This commit includes repository-hygiene passes #1 and #2.
- Phase 3 design-system consolidation is already in this lineage at `d6f357e23a703d8f05863a44f0ae6fd53319eca0`.
- Phase 4 homepage and curated-image work descend from Phase 3. Do not reapply Phase 3.
- GitHub `main` remains a legacy default branch and is behind the canonical lineage. Do not move it until deployment branch behavior is verified.

## Validation

Most recent founder-supplied validation for the promoted cleanup lineage:

- tests: 651 passed / 0 failed
- cancelled: 0
- skipped: 0
- todo: 0

The cleanup lineage was promoted into `canonical/chef-gringo` on founder instruction after the green test run.

Lint, typecheck, and build should continue to be run before future promotion/deployment changes; their exact output was not independently captured in the final test snippet preserved in this chat.

## Repository hygiene completed

- removed isolated `examples/d1` Notes demo/schema
- removed duplicate obsolete project-state ledger after migrating useful commercial history
- removed obsolete two-image editorial registry
- removed `public/images/editorial/commercial-kitchen-prep.jpg`
- removed `public/images/editorial/restaurant-kitchen-service.jpg`
- updated README and AGENTS guidance so future agents start from canonical project state
- documented cleanup decisions in `docs/CLEANUP_AUDIT.md`

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

1. Verify production/deployment relationship to GitHub `main` before moving default/trunk refs.
2. Resolve stale Partner Hunt analytics status messaging so founder UI reflects actual D1 persistence capability.
3. Verify current partner economics and actual account-side conversions/commissions.
4. Prove one complete click → conversion → commission loop on one active partner before generalizing revenue automation.
5. Continue conservative repository hygiene only where files are proven dead, duplicate, generated, or misleading.

## Current priorities

1. Partner Hunt truth/status correction.
2. Verify ThermoWorks/Impact first, then other active partners.
3. One-channel revenue reconciliation proof.
4. Founder dashboard expansion only after source-of-truth revenue data is proven.
5. Continue low-risk repository cleanup as a maintenance stream, not as a product rewrite.

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

Do not restore the superseded two-image fallback system.

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
- `cleanup/repository-hygiene-20260908` — COMPLETED CLEANUP SOURCE / archive candidate
- `chatgpt/phase4-images-final` — superseded source tip represented by canonical
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
