import Link from "next/link";
import { PARTNER_SHOWCASE } from "../lib/partners";
import styles from "./PartnerBand.module.css";

/**
 * Homepage partner band: the roster, on the front door. Advertising,
 * labeled as such — it never feeds Marketplace ranking.
 */
export function PartnerBand() {
  return (
    <section className={styles.band} aria-labelledby="partner-band-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <div>
            <p className={styles.kicker}>Our partners</p>
            <h2 id="partner-band-title">The brands behind the routes</h2>
          </div>
          <p>When Chef Gringo sends you to a tool, a store, or a system, it is usually one of these. The commercial relationship is stated on every card — and it never decides the recommendation.</p>
        </div>
        <div className={styles.grid}>
          {PARTNER_SHOWCASE.map((partner) => (
            <Link className={styles.card} href={partner.href} key={partner.href}>
              <span className={styles.kind}>{partner.kind}</span>
              <h3>{partner.name}</h3>
              <p>{partner.role}</p>
              <strong>See the partner page →</strong>
            </Link>
          ))}
        </div>
        <p className={styles.foot}>
          <Link href="/partners">Meet the partners — who they are, what the deal is, and how new ones get evaluated →</Link>
        </p>
      </div>
    </section>
  );
}
