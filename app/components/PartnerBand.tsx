/* eslint-disable @next/next/no-img-element -- Band thumbnails include Impact affiliate creative, which must be delivered unaltered from its endpoint rather than routed through image optimization. */
import Link from "next/link";
import { PARTNER_SHOWCASE } from "../lib/partners";
import styles from "./PartnerBand.module.css";

/**
 * Homepage Shop My Kitchen strip (redesign blueprint, 2026-11-05): the
 * partner roster, framed for readers — the tools these recipes actually
 * assume. Advertising, labeled as such; it never feeds any ranking.
 */
export function PartnerBand() {
  return (
    <section className={styles.band} aria-labelledby="partner-band-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <div>
            <p className={styles.kicker}>Shop my kitchen</p>
            <h2 id="partner-band-title">The tools these recipes actually use</h2>
          </div>
          <p>When a post on this site sends you to a tool, a store, or a system, it is usually one of these. The commercial relationship is stated on every card — and it never decides the recommendation.</p>
        </div>
        <div className={styles.grid}>
          {PARTNER_SHOWCASE.map((partner) => (
            <Link className={styles.card} href={partner.href} key={partner.href}>
              <span className={styles.media}>
                <img src={partner.image} alt={partner.imageAlt} loading="lazy" decoding="async" />
              </span>
              <span className={styles.kind}>{partner.kind}</span>
              <h3>{partner.name}</h3>
              <p>{partner.role}</p>
              <strong>See it in my kitchen →</strong>
            </Link>
          ))}
        </div>
        <p className={styles.foot}>
          <Link href="/partners">Shop My Kitchen — every partner, what the deal is, in plain language →</Link>
        </p>
      </div>
    </section>
  );
}
