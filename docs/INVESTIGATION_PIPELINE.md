# Investigation Pipeline

Stage F adds an ephemeral, deterministic case-intelligence pipeline for commercial kitchen, refrigeration, and foodservice equipment problems.

## Flow

`Raw user problem -> InvestigationCase -> evidence requirements -> constrained investigation plan -> decision-readiness state`

`app/home/investigation-case.ts` owns the provider-neutral domain model and parser. It records user-provided claims, system inferences, verified evidence, and unknowns as different states. It does not diagnose a failure or produce a recommendation.

`app/components/InvestigationCasePanel.tsx` renders the case as an evidence ledger and decision-readiness file. The approved synthetic Stage E proof remains a separate controlled path.

## Persistence seam

Cases are intentionally ephemeral in Stage F. The homepage holds the current `InvestigationCase` in client state; nothing is written to D1, R2, browser storage, or a remote service. The existing marketplace repositories model different administrative workflows and are not an appropriate implicit home for user investigations.

A future persistence adapter should accept and return the canonical `InvestigationCase` without changing parsing or readiness rules. Storage must preserve immutable evidence entries, their timestamps and states, and subsequent revisions rather than overwriting claim history. Adding that adapter requires a separate schema, privacy, retention, authentication, and migration decision.

Stage G shapes that seam as an append-oriented mutation contract. Every case carries a stable case ID, monotonically increasing version, previous-version reference, evidence additions, contradiction/supersession markers, and timestamped state transitions. `applyFollowUpAnswer()` returns a new case version and never mutates the input snapshot. A future repository can therefore store a case version plus its appended evidence and transition events without changing question-selection or readiness logic.

Stage H adds a conservative, local-only external evidence boundary. `external-evidence.ts` accepts one explicitly classified source at a time, extracts only labeled statements, records document identity, location, exact supporting text, source authority, confidence, and validation state, then returns a new case version. Images and PDFs require a human transcription of visible text in this stage: the system does not perform OCR, browse the web, or infer missing facts. Distributor quote components remain individually observed and an absent total, freight, tax, labor, or fee stays unknown.

Conflicts are append-only. Equal-or-higher-authority evidence may supersede an active claim while retaining both entries; lower-authority material such as a seller listing cannot displace data-plate or manufacturer evidence. Technician diagnoses remain attributed technician statements and never become Chef Gringo diagnoses automatically.

## Future external-document storage contract

Stage H keeps source bytes ephemeral and stores nothing. A later approved adapter may persist an external document only if it preserves:

- immutable document ID, content hash, media type, source classification, file name, retrieval/upload time, and uploader context;
- a private blob reference with explicit retention and deletion policy, rather than bytes embedded in the case row;
- append-only extracted facts linked to exact page/location and supporting snippet;
- extraction/version metadata sufficient to reproduce which parser produced each fact;
- validation, authority, confidence, conflict, and supersession history;
- case-version and audit-event references without silently rewriting earlier evidence.

That adapter requires separate privacy, malware scanning, access-control, retention, schema, migration, and D1/R2 decisions. Stage H adds no database or object-storage binding.

## Safety and recommendation boundaries

The parser requests only non-invasive observations. Requests involving live electrical work, refrigerant systems, combustion, pressure, or safety bypasses enter `PROFESSIONAL_VERIFICATION_REQUIRED`; the interface does not provide procedural instructions.

All candidate routes remain `not_ready` until required evidence exists. Stage F supports `NEEDS_INFORMATION`, `INVESTIGATING`, and `PROFESSIONAL_VERIFICATION_REQUIRED` from current rules while retaining the complete status vocabulary for later evidence-driven transitions. No commercial fields participate in case readiness.

Stage G may advance a route only to `needs_quote` or `needs_compatibility_verification`. It still cannot recommend a route. User follow-ups remain `user_provided`; a structured field does not make them verified. Contradictory observations preserve both ledger entries, mark the earlier active entry `superseded`, and mark the newer entry `conflicting` until independent evidence resolves the conflict.
