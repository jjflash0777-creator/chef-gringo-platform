-- Operator research concurrency guard. Additive only.
-- Durable mutual exclusion for bounded research execution: one live lease per
-- package + research subject + strategy fingerprint. Historical research runs,
-- candidates, corpus truth, and retry eligibility are unchanged.
CREATE TABLE `social_research_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`subject_kind` text NOT NULL,
	`subject_id` text NOT NULL,
	`strategy_fingerprint` text NOT NULL,
	`lease_token` text NOT NULL,
	`actor_email` text NOT NULL,
	`acquired_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `social_research_reservations_subject_kind_check` CHECK(`subject_kind` in ('claim', 'evidence_request', 'package'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_research_reservations_subject_idx` ON `social_research_reservations` (`package_id`,`subject_kind`,`subject_id`,`strategy_fingerprint`);
--> statement-breakpoint
CREATE INDEX `social_research_reservations_package_idx` ON `social_research_reservations` (`package_id`);
