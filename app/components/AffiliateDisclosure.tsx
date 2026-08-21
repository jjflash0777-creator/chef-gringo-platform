import Link from "next/link";
import { AFFILIATE_DISCLOSURE_TEXT } from "./affiliate-disclosure-copy";

export { AFFILIATE_DISCLOSURE_TEXT };

/**
 * The single affiliate disclosure used everywhere money is involved.
 *
 * It renders as plain readable text: no <details>, no tooltip, no hover state,
 * no fine print. It also carries no `data-event`, so the global analytics click
 * handler in AnalyticsBridge cannot report reading a disclosure as a product
 * click. Keep it outside any element that sets `data-event` for the same reason.
 */
export function AffiliateDisclosure({ id }: { id?: string }) {
  return (
    <aside className="cg-affiliate-disclosure" id={id} aria-label="Affiliate disclosure">
      <p>
        {AFFILIATE_DISCLOSURE_TEXT}{" "}
        <Link href="/affiliate-disclosure">Read the full disclosure</Link>
      </p>
    </aside>
  );
}
