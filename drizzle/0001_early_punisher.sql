CREATE TABLE `sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`publisher` text DEFAULT '' NOT NULL,
	`source_type` text NOT NULL,
	`url` text,
	`publication_date` text,
	`accessed_at` text,
	`verification_status` text DEFAULT 'draft' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "sources_type_check" CHECK("sources"."source_type" in ('professional_standard', 'manufacturer_documentation', 'regulatory_guidance', 'professional_organization_guidance', 'direct_professional_experience', 'editorial_judgment')),
	CONSTRAINT "sources_verification_check" CHECK("sources"."verification_status" in ('draft', 'verified', 'superseded', 'withdrawn'))
);
--> statement-breakpoint
CREATE INDEX `sources_status_idx` ON `sources` (`verification_status`);--> statement-breakpoint
CREATE TABLE `workflow_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`workflow_step_id` integer,
	`source_id` integer NOT NULL,
	`claim_text` text NOT NULL,
	`evidence_summary` text DEFAULT '' NOT NULL,
	`confidence_level` text DEFAULT 'insufficient' NOT NULL,
	`limitations` text DEFAULT '' NOT NULL,
	`verified_by_user_id` text,
	`verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workflow_step_id`) REFERENCES `workflow_steps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workflow_sources_confidence_check" CHECK("workflow_sources"."confidence_level" in ('insufficient', 'low', 'moderate', 'high'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_sources_claim_idx` ON `workflow_sources` (`workflow_id`,`workflow_step_id`,`source_id`,`claim_text`);--> statement-breakpoint
CREATE INDEX `workflow_sources_workflow_idx` ON `workflow_sources` (`workflow_id`);--> statement-breakpoint
CREATE INDEX `workflow_sources_step_idx` ON `workflow_sources` (`workflow_step_id`);--> statement-breakpoint
CREATE INDEX `workflow_sources_source_idx` ON `workflow_sources` (`source_id`);--> statement-breakpoint
CREATE TABLE `workflow_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` integer NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`instruction` text DEFAULT '' NOT NULL,
	`purpose` text DEFAULT '' NOT NULL,
	`expected_result` text DEFAULT '' NOT NULL,
	`measurable_check` text DEFAULT '' NOT NULL,
	`common_mistake` text DEFAULT '' NOT NULL,
	`corrective_action` text DEFAULT '' NOT NULL,
	`risk_level` text DEFAULT 'low' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workflow_steps_position_check" CHECK("workflow_steps"."position" > 0),
	CONSTRAINT "workflow_steps_risk_check" CHECK("workflow_steps"."risk_level" in ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_steps_position_idx` ON `workflow_steps` (`workflow_id`,`position`);--> statement-breakpoint
CREATE INDEX `workflow_steps_workflow_idx` ON `workflow_steps` (`workflow_id`);--> statement-breakpoint
CREATE TABLE `workflows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`problem_statement` text DEFAULT '' NOT NULL,
	`job_statement` text DEFAULT '' NOT NULL,
	`intended_outcome` text DEFAULT '' NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`affiliate_disclosure` text DEFAULT 'No affiliate-linked products are referenced.' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`confidence_level` text DEFAULT 'insufficient' NOT NULL,
	`primary_persona_id` integer,
	`primary_environment_id` integer,
	`primary_use_case_id` integer,
	`reviewer_user_id` text,
	`created_by_user_id` text NOT NULL,
	`last_verified_at` text,
	`review_due_at` text,
	`published_at` text,
	`revision_number` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`primary_persona_id`) REFERENCES `customer_personas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`primary_environment_id`) REFERENCES `culinary_environments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`primary_use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "workflows_status_check" CHECK("workflows"."status" in ('draft', 'in_review', 'published')),
	CONSTRAINT "workflows_confidence_check" CHECK("workflows"."confidence_level" in ('insufficient', 'low', 'moderate', 'high')),
	CONSTRAINT "workflows_revision_check" CHECK("workflows"."revision_number" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflows_slug_idx` ON `workflows` (`slug`);--> statement-breakpoint
CREATE INDEX `workflows_status_idx` ON `workflows` (`status`);--> statement-breakpoint
CREATE INDEX `workflows_context_idx` ON `workflows` (`primary_persona_id`,`primary_environment_id`,`primary_use_case_id`);