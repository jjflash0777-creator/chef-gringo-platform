import { getCampaignAssetsBinding } from "../../../../../db/index.ts";
import { getContentAsset, updateContentAssetUri } from "../../../../../db/social-growth-repository.ts";
import { growthDb, growthError, requireGrowthAdministrator } from "../../_shared.ts";

export const dynamic = "force-dynamic";

const TARGET_ASSET_ID = "sgo:asset:thermoworks-stop-guessing-still";
const TARGET_SHA256 = "fe65e036d11fde762aa24192732d1ce3ddf7f261b85b0e79218a2f58852b7ab2";
const TARGET_KEY = "brand/social/thermoworks/thermoworks-facebook-landscape.jpg";
const TARGET_URI = "/brand/social/thermoworks/thermoworks-facebook-landscape.jpg";
const MAX_BYTES = 8 * 1024 * 1024;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(digest));
}

export async function POST(request: Request) {
  const { administrator, response } = requireGrowthAdministrator(request);
  if (response || !administrator) return response;

  let uploaded = false;
  try {
    const form = await request.formData();
    const assetId = String(form.get("assetId") ?? "").trim();
    const expectedSha256 = String(form.get("expectedSha256") ?? "").trim().toLowerCase();
    const file = form.get("file");

    if (assetId !== TARGET_ASSET_ID) {
      return Response.json({ error: "This recovery endpoint is restricted to the approved ThermoWorks still." }, { status: 400 });
    }
    if (expectedSha256 !== TARGET_SHA256) {
      return Response.json({ error: "Expected SHA-256 does not match the approved recovery fingerprint." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return Response.json({ error: "Recovered JPEG file is required." }, { status: 400 });
    }
    if (file.type !== "image/jpeg") {
      return Response.json({ error: "Recovered asset must be image/jpeg." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return Response.json({ error: "Recovered asset size is invalid." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const actualSha256 = await sha256(bytes);
    if (actualSha256 !== TARGET_SHA256) {
      return Response.json({
        error: "Recovered asset hash mismatch.",
        expectedSha256: TARGET_SHA256,
        actualSha256,
      }, { status: 400 });
    }

    const db = growthDb();
    const existingAsset = await getContentAsset(db, TARGET_ASSET_ID);
    if (!existingAsset) throw new Error("Approved ThermoWorks asset record was not found.");

    const r2 = getCampaignAssetsBinding();
    await r2.put(TARGET_KEY, bytes, {
      httpMetadata: { contentType: "image/jpeg" },
      customMetadata: {
        sha256: TARGET_SHA256,
        restoredBy: administrator.email,
        assetId: TARGET_ASSET_ID,
      },
    });
    uploaded = true;

    const stored = await r2.get(TARGET_KEY);
    if (!stored) throw new Error("Recovered asset was not readable from R2 after upload.");
    const storedBytes = await stored.arrayBuffer();
    const storedSha256 = await sha256(storedBytes);
    if (storedSha256 !== TARGET_SHA256) {
      throw new Error("Recovered R2 object failed post-write SHA-256 verification.");
    }

    const asset = await updateContentAssetUri(db, { assetId: TARGET_ASSET_ID, uri: TARGET_URI });

    return Response.json({
      ok: true,
      asset,
      r2Key: TARGET_KEY,
      uri: TARGET_URI,
      sha256: storedSha256,
      contentType: "image/jpeg",
      restoredBy: administrator.email,
    });
  } catch (error) {
    if (uploaded) {
      await getCampaignAssetsBinding().delete(TARGET_KEY).catch(() => undefined);
    }
    return growthError(error);
  }
}
