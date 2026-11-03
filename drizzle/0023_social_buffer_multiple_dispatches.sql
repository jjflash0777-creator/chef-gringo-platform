-- Rebuild the historical Buffer dispatch ledger so a single approved variant can
-- have multiple distinct Buffer dispatches over time. Preserve every existing row.
-- buffer_post_id remains globally unique; variant_id becomes a normal indexed field.

CREATE TABLE `social_buffer_publications_next` (
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
INSERT INTO `social_buffer_publications_next` (
  id, package_id, variant_id, channel, buffer_channel_id, buffer_post_id,
  due_at, status, queued_at, actor_email, created_at, updated_at
)
SELECT
  id, package_id, variant_id, channel, buffer_channel_id, buffer_post_id,
  due_at, status, queued_at, actor_email, created_at, updated_at
FROM `social_buffer_publications`;
--> statement-breakpoint
DROP TABLE `social_buffer_publications`;
--> statement-breakpoint
ALTER TABLE `social_buffer_publications_next` RENAME TO `social_buffer_publications`;
--> statement-breakpoint
CREATE UNIQUE INDEX `social_buffer_publications_buffer_post_idx`
  ON `social_buffer_publications` (`buffer_post_id`);
--> statement-breakpoint
CREATE INDEX `social_buffer_publications_variant_idx`
  ON `social_buffer_publications` (`variant_id`);
