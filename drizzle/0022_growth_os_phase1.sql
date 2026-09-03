-- Growth OS Phase 1: fail-closed partner registry controls + publication outbox.
-- Additive only. No dispatcher or external publisher is enabled by this migration.
ALTER TABLE `partner_opportunities` ADD COLUMN `organic_promotion_status` text DEFAULT 'unknown' NOT NULL CHECK(`organic_promotion_status` in ('unknown','allowed','blocked'));
--> statement-breakpoint
ALTER TABLE `partner_opportunities` ADD COLUMN `paid_promotion_status` text DEFAULT 'unknown' NOT NULL CHECK(`paid_promotion_status` in ('unknown','allowed','blocked'));
--> statement-breakpoint
ALTER TABLE `partner_opportunities` ADD COLUMN `affiliate_destination_verified` integer DEFAULT false NOT NULL CHECK(`affiliate_destination_verified` in (0,1));
--> statement-breakpoint
ALTER TABLE `partner_opportunities` ADD COLUMN `terms_source_url` text;
--> statement-breakpoint
ALTER TABLE `partner_opportunities` ADD COLUMN `terms_verified_at` text;
--> statement-breakpoint
ALTER TABLE `partner_opportunities` ADD COLUMN `trademark_restrictions` text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE `partner_opportunities` ADD COLUMN `geographic_restrictions` text DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE `partner_opportunities` ADD COLUMN `publishing_enabled` integer DEFAULT false NOT NULL CHECK(`publishing_enabled` in (0,1));
--> statement-breakpoint
ALTER TABLE `partner_opportunities` ADD COLUMN `publishing_disabled_reason` text;
--> statement-breakpoint
CREATE TABLE `growth_os_controls` (
  `scope` text PRIMARY KEY NOT NULL,
  `enabled` integer DEFAULT false NOT NULL CHECK(`enabled` in (0,1)),
  `reason` text DEFAULT '' NOT NULL,
  `actor_email` text,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT `growth_os_controls_scope_check` CHECK(`scope` in ('global_outbound','organic_publishing','paid_publishing','dispatcher','channel:facebook','channel:instagram','channel:pinterest','channel:tiktok'))
);
--> statement-breakpoint
INSERT INTO `growth_os_controls` (`scope`,`enabled`,`reason`) VALUES
 ('global_outbound',0,'Phase 1 fail-closed default'),
 ('organic_publishing',0,'Phase 1 pilot not approved'),
 ('paid_publishing',0,'Paid publishing prohibited in Phase 1'),
 ('dispatcher',0,'Dispatcher not connected'),
 ('channel:facebook',0,'Channel disabled until pilot'),
 ('channel:instagram',0,'Channel disabled until pilot'),
 ('channel:pinterest',0,'Channel disabled until pilot'),
 ('channel:tiktok',0,'Channel disabled until pilot');
--> statement-breakpoint
CREATE TABLE `publication_outbox` (
  `id` text PRIMARY KEY NOT NULL,
  `idempotency_key` text NOT NULL,
  `package_id` text NOT NULL,
  `variant_id` text NOT NULL,
  `destination_url_id` text NOT NULL,
  `partner_id` text,
  `channel` text NOT NULL,
  `target_account` text NOT NULL,
  `state` text DEFAULT 'awaiting_approval' NOT NULL,
  `publication_kind` text DEFAULT 'organic' NOT NULL,
  `copy_snapshot` text NOT NULL,
  `copy_hash` text NOT NULL,
  `asset_refs` text DEFAULT '[]' NOT NULL,
  `tracked_href` text NOT NULL,
  `approval_id` text,
  `approved_by` text,
  `approved_at` text,
  `scheduled_at` text,
  `attempt_count` integer DEFAULT 0 NOT NULL CHECK(`attempt_count` >= 0),
  `max_attempts` integer DEFAULT 2 NOT NULL CHECK(`max_attempts` between 1 and 3),
  `remote_publication_id` text,
  `remote_publication_url` text,
  `verification_state` text DEFAULT 'not_started' NOT NULL,
  `last_error` text,
  `created_by` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`variant_id`) REFERENCES `social_channel_variants`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`destination_url_id`) REFERENCES `social_destination_urls`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`partner_id`) REFERENCES `partner_opportunities`(`id`) ON UPDATE no action ON DELETE restrict,
  FOREIGN KEY (`approval_id`) REFERENCES `social_approvals`(`id`) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT `publication_outbox_state_check` CHECK(`state` in ('draft','awaiting_approval','approved_waiting','sending','published_unverified','verified','failed','cancelled')),
  CONSTRAINT `publication_outbox_kind_check` CHECK(`publication_kind` in ('organic','paid')),
  CONSTRAINT `publication_outbox_channel_check` CHECK(`channel` in ('facebook','instagram','pinterest','tiktok')),
  CONSTRAINT `publication_outbox_verification_check` CHECK(`verification_state` in ('not_started','pending','verified','failed','ambiguous'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `publication_outbox_idempotency_idx` ON `publication_outbox` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `publication_outbox_state_schedule_idx` ON `publication_outbox` (`state`,`scheduled_at`);
--> statement-breakpoint
CREATE INDEX `publication_outbox_package_idx` ON `publication_outbox` (`package_id`);
--> statement-breakpoint
CREATE INDEX `publication_outbox_partner_idx` ON `publication_outbox` (`partner_id`);
--> statement-breakpoint
CREATE TABLE `publication_outbox_events` (
  `id` text PRIMARY KEY NOT NULL,
  `outbox_id` text NOT NULL,
  `from_state` text,
  `to_state` text NOT NULL,
  `actor_email` text,
  `detail` text DEFAULT '{}' NOT NULL,
  `occurred_at` text NOT NULL,
  FOREIGN KEY (`outbox_id`) REFERENCES `publication_outbox`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `publication_outbox_events_outbox_idx` ON `publication_outbox_events` (`outbox_id`,`occurred_at`);
