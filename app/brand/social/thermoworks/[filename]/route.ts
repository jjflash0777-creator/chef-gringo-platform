import { getCampaignAssetsBinding } from "../../../../../db/index.ts";

export const dynamic = "force-dynamic";

const TARGET_FILENAME = "thermoworks-facebook-landscape.jpg";
const TARGET_KEY = "brand/social/thermoworks/thermoworks-facebook-landscape.jpg";
const CACHE_CONTROL = "public, max-age=86400, s-maxage=604800, immutable";

async function loadAsset(filename: string) {
  if (filename !== TARGET_FILENAME) return null;
  return getCampaignAssetsBinding().get(TARGET_KEY);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  try {
    const object = await loadAsset(filename);
    if (!object) return new Response("Not found", { status: 404 });
    const bytes = await object.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": object.httpMetadata?.contentType || "image/jpeg",
        "cache-control": CACHE_CONTROL,
        "content-length": String(bytes.byteLength),
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Asset storage unavailable", { status: 503 });
  }
}

export async function HEAD(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  try {
    const object = await loadAsset(filename);
    if (!object) return new Response(null, { status: 404 });
    const bytes = await object.arrayBuffer();
    return new Response(null, {
      status: 200,
      headers: {
        "content-type": object.httpMetadata?.contentType || "image/jpeg",
        "cache-control": CACHE_CONTROL,
        "content-length": String(bytes.byteLength),
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
