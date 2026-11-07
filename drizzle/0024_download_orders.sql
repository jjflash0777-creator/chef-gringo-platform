-- Paid /downloads orders. One row per verified Stripe Checkout session;
-- the unique session index is the idempotency key that makes webhook
-- redeliveries safe. Download delivery is authorized against these rows
-- via HMAC-signed tokens, never by session id alone.

CREATE TABLE `download_orders` (
  `id` text PRIMARY KEY NOT NULL,
  `product_id` text NOT NULL,
  `buyer_email` text NOT NULL,
  `amount_total` integer NOT NULL,
  `currency` text DEFAULT 'USD' NOT NULL,
  `stripe_checkout_session_id` text NOT NULL,
  `stripe_payment_intent_id` text,
  `status` text DEFAULT 'paid' NOT NULL,
  `paid_at` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `download_orders_status_check` CHECK(`status` in ('paid', 'refunded'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `download_orders_stripe_session_idx` ON `download_orders` (`stripe_checkout_session_id`);
--> statement-breakpoint
CREATE INDEX `download_orders_email_idx` ON `download_orders` (`buyer_email`);
