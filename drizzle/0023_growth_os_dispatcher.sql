-- Growth OS Phase 1: dispatcher attempt ledger and verification receipts.
-- Additive only. No transport endpoint or outbound publishing is enabled here.
CREATE TABLE `publication_dispatch_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `outbox_id` text NOT NULL,
  `attempt_number` integer NOT NULL CHECK(`attempt_number` between 1 and 3),
  `lease_token` text NOT NULL,
  `adapter` text NOT NULL,
  `envelope_hash` text NOT NULL,
  `status` text DEFAULT 'claimed' NOT NULL,
  `remote_publication_id` text,
  `remote_publication_url` text,
  `response_code` integer,
  `error` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`outbox_id`) REFERENCES `publication_outbox`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `publication_dispatch_attempts_status_check` CHECK(`status` in ('claimed','accepted','ambiguous','failed','verified'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_dispatch_attempts_lease_idx` ON `publication_dispatch_attempts` (`lease_token`);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_dispatch_attempts_number_idx` ON `publication_dispatch_attempts` (`outbox_id`,`attempt_number`);
--> statement-breakpoint
CREATE INDEX `publication_dispatch_attempts_outbox_idx` ON `publication_dispatch_attempts` (`outbox_id`,`created_at`);
