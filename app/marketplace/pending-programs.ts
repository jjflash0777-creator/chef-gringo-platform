import { marketplaceCatalog } from "./catalog.ts";
import { purchaseLink } from "./commercial-links.ts";

/**
 * Internal registry of catalog records whose affiliate status is `unknown`.
 *
 * This is not a public partnership claim. Nothing here may be presented as an
 * active program, a live commission, or an approved relationship. The UI maps
 * every row to commercial-link kind `pending`.
 */
export type PendingProgramRecord = {
  productId: string;
  productName: string;
  programWording: string | null;
  destinationName: string | null;
  destinationUrl: string | null;
  evidenceLabel: string | null;
  evidenceUrl: string | null;
  verificationNeeded: string;
  uiTreatment: string;
};

export const PENDING_PROGRAM_VERIFICATION =
  "Confirm whether a live program exists, the network, written terms, cookie window, and commission. Until then Chef Gringo earns nothing and must not claim a partnership.";

export const PENDING_PROGRAM_UI_TREATMENT =
  "Kind `pending`: button is not rel=sponsored, event is merchant_click, label is “No active relationship,” copy says Chef Gringo earns nothing today.";

export function pendingProgramRecords(): PendingProgramRecord[] {
  return marketplaceCatalog.products
    .filter((product) => product.affiliate.status === "unknown")
    .map((product) => {
      const merchant = product.merchants[0];
      const evidence = product.evidence[0];
      const link = purchaseLink(product);
      return {
        productId: product.id,
        productName: product.name,
        programWording: product.affiliate.program,
        destinationName: merchant?.name ?? null,
        destinationUrl: merchant?.url ?? null,
        evidenceLabel: evidence?.label ?? null,
        evidenceUrl: evidence?.url ?? null,
        verificationNeeded: PENDING_PROGRAM_VERIFICATION,
        uiTreatment: `${PENDING_PROGRAM_UI_TREATMENT} Current kind: ${link.kind}.`,
      };
    });
}
