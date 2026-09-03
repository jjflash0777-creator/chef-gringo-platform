# Chef Gringo Growth OS — Phase 1

## Objective
Build a fail-closed publication pipeline on top of Chef Gringo's existing Growth Queue without giving external automation tools authority over editorial decisions, partner eligibility, paid spend, or the Chef Gringo database.

## Non-negotiable boundaries

1. Chef Gringo is the system of record.
2. External orchestration/publishing services receive approved publication payloads only; they do not receive database write access.
3. AI may prepare ideas, research, briefs, drafts, assets, and recommendations, but publication requires Chef Gringo publication authority.
4. Paid publishing remains disabled during Phase 1.
5. Unknown partner status, missing affiliate destination, failed evidence gate, invalid asset, or uncertain publication state must fail closed.
6. Every outbound publication must be idempotent and auditable.

## Build order

### Gate 0 — Commercial analytics integrity
- Eliminate avoidable 400 responses from browser-generated public commercial events.
- Preserve strict validation for invalid timestamps and privileged revenue/commission assertions.
- Confirm campaign page views and affiliate/merchant clicks can be persisted before automating traffic.

### Gate 1 — Partner Registry
Create a structured operational registry derived from the existing partner opportunity model. Publication eligibility must be machine-readable rather than inferred from prose notes.

Minimum fields:
- partner id/name
- lifecycle/status
- affiliate URL + verification state
- organic promotion allowed/unknown/blocked
- paid promotion allowed/unknown/blocked
- trademark/brand-bidding restrictions
- geographic restrictions
- terms source/evidence
- last verified timestamp

Monetized campaign rule: no ACTIVE/verified partner + verified destination = no monetized publication.

### Gate 2 — Publication Outbox
Add durable publication jobs owned by Chef Gringo.

Minimum state machine:
- DRAFT
- AWAITING_APPROVAL
- APPROVED_WAITING
- SENDING
- PUBLISHED_UNVERIFIED
- VERIFIED
- FAILED
- CANCELLED

Each job must include:
- immutable publication id
- idempotency key
- package/variant/destination ids
- channel/account target
- asset references
- copy snapshot/hash
- tracked destination
- approval record
- scheduled time
- attempt count
- remote publication id/url when known
- verification state
- last error

### Gate 3 — Dispatcher boundary
Create a narrow outbound adapter contract. Activepieces is an orchestration candidate; TryPost is a publishing transport candidate. Neither is embedded as the source of truth.

Required behavior:
- send only APPROVED_WAITING jobs
- signed/authenticated webhook payload
- deterministic idempotency key
- bounded retries
- no retry when remote state is ambiguous until verification runs
- callback/result ingestion cannot mutate editorial approval

### Gate 4 — Verification
A successful API request is not equivalent to a verified live post.

After dispatch:
1. capture remote publication id when available
2. query/receive remote status
3. verify expected account/channel/media/copy where the platform permits
4. mark VERIFIED only after confirmation
5. otherwise retain PUBLISHED_UNVERIFIED or FAILED with diagnostics

### Gate 5 — Organic pilot
Run one controlled organic publication end-to-end:
idea → evidence → content intelligence → asset → variant → approval → outbox → dispatch → verification → first-party performance.

Do not expand to multiple networks until repeated runs are clean.

## Current implementation status
- Gate 0 hardened browser event timestamps while preserving privileged-event validation.
- Gate 1 operational partner fields are persisted and fail closed on unknown/blocked promotion state.
- Gate 2 durable outbox, immutable copy snapshot/hash, idempotency key, audit events, approval authority, attempt limits, and kill switches are implemented.
- Gate 3 now has a single-writer dispatcher claim, attempt ledger, HMAC-SHA256 signed envelope, HTTPS-only configured transport endpoint, deterministic idempotency header, and ambiguous-response handling. No transport endpoint or secret is configured by code.
- Gate 4 now has an HMAC-authenticated verification callback. An accepted publish response remains PUBLISHED_UNVERIFIED. VERIFIED requires matching observed channel, target account, copy hash, and remote publication identity.
- Confirmed failures may be explicitly requeued only while attempts remain. Ambiguous states cannot be requeued blindly.
- All outbound and channel controls remain disabled by default. Paid publishing cannot be enabled in Phase 1.
- Gate 5 has not started. There has been no production deployment or live social publication through this path.

## Kill switches
- GLOBAL_OUTBOUND_ENABLED=false by default until pilot approval
- ORGANIC_PUBLISHING_ENABLED separate from paid publishing
- PAID_PUBLISHING_ENABLED=false throughout Phase 1
- per-channel disable switch
- per-partner disable switch

## Phase 1 acceptance criteria
- Commercial event ingestion is stable for supported public events.
- No unapproved publication can reach a dispatcher.
- Duplicate dispatch of the same idempotency key cannot create a second logical publication.
- Ambiguous remote responses do not trigger blind retries.
- A post is not labeled LIVE/VERIFIED solely because the initial publish request returned success.
- Partner eligibility and affiliate destination are checked before monetized publication.
- Paid spend remains impossible through the Phase 1 path.
- Operator can disable all outbound publishing from Chef Gringo.

## Deferred
- Paid-ad automation
- autonomous budget changes
- multi-network rollout before pilot stability
- external service direct database access
- replacing Chef Gringo Growth Queue with a third-party dashboard
