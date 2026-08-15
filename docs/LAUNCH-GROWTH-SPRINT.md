# Chef Gringo Launch + Growth Sprint

## Goal

Reach a credible public V1 and begin founder-reviewed affiliate applications without weakening editorial independence, inventing metrics, or turning unfinished integrations into public claims.

## Release rule

A launch blocker is anything that prevents a stranger from understanding Chef Gringo, completing a useful AI/action flow, joining the email list, or trusting the commercial and evidence boundaries.

A future feature is not a launch blocker merely because it could make Chef Gringo better.

## Gate A — Public product

- [ ] Approved Chef Gringo brand lockup renders correctly on desktop and mobile.
- [ ] Homepage matches the approved visual direction and has no known contrast/overflow defects.
- [ ] AI runtime answers ordinary culinary and hospitality questions without forcing deterministic intake.
- [ ] Cooking Mission quality lanes render and continue the conversation.
- [ ] Shopping-list, scale, Cook Mode, and fulfillment-preparation actions work.
- [ ] Marketplace and comparison pages contain no fake prices, availability, imagery rights, affiliate status, or evidence.
- [ ] About, Privacy, Terms, Affiliate Disclosure, Partners, Newsletter/Field Notes, sitemap, and robots routes render.

## Gate B — Email and retention

- [ ] Configure `EMAIL_SUBSCRIBE_ENDPOINT` to the approved Loops contacts endpoint in production.
- [ ] Configure `EMAIL_SUBSCRIBE_TOKEN` server-side only.
- [ ] Submit a real test signup and verify contact creation, source metadata, consent, and policy version.
- [ ] Build the initial welcome sequence in the provider:
  1. Welcome + what Chef Gringo does.
  2. Try a Cooking Mission.
  3. Marketplace / evidence-led decision example.
  4. Free useful operator or cooking resource.
  5. Ask what the subscriber wants Chef Gringo to solve next.
- [ ] Verify unsubscribe behavior and sender identity.

## Gate C — Measurement

- [ ] Bind/configure production storage for first-party commercial events.
- [ ] Verify `page_view`, `content_view`, `marketplace_view`, `recommendation_view`, `merchant_click`, `affiliate_click`, `email_signup`, and legitimate server-side lead/sale/commission events.
- [ ] Confirm public clients cannot assert sales, commissions, monetary values, or partner attribution.
- [ ] Confirm campaign/source parameters can be retained without storing unnecessary personal data.
- [ ] Establish a founder dashboard baseline before paid traffic begins.

## Gate D — Production AI

- [ ] Configure a reliable hosted OpenAI-compatible model endpoint for production.
- [ ] Keep credentials server-side.
- [ ] Add/verify request timeout, graceful provider failure, bounded context, and cost controls.
- [ ] Add/verify public rate limiting before meaningful traffic or paid ads.
- [ ] Test culinary, equipment, shopping, software, and operator prompts.
- [ ] Confirm the model does not invent prices, availability, affiliate relationships, certifications, warranties, or specifications.

## Gate E — Affiliate Application Wave 1

Founder reviews every submission before it is sent.

Priority queue:

1. ThermoWorks — affiliate.
2. Square / Square for Restaurants — affiliate/referral.
3. Instacart Developer Platform — shopping/recipe integration; affiliate path after approved live integration where applicable.
4. Toast — advocate/referral route, subject to current eligibility and terms.
5. 360training / Learn2Serve — training/certification.
6. StateFoodSafety — training/certification.
7. SimplyThick — direct/affiliate/referral research.
8. Performance Health — affiliate/referral research.
9. Equipment manufacturers/distributors — direct outreach, RFQ, approved media, referral, or dealer relationships as appropriate.

For every application:

- [ ] Current official program/route verified.
- [ ] Chef Gringo eligibility verified or left unresolved.
- [ ] Current material terms/restrictions reviewed.
- [ ] Application/contact route verified.
- [ ] Customer-value thesis written.
- [ ] Proposed relationship chosen.
- [ ] Public site URL, contact email, disclosure URL, and audience description are accurate.
- [ ] Traffic/subscriber/follower metrics are supplied only if verified.
- [ ] No application is represented as approved until actual approval exists.

## Gate F — Distribution

### Initial content bank

Create from real Chef Gringo missions rather than unrelated generic posts:

- Cooking Mission: marinara — Budget Smart vs Premium Pantry vs Bring Italy to the Table.
- Ingredient intelligence: where spending more actually changes marinara.
- Shopping-list transformation: home recipe to useful buying units.
- Refrigeration: diagnose vs repair vs replace.
- Equipment comparison: True T-49-HC vs Turbo Air M3R47-2-N, preserving unresolved costs.
- Operator software: food-cost/POS decision example.
- Senior/healthcare foodservice: practical texture-modified workflow or operator tool.

Each strong mission may be repurposed into:

- site article/mission;
- short-form video script;
- vertical video;
- social carousel;
- Pinterest asset where appropriate;
- Field Notes email;
- search landing page;
- lead magnet/download when genuinely useful.

### Social launch

- [ ] Claim/confirm official handles before advertising them publicly.
- [ ] Use the approved CG mark consistently.
- [ ] Prepare profile copy and destination URL.
- [ ] Publish a small initial bank before paid promotion so profiles do not look empty.
- [ ] Do not buy followers or fabricate engagement.

## Gate G — Paid acquisition

Do not enable broad automated spend merely because ad platforms permit it.

Required before paid campaigns:

- [ ] Conversion events persist reliably.
- [ ] One landing experience has a clear user action.
- [ ] Email capture works.
- [ ] Campaign/source attribution works.
- [ ] Privacy/consent treatment matches the actual tracking configuration.
- [ ] Founder sets an explicit test budget and stop-loss.

First proposed experiment:

`short-form/search ad -> Cooking Mission -> quality lane -> shopping list -> email/save action -> future verified fulfillment route`

Scale only after observed data supports it.

## Gate H — Launch QA

- [ ] Production build passes.
- [ ] TypeScript passes.
- [ ] Lint passes.
- [ ] Relevant tests pass.
- [ ] `git diff --check` passes.
- [ ] Desktop and mobile visual QA passes.
- [ ] Keyboard/focus and WCAG AA contrast checks pass on public conversion paths.
- [ ] Forms and provider failures render useful messages.
- [ ] Broken-link check passes on public routes.
- [ ] Canonical URL and social metadata use the production domain.
- [ ] Security headers and rate limiting are reviewed.
- [ ] No secrets are present in client bundles or repository changes.

## Explicitly post-launch

These are valuable but must not delay V1 unless they become necessary for a live promise:

- full Kitchen Graph;
- large POD merchandise catalog;
- complete manufacturer imagery library;
- every Marketplace discovery record deeply verified;
- fully automated ad scaling;
- automated affiliate applications;
- sophisticated RFQ marketplace;
- enterprise licensing;
- outcome-data API.

## Operating principle

Recommendation first. Action second. Monetization third.

A useful outcome may generate affiliate, referral, SaaS, grocery, RFQ, digital-product, training, service, merchandise, subscription, or other legitimate revenue. It may also generate no revenue at all. Commercial opportunity never changes the underlying recommendation.