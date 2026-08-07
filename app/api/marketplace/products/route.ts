import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db/index.ts";
import { brands, categories, editorialEvents, products } from "../../../../db/schema.ts";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function authenticatedEmail(request: Request) {
  return request.headers.get("oai-authenticated-user-email");
}

export async function GET(request: Request) {
  if (!authenticatedEmail(request)) {
    return Response.json({ error: "Sign in to access Marketplace administration." }, { status: 401 });
  }
  try {
    const rows = await getDb().select().from(products).orderBy(desc(products.updatedAt), desc(products.id)).limit(100);
    return Response.json({ products: rows });
  } catch (error) {
    const message = error instanceof Error && /no such table/i.test(error.message)
      ? "Marketplace storage is being prepared. Deploy the generated database migration."
      : "The product catalog could not be loaded.";
    return Response.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const actorEmail = authenticatedEmail(request);
  if (!actorEmail) {
    return Response.json({ error: "Sign in to manage Marketplace products." }, { status: 401 });
  }

  const payload = await request.json() as Record<string, string | undefined>;
  const name = payload.name?.trim() || "";
  const brandName = payload.brand?.trim() || "";
  const categoryName = payload.category?.trim() || "";
  const summary = payload.summary?.trim() || "";
  const bestFor = payload.bestFor?.trim() || "";
  if (!name || !brandName || !categoryName || !summary || !bestFor) {
    return Response.json({ error: "Name, brand, category, summary, and best-for guidance are required." }, { status: 400 });
  }

  const db = getDb();
  const brandSlug = slugify(brandName);
  const categorySlug = slugify(categoryName);
  const productSlug = slugify(`${brandName}-${name}`);

  const [existingBrand] = await db.select().from(brands).where(eq(brands.slug, brandSlug)).limit(1);
  const [brand] = existingBrand ? [existingBrand] : await db.insert(brands).values({ name: brandName, slug: brandSlug }).returning();
  const [existingCategory] = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
  const [category] = existingCategory ? [existingCategory] : await db.insert(categories).values({
    name: categoryName,
    slug: categorySlug,
    problemStatement: `I need help choosing ${categoryName.toLowerCase()}.`,
  }).returning();

  try {
    const [product] = await db.insert(products).values({
      brandId: brand.id,
      categoryId: category.id,
      name,
      slug: productSlug,
      summary,
      bestFor,
      notRecommendedFor: payload.notRecommendedFor?.trim() || "",
      evidenceLevel: payload.evidenceLevel || "research",
    }).returning();
    await db.insert(editorialEvents).values({
      entityType: "product",
      entityId: product.id,
      action: "created",
      actorEmail,
      detail: JSON.stringify({ editorialStatus: "draft" }),
    });
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && /unique/i.test(error.message)
      ? "This product already exists. Edit the canonical record instead."
      : "The product draft could not be saved.";
    return Response.json({ error: message }, { status: 409 });
  }
}
