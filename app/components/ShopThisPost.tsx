import Link from "next/link";
import { AffiliateDisclosure } from "./AffiliateDisclosure";
import { PARTNER_SHOWCASE } from "../lib/partners";

/**
 * The post template's commercial block (redesign blueprint, 2026-11-05):
 * disclosure up front, then the partner routes this post actually uses —
 * cards, never a catalog dump. Picks are partner-page hrefs from
 * app/lib/partners.ts, so the roster stays the single source of truth and
 * ordering here is editorial, never commission-ranked.
 */
export function ShopThisPost({
  picks,
  heading = "Shop this post",
  intro,
}: {
  picks: readonly { href: string; note: string }[];
  heading?: string;
  intro?: string;
}) {
  const partners = picks
    .map((pick) => ({ pick, partner: PARTNER_SHOWCASE.find((entry) => entry.href === pick.href) }))
    .filter((entry) => entry.partner);
  if (partners.length === 0) return null;
  return (
    <section className="cg-shop-this-post" aria-label={heading}>
      <h2>{heading}</h2>
      <AffiliateDisclosure />
      {intro ? <p>{intro}</p> : null}
      <ul className="cg-shop-this-post-list">
        {partners.map(({ pick, partner }) => (
          <li key={pick.href}>
            <strong>
              {partner!.name} — {partner!.role}.
            </strong>{" "}
            {pick.note}{" "}
            <Link href={pick.href}>
              <strong>See {partner!.name} via Chef Gringo →</strong>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
