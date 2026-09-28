# Production / Git Reconciliation Map — Package 01

Date: 2026-09-28
Status: REQUIRED BEFORE PRODUCTION PROMOTION
Scope: Chef Gringo Sites production v23 vs GitHub `main`

## Confirmed shared production identity
- Production Sites project: `appgprj_6a88d56167a08191bb0c358e41fd62f6`
- Production custom domain: `chefgringo.com`
- Production D1 binding: `DB`

## Confirmed GitHub migration sequence
Current GitHub contains:
- `0019_social_operator_investigation.sql`
- `0020_social_investigation_claim_links.sql`
- `0021_social_research_reservations.sql`

The Drizzle journal is historically incomplete relative to the SQL files, so journal state alone must not be treated as the production migration ledger.

## Confirmed production-only history from prior releases
Prior production releases preserved a Buffer publishing layer and Pinterest board-resolution behavior that are not present in current GitHub main.

Recorded production releases:
- Sites version 22 — deployment identifier `f612f6fa74631c7cd01e99062a86671696378fdd`
- Sites version 23 — deployment identifier `56a4fe74a525527a2ad4ead2389093c75a22c329`

Those identifiers are not resolvable as commits in the current GitHub repository. They belong to the Sites-only production history.

Production release instructions explicitly preserved:
- Buffer publishing
- Pinterest board resolution
- campaign images
- D1 `DB`
- existing production configuration
- no new migration during v23 publication

## Migration collision that must be resolved before any migrate/deploy
Production history records a Buffer migration named:
`0020_buffer_social_publishing.sql`

Current GitHub independently uses ordinal 0020 for:
`0020_social_investigation_claim_links.sql`

These are distinct migrations with the same ordinal. Do not:
- rename either migration casually;
- copy the production Buffer migration into Git as another 0020;
- run the current Git migration set against production without an applied-migration inventory;
- assume the Drizzle journal resolves the conflict.

## Safe identity-map procedure
1. Obtain the exact applied D1 migration names/schema state from production.
2. Obtain/export the Sites v23 source/file manifest for Buffer, Pinterest, campaign assets and migration code.
3. Map each production-applied schema object to its historical migration identity.
4. Preserve Git `0020_social_investigation_claim_links.sql` if production applied it under that identity.
5. If Buffer `0020_buffer_social_publishing.sql` exists only in production, import its source as historical evidence and reconcile future Git under the next unused migration identity rather than replaying the old ordinal.
6. Do not execute a production migration until the identity map proves what has already been applied.

## Buffer publishing contract to preserve
The production publishing path is Buffer, not a replacement scheduler.

Desired flow:
approved Chef Gringo package
→ saved network variant
→ Chef Gringo-owned tracked destination
→ Buffer queue/publish
→ platform post ID/permalink
→ record publication back into Social Growth
→ first-party attribution/performance

Pinterest requires the intended board to exist/resolve in Buffer before queueing.

## Package 01 rule
Package 01 may pass code/content CI and preview review independently, but it MUST NOT be promoted over production until the v23 Buffer/Pinterest reconciliation is complete.

No Buffer replacement should be introduced as part of Package 01.
