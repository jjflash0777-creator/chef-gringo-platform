import { sql } from "drizzle-orm";
import {
  check,
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

export const workflows = sqliteTable("workflows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  problemStatement: text("problem_statement").notNull().default(""),
  jobStatement: text("job_statement").notNull().default(""),
  intendedOutcome: text("intended_outcome").notNull().default(""),
  nextAction: text("next_action").notNull().default(""),
  affiliateDisclosure: text("affiliate_disclosure").notNull().default("No affiliate-linked products are referenced."),
  status: text("status").notNull().default("draft"),
  confidenceLevel: text("confidence_level").notNull().default("insufficient"),
  primaryPersonaId: integer("primary_persona_id").references(() => customerPersonas.id),
  primaryEnvironmentId: integer("primary_environment_id").references(() => culinaryEnvironments.id),
  primaryUseCaseId: integer("primary_use_case_id").references(() => useCases.id),
  reviewerUserId: text("reviewer_user_id"),
  createdByUserId: text("created_by_user_id").notNull(),
  lastVerifiedAt: text("last_verified_at"),
  reviewDueAt: text("review_due_at"),
  publishedAt: text("published_at"),
  revisionNumber: integer("revision_number").notNull().default(1),
  ...timestamps,
}, (table) => [
  uniqueIndex("workflows_slug_idx").on(table.slug),
  index("workflows_status_idx").on(table.status),
  index("workflows_context_idx").on(table.primaryPersonaId, table.primaryEnvironmentId, table.primaryUseCaseId),
  check("workflows_status_check", sql`${table.status} in ('draft', 'in_review', 'published')`),
  check("workflows_confidence_check", sql`${table.confidenceLevel} in ('insufficient', 'low', 'moderate', 'high')`),
  check("workflows_revision_check", sql`${table.revisionNumber} > 0`),
]);

export const workflowSteps = sqliteTable("workflow_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workflowId: integer("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  instruction: text("instruction").notNull().default(""),
  purpose: text("purpose").notNull().default(""),
  expectedResult: text("expected_result").notNull().default(""),
  measurableCheck: text("measurable_check").notNull().default(""),
  commonMistake: text("common_mistake").notNull().default(""),
  correctiveAction: text("corrective_action").notNull().default(""),
  riskLevel: text("risk_level").notNull().default("low"),
  ...timestamps,
}, (table) => [
  uniqueIndex("workflow_steps_position_idx").on(table.workflowId, table.position),
  index("workflow_steps_workflow_idx").on(table.workflowId),
  check("workflow_steps_position_check", sql`${table.position} > 0`),
  check("workflow_steps_risk_check", sql`${table.riskLevel} in ('low', 'medium', 'high')`),
]);

export const sources = sqliteTable("sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  publisher: text("publisher").notNull().default(""),
  sourceType: text("source_type").notNull(),
  url: text("url"),
  publicationDate: text("publication_date"),
  accessedAt: text("accessed_at"),
  verificationStatus: text("verification_status").notNull().default("draft"),
  notes: text("notes").notNull().default(""),
  ...timestamps,
}, (table) => [
  index("sources_status_idx").on(table.verificationStatus),
  check("sources_type_check", sql`${table.sourceType} in ('professional_standard', 'manufacturer_documentation', 'regulatory_guidance', 'professional_organization_guidance', 'direct_professional_experience', 'editorial_judgment')`),
  check("sources_verification_check", sql`${table.verificationStatus} in ('draft', 'verified', 'superseded', 'withdrawn')`),
]);

export const workflowSources = sqliteTable("workflow_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workflowId: integer("workflow_id").notNull().references(() => workflows.id, { onDelete: "cascade" }),
  workflowStepId: integer("workflow_step_id").references(() => workflowSteps.id, { onDelete: "cascade" }),
  sourceId: integer("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  claimText: text("claim_text").notNull(),
  evidenceSummary: text("evidence_summary").notNull().default(""),
  confidenceLevel: text("confidence_level").notNull().default("insufficient"),
  limitations: text("limitations").notNull().default(""),
  verifiedByUserId: text("verified_by_user_id"),
  verifiedAt: text("verified_at"),
  ...timestamps,
}, (table) => [
  uniqueIndex("workflow_sources_claim_idx").on(table.workflowId, table.workflowStepId, table.sourceId, table.claimText),
  index("workflow_sources_workflow_idx").on(table.workflowId),
  index("workflow_sources_step_idx").on(table.workflowStepId),
  index("workflow_sources_source_idx").on(table.sourceId),
  check("workflow_sources_confidence_check", sql`${table.confidenceLevel} in ('insufficient', 'low', 'moderate', 'high')`),
]);
