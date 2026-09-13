import { submitEvidenceRequestCandidate } from "../../../../../../db/social-evidence-request-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const submitted = await submitEvidenceRequestCandidate(growthDb(), {
      requestId: decodeURIComponent(id),
      actorEmail: administrator.email,
      existingDocumentId: typeof body.existingDocumentId === "string" ? body.existingDocumentId : null,
      title: typeof body.title === "string" ? body.title : undefined,
      publisher: typeof body.publisher === "string" ? body.publisher : undefined,
      canonicalUrl: typeof body.canonicalUrl === "string" ? body.canonicalUrl : null,
      excerpt: typeof body.excerpt === "string" ? body.excerpt : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      provenanceMethod: typeof body.provenanceMethod === "string" ? body.provenanceMethod : "founder_uploaded_document",
      evidenceDomain: typeof body.evidenceDomain === "string" ? body.evidenceDomain : "equipment",
      sourceType: typeof body.sourceType === "string" ? body.sourceType : undefined,
      authorityTier: typeof body.authorityTier === "number" ? body.authorityTier : undefined,
    });
    return Response.json({
      request: submitted.request,
      document: {
        id: submitted.document.id,
        ingestionStatus: submitted.document.ingestionStatus,
        productionExposure: submitted.document.productionExposure,
        title: submitted.document.title,
      },
    }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
