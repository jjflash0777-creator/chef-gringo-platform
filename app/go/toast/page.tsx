import Link from "next/link";
import styles from "./toast.module.css";

const TOAST_REFERRAL = "https://toast.partner-experience.com/r/R-UXCQ-UTI3";

const operatorAreas = [
  ["ORDER", "Point of sale + handhelds", "Take orders and payments where the work is happening."],
  ["MAKE", "Kitchen Display System", "Keep orders moving through high-volume kitchen workflows."],
  ["SERVE", "Guest experience", "Connect ordering, payments, and service without stitching together unrelated tools."],
  ["GROW", "Online ordering + marketing", "Bring guests in, bring them back, and keep the relationship connected."],
  ["MANAGE", "Team + integrations", "Connect payroll, scheduling, integrations, and operating data as the business grows."],
] as const;

const fit = [
  "You run a restaurant and want restaurant-specific workflows rather than generic retail software.",
  "Handheld ordering, kitchen display, or online ordering matter to your operation.",
  "You want more of the operating stack connected instead of managing a pile of disconnected systems.",
  "You expect your technology needs to grow with the restaurant.",
] as const;

const compare = [
  "You only need extremely basic payment processing.",
  "Lowest possible upfront cost is the deciding factor.",
  "Your operation depends on unusual integrations that need to be verified first.",
  "You are already deeply committed to another ecosystem and switching costs may outweigh the upside.",
] as const;

export default function ToastCampaignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>Chef Gringo</Link>
        <span>Independent restaurant technology</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroImage} aria-hidden="true" />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Chef Gringo × Toast · restaurant POS</p>
          <h1>Running a restaurant is hard enough. <em>Your POS shouldn’t make it harder.</em></h1>
          <p className={styles.deck}>See whether Toast fits the way your restaurant actually operates — from orders and payments to kitchen flow, online ordering, team management, and growth.</p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href={TOAST_REFERRAL} target="_blank" rel="sponsored noreferrer">See the Toast offer →</a>
            <a className={styles.secondary} href="#fit">Is Toast a fit?</a>
          </div>
          <p className={styles.offer}><strong>$500 off Toast hardware</strong> through the current Toast Advocates referral offer. Terms and eligibility apply.</p>
        </div>
      </section>

      <section className={styles.intro}>
        <div>
          <p className={styles.kicker}>Built around restaurant reality</p>
          <h2>One operating stack. Five places the restaurant feels it.</h2>
        </div>
        <p>Toast combines restaurant point of sale with handhelds, kitchen display, online ordering, marketing, integrations, and team-management capabilities. Chef Gringo translates that feature list into the parts of an operation that actually have to work together.</p>
      </section>

      <section className={styles.system} aria-label="Toast restaurant operating system">
        {operatorAreas.map(([step, title, detail]) => (
          <article key={step}>
            <span>{step}</span>
            <h3>{title}</h3>
            <p>{detail}</p>
          </article>
        ))}
      </section>

      <section className={styles.fitSection} id="fit">
        <div className={styles.fitHeading}>
          <p className={styles.kicker}>Chef Gringo decision check</p>
          <h2>Would I actually consider Toast?</h2>
          <p>A referral is only useful if the system fits the operation. Start here before clicking through.</p>
        </div>
        <div className={styles.fitGrid}>
          <article className={styles.goodFit}>
            <span>STRONGER FIT</span>
            <h3>Toast deserves a look if…</h3>
            <ul>{fit.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className={styles.thinkTwice}>
            <span>COMPARE FIRST</span>
            <h3>Slow down if…</h3>
            <ul>{compare.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
        <Link className={styles.askLink} href="/?audience=restaurant#operator-question">Not sure? Ask Chef Gringo about your operation →</Link>
      </section>

      <section className={styles.proof}>
        <div className={styles.proofImage} aria-hidden="true" />
        <div className={styles.proofCopy}>
          <p className={styles.kicker}>Why it is worth considering</p>
          <h2>Restaurant-specific tools instead of a generic checkout counter.</h2>
          <p>Toast’s current platform materials describe POS, handhelds, Kitchen Display System, Toast IQ, online ordering, marketing, integrations, and team management as connected parts of the platform. That breadth is the reason Chef Gringo considers Toast when an operator wants more than basic payments.</p>
          <p className={styles.limit}><strong>The limitation:</strong> breadth can also mean more system than a very small or extremely simple operation needs. Verify pricing, contract terms, integrations, and switching costs for your exact restaurant before committing.</p>
        </div>
      </section>

      <section className={styles.offerSection}>
        <p className={styles.kicker}>Current Chef Gringo referral offer</p>
        <h2>$500 off Toast hardware.</h2>
        <p>Use Chef Gringo’s Toast referral route to see the current offer and continue with Toast. Toast’s terms and eligibility determine the final offer.</p>
        <a className={styles.offerButton} href={TOAST_REFERRAL} target="_blank" rel="sponsored noreferrer">See the Toast offer →</a>
        <p className={styles.disclosure}>Chef Gringo participates in the Toast Advocates referral program and may receive compensation if a qualifying referred business becomes a Toast customer. This commercial relationship does not determine Chef Gringo’s recommendations.</p>
      </section>

      <footer className={styles.footer}>
        <Link href="/">Chef Gringo</Link>
        <span>Decision first. Commercial route second.</span>
      </footer>
    </main>
  );
}
