-- Live bounded research: allow live_retrieval when provider_kind is live.
-- Additive candidate audit columns. Does not copy web bodies.
PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE `social_research_runs_new` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`claim_id` text,
	`evidence_request_id` text,
	`actor_email` text NOT NULL,
	`provider_id` text NOT NULL,
	`provider_kind` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`live_retrieval` integer DEFAULT 0 NOT NULL,
	`stop_reason` text NOT NULL,
	`plan_json` text NOT NULL,
	`queries_json` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claim_id`) REFERENCES `social_package_claims`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`evidence_request_id`) REFERENCES `social_evidence_requests`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `social_research_runs_kind_check` CHECK(`provider_kind` in ('fixture', 'live')),
	CONSTRAINT `social_research_runs_status_check` CHECK(`status` in ('completed', 'blocked', 'failed')),
	CONSTRAINT `social_research_runs_live_check` CHECK(`live_retrieval` in (0, 1)),
	CONSTRAINT `social_research_runs_live_kind_check` CHECK(`live_retrieval` = 0 OR `provider_kind` = 'live')
);
--> statement-breakpoint
INSERT INTO `social_research_runs_new` SELECT * FROM `social_research_runs`;
--> statement-breakpoint
DROP TABLE `social_research_runs`;
--> statement-breakpoint
ALTER TABLE `social_research_runs_new` RENAME TO `social_research_runs`;
--> statement-breakpoint
CREATE INDEX `social_research_runs_package_idx` ON `social_research_runs` (`package_id`);
--> statement-breakpoint
ALTER TABLE `social_research_candidates` ADD COLUMN `result_url` text;
--> statement-breakpoint
ALTER TABLE `social_research_candidates` ADD COLUMN `retrieval_status` text DEFAULT 'ok';
--> statement-breakpoint
ALTER TABLE `social_research_candidates` ADD COLUMN `excerpt_locator` text;
--> statement-breakpoint
PRAGMA foreign_keys = ON;
