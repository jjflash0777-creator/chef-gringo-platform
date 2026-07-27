# Knowledge Core Pilot Architecture

## Scope

This implementation adds the smallest governed Knowledge Core needed to store, edit, review, verify, revise, and audit one operational workflow. It does not add a public workflow surface, AI recommendations, a generalized graph, automated source verification, or clinical decision-making.

## Baseline and preservation

Pre-implementation baseline: `07d5f4fa0f7edb64f468795b3ef931a653cb5256`.

All 20 existing Marketplace tables are preserved. The pilot reuses:

- `customer_personas` for the primary audience;
- `culinary_environments` for the operating context;
- `use_cases` for the canonical problem/outcome;
- `products` and `product_use_cases` for future supporting equipment relationships without duplicating products;
- `editorial_events` for append-only workflow history;
- platform-provided user identity;
- the existing Marketplace admin styling and Vinext/D1 architecture.

## Added tables

### `workflows`

Canonical operational workflow record. It stores title, slug, summary, problem, job, outcome, next action, affiliate disclosure, constrained status/confidence, primary context foreign keys, author/reviewer identity, verification/review dates, publication date, and revision number.

Integrity:

- unique slug;
- constrained `draft|in_review|published` status;
- constrained `insufficient|low|moderate|high` confidence;
- positive revision number;
- foreign keys to existing persona, environment, and use-case tables;
- indexes on status and primary context.

### `workflow_steps`

Ordered operational actions with instruction, purpose, expected result, measurable check, common mistake, corrective action, and constrained risk.

Integrity:

- cascade delete with workflow;
- positive position;
- unique `(workflow_id, position)`;
- constrained `low|medium|high` risk;
- workflow index.

Reordering uses a temporary position offset inside one D1 batch, then writes contiguous positions. Deletion removes step evidence and compacts the remaining sequence atomically.

### `sources`

Pilot-scale source metadata with constrained types and verification status. It intentionally avoids a universal citation platform.

Source types:

- professional standard;
- manufacturer documentation;
- regulatory guidance;
- professional-organization guidance;
- direct professional experience;
- editorial judgment.

Verification states are `draft`, `verified`, `superseded`, and `withdrawn`.

### `workflow_sources`

Queryable claim-level provenance joining a source to a workflow or specific step. It stores claim text, evidence summary, confidence, limitations, verifier, and verification time.

Integrity:

- cascade delete with workflow, step, or source;
- constrained confidence;
- unique workflow/step/source/claim combination;
- indexes for workflow, step, and source lookup.

## Runtime layers

```text
Protected admin pages
  └─ workflow editor / new-workflow form
       └─ authenticated workflow APIs
            └─ centralized editor allowlist
                 └─ Knowledge Core repository
                      ├─ D1 transactional batches
                      ├─ server quality gates
                      └─ editorial_events
```

### Domain layer

`app/lib/knowledge-core.ts` owns stable confidence identifiers, descriptions, minimum evidence expectations, lifecycle transitions, and publication gates. These rules are independent from the UI.

### Authorization layer

`app/lib/marketplace-permissions.ts` performs pure request/email authorization. `app/marketplace-authorization.ts` applies the same boundary to server-rendered admin pages.

### Repository layer

`db/knowledge-core-repository.ts` owns SQL reads and mutations. Mutations use D1 `batch`, which is transactional: the content change and audit event commit together or roll back together.

### API layer

Routes under `/api/marketplace/workflows` validate authorization and inputs, call repository operations, and return safe errors.

## Seed strategy

`0002_seed_iddsi_pilot.sql` creates only:

- one existing-model persona;
- one existing-model environment;
- one existing-model use case;
- one draft, insufficient-confidence workflow;
- twelve draft operational steps;
- one workflow-created audit event.

The initial seed creates no sources and no verified claims. Follow-up editorial migration `0003_validate_iddsi_pilot_evidence.sql` records eight real primary sources, twenty-one precisely limited claim links, and twelve evidence-informed step revisions. Every source/link remains draft and insufficient pending qualified human verification.

## Migration and reversal guidance

Migration `0001_early_punisher.sql` adds the four tables. Migration `0002_seed_iddsi_pilot.sql` adds the draft fixture. Migration `0003_validate_iddsi_pilot_evidence.sql` adds editorial content and evidence records only; it makes no schema change and does not publish.

Sites/D1 deployments are forward-migration oriented. Before any deployed reversal:

1. confirm no published workflow depends on the new tables;
2. export workflow, step, source-link, source, and workflow audit data;
3. remove only pilot records if retaining the schema;
4. if full reversal is approved, drop in dependency order: `workflow_sources`, `workflow_steps`, `sources`, `workflows`;
5. preserve `editorial_events` unless an explicit retention decision permits removal;
6. create a reviewed forward migration rather than editing applied migration files.

No reversal was executed in this sprint.

## Adding a second workflow without code

An allowlisted editor opens `/admin/marketplace/workflows/new`, enters a title, slug, and draft summary, and creates a canonical insufficient-confidence draft. The editor is redirected to the governed workflow screen to add existing persona/environment/use-case context, ordered steps, sources, reviewer, verification dates, and evidence. No source code or migration is required.

This capability does not create another seeded workflow; it only enables controlled future authoring.
