# Chef Gringo — Operating System Architecture v2

**Status:** Repo-grounded implementation blueprint  
**Date:** 2026-09-08  
**Source lineage:** `fix/partner-hunt-analytics-truth` → `docs/operating-system-architecture-v2`  
**Purpose:** Reconcile the external architecture review with the real Chef Gringo repository before any orchestration work is implemented.

## Executive decision

Chef Gringo should evolve into a persistent hospitality operating system using the pipeline:

`Signal → Research → Evidence → Content → Creative → Distribution → Commercial Action → Revenue → Learning → Next Signal`

The operating-system layer must **coordinate existing systems rather than replace or duplicate them**.

The core architectural rule is:

> `work_item` is a thin coordination record. It references domain-owned evidence, content, publication, partner, campaign, and revenue records by ID. It does not become a second source of truth for those records.

## Source-of-truth hierarchy by domain

There is no single universal source of truth. Authority is domain-specific:

1. **Git / GitHub** — code truth: branch, commit, file contents, migration history, implementation state.
2. **D1 structured state** — business and operational truth: partners, commercial events, work state, approvals, decisions, publications, revenue events.
3. **Append-only event/history rows** — historical truth: what changed, when, by whom, and why.
4. **Generated state document** — readable snapshot derived from Git + D1; advisory and timestamped, never authoritative over its inputs.
5. **AI session summaries** — narrative continuity only.
6. **Conversation memory** — lowest-trust convenience context; never authoritative.

When two sources conflict, resolve by the authority for that domain rather than a global ranking.

## Existing repo capabilities: preserve and extend

### EXISTS — preserve as authoritative building blocks

- Ask Chef Gringo
- Culinary Pulse
- Marketplace and Product Harvest
- research / evidence governance
- publication/performance tracking
- commercial event tracking
- Revenue Operations
- Growth Queue
- Partner Hunt
- newsletter / Loops adapter
- curated brand imagery
- admin authorization
- D1 / Drizzle migration history

### EXISTS — partner/commercial data structures that must be mapped before adding tables

The canonical schema already includes:

- `affiliatePartners`
- `partnerOpportunities`
- `merchantLinks`
- `commercialEvents`

`partnerOpportunities` already carries provider identity, commercial lane, program type, lifecycle, economics, evidence, verification, rejection reason, application date, affiliate URL, affiliate identifier, and notes.

Therefore, do **not** automatically create parallel `Partner`, `Program`, and `Application` tables just because an external design document proposed them. First perform a field-by-field ownership audit of the existing structures and decide whether to:

- extend `partnerOpportunities`,
- normalize selected fields into child tables only where multiple programs/applications per partner are actually required,
- or retire/consolidate an older structure after migration and validation.

The rule is one authoritative owner per fact.

## New coordination entities

### NEW: `work_items`

A thin coordination layer only.

Recommended fields:

- `id` — text/UUID-compatible identifier
- `source` — e.g. `culinary_pulse`, `ask_log`, `search_demand`, `partner_change`, `manual`
- `entity_type` — signal/content/campaign/partner_action/etc.
- `entity_id` — nullable reference to the domain-owned entity
- `problem_statement` — concise operator problem
- `audience` — restaurant / food truck / senior living / etc.
- `priority` — explicit 1–5; never silently re-ranked
- `stage` — coordination stage only
- `owner` — human or scoped agent identifier
- `approval_status` — `not_required | pending | approved | rejected`
- `commercial_relevance` — `none | possible | attached`
- `parent_work_item_id` — nullable parent reference
- `campaign_id` — nullable
- `partner_id` — nullable
- `revenue_attribution_id` — nullable, admin-only
- `failure_state` — `none | retrying | failed_needs_human`
- `retry_count`
- `stage_entered_at`
- `created_at`
- `updated_at`

Do **not** persist derived domain facts such as `evidence_status` if they already belong to the evidence system. Read them live or through a view/query.

Do **not** store `child_work_item_ids` arrays. Derive children by querying `parent_work_item_id`, or use a dedicated relationship table only if multiple relationship types become necessary.

Because Chef Gringo uses D1/SQLite, use the existing repository convention for structured data (`text` columns containing JSON where needed). Do not design PostgreSQL-only `jsonb` types into the implementation plan.

### NEW: `work_item_events`

Append-only audit history:

- `id`
- `work_item_id`
- `from_stage`
- `to_stage`
- `actor`
- `note`
- `created_at`

Past rows are never edited.

### NEW: `decisions`

Append-only founder/system decision log with subject reference, decision, rationale, actor, and timestamp.

### NEW: `approvals`

Explicit approval record with work item, gate, actor, decision, note, timestamp.

## Orchestration lifecycle

Do not force every item through a single rigid linear path.

Use broad coordination stages:

`INTAKE → RESEARCH → REVIEW → PRODUCTION → READY → PUBLISHED/EXECUTED → MEASURING → CLOSED`

Side states:

`STALLED`, `FAILED`, `REJECTED`.

Domain-specific child work may branch under a parent item. For example, a refrigeration signal may create a research child, article child, newsletter child, and campaign child without pretending every one of those artifacts shares the same lifecycle.

Approval gates remain explicit:

- evidence sufficiency override
- editorial approval
- public publishing
- new commercial relationship
- partner outreach / contract acceptance
- financial commitment
- revenue claims outside admin
- schema/infrastructure change
- canonical branch promotion

## Agent model

Keep the architecture small.

### Five scoped agents

1. **Signal Agent** — creates candidate work from Culinary Pulse, Ask logs, search demand, and verified partner changes.
2. **Research/Evidence Agent** — gathers and organizes evidence using existing governance.
3. **Content Agent** — drafts only from approved evidence context.
4. **Partner Agent** — status verification and ledger maintenance only; no autonomous outreach or contract acceptance.
5. **Revenue Agent** — conservative read-only reconciliation; no access to recommendation-scoring economics.

### Deterministic infrastructure, not agents

- state bootstrap / state-doc generation
- stale-state detection
- retries/backoff
- publication execution after approval
- scheduled imports
- link checks

### Deferred

- Creative Agent
- autonomous multi-channel Distribution Agent
- generic multi-agent orchestration framework

## Memory and continuity protocol

### Session bootstrap

Every coding/operating session must:

1. verify the actual git branch and commit;
2. read the current state snapshot;
3. query/inspect the authoritative business state required for the task;
4. inspect existing code/schema for equivalent capability before creating anything new;
5. halt on a branch/source-of-truth mismatch rather than guessing.

### Pre-change requirement

Before adding a new subsystem, record:

> I checked for the existing capability at: [files/tables/routes]. It does / does not exist. The proposed change extends rather than duplicates it because: [reason].

### Post-change requirement

Every meaningful change must record:

- branch
- commit
- what changed
- validation result
- business-state impact
- known issues
- next action

### Generated current-state document

Long-term target: `CHEF_GRINGO_CURRENT_STATE.md` becomes machine-generated from authoritative sources where feasible, with a timestamp and explicit provenance. Until that generator exists, it remains a maintained operational snapshot and must never override Git/D1 truth.

## Day-to-day operating model

Cadence follows how quickly the underlying fact changes, not a software-company ritual.

- **First open of day:** Morning Brief — overnight changes, approvals, stale work, partner/revenue changes.
- **Daily:** short approval triage.
- **Daily/every other day:** one batched production block.
- **2–3× weekly:** partner/commercial review.
- **Weekly until volume justifies more:** economics reconciliation.
- **End of day:** deterministic state checkpoint showing completed work, decisions, unresolved items, and next actions.

## Founder command center target

Every visible module must be backed by real state/query data; `Unknown` is valid.

- Current State
- Today
- Needs Approval
- Signals
- Research
- Content
- Distribution
- Partners
- Revenue
- Failures
- What Changed
- Next Best Actions

No vanity widgets. No hard-coded health labels that contradict actual persistence.

## Revenue architecture

Editorial neutrality is structural:

- recommendation scoring cannot read commission/payout fields;
- commercial routing happens only after an evidence/fit-based recommendation exists;
- revenue records trace back through commercial event → content/recommendation → partner/program/campaign;
- public events cannot assert commission or revenue;
- first automated revenue channel is hand-verified against the partner dashboard before generalized automation.

## Implementation status map

### DONE / ESTABLISHED

- canonical lineage has been reconciled; do not redo Phase 3/4 branch archaeology
- `canonical/chef-gringo` is the working canonical lineage
- `main` remains legacy/default and must not be moved yet
- repository hygiene passes completed and test suite previously reported 651/651 green

### IN PROGRESS

- Partner Hunt stale analytics label correction exists on `fix/partner-hunt-analytics-truth`; validation/promotion still pending
- affiliate/partner business truth is being reconciled from real account/email evidence

### NOW

1. Finish partner portfolio truth and update the authoritative ledger/status source.
2. Validate and promote the Partner Hunt analytics-truth fix after current business-truth reconciliation.
3. Verify deployment/trunk behavior between canonical and legacy `main` — do not redo branch reconciliation.
4. Design the deterministic state snapshot generator.
5. Verify actual economics/clicks/conversions/commissions for confirmed-active partners.

### NEXT

1. Perform a field-ownership audit of `affiliatePartners` vs `partnerOpportunities` before any new commercial schema is added.
2. Add `work_items` + `work_item_events` as additive coordination infrastructure only.
3. Wire one source first: Culinary Pulse.
4. Run one vertical manually assisted end-to-end; refrigeration repair-or-replace remains a strong candidate.
5. Add decisions/approvals only where the first vertical proves the need.

### LATER

- widen Research/Evidence/Content automation
- Creative Agent
- multi-channel distribution automation
- generalized revenue ingestion
- polished founder command center

### DO NOT BUILD YET

- generic multi-agent framework
- autonomous public publishing
- autonomous partner outreach
- ML next-best-action ranking
- generalized content flywheel across all verticals
- new database
- migration away from D1
- moving `main` to canonical before deployment verification

## Validation rule

No architecture phase is promoted to canonical merely because it compiles.

Required sequence for code-bearing changes:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm test`

Then manually validate the specific business/source-of-truth behavior the phase changes.

## Final architectural principle

Chef Gringo should become easier to understand as it becomes more capable.

The operating system is successful only if a future agent or engineer can answer, without guessing:

- what is true now,
- what changed,
- why it changed,
- what is pending,
- what source owns each fact,
- and what the next safe action is.
