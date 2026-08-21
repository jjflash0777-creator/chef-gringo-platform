import { authorizeMarketplaceRequest, marketplaceAuthorizationResponse } from "../../../lib/marketplace-permissions.ts";
import { getD1Binding } from "../../../../db/index.ts";
import { corpusDashboard } from "../../../lib/research/corpus-import.ts";
import { ingestCorpusSource, IngestError } from "../../../lib/research/ingest.ts";
import type { CulinaryDomain } from "../../../lib/research/source-policy.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!authorizeMarketplaceRequest(request)) return marketplaceAuthorizationResponse(request);
  try {
    const dashboard = await corpusDashboard(getD1Binding());
    return Response.json({ ...dashboard, retrievalMode: "curated_corpus_not_live_web" });
  } catch (error) {
    const unavailable = error instanceof Error && /binding.*unavailable/i.test(error.message);
    return Response.json({ error: unavailable ? "Corpus persistence is not configured." : "Corpus documents could not be listed." }, { status: unavailable ? 503 : 400 });
  }
}

export async function POST(request: Request) {
  const administrator = authorizeMarketplaceRequest(request);
  if (!administrator) return marketplaceAuthorizationResponse(request);
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await ingestCorpusSource(getD1Binding(), {
      title: String(body.title ?? ""),
      publisher: String(body.publisher ?? ""),
      evidenceDomain: (body.evidenceDomain ?? "culinary_technique") as CulinaryDomain,
      sourceType: String(body.sourceType ?? "professional_practice"),
      authorityTier: (Number(body.authorityTier) || 2) as 1 | 2 | 3,
      jurisdiction: typeof body.jurisdiction === "string" ? body.jurisdiction : null,
      publishedDate: typeof body.publishedDate === "string" ? body.publishedDate : null,
      exactModel: typeof body.exactModel === "string" ? body.exactModel : null,
      licensingNotes: typeof body.licensingNotes === "string" ? body.licensingNotes : "",
      canonicalUrl: typeof body.canonicalUrl === "string" ? body.canonicalUrl : null,
      mimeType: String(body.mimeType ?? "text/plain"),
      text: typeof body.text === "string" ? body.text : undefined,
      actorEmail: administrator.email,
      fixture: body.fixture === true,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    const unavailable = error instanceof Error && /binding.*unavailable/i.test(error.message);
    const ingest = error instanceof IngestError;
    return Response.json({ error: ingest ? error.message : unavailable ? "Corpus persistence is not configured." : "Ingestion failed." }, { status: unavailable ? 503 : ingest ? 400 : 400 });
  }
}
