import { recordSocialApproval } from "../../../../db/social-growth-repository.ts";
import { growthDb, growthError, rejectBulkApproval, requireGrowthAdministrator } from "../_shared.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;
  try {
    const body = await request.json();
    const bulk = rejectBulkApproval(body);
    if (bulk) return bulk;
    const record = body as Record<string, unknown>;
    if (typeof record.reason !== "string" || !record.reason.trim()) {
      return Response.json({ error: "A reason is required." }, { status: 400 });
    }
    const approval = await recordSocialApproval(growthDb(), {
      slug: String(record.slug ?? `decision-${Date.now()}`),
      subjectKind: record.subjectKind as "package" | "variant",
      subjectId: String(record.subjectId ?? ""),
      decision: record.decision as "approved" | "rejected",
      actorEmail: administrator.email,
      reason: record.reason,
    });
    return Response.json({ approval, publishingEnabled: false }, { status: 201 });
  } catch (error) {
    return growthError(error);
  }
}
