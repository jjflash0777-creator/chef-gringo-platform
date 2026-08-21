import type { D1DatabaseLike } from "../../../db/index.ts";
import { CORPUS_FIXTURES } from "./corpus-fixtures.ts";
import { AUTHORITATIVE_MANIFEST, CORPUS_MANIFEST_VERSION, type ManifestEntry } from "./corpus-manifest.ts";
import type { CorpusHit } from "./corpus-types.ts";
import { ingestCorpusSource, reviewCorpusDocument } from "./ingest.ts";
import { corpusFingerprint, insertImportRun, lastImportRun, listCorpusDocuments, listCorpusChunks, writeAudit } from "../../../db/corpus-repository.ts";
import { chunkExtractedText } from "./chunker.ts";
import { CORPUS_TARGETS, provenanceFor, type CorpusTarget } from "./provenance.ts";
import { parseClaimScope } from "./exposure-gate.ts";

export const CORPUS_IMPORT_ACTOR = "corpus-import@chefgringo.local";
export const ATTESTATION_NOTES = "Reviewer attests this excerpt is a good-faith reduction of the cited official source. It was not live-fetched in this environment.";

export type ImportCounts = {
  manifestVersion: string;
  target: CorpusTarget | "unset";
  dryRun: boolean;
  submitted: number;
  accepted: number;
  limited: number;
  rejected: number;
  stale: number;
  failed: number;
  unavailable: number;
  duplicates: number;
  demoted: number;
  publicEligible: number;
  skipped: number;
  fingerprintBefore: string;
  fingerprintAfter: string;
};

export type ImportOptions = {
  target?: CorpusTarget;
  dryRun?: boolean;
  attestExcerpts?: boolean;
  reviewerEmail?: string;
  actorEmail?: string;
};

export function requireCorpusTarget(value: string | undefined): CorpusTarget {
  if (!value || !(CORPUS_TARGETS as readonly string[]).includes(value)) {
    throw new Error("Explicit --target is required: local | preview | production.");
  }
  return value as CorpusTarget;
}

export function assertTargetAllowsWrite(target: CorpusTarget, dryRun: boolean) {
  if (target === "production" && !dryRun) {
    throw new Error("Production corpus writes are refused in this stage. Use --target production --dry-run.");
  }
  if (target === "preview" && !dryRun && process.env.CHEF_GRINGO_PREVIEW_D1_CONFIRM !== "I_UNDERSTAND_PREVIEW") {
    throw new Error("Preview D1 import requires CHEF_GRINGO_PREVIEW_D1_CONFIRM=I_UNDERSTAND_PREVIEW and is not executed against production.");
  }
}

export function fixtureHitsFromManifest(entries: ManifestEntry[] = AUTHORITATIVE_MANIFEST, options: { attested?: boolean } = {}): CorpusHit[] {
  const hits: CorpusHit[] = [];
  for (const entry of entries) {
    const provenance = provenanceFor(entry.id);
    if (!entry.fixtureId) continue;
    if (provenance.method === "test_fixture" || provenance.method === "metadata_only") continue;
    if (provenance.requiresAttestation && !options.attested) continue;
    const text = CORPUS_FIXTURES[entry.fixtureId];
    if (!text) continue;
    const chunks = chunkExtractedText(text);
    for (const chunk of chunks) {
      hits.push({
        sourceId: entry.id,
        sourceVersion: `${entry.id}:v1`,
        chunkId: `${entry.id}:v1:c${chunk.ordinal}`,
        title: entry.id.replace("corpus:", "").replace(/-/g, " "),
        publisher: entry.issuingOrganization,
        authorityTier: entry.authorityTier,
        canonicalUrl: entry.canonicalUrl,
        excerpt: chunk.excerpt,
        heading: chunk.heading,
        locator: chunk.locator,
        score: 0,
        lastValidatedAt: "2026-08-21T00:00:00.000Z",
        productionExposure: true,
        domain: entry.evidenceDomain,
        jurisdiction: entry.jurisdiction,
        publishedDate: entry.expectedPublicationDate,
        fixture: false,
        ingestionStatus: "accepted",
        provenanceMethod: provenance.method,
        claimScope: JSON.stringify(provenance.claimScope),
      });
    }
  }
  return hits;
}

export async function importAuthoritativeCorpus(
  db: D1DatabaseLike,
  entries: ManifestEntry[] = AUTHORITATIVE_MANIFEST,
  options: ImportOptions = {},
): Promise<ImportCounts> {
  const target = options.target;
  if (!target) throw new Error("Explicit --target is required: local | preview | production.");
  const dryRun = Boolean(options.dryRun);
  assertTargetAllowsWrite(target, dryRun);
  const attest = Boolean(options.attestExcerpts);
  const reviewer = options.reviewerEmail ?? (attest ? options.actorEmail : undefined);
  if (attest && !reviewer) throw new Error("--attest-excerpts requires --reviewer.");

  const fingerprintBefore = await corpusFingerprint(db);
  const counts: ImportCounts = {
    manifestVersion: CORPUS_MANIFEST_VERSION,
    target,
    dryRun,
    submitted: 0,
    accepted: 0,
    limited: 0,
    rejected: 0,
    stale: 0,
    failed: 0,
    unavailable: 0,
    duplicates: 0,
    demoted: 0,
    publicEligible: 0,
    skipped: 0,
    fingerprintBefore,
    fingerprintAfter: fingerprintBefore,
  };

  if (dryRun) {
    for (const entry of entries) {
      const provenance = provenanceFor(entry.id);
      if (provenance.method === "metadata_only" || !entry.fixtureId) counts.unavailable += 1;
      else if (provenance.method === "test_fixture") counts.stale += 1;
      else if (provenance.requiresAttestation && !attest) {
        counts.accepted += 1;
        counts.demoted += 1;
      } else counts.publicEligible += 1;
    }
    counts.fingerprintAfter = fingerprintBefore;
    return counts;
  }

  for (const entry of entries) {
    try {
      const provenance = provenanceFor(entry.id);
      if (provenance.method === "metadata_only" || !entry.fixtureId) {
        if (entry.canonicalUrl) {
          const recorded = await ingestCorpusSource(db, {
            id: entry.id,
            title: entry.issuingOrganization,
            publisher: entry.issuingOrganization,
            evidenceDomain: entry.evidenceDomain,
            sourceType: "regulatory_document",
            authorityTier: entry.authorityTier,
            jurisdiction: entry.jurisdiction,
            publishedDate: entry.expectedPublicationDate,
            licensingNotes: entry.licensingNotes,
            canonicalUrl: entry.canonicalUrl,
            mimeType: "text/plain",
            actorEmail: options.actorEmail ?? CORPUS_IMPORT_ACTOR,
            fixture: false,
            provenanceMethod: "metadata_only",
            claimScope: [],
          });
          if (recorded.duplicate) counts.duplicates += 1;
          else counts.unavailable += 1;
        } else counts.unavailable += 1;
        continue;
      }

      const text = CORPUS_FIXTURES[entry.fixtureId];
      if (!text) {
        counts.failed += 1;
        continue;
      }

      const ingested = await ingestCorpusSource(db, {
        id: entry.id,
        title: `${entry.issuingOrganization} — ${entry.intendedClaims[0] ?? entry.id}`,
        publisher: entry.issuingOrganization,
        evidenceDomain: entry.evidenceDomain,
        sourceType: provenance.method === "repository_practice" ? "professional_practice" : "regulatory_document",
        authorityTier: entry.authorityTier,
        jurisdiction: entry.jurisdiction,
        publishedDate: entry.expectedPublicationDate,
        exactModel: provenance.exactModel ?? null,
        licensingNotes: entry.licensingNotes,
        canonicalUrl: entry.canonicalUrl,
        mimeType: "text/plain",
        text,
        actorEmail: options.actorEmail ?? CORPUS_IMPORT_ACTOR,
        fixture: provenance.method === "test_fixture",
        provenanceMethod: provenance.method,
        claimScope: provenance.claimScope,
        verificationNotes: attest && provenance.requiresAttestation ? ATTESTATION_NOTES : entry.reviewNotes,
        reviewerEmail: provenance.method === "repository_practice" || attest ? reviewer ?? options.actorEmail ?? CORPUS_IMPORT_ACTOR : undefined,
      });

      if (ingested.duplicate) {
        counts.duplicates += 1;
        if (ingested.document?.productionExposure) counts.publicEligible += 1;
        else if (ingested.document?.ingestionStatus === "accepted") counts.demoted += 1;
        continue;
      }

      counts.submitted += 1;

      if (provenance.method === "test_fixture") {
        const accepted = await reviewCorpusDocument(db, ingested.document!.id, "accept", options.actorEmail ?? CORPUS_IMPORT_ACTOR, { claimScope: provenance.claimScope });
        await reviewCorpusDocument(db, accepted!.id, "stale", options.actorEmail ?? CORPUS_IMPORT_ACTOR, { reason: "Stale contradiction fixture." });
        counts.stale += 1;
        continue;
      }

      if (provenance.requiresAttestation && !attest) {
        counts.demoted += 1;
        continue;
      }

      const reviewerEmail = reviewer ?? options.actorEmail ?? CORPUS_IMPORT_ACTOR;
      const accepted = await reviewCorpusDocument(db, ingested.document!.id, "accept", reviewerEmail, {
        claimScope: provenance.claimScope,
        verificationNotes: attest && provenance.requiresAttestation ? ATTESTATION_NOTES : entry.reviewNotes,
      });
      if (accepted?.productionExposure) counts.publicEligible += 1;
      else {
        counts.accepted += 1;
        counts.demoted += 1;
      }
    } catch {
      counts.failed += 1;
    }
  }

  counts.fingerprintAfter = await corpusFingerprint(db);
  await insertImportRun(db, {
    id: `import:${crypto.randomUUID()}`,
    target,
    manifestVersion: CORPUS_MANIFEST_VERSION,
    fingerprintBefore,
    fingerprintAfter: counts.fingerprintAfter,
    dryRun: false,
    countsJson: JSON.stringify(counts),
    actorEmail: options.actorEmail ?? CORPUS_IMPORT_ACTOR,
  });
  await writeAudit(db, "import", target, "durable_import", options.actorEmail ?? CORPUS_IMPORT_ACTOR, { demoted: counts.demoted, publicEligible: counts.publicEligible });
  return counts;
}

export async function corpusDashboard(db: D1DatabaseLike, target: CorpusTarget | "unbound" = "unbound") {
  const documents = await listCorpusDocuments(db);
  const last = await lastImportRun(db);
  const byStatus: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  const byProvenance: Record<string, number> = {};
  let missingLocator = 0;
  let missingReview = 0;
  for (const document of documents) {
    byStatus[document.ingestionStatus] = (byStatus[document.ingestionStatus] ?? 0) + 1;
    byDomain[document.evidenceDomain] = (byDomain[document.evidenceDomain] ?? 0) + 1;
    const method = document.provenanceMethod ?? document.retrievalMethod ?? "unknown";
    byProvenance[method] = (byProvenance[method] ?? 0) + 1;
    if (!document.reviewerEmail) missingReview += 1;
    if (document.currentVersionId) {
      const chunks = await listCorpusChunks(db, document.currentVersionId);
      if (chunks.length && chunks.every((chunk) => !chunk.locator)) missingLocator += 1;
    }
  }
  return {
    manifestVersion: CORPUS_MANIFEST_VERSION,
    target,
    fingerprint: await corpusFingerprint(db),
    documentCount: documents.length,
    publicEligible: documents.filter((document) => document.ingestionStatus === "accepted" && document.productionExposure).length,
    unreviewed: documents.filter((document) => document.ingestionStatus === "awaiting_review").length,
    metadataOnly: documents.filter((document) => document.provenanceMethod === "metadata_only").length,
    testFixtures: documents.filter((document) => document.fixture || document.provenanceMethod === "test_fixture").length,
    staleOrSuperseded: documents.filter((document) => document.ingestionStatus === "stale" || document.ingestionStatus === "superseded").length,
    missingLocator,
    missingReview,
    byStatus,
    byDomain,
    byProvenance,
    lastImport: last ? { ...last, dryRun: last.dryRun === 1 || last.dryRun === true } : null,
    persistence: target === "local" ? "file-backed sqlite" : target === "unbound" ? "process D1 binding or memory" : target,
    documents,
    claimScopes: documents.map((document) => ({ id: document.id, scope: parseClaimScope(document.claimScope) })),
  };
}
