CREATE TABLE `corpus_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_url` text,
	`title` text NOT NULL,
	`publisher` text NOT NULL,
	`evidence_domain` text NOT NULL,
	`source_type` text NOT NULL,
	`authority_tier` integer NOT NULL,
	`jurisdiction` text,
	`published_date` text,
	`revision_date` text,
	`retrieved_date` text,
	`last_validated_date` text,
	`mime_type` text,
	`licensing_notes` text DEFAULT '' NOT NULL,
	`ingestion_status` text DEFAULT 'submitted' NOT NULL,
	`validation_status` text DEFAULT 'submitted' NOT NULL,
	`production_exposure` integer DEFAULT false NOT NULL,
	`superseded_by` text,
	`rejection_reason` text,
	`parser_version` text,
	`retrieval_method` text,
	`exact_model` text,
	`current_version_id` text,
	`idempotency_key` text NOT NULL,
	`fixture` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "corpus_documents_status_check" CHECK(`ingestion_status` in ('submitted','fetching','parsed','awaiting_review','accepted','rejected','stale','superseded','failed')),
	CONSTRAINT "corpus_documents_validation_check" CHECK(`validation_status` in ('submitted','reachable','identified','authoritative','relevant','claim_supporting','contradicted','stale','rejected','manually_overridden')),
	CONSTRAINT "corpus_documents_tier_check" CHECK(`authority_tier` in (1,2,3)),
	CONSTRAINT "corpus_documents_domain_check" CHECK(`evidence_domain` in ('food_safety_public_health','nutrition_therapeutic_diets','equipment','culinary_technique','business_licensing','commercial_claims'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corpus_documents_idempotency_idx` ON `corpus_documents` (`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `corpus_documents_status_idx` ON `corpus_documents` (`ingestion_status`,`production_exposure`);
--> statement-breakpoint
CREATE TABLE `corpus_document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`version` integer NOT NULL,
	`checksum` text NOT NULL,
	`extracted_text` text,
	`byte_length` integer NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `corpus_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corpus_versions_doc_version_idx` ON `corpus_document_versions` (`document_id`,`version`);
--> statement-breakpoint
CREATE UNIQUE INDEX `corpus_versions_doc_checksum_idx` ON `corpus_document_versions` (`document_id`,`checksum`);
--> statement-breakpoint
CREATE TABLE `corpus_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`version_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`heading` text,
	`locator` text,
	`excerpt` text NOT NULL,
	`token_estimate` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `corpus_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`version_id`) REFERENCES `corpus_document_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `corpus_chunks_document_idx` ON `corpus_chunks` (`document_id`,`version_id`);
--> statement-breakpoint
CREATE TABLE `corpus_ingestion_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text,
	`actor_email` text NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`mime_type` text,
	`byte_length` integer DEFAULT 0 NOT NULL,
	`upload_label` text,
	`error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`document_id`) REFERENCES `corpus_documents`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `corpus_ingestion_jobs_created_idx` ON `corpus_ingestion_jobs` (`created_at`);
--> statement-breakpoint
CREATE TABLE `corpus_research_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`query_hash` text NOT NULL,
	`evidence_domain` text,
	`capability` text NOT NULL,
	`source_count` integer DEFAULT 0 NOT NULL,
	`cache_hit` integer DEFAULT false NOT NULL,
	`duration_ms` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `corpus_research_jobs_hash_idx` ON `corpus_research_jobs` (`query_hash`,`created_at`);
--> statement-breakpoint
CREATE TABLE `corpus_research_job_evidence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` text NOT NULL,
	`document_id` text NOT NULL,
	`version_id` text NOT NULL,
	`chunk_id` text NOT NULL,
	`score` real NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `corpus_research_jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `corpus_citations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_id` text NOT NULL,
	`version_id` text NOT NULL,
	`chunk_id` text NOT NULL,
	`claim_text` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `corpus_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corpus_citations_claim_idx` ON `corpus_citations` (`document_id`,`version_id`,`chunk_id`,`claim_text`);
--> statement-breakpoint
CREATE TABLE `corpus_retrieval_cache` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`corpus_version` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `corpus_audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_email` text NOT NULL,
	`detail` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `corpus_audit_entity_idx` ON `corpus_audit_events` (`entity_type`,`entity_id`);
