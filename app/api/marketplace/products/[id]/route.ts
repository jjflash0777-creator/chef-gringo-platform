import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db/index.ts";
import { editorialEvents, products } from "../../../../../db/schema.ts";

const validStatuses = new Set(["draft", "in_review", "published"]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const actorEmail = request.headers.get("oai-authenticated-user-email");
  if (!actorEmail) {
    return Response.json({ error: "Sign in to manage Marketplace products." }, { status: 401 });
  }
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  const payload = await request.json() as { editorialStatus?: string };
  if (!Number.isInteger(id) || !payload.editorialStatus || !validStatuses.has(payload.editorialStatus)) {
    return Response.json({ error: "A valid product and editorial status are required." }, { status: 400 });
  }

  const db = getDb();
  const [product] = await db.update(products).set({
    editorialStatus: payload.editorialStatus,
    publishedAt: payload.editorialStatus === "published" ? sql`CURRENT_TIMESTAMP` : null,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  }).where(eq(products.id, id)).returning();
  if (!product) return Response.json({ error: "Product not found." }, { status: 404 });

  await db.insert(editorialEvents).values({
    entityType: "product",
    entityId: id,
    action: `status:${payload.editorialStatus}`,
    actorEmail,
  });
  return Response.json({ product });
}
