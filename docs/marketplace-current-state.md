# Chef Gringo Marketplace — Current-State Audit

Audit date: 2026-07-27  
Audited source: `codex/chef-gringo-foundation-sprint-01` at `62c72264e9d5c3d4a9d2fbbc18ea73ec75645e71`  
Scope: Marketplace schema, migration, public and administrative application surfaces, validation, governance, tests, and fixture content.

## Executive summary

The current Marketplace is a compact foundation with three layers:

1. A public, static Marketplace page that demonstrates problem-led navigation, transparent tradeoffs, trust language, and representative recommendations.
2. A protected product-administration page that can create canonical product drafts and advance them through a three-state editorial pipeline.
3. A 20-table D1 schema that separates catalog, contextual fit, commerce, editorial content, and audit events.

The strongest architectural decisions are the canonical `products` table, separate merchant/affiliate records, normalized persona/environment/use-case fit junctions, and product references from guides and comparisons. The largest gaps are that the public page is not database-backed; operational workflows and workflow steps are not modeled; evidence has labels but no source provenance; publishing has no enforced reviewer, verification date, confidence rubric, or quality gate; and the audit table is an activity log rather than reconstructable version history.

No schema or application behavior was changed during this audit.

## Runtime and hosting

- Framework: Next-compatible Vinext application built with Vite.
- Hosting: Cloudflare Worker-compatible output.
- Persistence: Cloudflare D1 through logical binding `DB`.
- Object storage: R2 is not enabled.
- ORM and migrations: Drizzle ORM and Drizzle Kit.
- Authentication: platform-provided ChatGPT/OpenAI identity headers.
- Preview Site: `chef-gringo-preview`, owner-only.
- Database access: `db/index.ts` reads the request Worker environment exposed by `worker/index.ts` and returns a Drizzle client.

## Database inventory

All tables use SQLite/D1. Unless noted otherwise, entity tables have integer autoincrement primary keys and `created_at`/`updated_at` text timestamps defaulting to `CURRENT_TIMESTAMP`.

### Catalog and context

#### `brands`

Columns: `id` PK; `name` required; `slug` required; optional `website_url`; `notes` required default `""`; timestamps.  
Indexes/constraints: unique `brands_slug_idx(slug)`.  
Relationships: referenced optionally by `products.brand_id`. Deleting a brand is not configured to cascade.

#### `vendors`

Columns: `id` PK; `name` required; `slug` required; optional `website_url`, `contact_name`, `contact_email`; timestamps.  
Indexes/constraints: unique `vendors_slug_idx(slug)`.  
Relationships: referenced optionally by `merchant_links.vendor_id`. No delete cascade.

#### `affiliate_partners`

Columns: `id` PK; `name`, `network`, `commission_type` required; optional `commission_value`, `cookie_duration_days`, `contact_name`, `contact_email`; `approval_status` required default `researching`; `supported_categories` JSON text default `[]`; `notes` default `""`; timestamps.  
Indexes/constraints: primary key only; no uniqueness constraint on partner/network identity.  
Relationships: referenced optionally by `merchant_links.affiliate_partner_id`.

#### `categories`

Columns: `id` PK; optional `parent_id`; `name`, `slug`, `problem_statement` required; `description` default `""`; timestamps.  
Indexes/constraints: unique `categories_slug_idx(slug)`.  
Relationships: referenced optionally by `products.category_id`. `parent_id` is not declared as a foreign key, so hierarchy integrity is not database-enforced.

#### `customer_personas`

Columns: `id` PK; `name`, `slug` required; `needs`, `constraints` default `""`; timestamps.  
Indexes/constraints: unique `personas_slug_idx(slug)`.  
Relationships: many-to-many with products through `product_personas`.

#### `culinary_environments`

Columns: `id` PK; `name`, `slug` required; `requirements` default `""`; timestamps.  
Indexes/constraints: unique `environments_slug_idx(slug)`.  
Relationships: many-to-many with products through `product_environments`.

#### `use_cases`

Columns: `id` PK; `name`, `slug`, `problem_statement`, `outcome` required; timestamps.  
Indexes/constraints: unique `use_cases_slug_idx(slug)`.  
Relationships: many-to-many with products through `product_use_cases`. This is the closest current representation of a problem/job/outcome, but it has no workflow steps.

#### `products`

Columns: `id` PK; optional `brand_id`, `category_id`; required `name`, `slug`, `summary`, `best_for`; optional `model_number`, price bounds, and `published_at`; `not_recommended_for`, `operational_experience`, `internal_notes` default `""`; JSON-text `pros`, `cons`, `features`, `certifications`, `documentation_urls`, `video_urls`, `image_urls` default `[]`; JSON-text `specifications` default `{}`; `editorial_status` default `draft`; `evidence_level` default `research`; timestamps.  
Indexes/constraints: unique `products_slug_idx(slug)`; `products_category_idx(category_id)`; `products_status_idx(editorial_status)`; optional FKs to brand and category.  
Relationships: central canonical record referenced by persona, environment, use-case, merchant, relationship, review, guide, and comparison tables.

#### `product_personas`

Columns: required `product_id`, `persona_id`, `fit_score` default `3`, `rationale` default `""`.  
Indexes/constraints: composite PK `(product_id, persona_id)`; both FKs cascade on delete.  
Purpose: contextual recommendation fit for a customer type.

#### `product_environments`

Columns: required `product_id`, `environment_id`, `fit_score` default `3`, `rationale` default `""`.  
Indexes/constraints: composite PK `(product_id, environment_id)`; both FKs cascade on delete.  
Purpose: contextual recommendation fit for an operating environment.

#### `product_use_cases`

Columns: required `product_id`, `use_case_id`, `fit_score` default `3`, `rationale` default `""`.  
Indexes/constraints: composite PK `(product_id, use_case_id)`; both FKs cascade on delete.  
Purpose: product-to-problem/outcome recommendation rationale.

#### `product_relationships`

Columns: required `product_id`, `related_product_id`, `relationship_type`; `rationale` default `""`.  
Indexes/constraints: composite PK `(product_id, related_product_id, relationship_type)`; both product FKs cascade on delete.  
Purpose: related, alternative, accessory, replacement, compatibility, or other typed product edges. Relationship types are unrestricted text.

### Commerce

#### `merchant_links`

Columns: `id` PK; required `product_id`, `url`, `currency` default `USD`, `is_primary` boolean default false; optional `vendor_id`, `affiliate_partner_id`, `affiliate_url`, `price_cents`, `last_checked_at`; timestamps.  
Indexes/constraints: `merchant_links_product_idx(product_id)`; product FK cascades; vendor and affiliate FKs do not cascade.  
Purpose: keeps mutable merchant/affiliate economics independent from product editorial judgment.

### Editorial

#### `reviews`

Columns: `id` PK; required `product_id`, `title`, `verdict`, `testing_method`, `status` default `draft`, `author_email`; optional numeric `score`, `published_at`; `disclosure` default `""`; timestamps.  
Indexes/constraints: product FK cascades; no slug, status index, reviewer, verification, source, or unique review constraint.

#### `buying_guides`

Columns: `id` PK; required `title`, `slug`, `problem_statement`, `guidance`, `status` default `draft`; timestamps.  
Indexes/constraints: unique `buying_guides_slug_idx(slug)`.  
Relationships: many-to-many with products through `buying_guide_products`.

#### `buying_guide_products`

Columns: required `buying_guide_id`, `product_id`, `recommendation_label`, `rationale`; optional `rank`.  
Indexes/constraints: composite PK `(buying_guide_id, product_id)`; both FKs cascade.  
Purpose: guide-specific product recommendation and rationale.

#### `comparisons`

Columns: `id` PK; required `title`, `slug`, `decision_context`, `status` default `draft`; timestamps.  
Indexes/constraints: unique `comparisons_slug_idx(slug)`.  
Relationships: many-to-many with products through `comparison_products`.

#### `comparison_products`

Columns: required `comparison_id`, `product_id`, `position`; `verdict` default `""`.  
Indexes/constraints: composite PK `(comparison_id, product_id)`; both FKs cascade.  
Purpose: product placement and verdict within a comparison.

#### `educational_articles`

Columns: `id` PK; required `title`, `slug`, `body`, `status` default `draft`, `author_email`; timestamps.  
Indexes/constraints: unique `educational_articles_slug_idx(slug)`.  
Relationships: none. Articles cannot currently link structurally to products, problems, personas, environments, sources, or workflows.

### Governance

#### `editorial_events`

Columns: `id` PK; required `entity_type`, `entity_id`, `action`, `actor_email`; `detail` JSON text default `{}`; `created_at` default current timestamp.  
Indexes/constraints: `editorial_events_entity_idx(entity_type, entity_id)`; no foreign key because entities are polymorphic.  
Purpose: append-only activity/audit events. The current API writes `created` and `status:<state>` events for products only.

## Existing migrations

One migration exists:

- `drizzle/0000_wide_white_tiger.sql`: creates all 20 tables, foreign keys, composite primary keys, and indexes described above.
- `drizzle/meta/0000_snapshot.json`: Drizzle snapshot for the initial schema.
- `drizzle/meta/_journal.json`: one entry, index `0`, version `6`, breakpoints enabled.

There is no seed migration and no later corrective migration. The migration was inspected during this sprint but not regenerated or modified.

## Application routes

### Marketplace API routes

#### `GET /api/marketplace/products`

- Requires `oai-authenticated-user-email`.
- Returns up to 100 products ordered by `updated_at` then `id`, descending.
- Returns 401 without identity and 503 when storage is unavailable.
- Does not paginate, filter, search, join related records, or constrain access by application role.

#### `POST /api/marketplace/products`

- Requires platform identity.
- Requires nonblank product name, brand, category, summary, and best-for guidance.
- Slugifies brand, category, and product values.
- Reuses brand/category by slug or creates them.
- Creates a product in default `draft` state.
- Writes a `created` editorial event.
- Converts any uniqueness error into a duplicate-product response.
- Does not use a transaction; brand/category creation can survive a later product failure.
- Accepts `evidenceLevel` as unrestricted input.

#### `PATCH /api/marketplace/products/:id`

- Requires platform identity.
- Accepts only `draft`, `in_review`, or `published`.
- Updates status, `published_at`, and `updated_at`.
- Writes a status editorial event.
- Does not enforce legal transition order, reviewer separation, completeness, evidence, source, disclosure, confidence, or verification gates.

### Non-Marketplace APIs

- `POST /api/early-access`: validates waitlist data, rejects honeypot submissions, and forwards to a configured form endpoint.
- `POST /api/subscribe`: validates email and returns an honest unavailable message because persistence is not configured.

## Admin routes

### `/admin/marketplace`

- Dynamic, noindex page protected by `requireChatGPTUser`.
- Uses dispatch-owned ChatGPT sign-in and platform identity headers.
- Renders `ProductWorkspace`.
- Product section is functional: list, create draft, advance to review, publish.
- Sidebar labels for Brands, Categories, Affiliate partners, Buying guides, Reviews, and Comparisons are visual placeholders, not implemented admin modules.
- No role/permission model beyond “authenticated.”
- No edit, archive, delete, unpublish, evidence attachment, source management, relation management, reviewer assignment, or revision view.

## Public Marketplace routes

### `/marketplace`

- Static public Marketplace landing page.
- Includes a problem-led hero, six workflow/problem cards, three representative recommendation cards, trust/affiliate-independence disclosure, and knowledge-layer explanation.
- Uses static data from `app/marketplace/data.ts`; it does not query D1.
- Workflow cards are not links and the “Explore this workflow” affordance has no action.
- Representative recommendations are not canonical database records and are not seed data.

No public product-detail, guide, review, comparison, problem, use-case, workflow, persona, environment, search, or recommendation API routes exist.

## Reusable Marketplace components

- `ContextPill`: small contextual label.
- `WorkflowCard`: problem/context card with title, description, and noninteractive exploration cue.
- `RecommendationCard`: displays category, evidence label, verdict, best-for guidance, caution, tags, and price.
- `TrustDisclosure`: permanent trust-before-commission explanation.
- `ProductWorkspace`: client-side admin component for product creation and status transitions.

General reusable site components also exist for analytics, waitlist/newsletter forms, notices, and printing, but they are not part of the Marketplace knowledge model.

## Validation and authorization

### Marketplace

- Identity: admin page and product API require platform-authenticated identity.
- Product creation: only five nonblank fields are required.
- Slugs: lowercase ASCII-like normalization; empty results are not explicitly rejected.
- Duplicate handling: database unique product slug; generic matching of errors containing “unique.”
- Editorial status: allowlist of three values.
- Product ID: must be an integer.
- Database constraints: required columns, slug uniqueness, foreign keys, and junction composite primary keys.

Missing validation includes controlled evidence levels, fit-score range, price/currency rules, URLs, JSON shape, certification structure, legal editorial transitions, publication completeness, reviewer independence, verification age, source attribution, and recommendation confidence.

### Other site validation

- Waitlist validates first name, email, role, and an enumerated interest.
- Recipe scaler validates finite positive quantities.

## Editorial states

- Products: `draft` → `in_review` → `published` in the UI, but the API permits movement directly between any allowed states.
- Reviews, buying guides, comparisons, and educational articles: unrestricted text `status` defaulting to `draft`; no state-transition APIs or UI.
- Affiliate partners: `approval_status` default `researching`; unrestricted text.
- Products: `evidence_level` defaults to `research`; UI offers `research`, `workflow_assessed`, and `operator_reviewed`, but the API/database do not constrain values.

There is no rejected, changes-requested, archived, superseded, withdrawn, or verification-due state.

## Audit and revision capability

Present:

- `editorial_events` records entity type/id, action, actor email, detail, and time.
- Product creation and status changes emit events.
- Product and most entity tables carry `created_at` and `updated_at`.

Absent:

- Previous/new field values.
- Immutable snapshots or version numbers.
- Reason-for-change requirement.
- Reviewer/approver identity.
- Source or evidence change history.
- Events for product field edits, related records, guides, reviews, comparisons, articles, commerce, or corrections.
- Restore/diff capability.
- Transactional guarantee that a content change and its audit event succeed together.

Therefore the current facility is an activity log, not full revision history.

## Tests

The test command runs 12 tests across three files:

- `tests/marketplace.test.mjs`
  - Marketplace trust/problem-led HTML.
  - Presence of key schema domains.
  - Rejection of unauthenticated Marketplace writes.
- `tests/rendered-html.test.mjs`
  - Home-page positioning and CTAs.
  - Launch-route rendering and internal-link resolution.
  - Waitlist validation.
  - Early-access endpoint failure honesty.
  - Form state, analytics guard, and responsive navigation assertions.
- `tests/scaler.test.mjs`
  - Scaling math.
  - Supported units.
  - Invalid serving rejection.
  - Quantity formatting.

Missing Marketplace test coverage includes authenticated GET/POST/PATCH with D1, migrations against a test database, foreign-key behavior, duplicate handling, transition rules, audit-event creation, admin rendering with identity, accessibility interactions, D1-backed public content, and data-integrity checks.

## Seed and fixture data

There is no D1 seed script, seed migration, or persisted fixture dataset.

`app/marketplace/data.ts` contains display-only fixtures:

- Six problem/workflow cards.
- Three sample recommendations: Thermapen ONE, Robot Coupe MP 450 Turbo, and Vitamix Commercial XL.
- Six knowledge-layer labels.

These fixtures duplicate concepts that the database is intended to own, which creates a drift risk. They should not be treated as verified recommendations or canonical records.

## Known architectural gaps

1. Public Marketplace content is disconnected from the canonical database.
2. Problems are embedded in categories/use cases/static copy rather than consistently modeled.
3. Jobs to Be Done are implied, not first-class.
4. Operational workflows and ordered steps do not exist.
5. Evidence is a label/JSON field without claim-level sources or provenance.
6. Certifications are unvalidated JSON on products.
7. Recommendation confidence has fit scores but no rubric or record-level confidence.
8. Reviewers, approvers, and last-verification dates are absent.
9. Publishing is not protected by quality gates.
10. Status values are not database-constrained and transitions are not enforced.
11. Audit events do not form revision history.
12. Corrections, common mistakes, and measurable outcomes are not modeled.
13. Admin coverage exists only for basic product creation/status.
14. Authentication is not authorization; any authenticated viewer can write.
15. Product creation is not transactional.
16. Category parent integrity is not enforced by a foreign key.
17. JSON fields are not runtime-schema validated.
18. No seed/provenance boundary separates demonstration fixtures from verified knowledge.
19. No Marketplace integration tests exercise D1.
20. Editorial articles cannot structurally reference the knowledge graph.
