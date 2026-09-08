# Chef Gringo

Chef Gringo is a hospitality-intelligence platform built around one operating principle:

**Information → Decision → Action → Appropriate Commercial Route**

Public product areas include Ask Chef Gringo, Culinary Pulse, food/knowledge content, operator tools, and an evidence-led Marketplace. Internal founder systems include Partner Hunt, Revenue Operations, research/evidence workflows, publication tracking, and growth operations.

## Canonical project state

Read [`docs/CHEF_GRINGO_CURRENT_STATE.md`](docs/CHEF_GRINGO_CURRENT_STATE.md) before making changes. It records the canonical branch, validated baseline, current blockers, preservation rules, and next actions.

The active development lineage is `canonical/chef-gringo` unless that state document records a successor. Do not assume GitHub `main` represents the latest product state.

## Runtime

Chef Gringo uses:

- Next.js App Router + React 19
- vinext / Vite
- Cloudflare Worker
- Cloudflare D1 + Drizzle ORM
- OpenAI Sites deployment control plane

This is not a normal `next dev` / `next build` deployment path.

## Run locally

```bash
npm install
npm run dev
```

## Validate

Run in this order:

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

## Environment

Use `.env.example` as the authoritative list of environment-variable names. Never commit real credentials.

Notable integrations include:

- Loops email/newsletter adapter
- OpenAI-compatible Ask Chef Gringo runtime
- Marketplace/admin authorization allowlist
- optional Stripe decision-brief infrastructure
- governed corpus / bounded research controls
- optional live candidate discovery

Unconfigured providers must return honest unavailable states rather than pretending data was persisted or a commercial relationship exists.

## Documentation

- [`docs/CHEF_GRINGO_CURRENT_STATE.md`](docs/CHEF_GRINGO_CURRENT_STATE.md) — canonical operational handoff
- [`docs/CLEANUP_AUDIT.md`](docs/CLEANUP_AUDIT.md) — repository-hygiene decisions
- [`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md) — technical blueprint
- [`docs/ENGINEERING_HANDOFF.md`](docs/ENGINEERING_HANDOFF.md) — historical operational handbook; some sections may be stale
- [`docs/foundation`](docs/foundation) — product governance and constraints

## Safety rules for maintenance

- Preserve D1 migrations and durable data contracts.
- Preserve server-side admin authorization.
- Preserve curated `public/brand/editorial/` assets.
- Do not reapply the Phase 3 design-system migration; it is already in the canonical lineage.
- Do not delete dormant-but-intentional code solely because it is not rendered publicly.
- Never run destructive repository cleanup without first proving a file or subsystem is redundant.
