import type { ProductRecord } from "./catalog";

/**
 * Every outbound link the Marketplace renders is classified here, from the
 * stored commercial record. Nothing downstream may infer commercial status
 * from a URL pattern, a merchant name, or editorial copy.
 *
 * - affiliate:     a live program; Chef Gringo can earn from this click.
 * - pending:       a program has been identified but terms are unverified.
 *                  It earns nothing today and must not be dressed as a partnership.
 * - direct:        a real destination with no commercial relationship at all.
 * - informational: evidence and documentation. Never monetized.
 * - unavailable:   no verified destination exists yet.
 */
export const COMMERCIAL_LINK_KINDS = ["affiliate", "pending", "direct", "informational", "unavailable"] as const;
export type CommercialLinkKind = typeof COMMERCIAL_LINK_KINDS[number];

export type CommercialLink = {
  kind: CommercialLinkKind;
  href: string | null;
  label: string;
  destinationName: string | null;
  /** True only when Chef Gringo can actually earn from the click. */
  monetized: boolean;
  /** Commercial analytics event, or null when this link must not report one. */
  event: "affiliate_click" | "merchant_click" | null;
  /** `sponsored` is reserved for live programs; anything else would overstate the relationship. */
  rel: string | null;
  external: boolean;
  /** Reader-facing sentence. Never a raw enum value. */
  note: string | null;
};

export function isMonetized(link: CommercialLink) {
  return link.kind === "affiliate";
}

export function hasDestination(link: CommercialLink) {
  return link.href !== null;
}

export function purchaseLink(product: ProductRecord): CommercialLink {
  const merchant = product.merchants[0];
  const href = merchant?.url?.trim() || null;
  const destinationName = merchant?.name?.trim() || null;

  if (!href) {
    return {
      kind: "unavailable",
      href: null,
      label: "No verified place to buy yet",
      destinationName,
      monetized: false,
      event: null,
      rel: null,
      external: false,
      note: "Chef Gringo has not verified a purchase destination for this product.",
    };
  }

  if (product.affiliate.status === "available") {
    return {
      kind: "affiliate",
      href,
      label: "See current price",
      destinationName,
      monetized: true,
      event: "affiliate_click",
      rel: "sponsored nofollow noopener noreferrer",
      external: true,
      note: "Chef Gringo may earn a commission from this link.",
    };
  }

  if (product.affiliate.status === "unknown") {
    return {
      kind: "pending",
      href,
      label: "See current price",
      destinationName,
      monetized: false,
      event: "merchant_click",
      rel: "noopener noreferrer",
      external: true,
      note: "A commercial relationship with this seller is unverified. Chef Gringo earns nothing from this link today.",
    };
  }

  return {
    kind: "direct",
    href,
    label: "See current price",
    destinationName,
    monetized: false,
    event: "merchant_click",
    rel: "noopener noreferrer",
    external: true,
    note: "Chef Gringo has no commercial relationship with this seller.",
  };
}

export function evidenceLink(product: ProductRecord): CommercialLink {
  const evidence = product.evidence[0];
  const href = evidence?.url?.trim() || null;
  if (!href) {
    return {
      kind: "unavailable",
      href: null,
      label: "No published source recorded",
      destinationName: null,
      monetized: false,
      event: null,
      rel: null,
      external: false,
      note: "No source document has been recorded for this product yet.",
    };
  }
  return {
    kind: "informational",
    href,
    label: "Check evidence",
    destinationName: evidence.label ?? null,
    monetized: false,
    event: null,
    rel: "noopener noreferrer",
    external: true,
    note: null,
  };
}
