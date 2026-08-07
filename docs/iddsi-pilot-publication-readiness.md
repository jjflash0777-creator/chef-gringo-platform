# IDDSI Pilot Publication Readiness

## Test result

The workflow was evaluated against the unchanged server quality-gate function after migration `0003_validate_iddsi_pilot_evidence.sql`. It remains:

- status `draft`;
- confidence `insufficient`;
- reviewer unassigned;
- last verified date unset;
- review-due date unset;
- published date unset;
- eight sources, all `draft`;
- twenty-one evidence links, all `insufficient` and unverified.

No publication transition was performed.

## Gate classification

| Gate | Classification | Evidence |
|---|---|---|
| Required title, slug, summary, problem, job, outcome, next action, disclosure | Passed | All fields populated |
| Primary persona, environment, and use case | Passed | Existing canonical records linked |
| At least one workflow step | Passed | Twelve steps |
| Unique contiguous positions | Passed | Positions 1–12 |
| Step title, instruction, purpose, expected result/check, common mistake | Passed | All twelve complete |
| High-risk corrective action | Passed | All eight high-risk steps have explicit corrective action |
| Publishable workflow confidence | Failed | Intentionally `insufficient` |
| Assigned independent reviewer | Awaiting qualified reviewer | No reviewer assigned; role coverage unresolved |
| Reviewer differs from creator | Awaiting qualified reviewer | Cannot evaluate until assignment |
| Last verification date | Awaiting qualified reviewer | Unset because no qualified verification occurred |
| Review-due date | Awaiting qualified reviewer | Unset pending policy and reviewer decision |
| At least one verified source | Awaiting qualified reviewer | Eight collected sources remain draft |
| Verified source has verifier/date and non-insufficient confidence | Awaiting qualified reviewer | No verifier/date asserted |
| Verified step-level source for step 1 | Awaiting source / qualified reviewer / facility policy | CFR link is draft; authoritative facility order policy absent |
| Verified step-level source for step 4 | Awaiting source / qualified reviewer / facility policy | CFR/FDA links draft; adopted code and facility controls absent |
| Verified step-level source for step 6 | Awaiting source / qualified reviewer / facility policy | CFR/USIRG links draft; approved adjustment and clinical boundaries absent |
| Verified step-level source for step 7 | Awaiting qualified reviewer | IDDSI test source collected; competent application review absent |
| Verified step-level source for step 8 | Awaiting source / qualified reviewer / facility policy | IDDSI source draft; facility correction/retest procedure absent |
| Verified step-level source for step 9 | Awaiting source / qualified reviewer / facility policy | Sources draft; identification, holding, allergen, and recheck controls absent |
| Verified step-level source for step 10 | Awaiting source / qualified reviewer / facility policy | CFR/FDA draft; jurisdictional adoption and facility limits absent |
| Verified step-level source for step 12 | Awaiting source / qualified reviewer / facility policy | Federal sources draft; manufacturer and facility sanitation procedures absent |
| Correct lifecycle state for publication | Failed | Workflow deliberately remains `draft`, not `in_review` |
| Assigned reviewer is publishing actor | Awaiting qualified reviewer | No actor or assignment |
| Publication decision reason | Not applicable | No publication attempt was made |

## Remaining blocked inputs

1. Facility jurisdiction and applicable adopted state/local code.
2. Versioned resident-order, recipe, allergen, adjustment, testing, service, sanitation, documentation, and escalation policies.
3. Exact equipment identities and current manufacturer manuals.
4. Named qualified reviewers with role, credential, scope, conflict, and decision evidence.
5. Human verification of each source’s currency/applicability and every high-risk step link.
6. A governed review schedule.
7. Evidence-supported confidence reassessment.

## Decision

**Not ready for review submission or publication.** The workflow is substantially more reviewable, but source collection and claim mapping do not satisfy qualified verification. No gate was weakened.
