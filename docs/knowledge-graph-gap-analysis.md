# Chef Gringo Knowledge Graph — Gap Analysis

Assessment date: 2026-07-27  
Classification meanings:

- **Fully supported**: first-class schema, relationships, usable workflow, and meaningful integrity.
- **Partially supported**: some structure exists, but important semantics or operations are missing.
- **Missing**: no durable first-class representation.
- **Duplicated**: competing sources of truth exist.
- **Poorly modeled**: represented in a form that obscures meaning or cannot support governance.

No concept is classified as fully supported when the only implementation is static public copy.

| Concept | Classification | Existing implementation | Gap | Risk | Smallest recommended correction |
|---|---|---|---|---|---|
| Problems | Partially supported | `categories.problem_statement`, `use_cases.problem_statement`, buying-guide problem statements, and static `marketplaceProblems`. | No canonical problem identity; same idea can exist in several places. | Fragmented discovery and contradictory guidance. | For the proving workflow, make one canonical use case/problem record and stop introducing new static problem sources; evaluate a dedicated `problems` table only after the pilot exposes a real need. |
| Jobs to Be Done | Poorly modeled | Implied by `use_cases.name/outcome` and public “Define the job” language. | No explicit job statement, circumstances, progress, or actor. | Recommendations drift toward products rather than user progress. | Add structured job fields to the proving workflow or use case: job statement, trigger, desired progress, and responsible role. |
| Operational workflows | Missing | Public copy mentions workflows; no table or durable record. | No workflow identity, prerequisites, owner, controls, outcome, or publication state. | Operational guidance cannot be reused, governed, or recommended. | Add a minimal `workflows` table linked to an existing use case, persona, and environment. |
| Workflow steps | Missing | None. | No ordering, instructions, critical controls, mistakes, or checks. | Advice remains shallow and cannot support execution. | Add `workflow_steps` with workflow FK, position, action, control point, mistake, corrective action, and measurable check. |
| Personas | Partially supported | `customer_personas` plus product-fit junction with score/rationale. | Only products can link; no admin/API; no validation of fit scale. | Guides/workflows cannot adapt consistently by audience. | Reuse the table; add pilot workflow-persona linkage and constrain/validate fit scores. |
| Environments | Partially supported | `culinary_environments` plus product-fit junction. | Only products can link; requirements are unstructured text; no admin/API. | Healthcare/commercial constraints may be lost. | Reuse the table; link the proving workflow to “senior-living kitchen” and record explicit requirements. |
| Products | Partially supported | Strong canonical table, context junctions, prices separated from offers, basic admin create/publish. | Many JSON fields unvalidated; no complete edit workflow, sources, reviewer, verification, or publish gate. | Incomplete or unsupported products can be published. | Preserve table; add validation and governance fields only when the next sprint needs them. |
| Brands | Partially supported | Canonical table, unique slug, product FK, API auto-creation. | No admin; creation is implicit; no uniqueness beyond slug; no audit. | Brand duplication and weak stewardship. | Keep schema; add controlled select/create in admin and audit later. |
| Vendors | Partially supported | Canonical table and merchant-link FK. | No API/admin or uniqueness beyond slug. | Offer provenance becomes inconsistent. | Keep schema; defer admin until commerce data enters the pilot. |
| Affiliate partners | Partially supported | Partner/network/commission/cookie/approval/contact fields; merchant-link FK. | No constraints, admin, audit, or editorial firewall enforcement. | Commercial data can become stale or influence editorial work informally. | Keep table; document firewall now and add admin validation only when partner operations begin. |
| Guides | Partially supported | `buying_guides` and product junction with rank/label/rationale. | No author/reviewer, sources, context links, admin, route, or quality gate. | Thin guides could become detached ranking pages. | Preserve tables; defer implementation until workflow pilot proves source and review patterns. |
| Reviews | Partially supported | Product review with method, verdict, score, disclosure, author, status. | No sources, reviewer, verification, confidence, slug, admin/API, or revision history. | Reviews can overstate evidence and become stale. | Preserve table; use Constitution gates before enabling review publishing. |
| Comparisons | Partially supported | Comparison and product junction with position/verdict. | No explicit criteria, weights, evidence, audience/environment links, reviewer, or admin/API. | Arbitrary rankings and false universal winners. | Preserve tables; add criteria only when the first governed comparison is scheduled. |
| Certifications | Poorly modeled | JSON text array on products. | No authority, identifier, scope, validity dates, source, or verification. | Expired or irrelevant certifications may be presented as current. | Do not add a table in this sprint; for the pilot, store authoritative sources and avoid claiming product certification without structured verification. |
| Evidence | Poorly modeled | Product `evidence_level`, `operational_experience`, review `testing_method`, and public labels. | No evidence items, claim mapping, provenance, quality class, or applicability. | Confidence labels can become unsupported assertions. | Add evidence/source support only for the proving workflow; do not redesign every entity at once. |
| Sources | Missing | URL arrays on products and review method text. | No canonical source record, publisher/date/type/access date/status, or claim linkage. | Claims cannot be verified, refreshed, or retracted reliably. | Add `sources` and a workflow-source junction for the pilot. |
| Recommendation rationales | Partially supported | Rationale on product-persona/environment/use-case, guide products, and relationships; verdicts on reviews/comparisons. | No unified requirement, source linkage, confidence, or next action. | Recommendations are inconsistent and hard to explain. | For the pilot, require rationale and next action on workflow recommendations; reuse existing product junction rationales. |
| Confidence levels | Partially supported | Product evidence label and fit scores; public evidence text. | No governed rubric or record-level confidence; database accepts arbitrary evidence strings. | Confidence becomes subjective marketing language. | Adopt Constitution rubric and add constrained confidence to the proving workflow first. |
| Editorial approvals | Partially supported | Product state changes and authenticated actor events. | No reviewer/approver identity, role separation, decision reason, or fail-closed gate. | Any authenticated user can publish incomplete records. | Add reviewer, approval decision, and publish-gate validation to the workflow pilot; do not introduce a broad role system yet. |
| Version history | Missing | `updated_at` timestamps only. | No immutable versions, snapshots, diffs, or restore path. | Published knowledge can change silently. | For the pilot, record a JSON snapshot and version number in a workflow revision table or enriched editorial event before generalizing. |
| Audit history | Partially supported | Polymorphic `editorial_events` with actor/action/detail/time; product create/status events. | Not atomic with changes; sparse detail; only product API emits events. | Incomplete accountability and misleading audit coverage. | Reuse `editorial_events`; require before/after detail and atomic event writes for pilot mutations. |
| Corrective actions | Missing | None. | No structured response to failed checks or inaccurate knowledge. | Users cannot recover safely from process deviations. | Put `corrective_action` on pilot workflow steps; revisit normalization after more workflows. |
| Common mistakes | Missing | Product cons/not-recommended fields are not operational mistakes. | No step-level failure patterns. | Guidance tells users what to do but not how execution commonly fails. | Put `common_mistake` on pilot workflow steps. |
| Measurable outcomes | Partially supported | `use_cases.outcome` free text; product fit scores. | No metric, target, unit, measurement method, or pass/fail check. | Effectiveness cannot be evaluated or improved. | Add outcome statement plus measurable check/target fields to pilot workflow or steps. |

## Cross-cutting findings

### Duplicate sources of truth

The public `marketplaceProblems` and `sampleRecommendations` fixtures duplicate concepts intended for D1. This is currently acceptable as a visual prototype, but they must not evolve into parallel production knowledge.

### Product-centric relationships

Personas, environments, and use cases are normalized, but only products can use their fit junctions. The knowledge engine needs these contexts to apply to workflows, guides, reviews, and recommendations. The smallest path is to prove context linkage on one workflow rather than create a universal polymorphic graph prematurely.

### Governance is descriptive, not enforced

Trust and independence language is strong in public copy and documentation. The API does not yet enforce evidence, review, confidence, source, verification, or disclosure gates.

### Audit is not versioning

`editorial_events` is a valuable start, but it cannot reconstruct or compare record states. Enhancing its detail for the pilot is preferable to inventing a global version platform before the editing patterns are known.

## Priority order

1. Prove canonical workflow + steps for IDDSI Level 4 production.
2. Prove source/evidence attribution and confidence on that workflow.
3. Enforce reviewer, verification, next-action, and quality gates.
4. Capture revision/audit details atomically.
5. Only then generalize the proven pattern to guides, reviews, comparisons, and product recommendations.
