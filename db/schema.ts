import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const brands = sqliteTable("brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  websiteUrl: text("website_url"),
  notes: text("notes").notNull().default(""),
  ...timestamps,
}, (table) => [uniqueIndex("brands_slug_idx").on(table.slug)]);

export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  websiteUrl: text("website_url"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  ...timestamps,
}, (table) => [uniqueIndex("vendors_slug_idx").on(table.slug)]);

export const affiliatePartners = sqliteTable("affiliate_partners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  network: text("network").notNull(),
  commissionType: text("commission_type").notNull().default("percentage"),
  commissionValue: real("commission_value"),
  cookieDurationDays: integer("cookie_duration_days"),
  approvalStatus: text("approval_status").notNull().default("researching"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  supportedCategories: text("supported_categories").notNull().default("[]"),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id"),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  problemStatement: text("problem_statement").notNull(),
  description: text("description").notNull().default(""),
  ...timestamps,
}, (table) => [uniqueIndex("categories_slug_idx").on(table.slug)]);

export const customerPersonas = sqliteTable("customer_personas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  needs: text("needs").notNull().default(""),
  constraints: text("constraints").notNull().default(""),
  ...timestamps,
}, (table) => [uniqueIndex("personas_slug_idx").on(table.slug)]);

export const culinaryEnvironments = sqliteTable("culinary_environments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  requirements: text("requirements").notNull().default(""),
  ...timestamps,
}, (table) => [uniqueIndex("environments_slug_idx").on(table.slug)]);

export const useCases = sqliteTable("use_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  problemStatement: text("problem_statement").notNull(),
  outcome: text("outcome").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("use_cases_slug_idx").on(table.slug)]);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brandId: integer("brand_id").references(() => brands.id),
  categoryId: integer("category_id").references(() => categories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  modelNumber: text("model_number"),
  summary: text("summary").notNull(),
  bestFor: text("best_for").notNull(),
  notRecommendedFor: text("not_recommended_for").notNull().default(""),
  pros: text("pros").notNull().default("[]"),
  cons: text("cons").notNull().default("[]"),
  features: text("features").notNull().default("[]"),
  specifications: text("specifications").notNull().default("{}"),
  certifications: text("certifications").notNull().default("[]"),
  documentationUrls: text("documentation_urls").notNull().default("[]"),
  videoUrls: text("video_urls").notNull().default("[]"),
  imageUrls: text("image_urls").notNull().default("[]"),
  priceMinCents: integer("price_min_cents"),
  priceMaxCents: integer("price_max_cents"),
  editorialStatus: text("editorial_status").notNull().default("draft"),
  evidenceLevel: text("evidence_level").notNull().default("research"),
  operationalExperience: text("operational_experience").notNull().default(""),
  internalNotes: text("internal_notes").notNull().default(""),
  publishedAt: text("published_at"),
  ...timestamps,
}, (table) => [
  uniqueIndex("products_slug_idx").on(table.slug),
  index("products_category_idx").on(table.categoryId),
  index("products_status_idx").on(table.editorialStatus),
]);

export const productPersonas = sqliteTable("product_personas", {
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  personaId: integer("persona_id").notNull().references(() => customerPersonas.id, { onDelete: "cascade" }),
  fitScore: integer("fit_score").notNull().default(3),
  rationale: text("rationale").notNull().default(""),
}, (table) => [primaryKey({ columns: [table.productId, table.personaId] })]);

export const productEnvironments = sqliteTable("product_environments", {
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  environmentId: integer("environment_id").notNull().references(() => culinaryEnvironments.id, { onDelete: "cascade" }),
  fitScore: integer("fit_score").notNull().default(3),
  rationale: text("rationale").notNull().default(""),
}, (table) => [primaryKey({ columns: [table.productId, table.environmentId] })]);

export const productUseCases = sqliteTable("product_use_cases", {
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  useCaseId: integer("use_case_id").notNull().references(() => useCases.id, { onDelete: "cascade" }),
  fitScore: integer("fit_score").notNull().default(3),
  rationale: text("rationale").notNull().default(""),
}, (table) => [primaryKey({ columns: [table.productId, table.useCaseId] })]);

export const merchantLinks = sqliteTable("merchant_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => vendors.id),
  affiliatePartnerId: integer("affiliate_partner_id").references(() => affiliatePartners.id),
  url: text("url").notNull(),
  affiliateUrl: text("affiliate_url"),
  priceCents: integer("price_cents"),
  currency: text("currency").notNull().default("USD"),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  lastCheckedAt: text("last_checked_at"),
  ...timestamps,
}, (table) => [index("merchant_links_product_idx").on(table.productId)]);

export const productRelationships = sqliteTable("product_relationships", {
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relatedProductId: integer("related_product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(),
  rationale: text("rationale").notNull().default(""),
}, (table) => [primaryKey({ columns: [table.productId, table.relatedProductId, table.relationshipType] })]);

export const reviews = sqliteTable("reviews", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  verdict: text("verdict").notNull(),
  score: real("score"),
  testingMethod: text("testing_method").notNull(),
  disclosure: text("disclosure").notNull().default(""),
  status: text("status").notNull().default("draft"),
  authorEmail: text("author_email").notNull(),
  publishedAt: text("published_at"),
  ...timestamps,
});

export const buyingGuides = sqliteTable("buying_guides", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  problemStatement: text("problem_statement").notNull(),
  guidance: text("guidance").notNull(),
  status: text("status").notNull().default("draft"),
  ...timestamps,
}, (table) => [uniqueIndex("buying_guides_slug_idx").on(table.slug)]);

export const buyingGuideProducts = sqliteTable("buying_guide_products", {
  buyingGuideId: integer("buying_guide_id").notNull().references(() => buyingGuides.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  rank: integer("rank"),
  recommendationLabel: text("recommendation_label").notNull(),
  rationale: text("rationale").notNull(),
}, (table) => [primaryKey({ columns: [table.buyingGuideId, table.productId] })]);

export const comparisons = sqliteTable("comparisons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  decisionContext: text("decision_context").notNull(),
  status: text("status").notNull().default("draft"),
  ...timestamps,
}, (table) => [uniqueIndex("comparisons_slug_idx").on(table.slug)]);

export const comparisonProducts = sqliteTable("comparison_products", {
  comparisonId: integer("comparison_id").notNull().references(() => comparisons.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  verdict: text("verdict").notNull().default(""),
}, (table) => [primaryKey({ columns: [table.comparisonId, table.productId] })]);

export const educationalArticles = sqliteTable("educational_articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("draft"),
  authorEmail: text("author_email").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("educational_articles_slug_idx").on(table.slug)]);

export const editorialEvents = sqliteTable("editorial_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  actorEmail: text("actor_email").notNull(),
  detail: text("detail").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("editorial_events_entity_idx").on(table.entityType, table.entityId)]);
