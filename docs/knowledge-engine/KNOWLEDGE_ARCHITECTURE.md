# Knowledge Architecture

## Entity model

Implemented types are Dish, Recipe, Ingredient, Technique, Cuisine, Chef Interpretation, Equipment, and Dietary Consideration. Reserved entity types include Restaurant, Nutrition Topic, Supplier, Learning Path, Hospitality Role, and Workflow.

Every entity has a stable ID and slug, entity type, title, original summary, status, verification state, tags, timestamps, sources, optional reviewer and image metadata, and related entity IDs. Entity-specific fields hold culinary meaning instead of flattening everything into generic cards.

## Relationship model

Relationships are first-class records with `fromId`, `toId`, a typed relationship, an implementation flag, and an optional note. Phase 1 uses:

- dish `uses_ingredient` ingredient
- dish `requires_technique` technique
- dish `belongs_to_cuisine` cuisine
- dish `has_dietary_consideration` dietary consideration
- interpretation `interpretation_of` dish
- equipment `supports_technique` technique

Reserved relationships support substitutions, restaurants serving dishes, learning paths teaching techniques, suppliers producing dishes, roles performing workflows, and similarity.

## Storage and service boundaries

Seed data currently lives in `app/knowledge/domain/seed.ts`. UI code consumes domain functions or adapter interfaces and does not assume a database vendor. `KnowledgeRepository` is the future persistence boundary. Search, grounded answers, commerce, place discovery, nutrition, accounts, and community features each have a separate interface so one provider cannot leak across the product.

## Trust properties

- Verification is explicit: seeded, source-ready, reviewed, or verified.
- Content lifecycle is explicit: draft, review, or published.
- Sources and review scope travel with content.
- Missing evidence stays visible; the UI must not silently convert absence into certainty.
- External availability and prices require timestamps.
- Dietary and nutrition information remains educational unless reviewed by an appropriately qualified source.
