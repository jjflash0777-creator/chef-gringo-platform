import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { handleChefGringoPost } from "../app/lib/ai/chef-gringo-http.ts";
import { LIVE_RESEARCH_ENABLED } from "../app/lib/research/capability.ts";
import { auditCorpus } from "../app/lib/research/corpus-audit.ts";
import { importAuthoritativeCorpus, requireCorpusTarget, assertTargetAllowsWrite } from "../app/lib/research/corpus-import.ts";
import { CORPUS_SMOKE } from "../app/lib/research/corpus-smoke.ts";
import { ingestCorpusSource, reviewCorpusDocument } from "../app/lib/research/ingest.ts";
import { extractReadableContent } from "../app/lib/research/chunker.ts";
import { runAssistant } from "../app/lib/ai/assistant-service.ts";
import { listCorpusDocuments, publicSearchIndex } from "../db/corpus-repository.ts";
import { SqliteD1Adapter, applyMigrations } from "./helpers/sqlite-d1.mjs";

const requestOf = (question) => ({ question, source: "test" });

async function database(path) {
  const db = new SqliteD1Adapter(path);
  await applyMigrations(db);
  return db;
}

test("explicit import target is required and production writes are refused", () => {
  assert.throws(() => requireCorpusTarget(undefined), /Explicit --target/);
  assert.throws(() => requireCorpusTarget("prod"), /Explicit --target/);
  assert.throws(() => assertTargetAllowsWrite("production", false), /Production corpus writes are refused/);
  assert.doesNotThrow(() => assertTargetAllowsWrite("production", true));
  assert.throws(() => assertTargetAllowsWrite("preview", false), /PREVIEW_D1_CONFIRM/);
});

test("durable local persistence survives adapter restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cg-corpus-"));
  const path = join(dir, "corpus.sqlite");
  const first = await database(path);
  const imported = await importAuthoritativeCorpus(first, undefined, { target: "local", attestExcerpts: true, reviewerEmail: "reviewer@example.com" });
  assert.ok(imported.publicEligible >= 4);
  first.close();
  const second = new SqliteD1Adapter(path);
  const docs = await listCorpusDocuments(second);
  const publicHits = await publicSearchIndex(second);
  assert.ok(docs.length >= 20);
  assert.ok(publicHits.length >= 4);
  assert.ok(publicHits.every((hit) => hit.productionExposure && !hit.fixture));
  second.close();
  await rm(dir, { recursive: true, force: true });
});

test("preview dry run does not mutate and unattested excerpts are demoted", async () => {
  const db = await database();
  const dry = await importAuthoritativeCorpus(db, undefined, { target: "preview", dryRun: true });
  assert.equal(dry.dryRun, true);
  assert.ok(dry.demoted >= 10);
  assert.equal((await listCorpusDocuments(db)).length, 0);
  const live = await importAuthoritativeCorpus(db, undefined, { target: "local" });
  assert.ok(live.demoted >= 10);
  const publicHits = await publicSearchIndex(db);
  assert.ok(publicHits.every((hit) => /Chef Gringo|practice/i.test(hit.publisher) || hit.provenanceMethod === "repository_practice"));
  db.close();
});

test("provenance restrictions: test fixtures and metadata-only cannot be exposed", async () => {
  const db = await database();
  const ingested = await ingestCorpusSource(db, {
    title: "Trap", publisher: "Test", evidenceDomain: "food_safety_public_health", sourceType: "regulatory_document",
    authorityTier: 1, mimeType: "text/plain", text: "# Trap\n160°F", actorEmail: "admin@example.com",
    fixture: true, provenanceMethod: "test_fixture", claimScope: ["ground_beef_temp"],
  });
  const accepted = await reviewCorpusDocument(db, ingested.document.id, "accept", "admin@example.com", { claimScope: ["ground_beef_temp"] });
  assert.equal(accepted.productionExposure, false);
  await assert.rejects(() => reviewCorpusDocument(db, accepted.id, "expose", "admin@example.com"), /Public exposure blocked/);
  db.close();
});

test("reviewer approval and claim-scope are required for public exposure", async () => {
  const db = await database();
  const ingested = await ingestCorpusSource(db, {
    title: "Temps", publisher: "USDA FSIS", evidenceDomain: "food_safety_public_health", sourceType: "regulatory_document",
    authorityTier: 1, mimeType: "text/plain", text: "# Ground beef\n160°F", actorEmail: "admin@example.com",
    canonicalUrl: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
    provenanceMethod: "manually_verified_excerpt",
  });
  const accepted = await reviewCorpusDocument(db, ingested.document.id, "accept", "admin@example.com");
  assert.equal(accepted.productionExposure, false);
  const exposed = await reviewCorpusDocument(db, accepted.id, "expose", "admin@example.com", {
    claimScope: ["ground_beef_temp"],
    verificationNotes: "Reviewed excerpt against the cited FSIS chart identity.",
  });
  assert.equal(exposed.productionExposure, true);
  db.close();
});

test("PDF transcription requires page locators and version replacement stays reviewable", async () => {
  const db = await database();
  await assert.rejects(() => ingestCorpusSource(db, {
    title: "Manual", publisher: "ThermoWorks", evidenceDomain: "equipment", sourceType: "manufacturer_documentation",
    authorityTier: 1, mimeType: "application/pdf", text: "no page markers", actorEmail: "admin@example.com",
    provenanceMethod: "founder_uploaded_document", exactModel: "Thermapen ONE",
    canonicalUrl: "https://www.thermoworks.com/products/thermapen-one",
  }), /page N/);
  const first = await ingestCorpusSource(db, {
    title: "Manual", publisher: "ThermoWorks", evidenceDomain: "equipment", sourceType: "manufacturer_documentation",
    authorityTier: 1, mimeType: "application/pdf", text: "[page 14]\n\nResponse time 1 second.", actorEmail: "admin@example.com",
    provenanceMethod: "founder_uploaded_document", exactModel: "Thermapen ONE", claimScope: ["thermapen_one_spec"],
    canonicalUrl: "https://www.thermoworks.com/products/thermapen-one",
  });
  await reviewCorpusDocument(db, first.document.id, "accept", "admin@example.com", { claimScope: ["thermapen_one_spec"] });
  const second = await ingestCorpusSource(db, {
    title: "Manual", publisher: "ThermoWorks", evidenceDomain: "equipment", sourceType: "manufacturer_documentation",
    authorityTier: 1, mimeType: "application/pdf", text: "[page 14]\n\nResponse time 1 second revised.", actorEmail: "admin@example.com",
    provenanceMethod: "founder_uploaded_document", exactModel: "Thermapen ONE", claimScope: ["thermapen_one_spec"],
    canonicalUrl: "https://www.thermoworks.com/products/thermapen-one",
  });
  assert.equal(second.duplicate, false);
  assert.equal(second.document.ingestionStatus, "awaiting_review");
  db.close();
});

test("route-level retrieval uses durable D1 and citations survive restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cg-route-"));
  const path = join(dir, "corpus.sqlite");
  const db = await database(path);
  await importAuthoritativeCorpus(db, undefined, { target: "local", attestExcerpts: true, reviewerEmail: "reviewer@example.com" });
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db, CHEF_GRINGO_LOCAL_CORPUS_ENABLED: "true" };
  const first = await handleChefGringoPost(new Request("http://localhost/api/chef-gringo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "What temperature should ground beef reach?" }),
  }));
  const body = await first.json();
  assert.equal(body.researchCapability, "curated_corpus_retrieval");
  assert.ok(body.sourcesUsed.length);
  db.close();
  const reopened = new SqliteD1Adapter(path);
  globalThis.__CHEF_GRINGO_ENV__ = { DB: reopened, CHEF_GRINGO_LOCAL_CORPUS_ENABLED: "true" };
  const second = await handleChefGringoPost(new Request("http://localhost/api/chef-gringo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "What temperature should ground beef reach?" }),
  }));
  const again = await second.json();
  assert.equal(again.researchCapability, "curated_corpus_retrieval");
  const simple = await handleChefGringoPost(new Request("http://localhost/api/chef-gringo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "What’s mirepoix?" }),
  }));
  assert.equal((await simple.json()).researchCapability, "knowledge_only");
  delete globalThis.__CHEF_GRINGO_ENV__;
  reopened.close();
  await rm(dir, { recursive: true, force: true });
});

test("preview smoke suite distinguishes practice, evidence, county gap, safety, and commercial independence", async () => {
  const db = await database();
  await importAuthoritativeCorpus(db, undefined, { target: "local", attestExcerpts: true, reviewerEmail: "reviewer@example.com" });
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db, CHEF_GRINGO_LOCAL_CORPUS_ENABLED: "true" };
  assert.equal(CORPUS_SMOKE.length, 10);
  for (const item of CORPUS_SMOKE) {
    const result = await runAssistant(requestOf(item.question), { configured: false });
    assert.match(`${result.answer} ${result.explanation ?? ""} ${result.safety?.text ?? ""}`, item.match, item.id);
    if (item.expect === "practice") assert.equal(result.researchCapability, "knowledge_only");
    if (item.expect === "commercial_independence") assert.ok(!result.commercial || result.commercial.disclosureRequired || result.status === "needs_clarification" || result.status === "error");
    assert.notEqual(result.researchCapability, "bounded_research_complete");
  }
  assert.equal(LIVE_RESEARCH_ENABLED, false);
  delete globalThis.__CHEF_GRINGO_ENV__;
  db.close();
});

test("corpus audit fails on public test fixtures and passes a clean attested import", async () => {
  const db = await database();
  const dirty = await ingestCorpusSource(db, {
    title: "Trap", publisher: "Test", evidenceDomain: "food_safety_public_health", sourceType: "regulatory_document",
    authorityTier: 1, mimeType: "text/plain", text: "# Trap\n160°F", actorEmail: "admin@example.com",
    fixture: true, provenanceMethod: "test_fixture", claimScope: ["ground_beef_temp"],
    canonicalUrl: "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart",
  });
  await db.prepare("UPDATE corpus_documents SET ingestion_status='accepted', production_exposure=1, reviewer_email='x@y.z', reviewed_at=?, claim_scope=?, provenance_method='test_fixture' WHERE id=?").bind(new Date().toISOString(), '["ground_beef_temp"]', dirty.document.id).run();
  const failed = await auditCorpus(db, { target: "local" });
  assert.equal(failed.ok, false);
  assert.ok(failed.findings.some((finding) => finding.code === "test_fixture_public"));
  const clean = await database();
  await importAuthoritativeCorpus(clean, undefined, { target: "local", attestExcerpts: true, reviewerEmail: "reviewer@example.com" });
  const passed = await auditCorpus(clean, { target: "local" });
  assert.equal(passed.ok, true, JSON.stringify(passed.findings));
  db.close();
  clean.close();
});

test("admin authorization, mass-assignment rejection, stored XSS sanitization, and rollback disable", async () => {
  const db = await database();
  globalThis.__CHEF_GRINGO_ENV__ = { DB: db, MARKETPLACE_ADMIN_EMAILS: "admin@example.com" };
  const { POST } = await import("../app/api/marketplace/corpus/route.ts");
  const { POST: review } = await import("../app/api/marketplace/corpus/[id]/route.ts");
  const unauth = await POST(new Request("http://localhost/api/marketplace/corpus", { method: "POST", body: "{}" }));
  assert.equal(unauth.status, 401);
  const assigned = await POST(new Request("http://localhost/api/marketplace/corpus", {
    method: "POST",
    headers: { "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" },
    body: JSON.stringify({ title: "x", publisher: "y", productionExposure: true, text: "hello", mimeType: "text/plain" }),
  }));
  assert.equal(assigned.status, 400);
  const xss = extractReadableContent({ mimeType: "text/html", text: "<h1 onclick=alert(1)>Temps</h1><p>160°F</p>" });
  assert.doesNotMatch(xss.text, /onclick|alert/);
  await importAuthoritativeCorpus(db, undefined, { target: "local", attestExcerpts: true, reviewerEmail: "admin@example.com" });
  const publicBefore = (await publicSearchIndex(db)).length;
  const docs = await listCorpusDocuments(db);
  const publicDoc = docs.find((document) => document.productionExposure);
  const hidden = await review(new Request("http://localhost/api/marketplace/corpus/id", {
    method: "POST",
    headers: { "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" },
    body: JSON.stringify({ action: "unexpose" }),
  }), { params: Promise.resolve({ id: publicDoc.id }) });
  assert.equal(hidden.status, 200);
  assert.ok((await publicSearchIndex(db)).length < publicBefore);
  delete globalThis.__CHEF_GRINGO_ENV__;
  db.close();
});
