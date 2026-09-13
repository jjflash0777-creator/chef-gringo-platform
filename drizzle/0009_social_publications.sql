-- Social Growth Operator Step 2: manual publication records.
-- Additive. Stores evidence that a human already posted externally.
-- Does not publish, schedule, poll, or write production D1 by itself.
-- Performance snapshots remain deferred.
CREATE TABLE `social_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`channel` text NOT NULL,
	`mode` text DEFAULT 'manual' NOT NULL,
	`platform_post_id` text,
	`platform_post_url` text NOT NULL,
	`destination_url_id` text NOT NULL,
	`published_at` text NOT NULL,
	`recorded_at` text NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `social_channel_variants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`destination_url_id`) REFERENCES `social_destination_urls`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT `social_publications_mode_check` CHECK(`mode` = 'manual'),
	CONSTRAINT `social_publications_channel_check` CHECK(`channel` in ('facebook', 'instagram', 'pinterest', 'tiktok'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_publications_variant_url_idx` ON `social_publications` (`variant_id`, `platform_post_url`);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_publications_variant_post_id_idx` ON `social_publications` (`variant_id`, `platform_post_id`) WHERE `platform_post_id` IS NOT NULL;
--> statement-breakpoint
CREATE INDEX `social_publications_package_idx` ON `social_publications` (`package_id`);
--> statement-breakpoint
CREATE INDEX `social_publications_variant_idx` ON `social_publications` (`variant_id`);
