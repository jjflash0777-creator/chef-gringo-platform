# Knowledge Core Editorial Workflow

## Lifecycle

The pilot reuses the established Marketplace lifecycle:

```text
draft → in_review → published
  ↑         │          │
  └─────────┘          └──→ draft
```

Returning `in_review` to `draft` represents changes requested. Returning `published` to `draft` withdraws the record from the publishable state and clears `published_at`. Additional status values were not added because the required behavior can be expressed through events and decision reasons without expanding the state machine.

Invalid transitions are rejected server-side.

## Roles

- Author/editor: creates and revises workflow content, steps, and evidence.
- Assigned reviewer: independently evaluates the high-risk workflow and is the only identity permitted to publish it.
- System seed: creates the draft pilot but cannot review or publish it.

Author self-approval is blocked for the high-risk pilot.

## Draft

Editors may:

- update context;
- add/edit/delete/reorder steps;
- add and unlink source claims;
- assign confidence;
- assign a reviewer;
- record verification and review-due dates;
- inspect quality gates and history.

Every mutation emits an editorial event within the same transactional batch where possible.

## Submit for review

`draft → in_review` requires:

- an authorized editor;
- a decision reason.

Submission records previous/new status and actor. It does not imply that quality gates pass.

## Review and publication

Only the assigned reviewer may execute `in_review → published`.

The server records `publication_attempted` before evaluating the final transition. If gates fail, it records `publication_blocked` with every failure and leaves status unchanged. If gates pass, status/publication time/revision and the `published` event commit atomically.

The UI displays every unmet gate. UI display is explanatory; server evaluation remains authoritative.

## Request changes

`in_review → draft` requires a reason and records `returned_to_draft`. The reason should name the evidence, content, or control requiring revision.

## Verification renewal

Changing `last_verified_at` records `verification_renewed` with before/after fields and revision information. Renewal does not automatically publish or raise confidence.

## Audit actions

The implementation records:

- `workflow_created`
- `workflow_updated`
- `step_added`
- `step_changed`
- `step_reordered`
- `step_removed`
- `source_linked`
- `source_unlinked`
- `submitted_for_review`
- `publication_attempted`
- `publication_blocked`
- `published`
- `returned_to_draft`
- `verification_renewed`

The admin history shows actor, action, timestamp, status change where applicable, and JSON change summary.

## Revision-history limitation

`editorial_events` remains an activity and change-summary log. It is not a complete immutable snapshot system and cannot reconstruct every historical record byte-for-byte. The UI states this limitation and does not call the feature full versioning.

## Pilot content policy

The seeded IDDSI workflow is draft operational guidance, not verified medical, regulatory, or IDDSI instruction. It must remain draft or in review until authoritative sources are entered, linked to each high-risk step where applicable, verified, and approved by an independent qualified reviewer.
