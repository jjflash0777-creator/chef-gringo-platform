# Knowledge Core Publication Quality Gates

## Server authority

Publication gates live in `app/lib/knowledge-core.ts` and are evaluated again by the repository during every publish attempt. The admin interface only reports the server/domain result; it cannot bypass a gate.

## Required workflow context

Publication requires:

- title;
- canonical slug;
- summary;
- problem statement;
- job statement;
- intended outcome;
- next action;
- affiliate disclosure;
- primary persona;
- primary environment;
- primary use case.

The affiliate disclosure may explicitly state that no affiliate-linked products are referenced. If products are later connected, the disclosure must be updated before publication.

## Required editorial governance

- confidence must be `low`, `moderate`, or `high`; `insufficient` cannot publish;
- reviewer must be assigned;
- reviewer must differ from creator for this high-risk workflow;
- only the assigned reviewer may publish;
- last verification date is required;
- review-due date is required;
- transition must be `in_review → published`;
- a decision reason is required.

## Required ordered steps

- at least one step;
- positions unique and contiguous from 1;
- title, instruction, and purpose on every step;
- expected result or measurable check on every step;
- common mistake on every step;
- high-risk steps require a corrective action.

The database independently constrains positive unique positions and allowed risk values.

## Required evidence

- at least one verified workflow or step source;
- verified links require verifier and verification date;
- confidence cannot be `insufficient`;
- every high-risk step requires its own verified step-level source.

A workflow-level source cannot satisfy a high-risk step-level gate.

## Confidence rubric

| Identifier | Display | Meaning | Minimum expectation |
|---|---|---|---|
| `insufficient` | Insufficient | Evidence/context cannot support publication. | Record the gap; do not publish. |
| `low` | Low | Plausible guidance with limited or indirect support. | Relevant verified source and explicit limitations. |
| `moderate` | Moderate | Relevant sources or credible operational evidence with material limitations. | Verified applicable evidence and high-risk step support. |
| `high` | High | Converging authoritative/empirical and operational support in the target context. | Multiple current independent sources including authoritative/empirical and operational evidence. |

No “Expert Validated” label exists. High confidence is not available merely because a reviewer is an expert.

## Blocked publication

A blocked attempt:

1. leaves workflow status unchanged;
2. returns HTTP 422;
3. returns every failed gate;
4. records `publication_attempted`;
5. records `publication_blocked` with the failures.

## Pilot’s initial gate state

The seed intentionally has:

- `draft` status;
- `insufficient` confidence;
- no source records;
- no verified claims;
- no reviewer;
- no last-verification or review-due date.

The twelve steps are draft scaffolding. High-risk steps cannot publish until valid source evidence is linked individually.
