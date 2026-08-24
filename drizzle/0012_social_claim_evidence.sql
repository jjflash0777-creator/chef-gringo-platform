-- Evidence Intelligence v1.1. Additive claim→evidence join only.
-- Does not copy corpus/knowledge source truth. Backfills existing one-ref claims.
CREATE TABLE `social_claim_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	`evidence_kind` text NOT NULL,
	`evidence_id` text NOT NULL,
	`attached_by` text NOT NULL,
	`attached_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`claim_id`) REFERENCES `social_package_claims`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `social_claim_evidence_kind_check` CHECK(`evidence_kind` in ('knowledge_source', 'workflow_source', 'corpus_document', 'corpus_citation'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `social_claim_evidence_unique_idx` ON `social_claim_evidence` (`claim_id`, `evidence_kind`, `evidence_id`);
--> statement-breakpoint
CREATE INDEX `social_claim_evidence_claim_idx` ON `social_claim_evidence` (`claim_id`);
--> statement-breakpoint
INSERT INTO `social_claim_evidence` (`id`, `claim_id`, `evidence_kind`, `evidence_id`, `attached_by`, `attached_at`)
SELECT
	'sgo:claim-evidence:' || replace(`id`, 'sgo:claim:', '') || '-primary',
	`id`,
	`evidence_kind`,
	`evidence_id`,
	'migrated-claim-primary',
	`created_at`
FROM `social_package_claims`;
