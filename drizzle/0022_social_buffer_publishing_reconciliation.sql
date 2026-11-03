-- Additive reconciliation of the production Buffer dispatch ledger.
-- Production Sites historically created this table outside canonical GitHub.
-- Do not reuse historical migration identities and do not rebuild social_publications.

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
