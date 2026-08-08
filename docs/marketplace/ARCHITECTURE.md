# Chef Gringo Marketplace architecture

## Product boundary

The Marketplace is a recommendation system, not a merchant catalog. A product is recommended because it fits a documented job, customer, and operating environment. Commerce records are attached only after editorial fit is established.

## System shape

```text
Public experience
  problem navigation → guides → comparisons → reviews
                             ↓
Canonical knowledge layer (D1)
  products ↔ brands ↔ categories
      ↕         ↕
  use cases   personas   environments
      ↕
  reviews   guides   comparisons   educational articles
      ↕
Commerce layer
  vendors   merchant links   affiliate partners

Protected administration
  create → enrich → review → publish → audit event
```

The Cloudflare D1 database is the source of truth. Images, manuals, and video files can be moved to R2 later without changing product identity; D1 will retain their metadata and relationships.

## One-source-of-truth rule

`products` contains one canonical row per product/model. Buying guides, comparisons, reviews, recommendations, and future AI retrieval reference the product ID. They must not copy product specifications into editorial content.

Merchant offers are separate `merchant_links` rows because price, availability, vendor, and affiliate terms change independently from product facts. Removing an affiliate relationship must never remove or demote a product recommendation.

## Data domains

- Catalog: products, brands, categories, relationships.
- Context: customer personas, culinary environments, use cases, and fit rationales.
- Evidence: features, specifications, certifications, operational experience, editorial status, and review methodology.
- Commerce: vendors, affiliate partners, merchant links, prices, cookie duration, and commission metadata.
- Editorial: reviews, buying guides, comparisons, educational articles, and their product junctions.
- Governance: editorial events record who changed an entity and why.

Structured arrays and maps are JSON in the first sprint. High-cardinality, filterable concepts are normalized into tables. If a JSON attribute later becomes a major search facet, migrate it to a dedicated table while retaining the product ID.

## Runtime architecture

- Vinext renders the public Marketplace and protected admin workspace.
- D1 stores durable structured records.
- API routes are the write boundary and require the platform-authenticated user header.
- The hosting access policy keeps the preview owner-only.
- Drizzle defines the schema and produces deployable SQL migrations.

## Recommendation pipeline

1. Define the customer problem and desired outcome.
2. Attach personas and environments with a fit score and rationale.
3. Record evidence, specifications, certifications, operational experience, pros, and cons.
4. Add merchant offers independently.
5. Move the record from `draft` to `in_review`.
6. An editor validates evidence and disclosures.
7. Publish the canonical product.
8. Reference the product in guides, comparisons, and reviews.

## Future extension without redesign

- AI purchasing advisor: retrieve products through use-case, persona, environment, evidence, and relationship tables; cite the stored rationale.
- Personalized recommendations: add user preference and saved-collection tables referencing product IDs.
- Equipment planning: add projects, spaces, requirements, and project-product decisions.
- Vendor comparison: compare current merchant-link offers without changing product editorial data.
- Compliance references: add regulation and certification tables joined to categories, environments, and products.
- Professional dashboards: expose saved views, procurement status, and audit history over the same product graph.
- Product media: enable R2 and add an `assets` table with product ownership, file type, provenance, and accessibility metadata.

No future feature should introduce a second product record or encode ranking as affiliate commission.

## Partner and manufacturer intelligence — Sprint 1 contract

Product Harvest now adapts its existing canonical records into provider-neutral intelligence contracts. The contract models multi-role partner entities, partner programs, observed offers, evidence claims, editorial recommendation scorecards, separate commercial opportunity scorecards, controlled product/entity relationships, and the research lifecycle.

This layer is domain-only: it introduces no new database, migration, provider, scraping process, or public UI. Existing Product Harvest records remain the source fixture. Unknown shipping, landed cost, commissions, and program terms remain `null`; descriptive price context is not converted into invented numeric prices.

Editorial scoring accepts only workflow fit, durability, sanitation, performance, serviceability, value, evidence quality, and environment fit. Commercial scoring has a different input type and runtime allowlist. Commercial results are never passed into recommendation ranking.

Research follows `discover → resolve identity → verify → enrich → compare → challenge → score → monitor → learn`. A challenge appends an immutable history entry, increments the scorecard revision, and can flag, reduce confidence, or reject without overwriting the prior score or confidence.
