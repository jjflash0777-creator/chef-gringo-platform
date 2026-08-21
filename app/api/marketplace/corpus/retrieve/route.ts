import { authorizeMarketplaceRequest, marketplaceAuthorizationResponse } from "../../../../lib/marketplace-permissions.ts";
import { getD1Binding } from "../../../../../db/index.ts";
import { createLocalRetriever, retrieveWithCache } from "../../../../lib/research/retriever.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!authorizeMarketplaceRequest(request)) return marketplaceAuthorizationResponse(request);
  try {
    const body = await request.json() as { query?: string };
    const query = body.query?.trim() ?? "";
    if (!query) return Response.json({ error: "query is required." }, { status: 400 });
    const db = getD1Binding();
    const retriever = createLocalRetriever();
    const result = await retrieveWithCache(retriever, query, { db, limit: 4 });
    return Response.json({
      capability: result.hits.length ? "curated_corpus_retrieval" : "research_unavailable",
      liveWeb: false,
      cacheHit: result.cacheHit,
      hits: result.hits,
    });
  } catch (error) {
    const unavailable = error instanceof Error && /binding.*unavailable/i.test(error.message);
    return Response.json({ error: unavailable ? "Corpus persistence is not configured." : "Retrieval test failed." }, { status: unavailable ? 503 : 400 });
  }
}
