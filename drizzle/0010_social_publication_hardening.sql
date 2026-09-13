-- Social Growth Operator Step 2.1: reserved publications + tracked href.
-- Additive rebuild of social_publications. Does not drop 0009's uniqueness
-- intent: both platform URL and non-empty platform post ID remain unique
-- per variant via partial indexes. Drizzle can express .where() partial
-- unique indexes; this SQL is still handwritten so db:generate cannot
-- silently remove the 0009 safeguard. Do not regenerate 0009.
-- Performance snapshots remain deferred. Does not write production D1.
CREATE TABLE `social_publications_step21` (
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
	CONSTRAINT `social_publications_mode_check` CHECK(`mode` = 'manual'),
	CONSTRAINT `social_publications_status_check` CHECK(`status` in ('reserved', 'recorded')),
	CONSTRAINT `social_publications_channel_check` CHECK(`channel` in ('facebook', 'instagram', 'pinterest', 'tiktok'))
);
--> statement-breakpoint
INSERT INTO `social_publications_step21` (
	`id`, `package_id`, `variant_id`, `channel`, `mode`, `status`, `platform_post_id`, `platform_post_url`,
	`destination_url_id`, `tracked_href`, `published_at`, `recorded_at`, `actor_email`, `created_at`, `updated_at`
)
SELECT
	`id`, `package_id`, `variant_id`, `channel`, `mode`, 'recorded', `platform_post_id`, `platform_post_url`,
	`destination_url_id`, '', `published_at`, `recorded_at`, `actor_email`, `created_at`, `updated_at`
FROM `social_publications`;
--> statement-breakpoint
DROP TABLE `social_publications`;
--> statement-breakpoint
ALTER TABLE `social_publications_step21` RENAME TO `social_publications`;
--> statement-breakpoint
CREATE UNIQUE INDEX `social_publications_variant_url_idx` ON `social_publications` (`variant_id`, `platform_post_url`) WHERE `platform_post_url` IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `social_publications_variant_post_id_idx` ON `social_publications` (`variant_id`, `platform_post_id`) WHERE `platform_post_id` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `social_publications_package_idx` ON `social_publications` (`package_id`);
--> statement-breakpoint
CREATE INDEX `social_publications_variant_idx` ON `social_publications` (`variant_id`);
