# Marketplace product management workflow

## Roles

- Contributor creates and enriches draft records.
- Reviewer validates evidence, fit rationales, disclosures, and claims.
- Publisher moves an approved record live.
- Partner manager maintains commercial terms separately from editorial decisions.

The private preview uses platform identity for write attribution. A later multi-user release should add a server-side role table without changing the workflow or content tables.

## Record lifecycle

### 1. Create

Capture the product name, brand, problem category, summary, best-fit guidance, exclusions, and current evidence level. The system creates or reuses canonical brand and category records and rejects duplicate product slugs.

### 2. Enrich

Add:

- use cases and desired outcomes;
- customer personas and culinary environments;
- fit scores with written rationales;
- features, specifications, certifications, documentation, and media;
- pros, cons, operational experience, and internal notes;
- related, replacement, accessory, and incompatible products.

### 3. Add commerce

Create vendor offers and connect an affiliate partner only when applicable. Track price, currency, last verification, commission structure, cookie duration, and approval status. Do not place commission fields on the product.

### 4. Review

Move the record to `in_review`. Confirm that:

- the recommendation solves a defined problem;
- best-for and not-recommended-for guidance is specific;
- claims are supported by documentation or operational evidence;
- certifications are current and correctly scoped;
- downsides are stated;
- disclosures are complete;
- affiliate economics did not affect the verdict.

### 5. Publish

Publish the canonical product and create an editorial event. Guides, comparisons, reviews, and future recommendation services may now reference it.

## Adding a new content type

Create a content table with its own title, status, and editorial fields. Connect products through a junction table containing only relationship-specific data such as rank, verdict, or rationale. Consume canonical product attributes at render time.

## Adding a new recommendation dimension

Use a dedicated dimension table and a product junction containing `fit_score` and `rationale`. This keeps the system explainable and gives future AI features evidence to cite.

## Guardrails

- Never duplicate a product to support a second merchant.
- Never delete product editorial data when an affiliate relationship ends.
- Never publish a recommendation without a downside or exclusion review.
- Never hide commission metadata inside editorial fields.
- Never allow browser state to become the source of truth.
