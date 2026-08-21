import type { AuthorityTier, CulinaryDomain } from "./source-policy.ts";
import type { EvidenceValidationStatus } from "./evidence.ts";

export const CORPUS_PARSER_VERSION = "corpus-parser/1";

export const INGESTION_STATUSES = [
  "submitted",
  "fetching",
  "parsed",
  "awaiting_review",
  "accepted",
  "rejected",
  "stale",
  "superseded",
  "failed",
] as const;

export type IngestionStatus = typeof INGESTION_STATUSES[number];

export const RETRIEVAL_METHODS = ["upload", "https_fetch", "fixture"] as const;
export type RetrievalMethod = typeof RETRIEVAL_METHODS[number];

export type CorpusDocument = {
  id: string;
  canonicalUrl: string | null;
  title: string;
  publisher: string;
  evidenceDomain: CulinaryDomain;
  sourceType: string;
  authorityTier: AuthorityTier;
  jurisdiction: string | null;
  publishedDate: string | null;
  revisionDate: string | null;
  retrievedDate: string | null;
  lastValidatedDate: string | null;
  mimeType: string | null;
  licensingNotes: string;
  ingestionStatus: IngestionStatus;
  validationStatus: EvidenceValidationStatus;
  productionExposure: boolean;
  supersededBy: string | null;
  rejectionReason: string | null;
  parserVersion: string | null;
  retrievalMethod: RetrievalMethod | null;
  exactModel: string | null;
  currentVersionId: string | null;
  idempotencyKey: string;
  fixture: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CorpusVersion = {
  id: string;
  documentId: string;
  version: number;
  checksum: string;
  extractedText: string | null;
  byteLength: number;
  contentType: string;
  createdAt: string;
};

export type CorpusChunk = {
  id: string;
  documentId: string;
  versionId: string;
  ordinal: number;
  heading: string | null;
  locator: string | null;
  excerpt: string;
  tokenEstimate: number;
};

export type CorpusHit = {
  sourceId: string;
  sourceVersion: string;
  chunkId: string;
  title: string;
  publisher: string;
  authorityTier: AuthorityTier;
  canonicalUrl: string | null;
  excerpt: string;
  heading: string | null;
  locator: string | null;
  score: number;
  lastValidatedAt: string | null;
  productionExposure: boolean;
  domain: CulinaryDomain;
  jurisdiction: string | null;
  publishedDate: string | null;
  fixture: boolean;
  ingestionStatus: IngestionStatus;
};
