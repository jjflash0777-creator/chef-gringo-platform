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

export const partnerOpportunities = sqliteTable("partner_opportunities", {
  id: text("id").primaryKey(),
  providerName: text("provider_name").notNull(),
  website: text("website").notNull(),
  commercialLane: text("commercial_lane").notNull().default("unknown"),
  programType: text("program_type").notNull().default("unknown"),
  lifecycle: text("lifecycle").notNull().default("discovered"),
  regionsServed: text("regions_served").notNull().default("Unknown"),
  usAvailability: integer("us_availability", { mode: "boolean" }),
  description: text("description").notNull().default(""),
  whyItMatters: text("why_it_matters").notNull().default(""),
  customerValueThesis: text("customer_value_thesis").notNull().default(""),
  contactOrApplicationRoute: text("contact_or_application_route"),
  proposedRelationship: text("proposed_relationship"),
  majorRestrictionsUnderstood: integer("major_restrictions_understood", { mode: "boolean" }).notNull().default(false),
  credibilityBlockers: text("credibility_blockers").notNull().default("[]"),
  economics: text("economics").notNull().default("{}"),
  evidence: text("evidence").notNull().default("[]"),
  verification: text("verification").notNull().default("{}"),
  rejectedReason: text("rejected_reason"),
  applicationDate: text("application_date"),
  affiliateUrl: text("affiliate_url"),
  affiliateIdentifier: text("affiliate_identifier"),
  notes: text("notes").notNull().default(""),
  synthetic: integer("synthetic", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, (table) => [
  index("partner_opportunities_lifecycle_idx").on(table.lifecycle),
  index("partner_opportunities_lane_idx").on(table.commercialLane),
  index("partner_opportunities_program_idx").on(table.programType),
]);

export const commercialEvents = sqliteTable("commercial_events", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  occurredAt: text("occurred_at").notNull(),
  source: text("source"),
  channel: text("channel"),
  pagePath: text("page_path"),
  contentId: text("content_id"),
  recommendationId: text("recommendation_id"),
  productId: text("product_id"),
  providerId: text("provider_id"),
  campaignId: text("campaign_id"),
  partnerId: text("partner_id").references(() => partnerOpportunities.id),
  anonymousSessionId: text("anonymous_session_id"),
  monetaryAmountCents: integer("monetary_amount_cents"),
  commissionAmountCents: integer("commission_amount_cents"),
  currency: text("currency"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("commercial_events_type_time_idx").on(table.eventType, table.occurredAt),
  index("commercial_events_partner_idx").on(table.partnerId),
  index("commercial_events_content_idx").on(table.contentId),
  index("commercial_events_channel_idx").on(table.channel),
]);

export const decisionBriefRequests = sqliteTable("decision_brief_requests", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  businessName: text("business_name"),
  phone: text("phone"),
  equipmentType: text("equipment_type").notNull(),
  manufacturer: text("manufacturer"),
  modelNumber: text("model_number"),
  equipmentAge: text("equipment_age"),
  problemSummary: text("problem_summary").notNull(),
  evidenceSummary: text("evidence_summary").notNull().default(""),
  currentQuote: text("current_quote"),
  urgency: text("urgency").notNull().default("planning"),
  marketingConsent: integer("marketing_consent", { mode: "boolean" }).notNull().default(false),
  policyVersion: text("policy_version").notNull(),
  source: text("source").notNull().default("repair-or-replace-pilot"),
  status: text("status").notNull().default("awaiting_payment"),
  amountCents: integer("amount_cents").notNull().default(9900),
  currency: text("currency").notNull().default("USD"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: text("paid_at"),
  ...timestamps,
}, (table) => [
  index("decision_brief_status_created_idx").on(table.status, table.createdAt),
  index("decision_brief_email_idx").on(table.email),
  uniqueIndex("decision_brief_stripe_session_idx").on(table.stripeCheckoutSessionId),
  check("decision_brief_status_check", sql`${table.status} in ('awaiting_payment', 'paid', 'in_review', 'waiting_on_customer', 'delivered', 'refunded', 'cancelled')`),
  check("decision_brief_amount_check", sql`${table.amountCents} = 9900`),
  check("decision_brief_currency_check", sql`${table.currency} = 'USD'`),
]);

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

/**
 * Governed knowledge corpus. Separate from workflow `sources`, which remain
 * claim-links for knowledge-core workflows and must not be overloaded with
 * ingestion, chunking, or retrieval state.
 */
export const corpusDocuments = sqliteTable("corpus_documents", {
  id: text("id").primaryKey(),
  canonicalUrl: text("canonical_url"),
  title: text("title").notNull(),
  publisher: text("publisher").notNull(),
  evidenceDomain: text("evidence_domain").notNull(),
  sourceType: text("source_type").notNull(),
  authorityTier: integer("authority_tier").notNull(),
  jurisdiction: text("jurisdiction"),
  publishedDate: text("published_date"),
  revisionDate: text("revision_date"),
  retrievedDate: text("retrieved_date"),
  lastValidatedDate: text("last_validated_date"),
  mimeType: text("mime_type"),
  licensingNotes: text("licensing_notes").notNull().default(""),
  ingestionStatus: text("ingestion_status").notNull().default("submitted"),
  validationStatus: text("validation_status").notNull().default("submitted"),
  productionExposure: integer("production_exposure", { mode: "boolean" }).notNull().default(false),
  supersededBy: text("superseded_by"),
  rejectionReason: text("rejection_reason"),
  parserVersion: text("parser_version"),
  retrievalMethod: text("retrieval_method"),
  exactModel: text("exact_model"),
  currentVersionId: text("current_version_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  fixture: integer("fixture", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, (table) => [
  uniqueIndex("corpus_documents_idempotency_idx").on(table.idempotencyKey),
  index("corpus_documents_status_idx").on(table.ingestionStatus, table.productionExposure),
]);

export const corpusDocumentVersions = sqliteTable("corpus_document_versions", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => corpusDocuments.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  checksum: text("checksum").notNull(),
  extractedText: text("extracted_text"),
  byteLength: integer("byte_length").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("corpus_versions_doc_version_idx").on(table.documentId, table.version),
  uniqueIndex("corpus_versions_doc_checksum_idx").on(table.documentId, table.checksum),
]);

export const corpusChunks = sqliteTable("corpus_chunks", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull().references(() => corpusDocuments.id, { onDelete: "cascade" }),
  versionId: text("version_id").notNull().references(() => corpusDocumentVersions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  heading: text("heading"),
  locator: text("locator"),
  excerpt: text("excerpt").notNull(),
  tokenEstimate: integer("token_estimate").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("corpus_chunks_document_idx").on(table.documentId, table.versionId)]);

export const corpusIngestionJobs = sqliteTable("corpus_ingestion_jobs", {
  id: text("id").primaryKey(),
  documentId: text("document_id").references(() => corpusDocuments.id, { onDelete: "set null" }),
  actorEmail: text("actor_email").notNull(),
  method: text("method").notNull(),
  status: text("status").notNull(),
  mimeType: text("mime_type"),
  byteLength: integer("byte_length").notNull().default(0),
  uploadLabel: text("upload_label"),
  errorCode: text("error_code"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
}, (table) => [index("corpus_ingestion_jobs_created_idx").on(table.createdAt)]);

export const corpusResearchJobs = sqliteTable("corpus_research_jobs", {
  id: text("id").primaryKey(),
  queryHash: text("query_hash").notNull(),
  evidenceDomain: text("evidence_domain"),
  capability: text("capability").notNull(),
  sourceCount: integer("source_count").notNull().default(0),
  cacheHit: integer("cache_hit", { mode: "boolean" }).notNull().default(false),
  durationMs: integer("duration_ms").notNull().default(0),
  errorCode: text("error_code"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("corpus_research_jobs_hash_idx").on(table.queryHash, table.createdAt)]);

export const corpusResearchJobEvidence = sqliteTable("corpus_research_job_evidence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: text("job_id").notNull().references(() => corpusResearchJobs.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull(),
  versionId: text("version_id").notNull(),
  chunkId: text("chunk_id").notNull(),
  score: real("score").notNull(),
});

export const corpusCitations = sqliteTable("corpus_citations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: text("document_id").notNull().references(() => corpusDocuments.id, { onDelete: "cascade" }),
  versionId: text("version_id").notNull(),
  chunkId: text("chunk_id").notNull(),
  claimText: text("claim_text").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("corpus_citations_claim_idx").on(table.documentId, table.versionId, table.chunkId, table.claimText)]);

export const corpusRetrievalCache = sqliteTable("corpus_retrieval_cache", {
  cacheKey: text("cache_key").primaryKey(),
  corpusVersion: text("corpus_version").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at").notNull(),
});

export const corpusAuditEvents = sqliteTable("corpus_audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  actorEmail: text("actor_email").notNull(),
  detail: text("detail").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("corpus_audit_entity_idx").on(table.entityType, table.entityId)]);

/**
 * Social Growth Operator. Performance snapshots remain omitted — Step 2 only
 * records that a human already posted externally.
 */
export const socialContentOpportunities = sqliteTable("social_content_opportunities", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  problem: text("problem").notNull(),
  audience: text("audience").notNull(),
  usefulnessTest: text("usefulness_test").notNull(),
  productId: text("product_id"),
  workflowId: integer("workflow_id").references(() => workflows.id, { onDelete: "set null" }),
  partnerOpportunityId: text("partner_opportunity_id").references(() => partnerOpportunities.id, { onDelete: "set null" }),
  status: text("status").notNull().default("open"),
  ...timestamps,
}, (table) => [
  uniqueIndex("social_opportunities_slug_idx").on(table.slug),
  index("social_opportunities_status_idx").on(table.status),
  check("social_opportunities_status_check", sql`${table.status} in ('open', 'selected', 'discarded')`),
  check("social_opportunities_audience_check", sql`${table.audience} in ('home_cook', 'independent_operator', 'both')`),
]);

export const socialContentPackages = sqliteTable("social_content_packages", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  opportunityId: text("opportunity_id").notNull().references(() => socialContentOpportunities.id, { onDelete: "cascade" }),
  thesis: text("thesis").notNull(),
  usefulnessTest: text("usefulness_test").notNull(),
  commercialPosture: text("commercial_posture").notNull().default("none"),
  status: text("status").notNull().default("drafted"),
  ...timestamps,
}, (table) => [
  uniqueIndex("social_packages_slug_idx").on(table.slug),
  index("social_packages_opportunity_idx").on(table.opportunityId),
  check("social_packages_status_check", sql`${table.status} in ('drafted', 'approved', 'rejected')`),
  check("social_packages_posture_check", sql`${table.commercialPosture} in ('none', 'informational', 'pending', 'affiliate')`),
]);

export const socialPackageClaims = sqliteTable("social_package_claims", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => socialContentPackages.id, { onDelete: "cascade" }),
  claimText: text("claim_text").notNull(),
  evidenceKind: text("evidence_kind").notNull(),
  evidenceId: text("evidence_id").notNull(),
  safetySensitive: integer("safety_sensitive", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, (table) => [
  index("social_claims_package_idx").on(table.packageId),
  uniqueIndex("social_claims_text_idx").on(table.packageId, table.claimText),
  check("social_claims_evidence_kind_check", sql`${table.evidenceKind} in ('knowledge_source', 'workflow_source', 'corpus_document', 'corpus_citation')`),
]);

export const socialContentAssets = sqliteTable("social_content_assets", {
  id: text("id").primaryKey(),
  assetType: text("asset_type").notNull(),
  altText: text("alt_text").notNull(),
  license: text("license").notNull(),
  provenanceNote: text("provenance_note").notNull().default(""),
  uri: text("uri"),
  ...timestamps,
}, (table) => [
  check("social_assets_type_check", sql`${table.assetType} in ('still', 'carousel', 'pin', 'reel_script', 'caption')`),
]);

export const socialChannelVariants = sqliteTable("social_channel_variants", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => socialContentPackages.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  copy: text("copy").notNull().default(""),
  assetIds: text("asset_ids").notNull().default("[]"),
  destinationUrlId: text("destination_url_id"),
  ...timestamps,
}, (table) => [
  uniqueIndex("social_variants_package_channel_idx").on(table.packageId, table.channel),
  index("social_variants_package_idx").on(table.packageId),
  check("social_variants_channel_check", sql`${table.channel} in ('facebook', 'instagram', 'pinterest', 'tiktok')`),
]);

export const socialDestinationUrls = sqliteTable("social_destination_urls", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => socialContentPackages.id, { onDelete: "cascade" }),
  variantId: text("variant_id").notNull().references(() => socialChannelVariants.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  path: text("path").notNull(),
  href: text("href").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("social_destinations_variant_idx").on(table.variantId),
  index("social_destinations_package_idx").on(table.packageId),
  check("social_destinations_channel_check", sql`${table.channel} in ('facebook', 'instagram', 'pinterest', 'tiktok')`),
]);

export const socialApprovals = sqliteTable("social_approvals", {
  id: text("id").primaryKey(),
  subjectKind: text("subject_kind").notNull(),
  subjectId: text("subject_id").notNull(),
  decision: text("decision").notNull(),
  actorEmail: text("actor_email").notNull(),
  reason: text("reason").notNull(),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("social_approvals_subject_idx").on(table.subjectKind, table.subjectId),
  check("social_approvals_subject_check", sql`${table.subjectKind} in ('package', 'variant')`),
  check("social_approvals_decision_check", sql`${table.decision} in ('approved', 'rejected')`),
]);

export const socialPublications = sqliteTable("social_publications", {
  id: text("id").primaryKey(),
  packageId: text("package_id").notNull().references(() => socialContentPackages.id, { onDelete: "cascade" }),
  variantId: text("variant_id").notNull().references(() => socialChannelVariants.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  mode: text("mode").notNull().default("manual"),
  status: text("status").notNull().default("reserved"),
  platformPostId: text("platform_post_id"),
  platformPostUrl: text("platform_post_url"),
  destinationUrlId: text("destination_url_id").notNull().references(() => socialDestinationUrls.id, { onDelete: "restrict" }),
  trackedHref: text("tracked_href").notNull(),
  publishedAt: text("published_at"),
  recordedAt: text("recorded_at").notNull(),
  actorEmail: text("actor_email").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("social_publications_variant_url_idx").on(table.variantId, table.platformPostUrl).where(sql`${table.platformPostUrl} is not null`),
  uniqueIndex("social_publications_variant_post_id_idx").on(table.variantId, table.platformPostId).where(sql`${table.platformPostId} is not null`),
  index("social_publications_package_idx").on(table.packageId),
  index("social_publications_variant_idx").on(table.variantId),
  check("social_publications_mode_check", sql`${table.mode} = 'manual'`),
  check("social_publications_status_check", sql`${table.status} in ('reserved', 'recorded')`),
  check("social_publications_channel_check", sql`${table.channel} in ('facebook', 'instagram', 'pinterest', 'tiktok')`),
]);
