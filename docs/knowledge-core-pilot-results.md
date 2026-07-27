# Knowledge Core Pilot Results

## Outcome

The smallest production-quality Knowledge Core is implemented locally for:

> Producing Consistent IDDSI Level 4 Puréed Meals in a Senior-Living Kitchen

The pilot can be stored, edited, reviewed, verified, revised, and audited through protected administration. It remains an insufficient-confidence draft because no authoritative sources were invented or supplied.

## Delivered

- Four first-class pilot tables with foreign keys, checks, indexes, and unique ordering.
- Two forward migrations: schema and safe draft seed.
- Twelve ordered draft steps.
- Stable four-level confidence rubric.
- Claim-level workflow/step source provenance.
- Explicit editor allowlist separate from authentication.
- Transactional workflow mutations and audit events.
- Server-enforced lifecycle and publication gates.
- Five-section protected workflow editor.
- Readable audit history with an explicit non-versioning limitation.
- Minimal new-workflow draft form for future no-code authoring.

## Reused

Existing personas, environments, use cases, product catalog, product-use-case rationales, editorial events, platform identity, admin design system, D1 binding, migration tooling, and build system remain in place.

## Pilot status

- Status: `draft`
- Confidence: `insufficient`
- Steps: 12
- Sources: 0
- Verified claims: 0
- Reviewer: unassigned
- Last verified: unset
- Publication: blocked by design

## Sources required before publication

No source names, URLs, standards text, regulatory claims, clinical claims, or certification claims were invented.

Before publication, an authorized editor and qualified reviewer must enter and verify:

- current authoritative IDDSI framework/testing material applicable to the claims;
- current facility-approved texture-modification and resident-specific instruction processes;
- current food-safety, sanitation, allergen, holding, service-temperature, and equipment procedures applicable to the facility;
- qualified interdisciplinary review where the prescribed plan or clinical boundary requires it;
- step-level sources for every high-risk claim.

The exact source set depends on jurisdiction, facility policy, current authoritative material, and qualified professional review.

## Known limitations

- Audit history stores change summaries, not immutable full snapshots.
- Source verification is manual.
- No public workflow route exists.
- No automated IDDSI, regulatory, clinical, or safety determination exists.
- The pilot uses one primary persona/environment/use case.
- Secondary operational users are not separately linked.
- Workflow-product links are not implemented because the pilot references no products.
- Existing product write APIs remain authenticated but not allowlisted.
- No broad RBAC, notification, reminder, search, AI, or generalized graph system exists.

## Deferred backlog

- Full immutable workflow versions and diffs.
- Multi-persona/environment workflow relationships.
- Structured product support at workflow-step level if a real pilot need emerges.
- Source withdrawal/review reminders.
- Broader Marketplace authorization adoption.
- Governed guide, review, and comparison editors.
- Public workflow publishing surfaces.
- AI-assisted retrieval or recommendations.

## Validation record

- Migration validation: passed; the migrations apply cleanly and seed only the draft pilot.
- Production build: passed with all existing public routes plus the protected workflow editor and APIs.
- Lint: passed with no errors.
- Type checking: passed with no errors.
- Full tests: 24 passed, 0 failed, 0 skipped.
- Existing Marketplace regression: passed through the existing schema, API, rendered-HTML, navigation, waitlist, and recipe-scaler tests.
- Deployment: prohibited and not performed.
