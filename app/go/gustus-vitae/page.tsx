/* eslint-disable @next/next/no-img-element -- Impact affiliate ad URLs are external creative endpoints; preserve direct delivery and tracking rather than routing them through Next image optimization. */
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./gustus-vitae.module.css";

export const metadata: Metadata = {
  title: "Gustus Vitae Seasonings & Finishing Salts",
  description:
    "Shop Gustus Vitae small-batch seasonings, rubs, and finishing salts through Chef Gringo — a deliberate pantry upgrade for cooks who season in layers.",
  alternates: { canonical: "/go/gustus-vitae" },
  openGraph: {
    title: "Gustus Vitae Seasonings & Finishing Salts | Chef Gringo",
    description:
      "Shop Gustus Vitae small-batch seasonings, rubs, and finishing salts through Chef Gringo — a deliberate pantry upgrade for cooks who season in layers.",
    url: "/go/gustus-vitae",
  },
};

const GUSTUS_REFERRAL = "https://brownbaglunchllc.sjv.io/AgVrXN";
const GUSTUS_CONTENT_ID = "go:gustus-vitae";

const jobs = [
  {
    label: "FINISHING SALTS",
    icon: "✦",
    title: "The last five seconds of a dish.",
    detail: "A deliberate finishing salt at the plate adds texture and one final seasoning correction that no cooking salt, added an hour earlier, can make.",
    trackingId: "gustus-vitae:finishing-salts",
  },
  {
    label: "SEASONING BLENDS",
    icon: "🧂",
    title: "Weeknight insurance.",
    detail: "A balanced blend turns plain proteins and vegetables into a decided dish on the nights when building a seasoning mix from scratch is not going to happen.",
    trackingId: "gustus-vitae:seasoning-blends",
  },
  {
    label: "RUBS + GRILL",
    icon: "🔥",
    title: "Seasoned, not dusted.",
    detail: "Rubs built for bark, char and smoke only work when they go on early and in enough quantity to matter. The blend is the starting point, not the technique.",
    trackingId: "gustus-vitae:rubs",
  },
  {
    label: "OPERATOR PANTRY",
    icon: "⚖",
    title: "One standard, every cook.",
    detail: "For small operations, a consistent purchased blend can hold a house flavor standard across shifts better than five cooks freelancing from the spice shelf.",
    trackingId: "gustus-vitae:operator-pantry",
  },
] as const;

const strongerFit = [
  "You cook often enough that seasoning in layers — early, during, at the finish — is a real step in your process, not garnish.",
  "Your pantry is mostly commodity spices of unknown age and you want a deliberate, staged upgrade instead of replacing everything at once.",
  "You run a small kitchen and want a seasoning standard that survives staff changes and busy services.",
] as const;

const compareFirst = [
  "You grind and blend everything yourself and want full control of every ratio. A purchased blend is someone else's decision.",
  "Price per ounce is your main filter. Small-batch seasoning loses that comparison every time, on purpose.",
  "The real problem is technique — under-salting early, no acid, tired pans. No blend fixes that, including these.",
] as const;

export default function GustusVitaeCampaignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>Chef Gringo</Link>
        <div className={styles.partnerMark}><span>×</span> Gustus Vitae</div>
        <a href={GUSTUS_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.topCta} data-event="affiliate_click" data-content-id={GUSTUS_CONTENT_ID} data-product-id="gustus-vitae:catalog" data-placement="header">Shop Gustus Vitae →</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Chef Gringo × Gustus Vitae</p>
          <h1>FLAVOR IS A<br /><em>PANTRY</em><br />DECISION.</h1>
          <p className={styles.deck}>Small-batch seasonings, rubs and finishing salts for cooks who treat seasoning as part of the flavor base — not an afterthought shaken on at the pass.</p>
          <div className={styles.heroActions}>
            <a href={GUSTUS_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.primary} data-event="affiliate_click" data-content-id={GUSTUS_CONTENT_ID} data-product-id="gustus-vitae:catalog" data-placement="hero">Shop Gustus Vitae →</a>
            <a href="#pantry" className={styles.secondary}>Start with the job</a>
          </div>
          <p className={styles.disclosureMini}>Chef Gringo may earn compensation from qualifying purchases through this referral link.</p>
        </div>
        <div className={styles.heroPanel}>
          <span className={styles.liveDot}>● THE SEASONING LADDER</span>
          <strong>Season in layers.</strong>
          <p>One shake at the end is not a system.</p>
          <div className={styles.layerStack}>
            <div><span>01</span><b>Salt early — build the base</b></div>
            <div><span>02</span><b>Blend during — carry the flavor</b></div>
            <div><span>03</span><b>Rubs before heat — bark and char</b></div>
            <div><span>04</span><b>Finish at the plate — texture + correction</b></div>
          </div>
        </div>
      </section>

      <section className={styles.signalStrip}>
        <div><strong>SMALL-BATCH</strong><span>seasonings + blends</span></div>
        <div><strong>FINISHING SALTS</strong><span>the last correction</span></div>
        <div><strong>RUBS</strong><span>built for heat</span></div>
        <div><strong>PANTRY SYSTEM</strong><span>one standard, every cook</span></div>
      </section>

      <section className={styles.creativeStrip} aria-label="Gustus Vitae seasoning collections">
        <figure className={styles.creativeFigure}>
          <a href={GUSTUS_REFERRAL} target="_blank" rel="sponsored noreferrer" data-event="affiliate_click" data-content-id={GUSTUS_CONTENT_ID} data-product-id="gustus-vitae:catalog" data-placement="creative-figure"><img src="https://a.impactradius-go.com/display-ad/58359-4103247" alt="Gustus Vitae seasoning gift set" /></a>
          <figcaption>The collection format: gift sets and seasoning collections, sold as a shelf system rather than single jars. Creative supplied by Gustus Vitae through its affiliate program.</figcaption>
        </figure>
        <div className={styles.creativeCopy}>
          <p className={styles.eyebrowDark}>The shelf, as sold</p>
          <h2>Collections first. Single jars second.</h2>
          <p>Gustus Vitae sells its pantry as sets — gift sets, salt collections, and blend collections — which is why the route on this page points at collections, not a lone jar.</p>
        </div>
      </section>

      <section className={styles.jobSection} id="pantry">
        <div className={styles.sectionLead}>
          <p className={styles.eyebrowDark}>Choose by job, not by jar</p>
          <h2>Where does seasoning fail in your kitchen?</h2>
          <p>Most bland food is not under-spiced — it is seasoned at the wrong moment, in one layer, with whatever was closest. Match the product to the moment it has to fix.</p>
        </div>
        <div className={styles.jobGrid}>
          {jobs.map((job, index) => (
            <article key={job.label} className={styles.jobCard}>
              <div className={styles.jobTop}><span className={styles.jobIcon}>{job.icon}</span><b>0{index + 1}</b></div>
              <p>{job.label}</p>
              <h3>{job.title}</h3>
              <span>{job.detail}</span>
              <a href={GUSTUS_REFERRAL} target="_blank" rel="sponsored noreferrer" data-event="affiliate_click" data-content-id={GUSTUS_CONTENT_ID} data-recommendation-id={job.trackingId} data-product-id={job.trackingId} data-placement="job-card">Explore Gustus Vitae →</a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.ruleSection}>
        <div>
          <p className={styles.eyebrow}>Chef Gringo rule</p>
          <h2>Seasoning is a layer.<br />Not a rescue.</h2>
        </div>
        <div>
          <p>A blend cannot fix a dish that was never salted properly, never saw acid, or never built a base. That is the same lesson as mirepoix: the foundation decides what the finish can do. Buy seasoning to strengthen a working process — not to substitute for one.</p>
          <Link href="/learn/mirepoix-foundations-of-flavor" className={styles.ruleLink}>Read the flavor-base flagship: Mirepoix, Foundations of Flavor →</Link>
        </div>
      </section>

      <section className={styles.fitSection}>
        <div className={styles.fitHeading}>
          <p className={styles.eyebrowDark}>Decision check</p>
          <h2>Does a premium pantry earn its shelf space?</h2>
        </div>
        <div className={styles.fitGrid}>
          <article>
            <span>STRONGER FIT</span>
            <h3>Yes, especially if…</h3>
            <ul>{strongerFit.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <span>COMPARE FIRST</span>
            <h3>Slow down if…</h3>
            <ul>{compareFirst.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
        <div className={styles.tradeoff}>
          <p className={styles.eyebrowDark}>The honest tradeoff</p>
          <p>Small-batch spices cost more per ounce than commodity jars, and every blend is a shortcut built on someone else&apos;s ratios. If you do not like their balance, you will spend months seasoning around it. Buy one or two, cook with them for a month, and let the food — not the label — make the case for more.</p>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.eyebrowLight}>Pantry intelligence, applied</p>
          <h2>UPGRADE THE SHELF.</h2>
          <p>See Gustus Vitae&apos;s current seasonings, rubs and finishing salts through Chef Gringo&apos;s approved referral route.</p>
        </div>
        <a href={GUSTUS_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.finalButton} data-event="affiliate_click" data-content-id={GUSTUS_CONTENT_ID} data-product-id="gustus-vitae:catalog" data-placement="final-cta">Shop Gustus Vitae →</a>
        <p className={styles.disclosure}>Chef Gringo participates in the Gustus Vitae affiliate program and may receive compensation from qualifying purchases made through this link. This relationship does not determine Chef Gringo&apos;s recommendations. Product pricing, promotions, availability and formulations can change; verify current details with Gustus Vitae before purchasing.</p>
      </section>

      <footer className={styles.footer}>
        <Link href="/">Chef Gringo</Link>
        <span>Salt early. Season in layers. Finish on purpose.</span>
      </footer>
    </main>
  );
}
