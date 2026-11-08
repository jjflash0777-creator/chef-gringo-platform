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
- **Files are private.** Plaintext product files are not in this repo
  and have no public URL. Each file ships as an AES-256-GCM encrypted
  bundle under `app/lib/download-bundles/` and is decrypted in memory
  only by `/api/downloads/file`, which requires an HMAC-signed,
  product-scoped token (72 hours) **and** a matching paid order row.
  The decryption key (`DOWNLOAD_BUNDLE_KEY`) exists only as a
  production env var — the repo holds ciphertext only. (Delivery
  originally targeted the R2 bucket bound as `CAMPAIGN_ASSETS`; that
  bucket, `site-creator-r2`, is provisioned inside the OpenAI Sites
  platform's own infrastructure and is unreachable from any founder
  Cloudflare account or wrangler login — verified 2026-11-08 after
  checking both founder accounts. The route still falls back to the
  R2 object if a bundle cannot be decrypted, but bundles are the
  delivery path; do not go hunting for the bucket again.)

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
| `DOWNLOAD_BUNDLE_KEY` | base64-encoded 32-byte key the download bundles were encrypted with (Step 4) |

Never commit real values; `.env.example` carries names only.

## Step 4 — Encrypt the product files into bundles

There is no bucket upload step anymore (see the platform-bucket note
under Design choices). The files ship inside the site as ciphertext:

1. Generate the bundle key once: `openssl rand -base64 32`. Keep it
   somewhere safe (password manager) — if it is lost, the bundles must
   be re-encrypted from the plaintext sources; if it leaks, anyone
   with repo access can decrypt the products.
2. Set it as `DOWNLOAD_BUNDLE_KEY` in the production Sites env
   (Step 3) before deploying the bundle change.
3. From a checkout, run the encrypt script against the folder holding
   the six list-ready plaintext files under their plain filenames
   (`kitchen-reference-chart-set.pdf`, `healthcare-kitchen-starter-pack.pdf`,
   `healthcare-kitchen-starter-pack.docx`,
   `healthcare-kitchen-starter-pack-logs.xlsx`, `recipe-calculator.xlsx`,
   `foodservice-schedule-pack.xlsx`):

   ```
   DOWNLOAD_BUNDLE_KEY=<the key> node scripts/encrypt-download-bundles.mjs <plaintext-dir>
   ```

   This regenerates `app/lib/download-bundles/payloads/*.ts` and
   `app/lib/download-bundles/manifest.ts`. The script refuses to run
   without a valid 32-byte key. Source files are the list-ready,
   repair-verified copies in the fastest-to-cash goal files
   (`files/downloads-r2-upload/` holds the staged set) — do **not**
   use the pre-repair backups under
   `hidden_files/xlsx-backups-2026-11-07/`.
4. Commit the regenerated payload modules + manifest in a normal PR
   and deploy as usual. Plaintext files are never committed.
5. To update a product file later: replace its plaintext source,
   re-run the script, commit, deploy. The key does not change unless
   you deliberately rotate it (then set the new `DOWNLOAD_BUNDLE_KEY`
   in Sites in the same deploy).

Until `DOWNLOAD_BUNDLE_KEY` is set in production, downloads return an
honest "still being prepared" message with the support email —
checkout itself is unaffected, but finish this step before announcing
launch.

## Step 5 — Test-mode dry run (before live keys)

1. Set the four env vars with **test-mode** values (`sk_test_...` and
   the test webhook's `whsec_...`; `DOWNLOAD_BUNDLE_KEY` has no test
   variant — it is the same key the bundles were encrypted with),
   redeploy.
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
