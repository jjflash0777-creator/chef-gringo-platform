# Chef Gringo — Commercial Partner Ledger

**Status:** Internal operating ledger  
**Last verified:** 2026-09-08  
**Branch:** `docs/operating-system-architecture-v2`  
**Purpose:** One readable, evidence-grounded snapshot of affiliate, referral, and direct-partnership status. This document is an operational snapshot; structured D1 state should become authoritative once the partner ownership model is consolidated.

## Operating rules

- Application submitted ≠ approved.
- Approved ≠ active revenue.
- Click ≠ conversion.
- Conversion ≠ paid commission.
- Email acceptance proves enrollment/status only unless the message explicitly states economics.
- Account dashboards/exports are required for authoritative clicks, conversions, reversals, commissions, and payment status.
- Customer-value scoring must remain structurally separate from partner economics.
- Do not relabel Marketplace catalog rows merely because a commercial relationship exists elsewhere; catalog `affiliate.status` remains its own governed field.

## Revenue-ready / approved

| Partner | Relationship | Network / system | Current status | Verified economics | Last verified | Next action |
| --- | --- | --- | --- | --- | --- | --- |
| ThermoWorks | Affiliate | Impact | APPROVED / ACTIVE ENROLLMENT | Welcome email says competitive commissions, but exact rate/cookie terms are not established from current email evidence | 2026-08-31 | Pull Impact terms + clicks/actions/commission/payment data |
| BLUETTI | Affiliate | Impact | APPROVED / ACTIVE ENROLLMENT | Welcome/onboarding confirmed; first-order bonus mentioned in onboarding correspondence, but durable commission terms still need account verification | 2026-09-01 | Pull Impact program terms and performance data |
| Kitchen OS | Affiliate / referral | Referly | APPROVED / ACTIVE ENROLLMENT | **25% per sale** | 2026-08-20 | Verify current dashboard activity, attribution window, payout timing, reversals |
| Chef's Deal | Affiliate | CJ Affiliate | APPROVED / ACTIVE ENROLLMENT | **2% per sale; 45-day referral cookie** | 2026-08-25 | Verify current CJ advertiser terms, clicks, sales, commission/payment data |
| Toast Advocates | Referral / advocate | Toast Advocates | APPROVED / ACTIVE ENROLLMENT | Payout setup activity confirmed; current referral economics not established in this email pass | 2026-08-20 | Verify current reward/referral schedule and referral performance |
| Crazy Good Buy | Affiliate | Secomapp affiliate system | APPROVED / ACTIVE ENROLLMENT | Approval and payment-info setup confirmed; exact commission/cookie/payout terms not yet verified | 2026-09-02 | Open affiliate dashboard and capture terms + performance |

## Final onboarding / almost revenue-ready

| Partner | Relationship | Current status | Verified economics / terms | Last verified | Remaining blocker |
| --- | --- | --- | --- | --- | --- |
| Restaurant365 | Referral contractor | **AGREEMENT_SIGNED / W9_PENDING** | One-time **10% of first-year eligible subscription ARR** for qualifying referred prospects. Prospect generally must sign within 4 months of introduction unless continuously progressing in R365 pipeline. Eligible commission paid quarterly within 30 days after R365 fiscal-quarter close, beginning from Go-Live. Excludes third-party products/services, service/setup/implementation fees, taxes, hard goods and named excluded products. | 2026-09-08 | Submit valid W-9; confirm partner portal activation and final onboarding |
| Veno App | Affiliate | **ACCEPTED / ONBOARDING / AGREEMENT_PENDING** | First 3 months after first paid module: affiliate receives the full monthly payment for subscribed modules. After that: **20% recurring for lifetime of client account**. Monthly net-30 payout, **£50 minimum threshold**, Wise payout, Veno covers transfer fees. Attribution is permanently bound to affiliate account when client registers with code. Paid search on generic terms and currently brand terms is permitted subject to future brand-bidding changes. | 2026-09-02 | Intro call, formal affiliate agreement, dashboard credentials, unique code/assets |

## Direct partnership development

| Partner | Relationship | Current status | Evidence | Next action |
| --- | --- | --- | --- | --- |
| FoodDocs | Commercial partnership / reseller-style discussion | PARTNERSHIP DISCUSSION | FoodDocs expressed interest but explicitly said its model is not a simple referral-only relationship | Clarify commercial model, required partner duties, economics, ownership of onboarding/sales/support |
| Restoke | Direct commercial partnership discussion | ACTIVE CONVERSATION | Direct emails on 2026-09-02 and 2026-09-08 asking to schedule a conversation; no signed affiliate/referral agreement found | Decide whether to pursue referral, reseller, qualified-lead, or co-marketing relationship before classifying further |

## Pending / unresolved

| Partner | Status | Evidence | What is still unknown |
| --- | --- | --- | --- |
| Jackery | APPLICATION_SUBMITTED / PENDING | Impact application received 2026-08-31 | Approval/decline, terms, economics, attribution |
| Square / Block affiliate | APPLICATION_SUBMITTED / UNRESOLVED | Impact application received 2026-08-19 | No acceptance/decline found. Trackonomics Essentials emails are network-aggregation onboarding, not proof of Square acceptance |
| 7shifts | UNVERIFIED CURRENT STATUS | Prior project history says application submitted; no confirming Gmail evidence in current audit | Current status, network, terms, economics |
| EcoFlow | UNVERIFIED CURRENT STATUS | Prior project history says application submitted; no confirming Gmail evidence in current audit | Current status, network, terms, economics |
| Kitxens | UNVERIFIED CURRENT STATUS | Prior project history says application submitted; no confirming Gmail evidence in current audit | Current status, network, terms, economics |
| Vozly | UNVERIFIED CURRENT STATUS | Prior project history says inquiry/application submitted; no confirming Gmail evidence in current audit | Current status, relationship type, economics |

## Declined

| Partner | Status | Evidence date | Notes |
| --- | --- | --- | --- |
| Renogy | DECLINED | 2026-09-01 | Impact decline email |
| Dalstrong UK | DECLINED | 2026-09-01 | GoAffPro rejection email |
| Dalstrong Canada | DECLINED | 2026-09-01 | GoAffPro rejection email |

## Network / account identifiers verified in evidence

- Impact account ID: `7640961`
- ThermoWorks advertiser/entity ID in welcome correspondence: `6431786`
- ThermoWorks program ID: `39638`
- BLUETTI advertiser/entity reference from Impact application correspondence: `3609738`
- BLUETTI program ID: `17108`
- Jackery advertiser/entity reference from Impact application correspondence: `4039025`
- Jackery program ID: `18694`
- Square / Block advertiser/entity reference from Impact application correspondence: `1358214`
- Square program ID: `9398`
- Renogy advertiser/entity reference: `3086767`
- Renogy program ID: `14864`
- CJ publisher CID observed in account-change correspondence: `8048163`

## Schema ownership audit — current recommendation

The repository already has overlapping commercial structures. Do not add a third partner system before consolidating ownership.

### `affiliatePartners`

Current fields include name, network, commission type/value, cookie duration, approval status, contact details, supported categories, and notes. `merchantLinks` can reference this table.

**Recommended role:** marketplace/product-level affiliate fulfillment metadata only, unless a migration later proves it can safely absorb broader lifecycle/history needs.

### `partnerOpportunities`

Current fields include provider identity, commercial lane, program type, lifecycle, regions, US availability, customer-value thesis, application/contact route, proposed relationship, restrictions state, credibility blockers, economics JSON, evidence JSON, verification JSON, rejection reason, application date, affiliate URL/identifier, notes, and synthetic flag. `commercialEvents.partnerId` already references this table.

**Recommended role:** primary partner-business lifecycle and verification owner for Partner Hunt / commercial operations in the near term.

### `merchantLinks`

Owns product-to-merchant/affiliate routing and current destination details.

**Recommended role:** product fulfillment/routing only. Do not make it own partner approval/economics lifecycle.

### `commercialEvents`

Owns observed commercial activity and already links to `partnerOpportunities` through `partnerId`.

**Recommended role:** activity/attribution event truth, not partner status truth.

## Ownership decision before any schema migration

Short-term direction:

1. Keep `partnerOpportunities` as the business-lifecycle owner for approved/pending/declined/direct-outreach state.
2. Keep `affiliatePartners` as legacy/product-affiliate metadata until its actual runtime usage is fully mapped.
3. Do not duplicate economics/status between the two by hand.
4. Add a deterministic reconciliation/mapping layer only after field-by-field runtime usage is audited.
5. If one partner can genuinely have multiple programs/networks, normalize only that multiplicity rather than creating a wholesale replacement model.

## Current business-truth blockers

1. Restaurant365 W-9 submission and final activation.
2. Veno formal agreement + dashboard credentials.
3. Authoritative dashboard performance data for active partners.
4. Current program terms for ThermoWorks, BLUETTI, Toast, Crazy Good Buy, and Kitchen OS beyond the terms explicitly captured above.
5. Current status resolution for Jackery, Square, 7shifts, EcoFlow, Kitxens, Vozly.
6. Full runtime ownership audit of `affiliatePartners` vs `partnerOpportunities` before any structural migration.

## First revenue-proof candidates

Do not select solely by commission rate. Choose based on traceability and current access.

Strong candidates:

- ThermoWorks — Impact-backed tracking already wired in repo; good instrumentation candidate once Impact account data is accessible.
- Chef's Deal — high-ticket commercial equipment with explicit 2% / 45-day terms; good upside but sales cycle may be slower.
- Kitchen OS — explicit 25% per sale and direct affiliate dashboard; potentially easiest economic verification path.
- Restaurant365 — strong B2B economics and signed agreement, but lead lifecycle is longer and onboarding must finish first.
- Veno — unusually strong recurring economics, but formal agreement/dashboard release still pending.

The first proof channel should be whichever can produce the cleanest verified chain:

`content/recommendation → tracked click/lead → partner-side conversion → commission → payment`
