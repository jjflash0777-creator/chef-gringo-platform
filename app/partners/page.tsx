/* eslint-disable @next/next/no-img-element -- Partner card imagery mixes Impact affiliate creative, which must be delivered unaltered from its endpoint, with local editorial covers; one direct img pipeline serves both honestly. */
import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateDisclosure } from "../components/AffiliateDisclosure";
import { PARTNER_SHOWCASE } from "../lib/partners";
import styles from "./partners.module.css";

export const metadata: Metadata = {
  title: "Shop My Kitchen",
  description: "The tools and brands the Chef Gringo recipes actually use — every partner, the commercial relationship in plain language, and what each one is for.",
};

/**
 * /partners reframed for readers (redesign blueprint, 2026-11-05):
 * "Shop My Kitchen" leads; the roster cards stay as written; the B2B
 * material moves to one short block at the bottom.
 */
export default function PartnersPage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Shop My Kitchen</p>
      <p className="eyebrow">Shop my kitchen</p>
      <h1>The tools these recipes actually assume.</h1>
      <div className="prose">
        <p className="lede">When a recipe here says check the thickest part of the thigh, season in layers, or keep the cold side cold, these are the tools doing that work. Every card states the commercial relationship in plain terms, and a partner page explains the fit and the limitation before any link out.</p>
      </div>
      <AffiliateDisclosure />

      <section className={styles.roster} aria-labelledby="partner-roster-title">
        <div className="prose">
          <h2 id="partner-roster-title">In the kitchen</h2>
          <p>Inclusion here is advertising, not a ranking — compensation never decides what Chef Gringo recommends, and a partner product can be criticized or skipped when it is not the right tool.</p>
        </div>
        <div className={styles.rosterGrid}>
          {PARTNER_SHOWCASE.map((partner) => (
            <article className={styles.card} key={partner.href}>
              <div className={styles.cardMedia}>
                <img src={partner.image} alt={partner.imageAlt} loading="lazy" decoding="async" />
              </div>
              <div className={styles.cardTop}>
                <span className={styles.cardName}>{partner.name}</span>
                <span className={styles.kind}>{partner.kind}</span>
              </div>
              <p className={styles.role}>{partner.role}</p>
              <p className={styles.blurb}>{partner.blurb}</p>
              <Link className={styles.cardLink} href={partner.href}>Visit the {partner.name} partner page →</Link>
            </article>
          ))}
        </div>
      </section>

      <div className={`prose ${styles.proseNarrow}`} id="work-with-chef-gringo">
        <h2>Work with Chef Gringo</h2>
        <p>For brands: Chef Gringo evaluates affiliate and creator programs, restaurant software referrals, equipment and smallwares programs, and training partnerships. Commercial relationships are evaluated separately from editorial recommendations — participation does not guarantee a favorable recommendation, and audience metrics are shared only when verified; nothing here inflates traffic, follower, or sales claims.</p>
        <p>Affiliate managers and partners can reach Chef Gringo at <a href="mailto:hello@chefgringo.com">hello@chefgringo.com</a>. Readers: start with the cards above, or <Link href="/affiliate-disclosure">read the full affiliate disclosure</Link>.</p>
      </div>
    </div>
  );
}
