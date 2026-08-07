# Knowledge Core Second-Workflow Test

## Test setup

On 2026-07-27 the protected local admin creation page was rendered with an isolated allowlisted test identity. A disposable local draft was created through the same protected create operation used by the form:

> Calibrating and documenting a food thermometer check before service

The test record existed only in ignored local development D1 state. It is not present in a migration, commit, preview, or production environment.

The exercise added two medium-risk steps, completed workflow context, linked one draft source claim, reversed the step order, submitted the workflow for review, and immediately returned it to draft. The record stayed at insufficient confidence and was never published.

## Capability results

| Capability | Result | Evidence |
|---|---|---|
| Workflow creation | Completed | Created as `draft` / `insufficient`; `workflow_created` event recorded |
| Ordered steps | Completed | Added two steps and reordered them; positions remained contiguous; `step_added` and `step_reordered` events recorded |
| Common mistakes | Completed | Dedicated field on each step |
| Corrective actions | Completed | Dedicated field on each step |
| Risk classification | Completed | Low/medium/high selector; both test steps used medium |
| Evidence linking | Completed with limitation | Draft FDA Food Code claim linked to one step; `source_linked` event recorded |
| Review status | Completed | `draft → in_review → draft` with reasons and audit events |
| Quality gates | Completed | Remaining failures were displayed by the API/editor model; no gate was bypassed |
| Audit events | Completed | Creation, update, step additions, source link, reorder, submission, and return were recorded |

## What worked without code

- Create a safe insufficient-confidence draft.
- Edit problem, job, outcome, next action, disclosure, context, confidence, reviewer, and dates.
- Add complete step content with measurable check, failure, correction, and risk.
- Reorder and remove steps.
- Enter source metadata, claim, evidence summary, limitation, confidence, and optional verifier/date.
- Link evidence to the workflow or a specific step.
- Submit and return a workflow with a decision reason.
- See current quality-gate failures and an append-only change-summary history.

## Confusing or workaround-prone areas

- The new-workflow form collects only title, slug, and summary, then requires a second screen for all other content.
- The test needed an existing primary use case; the only seeded choice was the unrelated IDDSI pilot use case. Reusing it made the context semantically wrong. Leaving it blank is more honest but keeps the gate blocked.
- Source entry always creates a new source record. The editor cannot search for and link an existing source, encouraging duplicate FDA/IDDSI records.
- Step evidence is separated from the step form, so editors must remember the step identity while adding evidence.
- Reordering uses move buttons rather than a compact sequence view.
- The UI allows a source to be marked verified when a verifier email/date is supplied but cannot validate reviewer qualifications.
- “Medium” is stored as `medium` while editorial prose commonly says “moderate”; this is understandable but inconsistent vocabulary.

## Impossible in the current application

- Create a new persona, environment, or use case from the workflow editor.
- Reuse an existing source record for a new claim.
- Represent different operational, food-safety, IDDSI, clinical, equipment, facility-policy, and publisher reviewers.
- Store reviewer credentials, scope, conflicts, or claim-specific decisions.
- Store a dedicated escalation-boundary or facility-policy field on a step; these must be embedded in instruction/correction text.
- Delete an entire disposable workflow through the admin.
- Reconstruct complete prior versions from audit summaries.

## Blockers versus conveniences

### True blockers before scaled editorial use

1. **Canonical context creation/linking:** A second workflow cannot honestly satisfy context gates when the needed use case does not already exist.
2. **Source reuse:** Duplicate source creation undermines source withdrawal, supersession, and review consistency.
3. **Reviewer qualification representation:** One reviewer email cannot prove required specialist coverage.
4. **Authorization debt:** Product writes remain authentication-only.

### Convenience improvements

- A guided creation wizard.
- Drag-and-drop or numbered bulk step ordering.
- Evidence entry directly inside a step.
- Better source search and claim-link summaries.
- Draft workflow deletion/archive for test and abandoned records.
- Richer history diffs and filters.

## Maintainability decision

The current admin proves the core workflow lifecycle and evidence-link model without code changes. It is sufficient for one carefully governed pilot and basic second-draft authoring. It is not ready for repeated production authoring because canonical context reuse, source reuse, and reviewer-role representation become material governance problems on the second workflow.
