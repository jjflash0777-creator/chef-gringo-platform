import { authorizeMarketplaceRequest, marketplaceAuthorizationResponse } from "../../../../lib/marketplace-permissions.ts";
import { getD1Binding } from "../../../../../db/index.ts";
import { getCorpusDocument, listCorpusChunks } from "../../../../../db/corpus-repository.ts";
import { IngestError, reviewCorpusDocument } from "../../../../lib/research/ingest.ts";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  if (!authorizeMarketplaceRequest(request)) return marketplaceAuthorizationResponse(request);
  const { id } = await params;
  try {
    const document = await getCorpusDocument(getD1Binding(), id);
    if (!document) return Response.json({ error: "Not found." }, { status: 404 });
    const chunks = document.currentVersionId ? await listCorpusChunks(getD1Binding(), document.currentVersionId) : [];
    return Response.json({ document, chunks: chunks.slice(0, 8) });
  } catch (error) {
    const unavailable = error instanceof Error && /binding.*unavailable/i.test(error.message);
    return Response.json({ error: unavailable ? "Corpus persistence is not configured." : "Lookup failed." }, { status: unavailable ? 503 : 400 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const administrator = authorizeMarketplaceRequest(request);
  if (!administrator) return marketplaceAuthorizationResponse(request);
  const { id } = await params;
  try {
    const body = await request.json() as { action?: "accept" | "reject" | "stale" | "supersede" | "expose" | "unexpose"; reason?: string; supersededBy?: string; verificationNotes?: string; claimScope?: string[]; productionExposure?: unknown };
    if (!body.action) return Response.json({ error: "action is required." }, { status: 400 });
    if (body.productionExposure !== undefined) return Response.json({ error: "productionExposure cannot be assigned directly." }, { status: 400 });
    const document = await reviewCorpusDocument(getD1Binding(), id, body.action, administrator.email, { reason: body.reason, supersededBy: body.supersededBy, verificationNotes: body.verificationNotes, claimScope: body.claimScope });
    return Response.json({ document });
  } catch (error) {
    const unavailable = error instanceof Error && /binding.*unavailable/i.test(error.message);
    const ingest = error instanceof IngestError;
    return Response.json({ error: ingest ? error.message : unavailable ? "Corpus persistence is not configured." : "Review failed." }, { status: unavailable ? 503 : ingest ? 400 : 400 });
  }
}
