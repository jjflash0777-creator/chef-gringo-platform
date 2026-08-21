# Pending commercial programs — internal registry

**Status: internal only. Not a public partnership list.**

Canonical data: `app/marketplace/pending-programs.ts` (`pendingProgramRecords()`).

These nine catalog records store `affiliate.status = "unknown"` with free-text program wording such as “ThermoWorks opportunity—terms unverified”. No application, approval, network, cookie window, or commission is recorded. The public UI must keep treating them as **pending**: not `rel="sponsored"`, not `affiliate_click`, not “partner”.

Do not activate or relabel any row without written evidence.

| Field | Meaning |
| --- | --- |
| product | Catalog id and name |
| stored program wording | `affiliate.program` as stored, or none |
| destination | First merchant name and URL |
| evidence present | First evidence label and URL |
| verification required | Confirm live program, network, terms, cookie window, commission |
| current UI treatment | Kind `pending` — “No active relationship”; earns nothing today |

The function is derived from the catalog so this list cannot silently drift from `affiliate.status`.
