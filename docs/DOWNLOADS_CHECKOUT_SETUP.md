# Downloads checkout — founder setup

The /downloads storefront sells the four digital products with Stripe
Checkout. Code is live-gated: until the env vars below are set in the
production Sites project, the Buy buttons disable themselves with an
honest "checkout is being connected" note and every route fails closed.
Nothing about the flow can take money or release files before this setup
is done.

## Design choices (so future-you doesn't re-litigate them)

- **Prices live in code.** `app/lib/downloads.ts` is the only price
  source. Checkout sessions are created with inline `price_data`, so
  there are **no products or prices to create in the Stripe dashboard**.
  Changing a price = editing the catalog + a normal PR.
- **The webhook is the source of truth.** `POST /api/downloads/webhook`
  verifies the Stripe signature and records the order in D1
  (`download_orders`, idempotent on the session id). The confirmation
  page (`/downloads/success`) re-verifies the session server-side with
  Stripe and records the same order, so a slow webhook never strands a
  buyer — and a bare redirect never releases files by itself.
- **Files are private.** Product files are not in this repo and have no
  public URL. They live as objects in the R2 bucket bound as
  `CAMPAIGN_ASSETS` and are served only by `/api/downloads/file`, which
  requires an HMAC-signed, product-scoped token (72 hours) **and** a
  matching paid order row.

## Step 1 — Stripe account

1. Create/activate the Stripe account for Chef Gringo and finish
   business verification so live payments can be enabled.
2. In Stripe **Settings → Customer emails**, enable payment receipts —
   the confirmation page tells buyers "Stripe has emailed your receipt,"
   and this setting is what makes that true.
3. Decide on sales tax. Digital goods tax handling (Stripe Tax or
   manual) is a founder/accountant call; checkout does not enable
   automatic tax until you say so.

## Step 2 — Webhook endpoint

In Stripe **Developers → Webhooks**, add an endpoint:

- URL: `https://chefgringo.com/api/downloads/webhook`
- Event: `checkout.session.completed` (only this one)
- Copy its **Signing secret** (`whsec_...`) — it is *not* the same as
  the decision-brief endpoint's secret.

## Step 3 — Env vars (production Sites project)

Set these as **server-side** env vars, then redeploy (env changes need a
fresh deployment to take effect):

| Var | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` for the dry run, `sk_live_...` at launch |
| `STRIPE_DOWNLOADS_WEBHOOK_SECRET` | the `whsec_...` from Step 2 (test-mode endpoints have their own) |
| `DOWNLOAD_LINK_SECRET` | a long random string you generate and keep only here |

Never commit real values; `.env.example` carries names only.

## Step 4 — Upload the product files to R2

Upload each file below to the bucket bound as `CAMPAIGN_ASSETS` in the
production Sites project, at exactly the listed key. Use the bucket's
real name from the Sites/Cloudflare dashboard:

```
wrangler r2 object put <BUCKET> --key downloads/kitchen-reference-chart-set/kitchen-reference-chart-set.pdf --file kitchen-reference-chart-set.pdf
wrangler r2 object put <BUCKET> --key downloads/healthcare-kitchen-starter-pack/healthcare-kitchen-starter-pack.pdf --file healthcare-kitchen-starter-pack-list-ready.pdf
wrangler r2 object put <BUCKET> --key downloads/healthcare-kitchen-starter-pack/healthcare-kitchen-starter-pack.docx --file healthcare-kitchen-starter-pack-list-ready.docx
wrangler r2 object put <BUCKET> --key downloads/healthcare-kitchen-starter-pack/healthcare-kitchen-starter-pack-logs.xlsx --file healthcare-kitchen-starter-pack-logs.xlsx
wrangler r2 object put <BUCKET> --key downloads/recipe-calculator/recipe-calculator.xlsx --file Recipe-Calculator-Mac-Test.xlsx
wrangler r2 object put <BUCKET> --key downloads/foodservice-schedule-pack/foodservice-schedule-pack.xlsx --file foodservice-schedule-pack.xlsx
```

Source files (the list-ready, repair-verified copies in the
fastest-to-cash goal files — do **not** use the pre-repair backups under
`hidden_files/xlsx-backups-2026-11-07/`):

| R2 key ends with | Source file |
| --- | --- |
| `kitchen-reference-chart-set.pdf` | `files/kitchen-reference-chart-set/kitchen-reference-chart-set.pdf` |
| `healthcare-kitchen-starter-pack.pdf` | `files/healthcare-kitchen-starter-pack/healthcare-kitchen-starter-pack-list-ready.pdf` |
| `healthcare-kitchen-starter-pack.docx` | `files/healthcare-kitchen-starter-pack/healthcare-kitchen-starter-pack-list-ready.docx` |
| `healthcare-kitchen-starter-pack-logs.xlsx` | `files/healthcare-kitchen-starter-pack/healthcare-kitchen-starter-pack-logs.xlsx` |
| `recipe-calculator.xlsx` | `files/recipe-calculator-mvp/Recipe-Calculator-Mac-Test.xlsx` (the copy the founder verified on his Mac) |
| `foodservice-schedule-pack.xlsx` | `files/foodservice-schedule-pack/foodservice-schedule-pack.xlsx` |

Until a file is uploaded, its download returns an honest "still being
prepared" message with the support email — checkout itself is
unaffected, but upload before announcing launch.

## Step 5 — Test-mode dry run (before live keys)

1. Set the three env vars with **test-mode** values (`sk_test_...` and
   the test webhook's `whsec_...`), redeploy.
2. Buy the Chart Set with Stripe's test card `4242 4242 4242 4242`.
3. Confirm: the confirmation page lists the PDF with a working download
   link; the webhook delivered (Stripe dashboard → the endpoint shows a
   succeeded event); one row exists in `download_orders`.
4. Swap in live keys + the live webhook secret, redeploy, and make one
   real purchase of the cheapest product to prove the live path end to
   end; refund it from the Stripe dashboard.

## Known v1 limits (deliberate)

- Delivery happens on the confirmation page. If a buyer closes it
  before downloading, recovery is one email to hello@chefgringo.com
  (links live 72 hours and can be re-issued). Email delivery of links
  is the obvious v2.
- Refunds are manual in the Stripe dashboard; a refunded order's status
  can be flipped to `refunded` in `download_orders` to cut off its
  download links.
