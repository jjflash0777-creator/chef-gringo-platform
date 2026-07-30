# Hospitality Knowledge Engine

## Product intent

Chef Gringo is evolving from a hospitality landing site into a trustworthy, connected knowledge product. Phase 1 proves the pattern with local, curated data: users can search, explore a complete Carbonara knowledge page, switch guidance modes, scale an original recipe, create a shopping list, troubleshoot, and follow relationships.

The existing landing page, early-access flow, legacy culinary tools, analytics bridge, tests, and Cloudflare configuration remain part of the product.

## Phase 1: implemented locally

- `/discover`: natural-language search over a curated in-memory index, with honest empty and no-result states.
- `/knowledge/dishes/carbonara`: identity, history framing, original recipe, three guidance modes, scaling, shopping list, troubleshooting, attributed interpretation summaries, connected entities, and local Q&A.
- Typed entities and explicit relationships.
- Provider-neutral boundaries for repository, semantic search, grounded answers, commerce, places, nutrition, accounts, and community contributions.
- Analytics hooks for search, results, page views, modes, servings, shopping lists, troubleshooting, related entities, and questions.

## Prototype limitations

- Search is lexical and seeded around Carbonara; examples outside the seed demonstrate honest no-result behavior.
- Q&A selects from page-grounded curated answers; it is not generative AI.
- Source records are structurally present, but disputed historical claims still need final editorial sourcing and review.
- Shopping lists are local text only. No retailer, price, availability, ordering, map, restaurant, or affiliate request occurs.
- Scaling changes quantities. It does not replace production planning, food-safety controls, pan-capacity planning, or professional judgment.

## Future phases

1. Move entities and relationships to a versioned content repository with editorial workflow.
2. Add hybrid lexical and semantic retrieval behind the existing adapter.
3. Add retrieval-grounded assistance with visible citations and refusal behavior.
4. Add verified nutrition, restaurant, retailer, pricing, maps, affiliate, and ordering providers individually.
5. Add accounts, saved collections, learning paths, hospitality roles, workflows, and moderated community contributions.

Each integration must preserve the provider-neutral domain model and expose freshness, attribution, verification, and failure states.
