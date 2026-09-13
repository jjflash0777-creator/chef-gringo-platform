-- Allow candidate relationship `relevant`: topical but not claim-supporting.
-- SQLite cannot ALTER a CHECK constraint in place.
PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE `social_research_candidates_new` (
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
	`result_url` text,
	`retrieval_status` text DEFAULT 'ok',
	`excerpt_locator` text,
	`extraction_json` text,
	FOREIGN KEY (`run_id`) REFERENCES `social_research_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `social_research_candidates_relationship_check` CHECK(`relationship` in ('supports', 'contradicts', 'mixed', 'relevant', 'irrelevant'))
);
--> statement-breakpoint
INSERT INTO `social_research_candidates_new` SELECT * FROM `social_research_candidates`;
--> statement-breakpoint
DROP TABLE `social_research_candidates`;
--> statement-breakpoint
ALTER TABLE `social_research_candidates_new` RENAME TO `social_research_candidates`;
--> statement-breakpoint
CREATE UNIQUE INDEX `social_research_candidates_run_url_idx` ON `social_research_candidates` (`run_id`, `canonical_url`);
--> statement-breakpoint
CREATE INDEX `social_research_candidates_run_idx` ON `social_research_candidates` (`run_id`);
--> statement-breakpoint
PRAGMA foreign_keys = ON;
