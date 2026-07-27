CREATE TABLE `affiliate_partners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`network` text NOT NULL,
	`commission_type` text DEFAULT 'percentage' NOT NULL,
	`commission_value` real,
	`cookie_duration_days` integer,
	`approval_status` text DEFAULT 'researching' NOT NULL,
	`contact_name` text,
	`contact_email` text,
	`supported_categories` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`website_url` text,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_slug_idx` ON `brands` (`slug`);--> statement-breakpoint
CREATE TABLE `buying_guide_products` (
	`buying_guide_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`rank` integer,
	`recommendation_label` text NOT NULL,
	`rationale` text NOT NULL,
	PRIMARY KEY(`buying_guide_id`, `product_id`),
	FOREIGN KEY (`buying_guide_id`) REFERENCES `buying_guides`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `buying_guides` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`problem_statement` text NOT NULL,
	`guidance` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buying_guides_slug_idx` ON `buying_guides` (`slug`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`parent_id` integer,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`problem_statement` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_idx` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `comparison_products` (
	`comparison_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`position` integer NOT NULL,
	`verdict` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`comparison_id`, `product_id`),
	FOREIGN KEY (`comparison_id`) REFERENCES `comparisons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comparisons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`decision_context` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `comparisons_slug_idx` ON `comparisons` (`slug`);--> statement-breakpoint
CREATE TABLE `culinary_environments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`requirements` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `environments_slug_idx` ON `culinary_environments` (`slug`);--> statement-breakpoint
CREATE TABLE `customer_personas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`needs` text DEFAULT '' NOT NULL,
	`constraints` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personas_slug_idx` ON `customer_personas` (`slug`);--> statement-breakpoint
CREATE TABLE `editorial_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`action` text NOT NULL,
	`actor_email` text NOT NULL,
	`detail` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `editorial_events_entity_idx` ON `editorial_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `educational_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`author_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `educational_articles_slug_idx` ON `educational_articles` (`slug`);--> statement-breakpoint
CREATE TABLE `merchant_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`vendor_id` integer,
	`affiliate_partner_id` integer,
	`url` text NOT NULL,
	`affiliate_url` text,
	`price_cents` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`last_checked_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`affiliate_partner_id`) REFERENCES `affiliate_partners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `merchant_links_product_idx` ON `merchant_links` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_environments` (
	`product_id` integer NOT NULL,
	`environment_id` integer NOT NULL,
	`fit_score` integer DEFAULT 3 NOT NULL,
	`rationale` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`product_id`, `environment_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`environment_id`) REFERENCES `culinary_environments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_personas` (
	`product_id` integer NOT NULL,
	`persona_id` integer NOT NULL,
	`fit_score` integer DEFAULT 3 NOT NULL,
	`rationale` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`product_id`, `persona_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`persona_id`) REFERENCES `customer_personas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_relationships` (
	`product_id` integer NOT NULL,
	`related_product_id` integer NOT NULL,
	`relationship_type` text NOT NULL,
	`rationale` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`product_id`, `related_product_id`, `relationship_type`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `product_use_cases` (
	`product_id` integer NOT NULL,
	`use_case_id` integer NOT NULL,
	`fit_score` integer DEFAULT 3 NOT NULL,
	`rationale` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`product_id`, `use_case_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`use_case_id`) REFERENCES `use_cases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` integer,
	`category_id` integer,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`model_number` text,
	`summary` text NOT NULL,
	`best_for` text NOT NULL,
	`not_recommended_for` text DEFAULT '' NOT NULL,
	`pros` text DEFAULT '[]' NOT NULL,
	`cons` text DEFAULT '[]' NOT NULL,
	`features` text DEFAULT '[]' NOT NULL,
	`specifications` text DEFAULT '{}' NOT NULL,
	`certifications` text DEFAULT '[]' NOT NULL,
	`documentation_urls` text DEFAULT '[]' NOT NULL,
	`video_urls` text DEFAULT '[]' NOT NULL,
	`image_urls` text DEFAULT '[]' NOT NULL,
	`price_min_cents` integer,
	`price_max_cents` integer,
	`editorial_status` text DEFAULT 'draft' NOT NULL,
	`evidence_level` text DEFAULT 'research' NOT NULL,
	`operational_experience` text DEFAULT '' NOT NULL,
	`internal_notes` text DEFAULT '' NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_idx` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `products_status_idx` ON `products` (`editorial_status`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`title` text NOT NULL,
	`verdict` text NOT NULL,
	`score` real,
	`testing_method` text NOT NULL,
	`disclosure` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`author_email` text NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `use_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`problem_statement` text NOT NULL,
	`outcome` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `use_cases_slug_idx` ON `use_cases` (`slug`);--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`website_url` text,
	`contact_name` text,
	`contact_email` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendors_slug_idx` ON `vendors` (`slug`);