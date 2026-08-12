CREATE TABLE `commercial_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`occurred_at` text NOT NULL,
	`source` text,
	`channel` text,
	`page_path` text,
	`content_id` text,
	`recommendation_id` text,
	`product_id` text,
	`provider_id` text,
	`campaign_id` text,
	`partner_id` text,
	`anonymous_session_id` text,
	`monetary_amount_cents` integer,
	`commission_amount_cents` integer,
	`currency` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`partner_id`) REFERENCES `partner_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commercial_events_type_time_idx` ON `commercial_events` (`event_type`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `commercial_events_partner_idx` ON `commercial_events` (`partner_id`);--> statement-breakpoint
CREATE INDEX `commercial_events_content_idx` ON `commercial_events` (`content_id`);--> statement-breakpoint
CREATE INDEX `commercial_events_channel_idx` ON `commercial_events` (`channel`);--> statement-breakpoint
CREATE TABLE `partner_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_name` text NOT NULL,
	`website` text NOT NULL,
	`commercial_lane` text DEFAULT 'unknown' NOT NULL,
	`program_type` text DEFAULT 'unknown' NOT NULL,
	`lifecycle` text DEFAULT 'discovered' NOT NULL,
	`regions_served` text DEFAULT 'Unknown' NOT NULL,
	`us_availability` integer,
	`description` text DEFAULT '' NOT NULL,
	`why_it_matters` text DEFAULT '' NOT NULL,
	`customer_value_thesis` text DEFAULT '' NOT NULL,
	`contact_or_application_route` text,
	`proposed_relationship` text,
	`major_restrictions_understood` integer DEFAULT false NOT NULL,
	`credibility_blockers` text DEFAULT '[]' NOT NULL,
	`economics` text DEFAULT '{}' NOT NULL,
	`evidence` text DEFAULT '[]' NOT NULL,
	`verification` text DEFAULT '{}' NOT NULL,
	`rejected_reason` text,
	`application_date` text,
	`affiliate_url` text,
	`affiliate_identifier` text,
	`notes` text DEFAULT '' NOT NULL,
	`synthetic` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `partner_opportunities_lifecycle_idx` ON `partner_opportunities` (`lifecycle`);--> statement-breakpoint
CREATE INDEX `partner_opportunities_lane_idx` ON `partner_opportunities` (`commercial_lane`);--> statement-breakpoint
CREATE INDEX `partner_opportunities_program_idx` ON `partner_opportunities` (`program_type`);