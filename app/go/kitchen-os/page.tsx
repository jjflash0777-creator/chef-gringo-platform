import Link from "next/link";
import styles from "./kitchen-os.module.css";

const KITCHEN_OS_REFERRAL = "https://www.kitchen-os.com/?ref=josh45";

const jobs = [
  { label: "FOOD SAFETY", title: "Stop relying on paper logs.", copy: "Kitchen OS Food Safe System digitises HACCP records and can add continuous fridge/freezer monitoring with alerts and audit-ready reporting." },
  { label: "ALLERGENS", title: "Make allergen information easier to manage.", copy: "AllerQ provides QR-based allergen menus with live updates and multilingual support for guest-facing menus." },
  { label: "LABELLING", title: "Make prep labels consistent every shift.", copy: "The Food Label System prints date labels with use-by dates, allergen information, and barcodes from a tablet-and-printer workflow." },
  { label: "WASTE", title: "Turn food waste into something you can measure.", copy: "Kitchen OS also offers waste-tracking tools designed to surface where food is being lost and where intervention may pay back." },
] as const;

const fits = [
  "You run a professional kitchen where food safety, allergens, labelling, or waste are recurring operational problems.",
  "Your team still relies heavily on paper logs, handwritten labels, or disconnected spreadsheets.",
  "You manage multiple sites and need more consistency across kitchens.",
  "You want to solve one problem first and add other modules later rather than buying a giant ERP on day one.",
] as const;

const compare = [
  "Your main need is full POS, payroll, procurement, or enterprise resource planning rather than kitchen compliance operations.",
  "You are outside Kitchen OS's primary UK market and have not confirmed product availability for your location.",
  "You do not currently have meaningful compliance, allergen, labelling, or waste-management friction.",
  "You are evaluating the platform only because of a headline savings claim — verify your own workflow and economics first.",
] as const;

export default function KitchenOSCampaignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>Chef Gringo</Link>
        <span>Kitchen operations · food safety · compliance</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroMedia} aria-hidden="true" />
        <div className={styles.overlay} aria-hidden="true" />
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Chef Gringo × Kitchen OS</p>
          <h1>RUN THE KITCHEN.<br/><em>NOT THE PAPERWORK.</em></h1>
          <p className={styles.deck}>Food safety, allergen menus, prep labels, and waste tracking are different problems — but they all live in the same kitchen. Kitchen OS is built to bring those workflows into one operating layer.</p>
          <div className={styles.actions}>
            <a className={styles.primary} href={KITCHEN_OS_REFERRAL} target="_blank" rel="sponsored noreferrer">Explore Kitchen OS →</a>
            <a className={styles.secondary} href="#jobs">See what it actually does</a>
          </div>
          <p className={styles.disclosureMini}>Chef Gringo may earn compensation from qualifying referrals through this link.</p>
        </div>
      </section>

      <section className={styles.truthStrip}>
        <span>HACCP + TEMPERATURE</span><span>ALLERGEN MENUS</span><span>PREP LABELLING</span><span>WASTE TRACKING</span>
      </section>

      <section className={styles.intro} id="jobs">
        <div>
          <p className={styles.kicker}>Start with the problem</p>
          <h2>One platform. Four kitchen jobs.</h2>
        </div>
        <p>Kitchen OS currently brings together Food Safe System, AllerQ, Food Label System, and F*** Waste. Each module can solve a separate operational problem, and operators can use one module or combine them. Kitchen OS is primarily built for professional kitchens in the UK.</p>
      </section>

      <section className={styles.jobGrid}>
        {jobs.map((job, index) => (
          <article className={styles.jobCard} key={job.label}>
            <div className={styles.cardPhoto + " " + styles[`photo${index + 1}` as keyof typeof styles]} aria-hidden="true" />
            <div className={styles.cardBody}>
              <span>{job.label}</span>
              <h3>{job.title}</h3>
              <p>{job.copy}</p>
              <a href={KITCHEN_OS_REFERRAL} target="_blank" rel="sponsored noreferrer">See Kitchen OS →</a>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.darkSplit}>
        <div className={styles.darkCopy}>
          <p className={styles.kicker}>The real operational pain</p>
          <h2>When the system depends on memory, somebody eventually misses something.</h2>
          <p>Paper temperature logs, handwritten labels, recipe changes, allergen updates, and invisible waste all create the same problem: the kitchen is relying on people to remember dozens of small controls during service.</p>
          <a href={KITCHEN_OS_REFERRAL} target="_blank" rel="sponsored noreferrer">See how Kitchen OS handles it →</a>
        </div>
        <div className={styles.dashboardPanel}>
          <div><span>01</span><strong>MONITOR</strong><p>Fridges, freezers, food-safety records</p></div>
          <div><span>02</span><strong>STANDARDISE</strong><p>Labels, allergen information, routines</p></div>
          <div><span>03</span><strong>ALERT</strong><p>Surface problems before inspection day</p></div>
          <div><span>04</span><strong>LEARN</strong><p>Use waste and compliance data to improve</p></div>
        </div>
      </section>

      <section className={styles.fitSection}>
        <div className={styles.fitHeading}>
          <p className={styles.kicker}>Chef Gringo decision check</p>
          <h2>Is Kitchen OS actually a fit?</h2>
        </div>
        <div className={styles.fitGrid}>
          <article>
            <span>STRONGER FIT</span>
            <h3>It deserves a look if…</h3>
            <ul>{fits.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <span>COMPARE FIRST</span>
            <h3>Slow down if…</h3>
            <ul>{compare.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className={styles.pricingSection}>
        <div>
          <p className={styles.kicker}>Current public pricing structure</p>
          <h2>Start small instead of buying the whole stack.</h2>
        </div>
        <div className={styles.priceCards}>
          <article><span>ALLERQ</span><strong>£7.49/mo</strong><p>Digital allergen menus per location.</p></article>
          <article><span>FOOD SAFE SYSTEM</span><strong>from £15/mo</strong><p>Digital food-safety workflows; sensor pricing/setup varies by tier.</p></article>
          <article><span>FOOD LABEL SYSTEM</span><strong>£35/mo</strong><p>Tablet + printer included in the current public plan.</p></article>
        </div>
        <p className={styles.priceNote}>Pricing and availability can change. Kitchen OS currently advertises a 14-day free trial with no credit card required and primarily serves UK professional kitchens. Verify the current terms for your location before purchasing.</p>
      </section>

      <section className={styles.finalCta}>
        <p className={styles.kicker}>Less admin. More control.</p>
        <h2>Make the kitchen easier to run.</h2>
        <p>See Kitchen OS's current products, pricing, trial options, and availability through Chef Gringo's referral route.</p>
        <a className={styles.finalButton} href={KITCHEN_OS_REFERRAL} target="_blank" rel="sponsored noreferrer">Explore Kitchen OS →</a>
        <p className={styles.disclosure}>Chef Gringo participates in the Kitchen OS referral program and may receive compensation from qualifying referrals or purchases. This relationship does not determine Chef Gringo's recommendations. Product features, pricing, availability, and regulatory suitability vary by location and can change.</p>
      </section>

      <footer className={styles.footer}><Link href="/">Chef Gringo</Link><span>Decision first. Commercial route second.</span></footer>
    </main>
  );
}
