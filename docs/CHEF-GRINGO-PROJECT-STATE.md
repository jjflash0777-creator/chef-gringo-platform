# Chef Gringo — Project State & Decision Ledger

Last updated: 2026-08-31
Status: ACTIVE RESCUE BUILD
Source of truth: GitHub repository `jjflash0777-creator/chef-gringo-platform`
Active rescue branch: `chatgpt/culinary-pulse-v1`
Production: PROTECTED — do not change during experimentation.

## Why this file exists
This is the durable checkpoint for Chef Gringo. Before proposing a new direction, architecture, public experience, affiliate template, or deployment change, read this file and the referenced template/spec documents. Do not recreate approved work from memory.

## Product thesis
Chef Gringo is an independent culinary/hospitality intelligence and commerce platform. The main product helps people understand a food, kitchen, restaurant, purchasing, equipment, menu, health-oriented food, or operating decision and turn it into an action. Commercial relationships come after the recommendation and do not determine it.

## Current public-product direction — APPROVED
The homepage hero and Ask Chef Gringo intake are retained.
The homepage now adds a live Culinary Pulse/intelligence layer designed around:
- What changed?
- What requires action in the kitchen?
- What is changing financially?
- What matters to the business?
- What can the user cook/eat differently?
- What solutions are worth considering?

Approved UX principles:
- Intelligence must lead to action.
- Use horizontal topic rails instead of endless vertical article stacks.
- Use imagery heavily and avoid repeating the same image across unrelated stories.
- Dense information such as recalls and markets belongs in smart tables/dashboards.
- Avoid repetitive 'Chef Gringo says...' filler.
- Persona selector: Home Cook / Restaurant / Food Truck / Senior Living / Off-grid & Homestead.
- Main site demonstrates intelligence; it should not look like a generic affiliate catalog.

Current homepage implementation lives primarily in:
- `app/page.tsx`
- `app/components/CulinaryPulse.tsx`
- `app/components/CulinaryPulse.module.css`

Known visual cleanup item:
- Expand/rotate editorial imagery so the same chef/kitchen image does not repeat across the lead story and horizontal story rail.

## Commercial architecture — APPROVED
Main Chef Gringo site = intelligence + trust + decisions.
Campaign landing pages = marketing + advertising + conversion.

Affiliate/campaign pages should NOT carry the entire intelligence product. They should match a specific ad/search/social intent to a specific audience, problem, promise, offer, and action.

Permanent campaign specification:
- `docs/campaign-landing-template-v1.md`

Approved campaign template name:
- `CG Campaign Landing Template v1`

## Toast — FIRST REFERENCE CAMPAIGN — APPROVED DIRECTION
Route: `/go/toast`
Audience: Independent restaurant owner/operator.
Referral destination: `https://toast.partner-experience.com/r/R-UXCQ-UTI3`

Core campaign architecture:
1. Audience-specific hero.
2. One clear pain/promise.
3. One dominant commercial CTA.
4. Verified offer.
5. Visual translation into restaurant workflow.
6. Good fit / compare first honesty block.
7. Meaningful limitation/tradeoff.
8. Route back to Chef Gringo intelligence for uncertain users.
9. Focused final CTA.
10. Clear referral disclosure.

Toast campaign implementation:
- `app/go/toast/page.tsx`
- `app/go/toast/toast.module.css`

Founder visual verdict after local review: strong positive; this is the quality bar for future campaign landing pages.

Toast source material supplied by founder:
- Toast Advocates Training PDF, U.S. only.
- Verified in supplied training: POS, handhelds, Kitchen Display System, Toast IQ, online ordering, marketing, integrations, team management.
- Current supplied Advocate training states an exclusive $500 off hardware referral offer; terms apply.
- Advocate compensation shown in supplied training: $1,000 first successful referral; $1,250 second and third; $1,500 fourth and above; retail referral material states $2,000 for qualifying retail referrals that go live. These figures must not be treated as guaranteed future terms; re-verify before future public claims.

## ThermoWorks — APPROVED PARTNER
Status: APPROVED on 2026-08-31.
Chef Gringo referral destination: `https://thermoworks.sjv.io/k41o50`
Founder supplied ThermoWorks product and in-use campaign assets, including Thermapen/oven cooking, NODE/refrigeration monitoring, Smoke X4/BBQ, and a Sizzle/product image. Preserve attribution/usage rights according to the affiliate program terms before public deployment.

Campaign direction: use `CG Campaign Landing Template v1`, but tailor the campaign to food safety, temperature control, grilling/cooking accuracy, and professional-kitchen use rather than copying the Toast software structure.

Do not publish commission percentages, discount claims, product-performance claims, or offer language until verified against the current ThermoWorks affiliate terms or approved partner materials.

## Kitchen OS — ACTIVE REFERRAL
Status: ACTIVE referral relationship confirmed by founder on 2026-08-31.
Chef Gringo referral destination: `https://www.kitchen-os.com/?ref=josh45`

Campaign direction: treat Kitchen OS as restaurant/kitchen operations software, not as a generic affiliate listing. Before building a public campaign page, verify current product capabilities, pricing/offer language, referral economics, attribution rules, and approved marketing claims from Kitchen OS materials or the partner program.

If approved for campaign build, inherit `CG Campaign Landing Template v1` and tailor the page around the specific operating problem Kitchen OS solves.

## Chef's Deal — ACTIVE AFFILIATE / EQUIPMENT PARTNER
Status: ACTIVE affiliate creative/link supplied by founder on 2026-08-31.
Tracked affiliate destination: `https://www.dpbolvw.net/click-101866463-15872770`
Creative image source: `https://www.tqlkg.com/image-101866463-15872770`
Creative label: `Chef's Deal Restaurant Equipment`
Creative size supplied: 160 × 600.

Campaign direction: Chef's Deal belongs in the commercial-kitchen-equipment side of Chef Gringo. Do not reduce it to a banner-ad placement. Use the relationship in equipment-buying flows such as replacement decisions, opening-a-restaurant equipment lists, food-truck equipment, refrigeration, cooking equipment, prep equipment, and total-cost comparisons.

Before building a dedicated campaign page, verify current affiliate economics, deep-link capability, product-feed/catalog access, cookie/attribution window, paid-media rules, and any offer/pricing claims. If built, inherit `CG Campaign Landing Template v1` but tailor it around commercial equipment selection and purchasing rather than software or thermometer use cases.

## Affiliate/partner pipeline — current known state
- Toast: active referral relationship; first campaign page built.
- ThermoWorks: APPROVED; referral link saved; campaign build is next.
- Kitchen OS: ACTIVE referral link saved; verify program economics/claims before campaign build.
- Chef's Deal: ACTIVE affiliate tracking creative/link saved; equipment-commerce candidate.
- 7shifts: application submitted.
- Restaurant365: direct outreach from J.R. Gudger, Solution Partner Manager, Referrals; intro-call stage. Do not mark approved until program terms are agreed.
- Impact account: Chef Gringo website/profile configured; ThermoWorks approved there. Block/Square application had previously been declined for missing profile description; profile was subsequently improved. Verify current status before relying on it.
- Power/off-grid targets discussed: Jackery, BLUETTI, Renogy, EcoFlow, Anker/SOLIX.
- Growing-system targets discussed: Gardyn; VIVOSUN and AC Infinity deferred until audience/traffic thresholds make applications stronger.

Do not mark any partner as approved without current evidence.

## Expansion map — APPROVED CONCEPT, NOT ALL BUILT
Chef Gringo can expand coherently through:
Food / hospitality → mobile food businesses → power & water → food production → resilient kitchens/homes.

Commercial/content areas:
- Kitchen & Hospitality
- Food Trucks / Mobile Kitchens
- Power / Backup / Solar
- Grow Your Food / Hydroponics / Controlled Growing
- Resilient Kitchen / Off-grid

Rule: these areas must connect to a food, kitchen, hospitality, growing, sourcing, or operating problem. Do not turn Chef Gringo into a generic prepper/product catalog.

## Intelligence assets — KEEP
Do not casually rewrite or discard:
- evidence/provenance architecture
- observation vs hypothesis vs evidence vs verified fact vs recommendation boundaries
- ResearchMemory
- ClaimCoverage
- SubjectGrounding
- evidence precision gates
- bounded research
- source independence / authoritative-source preference
- human evidence acceptance and publication governance
- Product Harvest / marketplace intelligence
- partner intelligence
- commercial-opportunity separation
- landed-cost logic
- repair-versus-replace logic
- recipe scaling / menu intelligence
- safety controls
- analytics/event infrastructure

These systems are backend assets. Public UX should expose their value without exposing internal scaffolding.

## Operating system — current rule
- Founder: approves product direction, visual quality, commercial relationships, and production promotion.
- ChatGPT: product strategy, research, design direction, connected-tool orchestration, GitHub-controlled implementation where appropriate, audits, and preservation of project decisions.
- Cursor Pro: primary local coding, testing, debugging, and visual review environment.
- GitHub: source of truth.
- Existing hosting/preview workflow: retain until a migration has a clear business reason.
- Production: protected from experiments.
- PostHog: behavioral analytics.
- Figma: design system / visual composition tool; do not make it a new source of truth for business logic.

## Hosting/infrastructure decision
Do NOT migrate Chef Gringo to another hosting provider merely for architectural cleanliness. Prior Cloudflare migration work was stopped because it introduced auth/data/deployment complications without improving the immediate path to revenue. Vercel should not be introduced as another hosting layer unless it replaces something for a demonstrated reason.

## Current branch checkpoint
Active rescue branch: `chatgpt/culinary-pulse-v1`
Known important commits in this phase:
- `204ac6a2640251eda6bb01f846dd7c81663de1aa` — actionable Culinary Pulse/homepage iteration.
- `b8f01be0c810a94e6a5a105b655b1dea77510a8f` — Toast campaign + permanent campaign template checkpoint.
- `0028512340f415b906eacc09d1cc552baf4a24cd` — project-state decision ledger created.
- `a21ed4002b794d34d27907aeaae9aa40a68db55b` — ThermoWorks approval recorded.
- `c5ca2ae56af61d41e2fa171b55bea52ba398f07f` — Kitchen OS and Restaurant365 pipeline update.

## Permanent rules
1. GitHub is the source of truth.
2. Do not throw away approved work because a new idea appears.
3. Do not create another wholesale backend rewrite.
4. Do not touch production during experimentation.
5. Customer value and recommendation quality stay separate from commission economics.
6. No autonomous publication of high-consequence claims.
7. New affiliate campaign pages inherit `CG Campaign Landing Template v1` unless a deliberate v2 is approved.
8. Every approved major UX/template decision must be written into this ledger or a linked versioned spec.
9. Before a major pivot, compare the proposal against this ledger and explicitly identify what it replaces.
10. Prefer finishing and measuring complete customer experiences over adding infrastructure.

## Immediate next work
1. Fix repeated imagery in Culinary Pulse.
2. Validate `/go/toast` on desktop and mobile; preserve it as the reference campaign.
3. Build ThermoWorks campaign landing page using the approved campaign template and verified partner materials.
4. Add campaign analytics for view → CTA click → merchant outbound action if not already captured at the required granularity.
5. Prepare for Restaurant365 partner call and capture economics/program rules before building that campaign.
6. Verify Kitchen OS referral economics/claims before building its campaign.
7. Verify Chef's Deal deep-link/feed/program economics and map it into equipment-buying flows.
8. Build additional campaign variants only for approved/active partners or clearly labeled pre-approval design work.
9. Continue affiliate applications selectively; do not accumulate dozens of weak programs.

## How to resume the project in a future conversation
Start by reading:
1. `docs/CHEF-GRINGO-PROJECT-STATE.md`
2. `docs/campaign-landing-template-v1.md`
3. Current active branch status and latest commits.

Then inspect the actual current implementation before recommending changes.
