# Chef Gringo — Current State

Last updated: 2026-09-08

## Canonical branch

- Branch: `canonical/chef-gringo`
- Canonical head at start of this architecture reconciliation: `5f7b6b19142dc6f87c1feffc90102fa2007deeb1`
- This lineage includes repository-hygiene passes #1 and #2.
- Phase 3 design-system consolidation is already in this lineage at `d6f357e23a703d8f05863a44f0ae6fd53319eca0`.
- Phase 4 homepage and curated-image work descend from Phase 3. Do not reapply Phase 3.
- GitHub `main` remains a legacy default branch and is behind the canonical lineage. Do not move it until deployment branch behavior is verified.

## Active branches

### `fix/partner-hunt-analytics-truth`

- Purpose: remove the hard-coded false `DISCONNECTED` analytics status from Partner Hunt and replace it with a runtime D1/revenue-summary health check.
- Implementation commit: `f060e7b7b4d3918c463d503de04bc19dce5e1064`
- Business-truth/state follow-up commit: `9e4b3c3db173b45cfdb7d92263ee998c2c75d820`
- Awaiting full validation before promotion to canonical.

### `docs/operating-system-architecture-v2`

- Purpose: reconcile the external operating-system architecture review against the real Chef Gringo schema before any orchestration code is built.
- New blueprint: `docs/OPERATING_SYSTEM_ARCHITECTURE_V2.md`
- This branch intentionally starts from `fix/partner-hunt-analytics-truth` so the architecture review includes the latest Partner Hunt truth fix and business-state corrections.
- No orchestration code or schema migration has been added on this branch.

## Validation

Most recent founder-supplied validation for the promoted cleanup lineage:

- tests: 651 passed / 0 failed
- cancelled: 0
- skipped: 0
- todo: 0

Before promoting code-bearing Partner Hunt changes, run:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm test`

Documentation-only architecture reconciliation does not prove the Partner Hunt code fix; that code still requires the full validation sequence above.

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

## Operating-system architecture decision

The reviewed target pipeline is:

`Signal → Research → Evidence → Content → Creative → Distribution → Commercial Action → Revenue → Learning → Next Signal`

Implementation rule: connect the systems above through a thin coordination layer; do not replace or duplicate their domain-owned state.

The repo-grounded design is documented in `docs/OPERATING_SYSTEM_ARCHITECTURE_V2.md`.

Important corrections from the external design review:

- Git/GitHub owns code/branch truth; D1 owns structured business/operational truth.
- `work_item` must be a thin coordination row, not a second copy of evidence/content/publication state.
- D1/SQLite conventions apply; do not design PostgreSQL-only `jsonb` into the plan.
- do not store both parent and child ID arrays; derive children from `parent_work_item_id` or use a relation table if needed.
- do not create new Partner/Program/Application tables until the existing `affiliatePartners` and `partnerOpportunities` ownership model is audited.
- state bootstrapping/stale detection belongs in deterministic infrastructure, not an LLM Memory Agent.

## Commercial relationships and pipeline

### Verified active / approved

- ThermoWorks — Impact welcome email dated 2026-08-31 confirms acceptance into the ThermoWorks Affiliate Program; Impact account ID `7640961` and program ID `39638` are consistent with tracked links already wired in the repo.
- BLUETTI — Impact acceptance/welcome email dated 2026-09-01 confirms onboarding.
- Kitchen OS — referral-program welcome email dated 2026-08-20 confirms enrollment.
- Chef's Deal — CJ welcome email dated 2026-08-25 confirms acceptance into the Chef's Deal Affiliate Program.
- Toast Advocates — Toast welcome email dated 2026-08-19 confirms enrollment; payout-details update email dated 2026-08-20 confirms payout setup activity.
- Crazy Good Buy — approval email dated 2026-09-02 confirms the affiliate account was approved; payment-info verification activity also exists.

These messages verify enrollment/approval, not earnings.

### Final onboarding / almost revenue-ready

- Restaurant365 — Referral Partner Agreement is completed and acknowledged by J.R. Gudger. Latest email says Restaurant365 only needs a W-9 on file to wrap up onboarding. Treat as `AGREEMENT_SIGNED / W9_PENDING`, not intro-call stage and not fully active yet.
- Veno App — direct email dated 2026-09-01 says they would love to have Chef Gringo on board; follow-up says an affiliate dashboard/login will be set up. Treat as `ACCEPTED / ONBOARDING`, not merely submitted.

### Direct partnership development

- FoodDocs — expressed interest in partnership but explicitly said their model is not a simple referral setup. Commercial structure remains unresolved.
- Restoke — active direct conversation/follow-up exists; no signed affiliate/referral agreement is yet established from current evidence.

### Pending / unresolved

- Jackery — Impact application received 2026-08-31; no later approval/decline evidence found in the current email audit.
- Square / Block affiliate — Impact application received; later Trackonomics Essentials emails are analytics/network aggregation and do not prove Square affiliate acceptance.
- 7shifts — prior application status exists in project history, but no new confirming Gmail evidence was found in the current audit.
- EcoFlow — prior application status exists in project history, but no new confirming Gmail evidence was found in the current audit.
- Kitxens — prior application status exists in project history, but no new confirming Gmail evidence was found in the current audit.
- Vozly — prior inquiry/application status exists in project history, but no new confirming Gmail evidence was found in the current audit.

### Declined

- Renogy — Impact decline email dated 2026-09-01.
- Dalstrong UK — affiliate application rejection dated 2026-09-01.
- Dalstrong Canada — affiliate application rejection dated 2026-09-01.

### Revenue truth

No enrollment/approval message should be interpreted as proof of clicks, conversions, commissions, or payment.

A Gmail search for ThermoWorks/Impact performance-language after the 2026-08-31 approval found no sale/conversion/commission/payout notification. That is **not evidence of zero earnings**; email alone does not establish network-side revenue. Dashboard/API/export evidence is required for authoritative clicks, actions, commissions, reversals, and payment status.

## Commercial operating rules

- Main Chef Gringo site = intelligence + trust + decisions.
- Campaign pages = marketing + conversion, with disclosure and fit checks preserved.
- Customer value / recommendation quality must stay structurally separate from commission economics.
- No fake savings, conversion claims, or revenue assumptions.
- Application submitted ≠ approved.
- Approved ≠ revenue-producing.
- Click ≠ conversion.
- Conversion ≠ paid commission.
- Pause indiscriminate affiliate accumulation once a category has adequate coverage; prioritize execution, measurement, and partner quality.

## Current blockers

1. Finish the full partner/affiliate portfolio truth pass and ensure the authoritative commercial ledger reflects it.
2. Validate and promote the Partner Hunt analytics truth fix.
3. Verify production/deployment relationship to GitHub `main` before moving default/trunk refs.
4. Complete Restaurant365 W-9 onboarding and capture its actual referral economics/attribution process after activation.
5. Obtain authoritative account-side performance data for active partners before generalized revenue automation.
6. Prove one complete click → conversion → commission loop on one active partner.

## Current priorities

1. Partner portfolio truth and ledger consolidation.
2. Restaurant365 final onboarding.
3. Validate Partner Hunt truth/status correction.
4. Verify actual economics and performance for revenue-ready partners.
5. One-channel revenue reconciliation proof.
6. Only then begin the additive operating-system coordination layer described in Architecture v2.

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
- existing affiliate/commercial tables until ownership is mapped and a migration plan is approved

## Branch disposition

- `canonical/chef-gringo` — ACTIVE CANONICAL
- `fix/partner-hunt-analytics-truth` — ACTIVE VALIDATION BRANCH
- `docs/operating-system-architecture-v2` — ACTIVE ARCHITECTURE RECONCILIATION BRANCH
- `cleanup/repository-hygiene-20260908` — completed cleanup source / archive candidate
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
