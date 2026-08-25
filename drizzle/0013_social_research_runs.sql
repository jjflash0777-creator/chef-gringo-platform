-- Bounded candidate discovery audit. Not evidence. Not a second corpus.
-- Live retrieval stays disabled (live_retrieval CHECK = 0).
CREATE TABLE `social_research_runs` (
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
	CONSTRAINT `social_research_runs_live_check` CHECK(`live_retrieval` = 0)
);
--> statement-breakpoint
CREATE INDEX `social_research_runs_package_idx` ON `social_research_runs` (`package_id`);
--> statement-breakpoint
CREATE TABLE `social_research_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`canonical_url` text NOT NULL,
	`title` text NOT NULL,
	`publisher` text NOT NULL,
	`source_class` text NOT NULL,
	`provenance` text NOT NULL,
	`independence_cluster` text NOT NULL,
	`excerpts_json` text DEFAULT '[]' NOT NULL,
	`relationship` text NOT NULL,
	`scope_limitations` text DEFAULT '' NOT NULL,
	`authority_class` text NOT NULL,
	`authority_adequate` integer DEFAULT 0 NOT NULL,
	`freshness` text DEFAULT 'unknown' NOT NULL,
	`rank_score` integer DEFAULT 0 NOT NULL,
	`reason_selected` text,
	`reason_excluded` text,
	`proposed_for_review` integer DEFAULT 0 NOT NULL,
	`retrieved_checksum` text NOT NULL,
	`published_date` text,
	`query` text NOT NULL,
	`submitted_document_id` text,
	`discovered_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `social_research_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `social_research_candidates_relationship_check` CHECK(`relationship` in ('supports', 'contradicts', 'mixed', 'irrelevant'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_research_candidates_run_url_idx` ON `social_research_candidates` (`run_id`, `canonical_url`);
--> statement-breakpoint
CREATE INDEX `social_research_candidates_run_idx` ON `social_research_candidates` (`run_id`);
