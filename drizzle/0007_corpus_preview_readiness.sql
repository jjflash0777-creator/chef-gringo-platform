-- Stage 11: durable preview-readiness columns and import-run log.
-- Additive. Does not rewrite Stage 9/10 corpus tables.
ALTER TABLE `corpus_documents` ADD COLUMN `provenance_method` text;
--> statement-breakpoint
ALTER TABLE `corpus_documents` ADD COLUMN `reviewer_email` text;
--> statement-breakpoint
ALTER TABLE `corpus_documents` ADD COLUMN `reviewed_at` text;
--> statement-breakpoint
ALTER TABLE `corpus_documents` ADD COLUMN `verification_notes` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `corpus_documents` ADD COLUMN `claim_scope` text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE `corpus_documents` ADD COLUMN `refresh_due_at` text;
--> statement-breakpoint
CREATE TABLE `corpus_import_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`target` text NOT NULL,
	`manifest_version` text NOT NULL,
	`fingerprint_before` text NOT NULL,
	`fingerprint_after` text NOT NULL,
	`dry_run` integer DEFAULT false NOT NULL,
	`counts_json` text NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `corpus_import_runs_created_idx` ON `corpus_import_runs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `corpus_documents_provenance_idx` ON `corpus_documents` (`provenance_method`,`production_exposure`);
