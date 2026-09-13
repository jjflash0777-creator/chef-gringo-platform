# Chef Gringo — Project State & Decision Ledger

Last updated: 2026-09-01
Status: ACTIVE RESCUE BUILD
Source of truth: GitHub repository `jjflash0777-creator/chef-gringo-platform`
Active rescue branch: `chatgpt/culinary-pulse-v1`
Production: PROTECTED — do not change during experimentation.

## Why this file exists
This is the durable checkpoint for Chef Gringo. Before proposing a new direction, architecture, public experience, affiliate template, or deployment change, read this file and the referenced template/spec documents. Do not recreate approved work from memory.

## Product thesis
Chef Gringo is an independent culinary/hospitality intelligence and commerce platform. The main product helps people understand a food, kitchen, restaurant, purchasing, equipment, menu, health-oriented food, or operating decision and turn it into an action. Commercial relationships come after the recommendation and do not determine it.

## Current public-product direction — APPROVED
The homepage hero and Ask Chef Gringo intake are retained. Culinary Pulse turns live food/hospitality signals into actions. Approved UX principles: intelligence must lead to action; use horizontal topic rails; use diverse imagery; use smart tables/dashboards for dense information; avoid repetitive filler; persona selector includes Home Cook / Restaurant / Food Truck / Senior Living / Off-grid & Homestead; main site demonstrates intelligence and must not look like a generic affiliate catalog.

Current homepage implementation: `app/page.tsx`, `app/components/CulinaryPulse.tsx`, `app/components/CulinaryPulse.module.css`.
Known visual cleanup: expand/rotate editorial imagery so the same chef/kitchen image does not repeat across lead and story rail.

## Commercial architecture — APPROVED
Main Chef Gringo site = intelligence + trust + decisions.
Campaign landing pages = marketing + advertising + conversion.
Permanent specification: `docs/campaign-landing-template-v1.md`.
Approved template: `CG Campaign Landing Template v1`.

Campaign visual lesson approved 2026-09-01: conversion pages need substantially more visual intensity than the restrained main-site editorial design. Product/use-case imagery should drive the hierarchy and create desire before explanatory copy. ThermoWorks concept benchmark: cinematic food + product in use + immediate outcome promise + visual category navigation + strong CTA. Preserve v1 honesty, fit-check and disclosure architecture while developing a future Campaign Template v2 around this visual/conversion principle. Do not publish unverified merchant claims merely because they appear in a design concept.

## Active / approved commercial relationships
### Toast
Active referral relationship. Reference campaign built at `/go/toast`. Referral destination: `https://toast.partner-experience.com/r/R-UXCQ-UTI3`. Founder approved the visual/conversion direction as the quality bar for future campaign pages.

### ThermoWorks
APPROVED 2026-08-31.
Primary referral destination: `https://thermoworks.sjv.io/k41o50`.
Impact tracked campaign/creative links supplied by founder:
- `https://thermoworks.sjv.io/c/7640961/3270375/39638`
- `https://thermoworks.sjv.io/c/7640961/3269923/39638`
- `https://thermoworks.sjv.io/c/7640961/3262574/39638`
- `https://thermoworks.sjv.io/c/7640961/3259031/39638`
Associated creative endpoints supplied where available: creative 3270375 `//a.impactradius-go.com/display-ad/39638-3270375` (320×213), tracking pixel `https://imp.pxf.io/i/7640961/3270375/39638`; creative 3269923 `//a.impactradius-go.com/display-ad/39638-3269923` (320×214), tracking pixel `https://imp.pxf.io/i/7640961/3269923/39638`.
Publisher/account ID: `7640961`; advertiser/program ID visible in supplied links: `39638`.
Founder supplied official/partner product and in-use assets including Thermapen/oven cooking, NODE/refrigeration monitoring, Smoke X4/BBQ, and product imagery.
Campaign route `/go/thermoworks` is in visual refinement. Approved direction: rebuild visual hierarchy around cinematic food/product imagery; outcome-led hero; Home Cooking / Pro Kitchen & Food Safety / BBQ & Smoking / Refrigeration paths; preserve evidence-based claims and affiliate disclosure.

### BLUETTI
APPROVED / ONBOARDED 2026-09-01. Evidence: founder supplied welcome email from BLUETTI program stating onboarding/joining was successful and providing dedicated support contact. Welcome email also states an extra 1% commission on the first order as a first-order bonus. Treat this bonus as current onboarding evidence, not a permanent public commission claim. Dedicated support contact shown in supplied email: `madeline@bluetti.com`.

Primary Chef Gringo BLUETTI affiliate/referral link supplied by founder: `https://bluettius.sjv.io/YVvooe`.

BLUETTI is now build-ready from an attribution-link standpoint. Before public campaign deployment, capture current partner terms, paid-media/brand-bidding rules, approved creatives, and current product/offer data. High-value intended Chef Gringo use cases: food-truck/mobile-kitchen power, refrigeration/freezer backup, emergency kitchen continuity, off-grid/homestead food systems, and solar/portable-power sizing. Do not build it as a generic camping-power page.

### Kitchen OS
ACTIVE referral relationship. Referral destination: `https://www.kitchen-os.com/?ref=josh45`. Verify economics, attribution, product claims and paid-media rules before campaign build.

### Chef's Deal
ACTIVE commercial-kitchen-equipment affiliate. Publisher ID visible in supplied CJ-style links: `101866463`.
Creative/link #1: `https://www.dpbolvw.net/click-101866463-15872770` / `https://www.tqlkg.com/image-101866463-15872770` (160×600).
Creative/link #2: `https://www.kqzyfj.com/click-101866463-15872766` / `https://www.awltovhc.com/image-101866463-15872766` (320×100).
Use inside equipment selection, repair-vs-replace, restaurant-opening, refrigeration, cooking/prep and food-truck equipment flows rather than as generic banner inventory. Verify deep links/feed/economics/cookie/paid-media rules before campaign build.

## Partner pipeline — APPLICATIONS / NEGOTIATIONS
Do not mark these approved until current evidence confirms approval.
- 7shifts — application submitted.
- Restaurant365 — direct outreach from J.R. Gudger, Solution Partner Manager, Referrals; intro-call stage.
- Renogy — application submitted 2026-08-31.
- Jackery — application submitted 2026-08-31.
- EcoFlow — application submitted 2026-08-31.
- Restoke — affiliate/partner application submitted 2026-08-31.
- Kitxens — affiliate/partner application submitted 2026-08-31.
- Veno App — affiliate application submitted 2026-08-31.
- Vozly — partnership/affiliate inquiry submitted 2026-08-31.

## Next research queue — DO NOT APPLY BLINDLY
Pause broad application accumulation and research only clear gaps: Anker SOLIX; BougeRV; ACOPOWER; VEVOR; commercial equipment financing/restaurant funding; food-truck builders/trailers, insurance, water systems and training.

## Expansion map — APPROVED CONCEPT
Food / hospitality → mobile food businesses → power & water → food production → resilient kitchens/homes.
Commercial/content areas: Kitchen & Hospitality; Food Trucks / Mobile Kitchens; Power / Backup / Solar; Grow Your Food / Hydroponics / Controlled Growing; Resilient Kitchen / Off-grid.
Rule: every expansion must connect to a food, kitchen, hospitality, growing, sourcing or operating problem. Do not become a generic prepper/product catalog.

## High-value funnel thesis — FOOD TRUCK
Future candidate funnel: user describes concept, menu, covers/day, cooking fuel, shore-power availability and budget. Chef Gringo generates equipment list, electrical load, generator/battery requirement, refrigeration, water, POS, food-safety kit and startup-cost range. Potential commercial routes include Chef's Deal/equipment, ThermoWorks/temperature, Toast/POS, BLUETTI and any later-approved power partners, Renogy/solar if approved, and only later a vetted financing partner. One user may create multiple legitimate commercial events.

## Intelligence assets — KEEP
Do not casually rewrite or discard evidence/provenance architecture; observation/hypothesis/evidence/verified-fact/recommendation boundaries; ResearchMemory; ClaimCoverage; SubjectGrounding; evidence precision gates; bounded research; source independence; human evidence acceptance/publication governance; Product Harvest; marketplace/partner intelligence; commercial-opportunity separation; landed-cost and repair-vs-replace logic; recipe/menu intelligence; safety controls; analytics/event infrastructure.

## Operating system
Founder approves product direction, visual quality, commercial relationships and production promotion. ChatGPT handles product strategy, research, design direction, connected-tool orchestration, GitHub-controlled implementation where appropriate, audits and preservation of decisions. Cursor Pro is primary local coding/testing/debugging/visual review. GitHub is source of truth. Existing hosting/preview workflow stays until migration has a clear business reason. Production stays protected. PostHog is behavioral analytics. Figma is visual composition/design system, not source of truth for business logic.

## Permanent rules
1. GitHub is source of truth.
2. Do not throw away approved work because a new idea appears.
3. No wholesale backend rewrite.
4. Do not touch production during experimentation.
5. Customer value/recommendation quality stay separate from commission economics.
6. No autonomous publication of high-consequence claims.
7. New affiliate campaign pages inherit `CG Campaign Landing Template v1` unless deliberate v2 is approved.
8. Every approved major UX/template/partner decision goes in this ledger or a linked versioned spec.
9. Before a major pivot, identify what the proposal replaces.
10. Finish and measure complete customer experiences before adding infrastructure.
11. APPLICATION SUBMITTED is not APPROVED.
12. Pause indiscriminate affiliate accumulation once a category has sufficient coverage; prioritize building, measurement and partner quality.

## Immediate next work
1. Complete visual refinement of `/go/thermoworks` using the approved cinematic conversion direction.
2. Capture BLUETTI partner terms, creatives and paid-media rules; then build `/go/bluetti` around food/mobile/off-grid power problems using `https://bluettius.sjv.io/YVvooe` as the approved attribution route.
3. Fix repeated imagery in Culinary Pulse.
4. Validate `/go/toast` desktop/mobile and preserve as reference campaign.
5. Add/verify campaign analytics: landing view → CTA → merchant outbound action.
6. Prepare for Restaurant365 partner call and capture actual economics/program rules.
7. Monitor submitted applications and record approvals/rejections as they arrive.

## Resume protocol
Read `docs/CHEF-GRINGO-PROJECT-STATE.md`, then `docs/campaign-landing-template-v1.md`, then inspect current branch/status and actual implementation before recommending changes.
