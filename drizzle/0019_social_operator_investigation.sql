-- Autonomous Operator v1 + Investigation Refinement.
-- Additive only. Existing claim proposals and packages are not rewritten.
CREATE TABLE `social_investigation_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`package_fingerprint` text NOT NULL,
	`version` text NOT NULL,
	`state` text DEFAULT 'awaiting_review' NOT NULL,
	`generated_at` text NOT NULL,
	`items_json` text NOT NULL,
	`raw_proposal_ids_json` text DEFAULT '[]' NOT NULL,
	`dependencies_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `social_investigation_plans_state_check` CHECK(`state` in ('drafted', 'awaiting_review', 'acknowledged'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_investigation_plans_package_fp_idx` ON `social_investigation_plans` (`package_id`, `package_fingerprint`);
--> statement-breakpoint
CREATE INDEX `social_investigation_plans_package_idx` ON `social_investigation_plans` (`package_id`);
--> statement-breakpoint
CREATE TABLE `social_human_review_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`investigation_plan_id` text,
	`task_kind` text NOT NULL,
	`state` text DEFAULT 'open' NOT NULL,
	`decision_required` text NOT NULL,
	`why_automation_stopped` text NOT NULL,
	`context_json` text DEFAULT '{}' NOT NULL,
	`approve_consequence` text NOT NULL,
	`reject_consequence` text NOT NULL,
	`actor_email` text,
	`decided_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`investigation_plan_id`) REFERENCES `social_investigation_plans`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `social_human_review_tasks_kind_check` CHECK(`task_kind` in ('investigation_plan', 'corpus_candidates', 'publisher_identity', 'contradiction', 'package_approval', 'publication_approval')),
	CONSTRAINT `social_human_review_tasks_state_check` CHECK(`state` in ('open', 'acknowledged', 'rejected'))
);
--> statement-breakpoint
CREATE INDEX `social_human_review_tasks_package_idx` ON `social_human_review_tasks` (`package_id`);
--> statement-breakpoint
CREATE INDEX `social_human_review_tasks_state_idx` ON `social_human_review_tasks` (`state`);
--> statement-breakpoint
CREATE TABLE `social_operator_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`action` text NOT NULL,
	`from_state` text NOT NULL,
	`to_state` text NOT NULL,
	`stopped_reason` text NOT NULL,
	`automatic` integer DEFAULT false NOT NULL,
	`human_authority_required` integer DEFAULT false NOT NULL,
	`step_count` integer DEFAULT 0 NOT NULL,
	`trace_json` text DEFAULT '[]' NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `social_operator_runs_package_idx` ON `social_operator_runs` (`package_id`);
