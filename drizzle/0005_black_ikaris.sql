CREATE TABLE `decision_brief_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`business_name` text,
	`phone` text,
	`equipment_type` text NOT NULL,
	`manufacturer` text,
	`model_number` text,
	`equipment_age` text,
	`problem_summary` text NOT NULL,
	`evidence_summary` text DEFAULT '' NOT NULL,
	`current_quote` text,
	`urgency` text DEFAULT 'planning' NOT NULL,
	`marketing_consent` integer DEFAULT false NOT NULL,
	`policy_version` text NOT NULL,
	`source` text DEFAULT 'repair-or-replace-pilot' NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`amount_cents` integer DEFAULT 9900 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`stripe_checkout_session_id` text,
	`stripe_payment_intent_id` text,
	`paid_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "decision_brief_status_check" CHECK(`status` in ('awaiting_payment', 'paid', 'in_review', 'waiting_on_customer', 'delivered', 'refunded', 'cancelled')),
	CONSTRAINT "decision_brief_amount_check" CHECK(`amount_cents` = 9900),
	CONSTRAINT "decision_brief_currency_check" CHECK(`currency` = 'USD')
);
--> statement-breakpoint
CREATE INDEX `decision_brief_status_created_idx` ON `decision_brief_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `decision_brief_email_idx` ON `decision_brief_requests` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `decision_brief_stripe_session_idx` ON `decision_brief_requests` (`stripe_checkout_session_id`);
