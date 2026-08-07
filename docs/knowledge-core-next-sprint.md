# Chef Gringo Knowledge Core — Recommended Next Sprint

## Recommendation

Run one narrow implementation sprint that proves governed operational knowledge without redesigning the Marketplace:

> Producing consistent IDDSI Level 4 puréed meals in a senior-living kitchen

The sprint should create a durable workflow record, ordered steps, attributable sources, review/verification controls, and a protected admin editor. It should not add public pages, recommendation AI, generalized content builders, broad commerce features, or a universal graph abstraction.

## Why this workflow

It exercises the most important missing capabilities:

- a defined operational problem;
- a job with a measurable outcome;
- a high-consequence senior-living environment;
- culinary and clinical boundaries;
- ordered production steps;
- critical control points;
- common mistakes and corrective actions;
- authoritative and operational evidence;
- role-appropriate review;
- product/equipment relationships without making the workflow an advertisement.

It also forces the system to distinguish IDDSI testing and facility policy from product marketing. The sprint must not claim clinical suitability or universal compliance; current authoritative guidance and qualified local review remain controlling.

## Preserve the current 20-table foundation

Keep all existing tables. Reuse:

- `use_cases` for the canonical problem and desired outcome.
- `customer_personas` for culinary director, cook, dietary manager, and dietitian context as appropriate.
- `culinary_environments` for senior-living kitchen.
- `products` and `product_use_cases` for equipment that supports—but does not define—the workflow.
- `editorial_events` for workflow activity and audit details.
- Existing platform identity for author/reviewer attribution.

Do not add generic “knowledge nodes,” “knowledge edges,” ontology, embeddings, recommendation logs, AI conversations, or certification catalogs during this sprint.

## Required MVP schema changes

The exact migration should be proposed and reviewed during implementation, not generated during this discovery sprint.

### 1. `workflows`

Small first-class record for the governed operational method.

Recommended fields:

- `id`, `slug`, `title`
- `use_case_id` FK
- `persona_id` FK or one primary audience for the pilot
- `environment_id` FK
- `problem_statement`
- `job_statement`
- `entry_conditions`
- `intended_outcome`
- `measurable_outcome`
- `next_action`
- `confidence_level` constrained to `insufficient|low|moderate|high`
- `status` constrained to `draft|in_review|changes_requested|approved|published|withdrawn`
- `author_email`
- `reviewer_email`
- `reviewed_at`
- `last_verified_at`
- `review_due_at`
- `version` integer default `1`
- timestamps

This is intentionally specific. Generalize multi-persona/multi-environment junctions only when a second workflow proves they are required.

### 2. `workflow_steps`

Recommended fields:

- `id`, `workflow_id` FK with cascade
- `position` with unique `(workflow_id, position)`
- `title`
- `instruction`
- `critical_control_point`
- `common_mistake`
- `corrective_action`
- `measurable_check`
- `next_action`
- timestamps

Keep mistakes and corrective actions on the step in the MVP. Normalize only if reuse appears across workflows.

### 3. `sources`

Recommended fields:

- `id`
- `title`
- `responsible_organization`
- `publisher`
- `source_type`
- `url_or_identifier`
- `published_or_revised_at`
- `accessed_at`
- `jurisdiction_or_scope`
- `locator`
- `status` constrained to `active|superseded|withdrawn|inaccessible`
- timestamps

### 4. `workflow_sources`

Recommended fields:

- `workflow_id` FK
- `source_id` FK
- optional `workflow_step_id` FK
- `claim`
- `evidence_class`
- `applicability`
- `limitations`
- composite identity that prevents duplicate claim/source linkage

This provides claim-level attribution without adding a generalized evidence platform.

### 5. Audit detail, not a new audit system

Reuse `editorial_events`. For every workflow mutation, write an event in the same transaction containing:

- version;
- reason;
- before/after changed fields;
- source additions/removals;
- actor;
- review decision.

If event detail cannot support a reliable snapshot after implementation testing, add a narrowly scoped `workflow_versions` table. Do not add it preemptively.

## Required MVP admin changes

Add one protected route: `/admin/marketplace/workflows/:id`.

The editor should have five focused sections:

1. **Context**
   - problem/use case;
   - job statement;
   - persona;
   - environment;
   - entry conditions;
   - outcome and next action.
2. **Steps**
   - reorderable step list;
   - instruction;
   - critical control point;
   - common mistake;
   - corrective action;
   - measurable check.
3. **Evidence**
   - source create/select;
   - claim and locator;
   - evidence class;
   - applicability and limitations.
4. **Review**
   - confidence rubric;
   - reviewer;
   - verification dates;
   - Constitution checklist;
   - changes-requested reason.
5. **History**
   - timestamped audit events and changed fields.

Publishing must be a server-side operation that fails unless required fields, at least one valid source, reviewer identity, verification dates, confidence, every required step field, measurable outcome, and audit reason are present.

Do not implement generalized admin modules for guides, reviews, comparisons, vendors, or affiliates in this sprint.

## Proving workflow content boundary

The pilot should model the method, not invent clinical policy.

Minimum knowledge package:

- Problem: inconsistent texture and unsafe/nonconforming puréed-meal production.
- Job: produce repeatable Level 4 meals that meet current IDDSI testing expectations and the facility’s approved care plan and policies.
- Persona: production cook/culinary leader, with qualified dietitian or speech-language-pathology review where required.
- Environment: senior-living kitchen with batch production, sanitation, allergen, holding, and service constraints.
- Outcome: meals pass the relevant current IDDSI Level 4 checks at service conditions and match the individual’s prescribed plan.
- Steps: plan recipe and yield; prepare ingredients; cook appropriately; process; adjust consistency; perform and document tests; portion/hold; recheck at service; label/trace; handle failed checks.
- Corrective actions: explicitly cover too thin, too thick/sticky, lumps/particles, separation, temperature/holding changes, wrong recipe/label, and failed retest.
- Sources: current IDDSI framework/testing material plus facility-approved policies and qualified local review.
- Next action: document result and serve only when the meal meets the current prescribed requirements; otherwise correct, retest, or escalate.

## Required MVP tests

- Migration applies cleanly to an empty D1-compatible database.
- Workflow create/update requires authenticated identity.
- Position uniqueness and FK behavior are enforced.
- Invalid status/confidence values are rejected.
- Publication fails for every missing Constitution gate.
- Publication succeeds for a complete fixture.
- Audit event and workflow change commit atomically.
- Revision reason and changed fields are retained.
- Source withdrawal lowers or blocks publishability as designed.
- Unauthorized/self-approval rule for high-risk content is enforced.
- Existing 12 tests remain green.
- Existing product admin and `/marketplace` HTML remain unchanged.

## MVP acceptance criteria

- One complete IDDSI Level 4 workflow exists in D1 as governed knowledge.
- Every step has a check, common mistake, and corrective action.
- Every material claim has an attributable source.
- Confidence follows the Constitution rubric.
- Author, reviewer, last verification, and next review are recorded.
- Server-side quality gates prevent incomplete publication.
- Audit history explains what changed and why.
- No public feature is added.
- No existing table is replaced.
- Existing Marketplace behavior and tests remain intact.

## Future backlog — explicitly out of scope

- Public workflow pages.
- AI purchasing or culinary advisor.
- Embeddings/vector search.
- Universal knowledge-node/edge abstraction.
- Multi-persona and multi-environment workflow junctions unless the pilot proves them necessary.
- Generalized claim/evidence framework across every entity.
- Full role-based access-control system.
- Guide/review/comparison workflow editors.
- Product certification registry.
- Source ingestion/crawling.
- Automated regulation monitoring.
- Public revision diffs.
- Notifications and review reminders.
- Saved collections and personalization.
- Equipment planning and procurement dashboards.

## Sprint sequence

1. Review Constitution and approve the pilot content boundary.
2. Write migration proposal and state-transition contract.
3. Add workflow/source schema and repository helpers.
4. Build authenticated APIs with transactions and quality gates.
5. Build the single workflow admin editor.
6. Enter and review the IDDSI Level 4 pilot record.
7. Add integration and regression tests.
8. Validate locally; deploy only after a separate explicit approval.

## Definition of “smallest successful correction”

The sprint succeeds when Chef Gringo can store, review, verify, revise, and audit one high-quality operational workflow. It does not need to prove every future content type. The resulting pattern should be extended only after the pilot reveals which relationships and controls are truly reusable.
