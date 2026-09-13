-- Autonomous Operator v2. Additive provenance from InvestigationPlan items to claims.
-- Does not rewrite investigation plans, proposals, or existing claim rows.
CREATE TABLE `social_investigation_claim_links` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`investigation_plan_id` text NOT NULL,
	`package_fingerprint` text NOT NULL,
	`item_key` text NOT NULL,
	`claim_id` text NOT NULL,
	`source_proposal_ids_json` text DEFAULT '[]' NOT NULL,
	`recommended_source_class` text NOT NULL,
	`independence_requirement` text NOT NULL,
	`expected_evidence_policy` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`investigation_plan_id`) REFERENCES `social_investigation_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claim_id`) REFERENCES `social_package_claims`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_investigation_claim_links_plan_item_idx` ON `social_investigation_claim_links` (`investigation_plan_id`, `item_key`);
--> statement-breakpoint
CREATE INDEX `social_investigation_claim_links_package_idx` ON `social_investigation_claim_links` (`package_id`);
--> statement-breakpoint
CREATE INDEX `social_investigation_claim_links_claim_idx` ON `social_investigation_claim_links` (`claim_id`);
