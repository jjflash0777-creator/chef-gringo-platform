-- Social publishing reconciliation: permit API reservations and normalize the
-- production Buffer dispatch ledger without reusing the historical 0020 identity.
-- Production already contains social_buffer_publications from the Sites-only
-- publishing lineage. CREATE TABLE IF NOT EXISTS is intentionally a no-op there.

CREATE TABLE `social_publications_step22` (
  `id` text PRIMARY KEY NOT NULL,
  `package_id` text NOT NULL,
  `variant_id` text NOT NULL,
  `channel` text NOT NULL,
  `mode` text DEFAULT 'manual' NOT NULL,
  `status` text DEFAULT 'reserved' NOT NULL,
  `platform_post_id` text,
  `platform_post_url` text,
  `destination_url_id` text NOT NULL,
  `tracked_href` text NOT NULL,
  `published_at` text,
  `recorded_at` text NOT NULL,
  `actor_email` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`variant_id`) REFERENCES `social_channel_variants`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`destination_url_id`) REFERENCES `social_destination_urls`(`id`) ON UPDATE no action ON DELETE restrict,
  CONSTRAINT `social_publications_mode_check` CHECK(`mode` in ('manual', 'api')),
  CONSTRAINT `social_publications_status_check` CHECK(`status` in ('reserved', 'recorded')),
  CONSTRAINT `social_publications_channel_check` CHECK(`channel` in ('facebook', 'instagram', 'pinterest', 'tiktok'))
);
--> statement-breakpoint
INSERT INTO `social_publications_step22` (
  `id`, `package_id`, `variant_id`, `channel`, `mode`, `status`,
  `platform_post_id`, `platform_post_url`, `destination_url_id`, `tracked_href`,
  `published_at`, `recorded_at`, `actor_email`, `created_at`, `updated_at`
)
SELECT
  `id`, `package_id`, `variant_id`, `channel`, `mode`, `status`,
  `platform_post_id`, `platform_post_url`, `destination_url_id`, `tracked_href`,
  `published_at`, `recorded_at`, `actor_email`, `created_at`, `updated_at`
FROM `social_publications`;
--> statement-breakpoint
DROP TABLE `social_publications`;
--> statement-breakpoint
ALTER TABLE `social_publications_step22` RENAME TO `social_publications`;
--> statement-breakpoint
CREATE UNIQUE INDEX `social_publications_variant_url_idx` ON `social_publications` (`variant_id`, `platform_post_url`) WHERE `platform_post_url` IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `social_publications_variant_post_id_idx` ON `social_publications` (`variant_id`, `platform_post_id`) WHERE `platform_post_id` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `social_publications_package_idx` ON `social_publications` (`package_id`);
--> statement-breakpoint
CREATE INDEX `social_publications_variant_idx` ON `social_publications` (`variant_id`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `social_buffer_publications` (
  `id` text PRIMARY KEY NOT NULL,
  `package_id` text NOT NULL,
  `variant_id` text NOT NULL,
  `channel` text NOT NULL,
  `buffer_channel_id` text NOT NULL,
  `buffer_post_id` text NOT NULL,
  `due_at` text,
  `status` text NOT NULL,
  `queued_at` text NOT NULL,
  `actor_email` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`variant_id`) REFERENCES `social_channel_variants`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `social_buffer_publications_channel_check` CHECK(`channel` in ('facebook', 'instagram', 'pinterest', 'tiktok'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `social_buffer_publications_buffer_post_idx` ON `social_buffer_publications` (`buffer_post_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `social_buffer_publications_variant_idx` ON `social_buffer_publications` (`variant_id`);
