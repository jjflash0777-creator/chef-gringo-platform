-- Growth Evidence Intake Bridge. Additive workflow metadata only.
-- Does not copy corpus documents, excerpts, or verification authority.
-- Does not create a second evidence store. Does not write production D1 by itself.
CREATE TABLE `social_evidence_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`opportunity_id` text,
	`question` text NOT NULL,
	`why_required` text NOT NULL,
	`preferred_source_type` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_by` text NOT NULL,
	`candidate_document_id` text,
	`resolved_kind` text,
	`resolved_id` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `social_content_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`opportunity_id`) REFERENCES `social_content_opportunities`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT `social_evidence_requests_status_check` CHECK(`status` in ('open', 'candidate_submitted', 'under_review', 'resolved', 'rejected')),
	CONSTRAINT `social_evidence_requests_source_type_check` CHECK(`preferred_source_type` is null or `preferred_source_type` in ('government_regulatory', 'electrical_code_standard', 'manufacturer_technical', 'equipment_manual', 'industry_organization', 'primary_documentation', 'editorial'))
);
--> statement-breakpoint
CREATE INDEX `social_evidence_requests_package_idx` ON `social_evidence_requests` (`package_id`);
--> statement-breakpoint
CREATE INDEX `social_evidence_requests_status_idx` ON `social_evidence_requests` (`status`);
