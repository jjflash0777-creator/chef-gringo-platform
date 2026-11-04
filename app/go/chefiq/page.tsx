import type { Metadata } from "next";
import Link from "next/link";
import styles from "./chefiq.module.css";

export const metadata: Metadata = {
  title: "Chef iQ Guided Smart Cooking",
  description:
    "Shop the Chef iQ and Chefman guided-cooking ecosystem through Chef Gringo — guided recipes and connected temperature tracking for home cooks.",
  alternates: { canonical: "/go/chefiq" },
  openGraph: {
    title: "Chef iQ Guided Smart Cooking | Chef Gringo",
    description:
      "Shop the Chef iQ and Chefman guided-cooking ecosystem through Chef Gringo — guided recipes and connected temperature tracking for home cooks.",
    url: "/go/chefiq",
  },
};

const CHEFIQ_REFERRAL = "https://chefiq.pxf.io/YVGO3B";
const CHEFIQ_CONTENT_ID = "go:chefiq";

const jobs = [
  {
    eyebrow: "GUIDED COOKING",
    icon: "🧭",
    title: "A recipe that cooks along with you.",
    detail: "Guided recipes break the cook into managed steps and adjust as the food progresses, so the process is followed instead of reconstructed from memory.",
    trackingId: "chefiq:guided-cooking",
  },
  {
    eyebrow: "SMART PROBE",
    icon: "🌡️",
    title: "Doneness without the lid-lifting ritual.",
    detail: "A connected probe tracks internal temperature from inside the food, so doneness is monitored continuously instead of checked in hopeful intervals.",
    trackingId: "chefiq:smart-probe",
  },
  {
    eyebrow: "CHEFMAN APPLIANCES",
    icon: "🍳",
    title: "Countertop gear in the same system.",
    detail: "The Chef iQ program also covers Chefman countertop appliances built to work with the same guided-cooking approach, rather than a drawer of unrelated gadgets.",
    trackingId: "chefiq:chefman-appliances",
  },
  {
    eyebrow: "NEW COOKS",
    icon: "✦",
    title: "Training wheels that actually teach.",
    detail: "For cooks still building confidence, guided steps and live temperature feedback turn “is it done yet?” into a skill instead of a recurring worry.",
    trackingId: "chefiq:new-cooks",
  },
] as const;

const fit = [
  "You like cooking with a plan — steps in front of you, temperature tracked, fewer decisions left to instinct alone.",
  "You regularly cook proteins where doneness is the whole dish and guesswork keeps costing you meals.",
  "You are outfitting a home kitchen and would rather buy appliances that work as one system than one at a time.",
] as const;

const compare = [
  "You cook by feel and do not want a phone mediating your time at the stove.",
  "You cook professionally, where personal phones stay off the line and technique has to live in your hands.",
  "You already own capable appliances and would only be replacing them to join an ecosystem.",
] as const;

export default function ChefIqCampaignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>Chef Gringo</Link>
        <div className={styles.partnerMark}><span>×</span> Chef iQ</div>
        <a href={CHEFIQ_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.topCta} data-event="affiliate_click" data-content-id={CHEFIQ_CONTENT_ID} data-product-id="chefiq:catalog" data-placement="header">Shop Chef iQ →</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <p className={styles.heroKicker}>CHEF GRINGO × CHEF IQ</p>
          <h1>COOK WITH<br />A GUIDE.<br /><em>NOT A GUESS.</em></h1>
          <p className={styles.heroDeck}>The Chef iQ ecosystem pairs Chefman and Chef iQ devices with step-by-step guided recipes and connected temperature tracking — built for home cooks who want the process managed, not memorized.</p>
          <div className={styles.heroActions}>
            <a href={CHEFIQ_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.goldButton} data-event="affiliate_click" data-content-id={CHEFIQ_CONTENT_ID} data-product-id="chefiq:catalog" data-placement="hero">SHOP CHEF IQ →</a>
            <a href="#choose" className={styles.ghostButton}>CHOOSE BY JOB ↓</a>
          </div>
          <p className={styles.heroDisclosure}>Chef Gringo may earn compensation from qualifying purchases through this referral link.</p>
        </div>
        <div className={styles.heroPanel}>
          <span className={styles.liveDot}>● THE GUIDED LOOP</span>
          <strong>Guidance is the product.</strong>
          <p>The hardware is how it reaches the food.</p>
          <div className={styles.stepStack}>
            <div><span>01</span><b>Pick a guided recipe</b></div>
            <div><span>02</span><b>Probe in, lid on</b></div>
            <div><span>03</span><b>Follow prompts, not hunches</b></div>
            <div><span>04</span><b>Pull at the temperature, not the timer</b></div>
          </div>
        </div>
      </section>

      <section className={styles.chooseIntro} id="choose">
        <div>
          <p className={styles.kicker}>CHOOSE BY JOB, NOT HYPE</p>
          <h2>What do you want the system to do for you?</h2>
        </div>
        <p>Smart cooking is not one product. A guided recipe, a connected probe and a countertop appliance solve different problems. Start with the job, then decide whether the ecosystem earns its place.</p>
      </section>

      <section className={styles.jobGrid}>
        {jobs.map((job, index) => (
          <a key={job.eyebrow} href={CHEFIQ_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.jobCard} data-event="affiliate_click" data-content-id={CHEFIQ_CONTENT_ID} data-recommendation-id={job.trackingId} data-product-id={job.trackingId} data-placement="job-card">
            <div className={styles.jobTop}><span className={styles.jobIcon}>{job.icon}</span><b>0{index + 1}</b></div>
            <span className={styles.jobEyebrow}>{job.eyebrow}</span>
            <h3>{job.title}</h3>
            <p>{job.detail}</p>
            <b className={styles.jobLink}>EXPLORE CHEF IQ →</b>
          </a>
        ))}
      </section>

      <section className={styles.decisionSection}>
        <div className={styles.decisionHeading}>
          <p className={styles.kicker}>CHEF GRINGO DECISION CHECK</p>
          <h2>Guided cooking is useful only if guidance is what you are missing.</h2>
        </div>
        <div className={styles.decisionGrid}>
          <article className={styles.yesCard}>
            <span>STRONGER FIT</span>
            <h3>Chef iQ makes more sense if…</h3>
            <ul>{fit.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className={styles.noCard}>
            <span>COMPARE FIRST</span>
            <h3>Slow down before buying if…</h3>
            <ul>{compare.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className={styles.tradeoff}>
        <div>
          <p className={styles.kicker}>THE HONEST TRADEOFF</p>
          <h2>The guidance lives in the app.</h2>
          <p>No phone, no charge, or no interest in staying inside one brand&apos;s ecosystem — and much of what you are paying for goes unused. The devices still cook. But the guided system is the point of the purchase, so buy it only if you will actually cook that way.</p>
        </div>
        <div className={styles.tradeoffLinks}>
          <Link href="/learn/mirepoix-foundations-of-flavor">Prefer to build the skill instead? Start with Foundations of Flavor →</Link>
          <Link href="/#operator-question">Not sure what you need? Ask Chef Gringo →</Link>
        </div>
      </section>

      <section className={styles.finalCta}>
        <p>STEPS ON SCREEN. TEMPERATURE TRACKED.</p>
        <h2>Cook the meal. Learn the pattern.</h2>
        <div className={styles.finalActions}>
          <a href={CHEFIQ_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.goldButton} data-event="affiliate_click" data-content-id={CHEFIQ_CONTENT_ID} data-product-id="chefiq:catalog" data-placement="final-cta">SHOP CHEF IQ →</a>
          <Link href="/#operator-question" className={styles.finalSecondary}>Not sure what you need? Ask Chef Gringo →</Link>
        </div>
        <p className={styles.disclosure}>Chef Gringo participates in the Chef iQ affiliate program and may receive compensation from qualifying purchases made through these links. The program covers Chef iQ and Chefman products. This relationship does not determine Chef Gringo recommendations. Product pricing, promotions, availability and specifications can change; verify current details with Chef iQ before purchasing.</p>
      </section>

      <footer className={styles.footer}><Link href="/">Chef Gringo</Link><span>Decision first. Commercial route second.</span></footer>
    </main>
  );
}
