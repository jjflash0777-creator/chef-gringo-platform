import { getDownloadOrderById } from "../../../../db/download-orders-repository.ts";
import { getCampaignAssetsBinding, getD1Binding } from "../../../../db/index.ts";
import { getDownloadFile, getDownloadProduct } from "../../../lib/downloads.ts";
import { verifyDownloadToken } from "../../../lib/payments/downloadTokens.ts";

export const dynamic = "force-dynamic";

/**
 * Paid-file delivery. The product files live only as private objects in
 * the CAMPAIGN_ASSETS R2 bucket — they are not in this repo and have no
 * public URL. This route is the only way in, and it requires all three:
 *   1. a valid, unexpired HMAC token (minted on the confirmation page),
 *   2. a paid order row in D1 matching the token's order + product,
 *   3. a file id that belongs to that product in the catalog.
 * Anything missing fails closed with an honest status, never a file.
 */
export async function GET(request: Request) {
  const secret = process.env.DOWNLOAD_LINK_SECRET;
  if (!secret) {
    return Response.json(
      { message: "Download delivery is being connected. Email hello@chefgringo.com and we'll send your files." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const fileId = url.searchParams.get("file") || "";

  const verification = await verifyDownloadToken({ secret, token });
  if (!verification.ok) {
    if (verification.reason === "expired") {
      return Response.json(
        { message: "That download link has expired. Email hello@chefgringo.com and we'll re-issue it." },
        { status: 410 },
      );
    }
    return Response.json({ message: "That download link is not valid." }, { status: 401 });
  }

  const product = getDownloadProduct(verification.payload.productId);
  if (!product) return Response.json({ message: "That product is not in the downloads catalog." }, { status: 404 });
  const file = getDownloadFile(product, fileId);
  if (!file) return Response.json({ message: "That file is not part of this product." }, { status: 404 });

  let order;
  try {
    order = await getDownloadOrderById(getD1Binding(), verification.payload.orderId);
  } catch {
    return Response.json({ message: "Download delivery is temporarily unavailable." }, { status: 503 });
  }
  if (!order || order.productId !== product.id || order.status !== "paid") {
    return Response.json({ message: "No paid order matches that download link." }, { status: 403 });
  }

  let object;
  try {
    object = await getCampaignAssetsBinding().get(file.r2Key);
  } catch {
    return Response.json({ message: "Download delivery is temporarily unavailable." }, { status: 503 });
  }
  if (!object) {
    return Response.json(
      { message: "That file is still being prepared. Email hello@chefgringo.com and we'll send it directly." },
      { status: 503 },
    );
  }

  const bytes = await object.arrayBuffer();
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.fileName}"`,
      "content-length": String(bytes.byteLength),
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
