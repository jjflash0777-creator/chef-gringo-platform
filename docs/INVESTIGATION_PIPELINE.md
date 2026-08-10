# Investigation Pipeline

Stage F adds an ephemeral, deterministic case-intelligence pipeline for commercial kitchen, refrigeration, and foodservice equipment problems.

## Flow

`Raw user problem -> InvestigationCase -> evidence requirements -> constrained investigation plan -> decision-readiness state`

`app/home/investigation-case.ts` owns the provider-neutral domain model and parser. It records user-provided claims, system inferences, verified evidence, and unknowns as different states. It does not diagnose a failure or produce a recommendation.

`app/components/InvestigationCasePanel.tsx` renders the case as an evidence ledger and decision-readiness file. The approved synthetic Stage E proof remains a separate controlled path.

## Persistence seam

Cases are intentionally ephemeral in Stage F. The homepage holds the current `InvestigationCase` in client state; nothing is written to D1, R2, browser storage, or a remote service. The existing marketplace repositories model different administrative workflows and are not an appropriate implicit home for user investigations.

A future persistence adapter should accept and return the canonical `InvestigationCase` without changing parsing or readiness rules. Storage must preserve immutable evidence entries, their timestamps and states, and subsequent revisions rather than overwriting claim history. Adding that adapter requires a separate schema, privacy, retention, authentication, and migration decision.

## Safety and recommendation boundaries

The parser requests only non-invasive observations. Requests involving live electrical work, refrigerant systems, combustion, pressure, or safety bypasses enter `PROFESSIONAL_VERIFICATION_REQUIRED`; the interface does not provide procedural instructions.

All candidate routes remain `not_ready` until required evidence exists. Stage F supports `NEEDS_INFORMATION`, `INVESTIGATING`, and `PROFESSIONAL_VERIFICATION_REQUIRED` from current rules while retaining the complete status vocabulary for later evidence-driven transitions. No commercial fields participate in case readiness.
