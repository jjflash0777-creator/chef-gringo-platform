import type { D1DatabaseLike } from "../../../db/index.ts";
import { CORPUS_FIXTURES } from "./corpus-fixtures.ts";
import { AUTHORITATIVE_MANIFEST, CORPUS_MANIFEST_VERSION, type ManifestEntry } from "./corpus-manifest.ts";
import type { CorpusHit } from "./corpus-types.ts";
import { ingestCorpusSource, reviewCorpusDocument } from "./ingest.ts";
import { listCorpusDocuments, updateCorpusDocument, writeAudit } from "../../../db/corpus-repository.ts";
import { chunkExtractedText } from "./chunker.ts";

export const CORPUS_IMPORT_ACTOR = "corpus-import@chefgringo.local";

export type ImportCounts = {
  manifestVersion: string;
  submitted: number;
  accepted: number;
  limited: number;
  rejected: number;
  stale: number;
  failed: number;
  unavailable: number;
  duplicates: number;
  publicEligible: number;
};

export function fixtureHitsFromManifest(entries: ManifestEntry[] = AUTHORITATIVE_MANIFEST): CorpusHit[] {
  const hits: CorpusHit[] = [];
  for (const entry of entries) {
    if (!entry.fixtureId || entry.productionEligibility !== "public") continue;
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
        fixture: true,
        ingestionStatus: "accepted",
      });
    }
  }
  return hits;
}

export async function importAuthoritativeCorpus(db: D1DatabaseLike, entries: ManifestEntry[] = AUTHORITATIVE_MANIFEST): Promise<ImportCounts> {
  const counts: ImportCounts = {
    manifestVersion: CORPUS_MANIFEST_VERSION,
    submitted: 0,
    accepted: 0,
    limited: 0,
    rejected: 0,
    stale: 0,
    failed: 0,
    unavailable: 0,
    duplicates: 0,
    publicEligible: 0,
  };

  for (const entry of entries) {
    try {
      if (entry.productionEligibility === "unavailable" || !entry.fixtureId) {
        if (entry.canonicalUrl) {
          const recorded = await ingestCorpusSource(db, {
            id: entry.id,
            title: entry.issuingOrganization,
            publisher: entry.issuingOrganization,
            evidenceDomain: entry.evidenceDomain,
            sourceType: entry.authorityTier === 1 ? "regulatory_document" : "professional_practice",
            authorityTier: entry.authorityTier,
            jurisdiction: entry.jurisdiction,
            publishedDate: entry.expectedPublicationDate,
            licensingNotes: entry.licensingNotes,
            canonicalUrl: entry.canonicalUrl,
            mimeType: "text/plain",
            actorEmail: CORPUS_IMPORT_ACTOR,
            fixture: true,
          });
          if (recorded.duplicate) counts.duplicates += 1;
          else counts.unavailable += 1;
        } else {
          counts.unavailable += 1;
        }
        continue;
      }

      const text = CORPUS_FIXTURES[entry.fixtureId];
      if (!text) {
        counts.failed += 1;
        continue;
      }

      const ingested = await ingestCorpusSource(db, {
        id: entry.id,
        title: entry.issuingOrganization + " — " + entry.intendedClaims[0],
        publisher: entry.issuingOrganization,
        evidenceDomain: entry.evidenceDomain,
        sourceType: entry.canonicalUrl ? "regulatory_document" : "professional_practice",
        authorityTier: entry.authorityTier,
        jurisdiction: entry.jurisdiction,
        publishedDate: entry.expectedPublicationDate,
        exactModel: entry.id.includes("thermapen") ? "Thermapen ONE" : entry.id.includes("wsb50") ? "WSB50" : entry.id.includes("sp20") ? "SP20" : entry.id.includes("hl200") ? "HL200" : null,
        licensingNotes: entry.licensingNotes,
        canonicalUrl: entry.canonicalUrl,
        mimeType: "text/plain",
        text,
        actorEmail: CORPUS_IMPORT_ACTOR,
        fixture: true,
      });

      if (ingested.duplicate) {
        counts.duplicates += 1;
        const current = ingested.document;
        if (current.ingestionStatus === "accepted" && current.productionExposure) counts.accepted += 1;
        continue;
      }

      counts.submitted += 1;

      if (entry.productionEligibility === "rejected") {
        const accepted = await reviewCorpusDocument(db, ingested.document!.id, "accept", CORPUS_IMPORT_ACTOR);
        await reviewCorpusDocument(db, accepted!.id, "stale", CORPUS_IMPORT_ACTOR, { reason: "Stale contradiction fixture." });
        counts.stale += 1;
        continue;
      }

      await reviewCorpusDocument(db, ingested.document!.id, "accept", CORPUS_IMPORT_ACTOR);
      if (entry.productionEligibility === "limited") {
        await updateCorpusDocument(db, ingested.document!.id, { productionExposure: false, rejectionReason: "Limited public exposure. Clinical or copyright boundary." });
        await writeAudit(db, "document", ingested.document!.id, "limited", CORPUS_IMPORT_ACTOR, { eligibility: "limited" });
        counts.limited += 1;
      } else {
        counts.accepted += 1;
        counts.publicEligible += 1;
      }
    } catch {
      counts.failed += 1;
    }
  }

  return counts;
}

export async function corpusDashboard(db: D1DatabaseLike) {
  const documents = await listCorpusDocuments(db);
  const byStatus: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  for (const document of documents) {
    byStatus[document.ingestionStatus] = (byStatus[document.ingestionStatus] ?? 0) + 1;
    byDomain[document.evidenceDomain] = (byDomain[document.evidenceDomain] ?? 0) + 1;
  }
  return {
    manifestVersion: CORPUS_MANIFEST_VERSION,
    documentCount: documents.length,
    publicEligible: documents.filter((document) => document.ingestionStatus === "accepted" && document.productionExposure).length,
    byStatus,
    byDomain,
    staleOrRefreshDue: documents.filter((document) => document.ingestionStatus === "stale" || document.ingestionStatus === "failed").length,
    failed: documents.filter((document) => document.ingestionStatus === "failed" || (document.ingestionStatus === "submitted" && document.rejectionReason)).map((document) => ({
      id: document.id,
      reason: document.rejectionReason,
    })),
    documents,
  };
}
