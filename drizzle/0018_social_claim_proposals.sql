-- Claim Decomposition v1. Proposal metadata only.
-- Not claims, not evidence, not approval or publication authority.
CREATE TABLE `social_claim_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`proposal_key` text NOT NULL,
	`generation_id` text NOT NULL,
	`package_fingerprint` text NOT NULL,
	`proposed_slug` text NOT NULL,
	`proposed_claim_text` text NOT NULL,
	`claim_kind` text NOT NULL,
	`why_it_matters` text NOT NULL,
	`safety_sensitive` integer DEFAULT false NOT NULL,
	`recommended_source_class` text NOT NULL,
	`authority_requirement` text NOT NULL,
	`independence_requirement` text NOT NULL,
	`source_field` text NOT NULL,
	`source_excerpt` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`created_claim_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_claim_id`) REFERENCES `social_package_claims`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `social_claim_proposals_status_check` CHECK(`status` in ('proposed', 'selected', 'discarded')),
	CONSTRAINT `social_claim_proposals_kind_check` CHECK(`claim_kind` in ('factual', 'diagnostic', 'safety_boundary', 'decision_rule', 'unresolved_question'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_claim_proposals_key_idx` ON `social_claim_proposals` (`package_id`, `proposal_key`);
--> statement-breakpoint
CREATE INDEX `social_claim_proposals_package_idx` ON `social_claim_proposals` (`package_id`);
--> statement-breakpoint
CREATE INDEX `social_claim_proposals_status_idx` ON `social_claim_proposals` (`status`);
