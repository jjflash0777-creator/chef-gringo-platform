-- Social Growth Operator Step 0: durable domain records.
-- Additive. Does not publish, schedule, or write production D1 by itself.
-- Publications and performance snapshots are deferred until a later step
-- can populate them.
CREATE TABLE `social_content_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`problem` text NOT NULL,
	`audience` text NOT NULL,
	`usefulness_test` text NOT NULL,
	`product_id` text,
	`workflow_id` integer,
	`partner_opportunity_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`partner_opportunity_id`) REFERENCES `partner_opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `social_opportunities_status_check` CHECK(`status` in ('open', 'selected', 'discarded')),
	CONSTRAINT `social_opportunities_audience_check` CHECK(`audience` in ('home_cook', 'independent_operator', 'both'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_opportunities_slug_idx` ON `social_content_opportunities` (`slug`);
--> statement-breakpoint
CREATE INDEX `social_opportunities_status_idx` ON `social_content_opportunities` (`status`);
--> statement-breakpoint
CREATE TABLE `social_content_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`thesis` text NOT NULL,
	`usefulness_test` text NOT NULL,
	`commercial_posture` text DEFAULT 'none' NOT NULL,
	`status` text DEFAULT 'drafted' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `social_content_opportunities`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `social_packages_status_check` CHECK(`status` in ('drafted', 'approved', 'rejected')),
	CONSTRAINT `social_packages_posture_check` CHECK(`commercial_posture` in ('none', 'informational', 'pending', 'affiliate'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_packages_slug_idx` ON `social_content_packages` (`slug`);
--> statement-breakpoint
CREATE INDEX `social_packages_opportunity_idx` ON `social_content_packages` (`opportunity_id`);
--> statement-breakpoint
CREATE TABLE `social_package_claims` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`claim_text` text NOT NULL,
	`evidence_kind` text NOT NULL,
	`evidence_id` text NOT NULL,
	`safety_sensitive` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `social_claims_evidence_kind_check` CHECK(`evidence_kind` in ('knowledge_source', 'workflow_source', 'corpus_document', 'corpus_citation'))
);
--> statement-breakpoint
CREATE INDEX `social_claims_package_idx` ON `social_package_claims` (`package_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_claims_text_idx` ON `social_package_claims` (`package_id`, `claim_text`);
--> statement-breakpoint
CREATE TABLE `social_content_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_type` text NOT NULL,
	`alt_text` text NOT NULL,
	`license` text NOT NULL,
	`provenance_note` text DEFAULT '' NOT NULL,
	`uri` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `social_assets_type_check` CHECK(`asset_type` in ('still', 'carousel', 'pin', 'reel_script', 'caption'))
);
--> statement-breakpoint
CREATE TABLE `social_channel_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`channel` text NOT NULL,
	`copy` text DEFAULT '' NOT NULL,
	`asset_ids` text DEFAULT '[]' NOT NULL,
	`destination_url_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `social_variants_channel_check` CHECK(`channel` in ('facebook', 'instagram', 'pinterest', 'tiktok'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_variants_package_channel_idx` ON `social_channel_variants` (`package_id`, `channel`);
--> statement-breakpoint
CREATE INDEX `social_variants_package_idx` ON `social_channel_variants` (`package_id`);
--> statement-breakpoint
CREATE TABLE `social_destination_urls` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`channel` text NOT NULL,
	`path` text NOT NULL,
	`href` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `social_channel_variants`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `social_destinations_channel_check` CHECK(`channel` in ('facebook', 'instagram', 'pinterest', 'tiktok'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_destinations_variant_idx` ON `social_destination_urls` (`variant_id`);
--> statement-breakpoint
CREATE INDEX `social_destinations_package_idx` ON `social_destination_urls` (`package_id`);
--> statement-breakpoint
CREATE TABLE `social_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_kind` text NOT NULL,
	`subject_id` text NOT NULL,
	`decision` text NOT NULL,
	`actor_email` text NOT NULL,
	`reason` text NOT NULL,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT `social_approvals_subject_check` CHECK(`subject_kind` in ('package', 'variant')),
	CONSTRAINT `social_approvals_decision_check` CHECK(`decision` in ('approved', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `social_approvals_subject_idx` ON `social_approvals` (`subject_kind`, `subject_id`);
