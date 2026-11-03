import type { Metadata } from "next";
import Link from "next/link";
import styles from "./bluetti.module.css";

const BLUETTI_REFERRAL = "https://bluettius.sjv.io/YVvooe";

export const metadata: Metadata = {
  title: "Food-Truck Backup Power: Size the Load First | Chef Gringo",
  description:
    "A practical Chef Gringo guide to sizing backup power for food trucks, catering, refrigeration, and emergency kitchen continuity before choosing a BLUETTI system.",
  alternates: { canonical: "/go/bluetti" },
  openGraph: {
    title: "How Long Can Your Food Truck Run When the Power Goes Out?",
    description: "Calculate the load first. Then decide where portable backup power may fit.",
    url: "/go/bluetti",
  },
};

const loadSteps = [
  {
    number: "01",
    title: "List what must stay on",
    body: "Separate critical loads from nice-to-have loads. Refrigeration, POS, lights, charging, and selected prep equipment may matter more than running every appliance.",
  },
  {
    number: "02",
    title: "Find running watts",
    body: "Use each appliance nameplate or manufacturer documentation. Do not guess from the plug shape or breaker size.",
  },
  {
    number: "03",
    title: "Account for startup demand",
    body: "Compressors and motors can pull more power when they start than while they are already running. Your power source has to survive that moment.",
  },
  {
    number: "04",
    title: "Choose the hours that matter",
    body: "Backup for one service hour is a different problem from protecting refrigeration overnight.",
  },
] as const;

const useCases = [
  {
    label: "Food truck",
    title: "Protect the service, not every outlet.",
    body: "Prioritize refrigeration, POS, lighting, charging, and the equipment that actually keeps you selling. High-draw electric cooking loads can change the equation quickly.",
  },
  {
    label: "Catering + events",
    title: "Plan for the load before leaving the commissary.",
    body: "Portable backup can support selected cold holding, lighting, communications, and prep tools when venue power is limited or unreliable.",
  },
  {
    label: "Refrigeration backup",
    title: "Buy time when the cold side loses power.",
    body: "A correctly sized portable system may help keep a refrigerator or freezer operating during a short outage, but runtime depends on the actual appliance and cycling behavior.",
  },
  {
    label: "Emergency kitchen continuity",
    title: "Keep the essential food system alive.",
    body: "During an outage, the first goal is usually preserving food, communications, lighting, and selected safe-production capability — not recreating full utility service.",
  },
] as const;

const compareFirst = [
  "You have not measured the equipment you actually need to run.",
  "You expect a portable battery to run several high-draw heating appliances at once.",
  "You need whole-building backup and a permanently installed system may be more appropriate.",
  "You are choosing only from advertised battery capacity without checking output, startup demand, charging time, ports, and real-world losses.",
] as const;

export default function BluettiCampaignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>Chef Gringo</Link>
        <span>Food-service backup power</span>
        <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.topCta}>
          See BLUETTI options →
        </a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Chef Gringo × BLUETTI</p>
          <h1>How long can your food truck run when the power goes out?</h1>
          <p className={styles.deck}>
            Do the math before you buy the battery. Start with running watts, startup demand, and the number of hours you actually need.
          </p>
          <div className={styles.heroActions}>
            <a href="#math" className={styles.primary}>Do the math first ↓</a>
            <a href="#fit" className={styles.secondary}>See where BLUETTI may fit</a>
          </div>
          <p className={styles.disclosureMini}>
            Chef Gringo may earn a commission from qualifying purchases. Recommendations are based on practical fit, not commission.
          </p>
        </div>

        <aside className={styles.heroPanel}>
          <span className={styles.panelLabel}>The rule</span>
          <strong>Don’t start with the battery.</strong>
          <p>Start with the equipment that cannot stop.</p>
          <div className={styles.panelStack}>
            <div><b>Running watts</b><span>Can it keep the load on?</span></div>
            <div><b>Startup demand</b><span>Can it handle compressors and motors starting?</span></div>
            <div><b>Watt-hours</b><span>Roughly how much energy is available?</span></div>
            <div><b>Runtime target</b><span>How long do you actually need backup?</span></div>
          </div>
        </aside>
      </section>

      <section className={styles.promiseStrip}>
        <div><strong>Food trucks</strong><span>protect the service window</span></div>
        <div><strong>Catering</strong><span>prepare for weak venue power</span></div>
        <div><strong>Refrigeration</strong><span>buy time during outages</span></div>
        <div><strong>Emergency kitchens</strong><span>prioritize essential loads</span></div>
      </section>

      <section className={styles.mathSection} id="math">
        <div className={styles.sectionLead}>
          <p className={styles.eyebrowDark}>Step 1 · Size the problem</p>
          <h2>Four numbers matter before the brand does.</h2>
          <p>Portable power becomes much easier to evaluate when the kitchen load is broken into simple pieces.</p>
        </div>

        <div className={styles.stepGrid}>
          {loadSteps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>

        <div className={styles.formulaCard}>
          <div>
            <p className={styles.eyebrowDark}>Quick runtime estimate</p>
            <h3>Usable battery energy ÷ average real load ≈ rough runtime</h3>
          </div>
          <div className={styles.formula}>
            <span>usable Wh</span><b>÷</b><span>average watts</span><b>≈</b><span>hours</span>
          </div>
          <p>
            This is only a planning estimate. Conversion losses, inverter overhead, compressor cycling, startup surge, ambient temperature, battery state, and appliance behavior can reduce real-world runtime.
          </p>
        </div>
      </section>

      <section className={styles.useCaseSection}>
        <div className={styles.sectionLead}>
          <p className={styles.eyebrowDark}>Step 2 · Define the job</p>
          <h2>What are you trying to keep running?</h2>
          <p>Different food operations need different backup strategies. Avoid buying power for equipment you do not actually need during the outage.</p>
        </div>

        <div className={styles.useCaseGrid}>
          {useCases.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.productSection} id="fit">
        <div className={styles.productHeading}>
          <p className={styles.eyebrow}>Step 3 · Compare the hardware</p>
          <h2>A BLUETTI reference point: Elite 200 V2</h2>
          <p>
            BLUETTI currently lists the Elite 200 V2 at <strong>2,600W rated output</strong> and <strong>2,073.6Wh capacity</strong>. Those numbers are useful for comparison, but they do not tell you your runtime by themselves.
          </p>
        </div>

        <div className={styles.productGrid}>
          <article className={styles.specCard}>
            <span className={styles.specLabel}>Published specification</span>
            <strong>2,600W</strong>
            <p>Rated output</p>
            <small>Compare this against running load and startup demand.</small>
          </article>
          <article className={styles.specCard}>
            <span className={styles.specLabel}>Published specification</span>
            <strong>2,073.6Wh</strong>
            <p>Battery capacity</p>
            <small>Capacity is not the same as guaranteed usable runtime.</small>
          </article>
          <article className={styles.decisionCard}>
            <span className={styles.specLabel}>Chef Gringo decision</span>
            <h3>Useful only if those numbers fit your load.</h3>
            <p>Two kitchens can buy the same battery and get very different results because their equipment, cycling, surge, and service hours are different.</p>
            <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer">See current BLUETTI options →</a>
          </article>
        </div>
      </section>

      <section className={styles.exampleSection}>
        <div className={styles.sectionLead}>
          <p className={styles.eyebrowDark}>Example planning logic</p>
          <h2>Think in loads, not slogans.</h2>
          <p>These are examples of how to organize the decision — not runtime promises.</p>
        </div>

        <div className={styles.exampleGrid}>
          <article>
            <span>Priority load</span>
            <h3>Cold side first</h3>
            <p>Refrigerator + freezer + POS + lights may be a more realistic emergency package than trying to keep every cooking appliance energized.</p>
          </article>
          <article>
            <span>High-draw warning</span>
            <h3>Electric heat changes everything</h3>
            <p>Griddles, fryers, induction units, water heaters, and other heating equipment can consume far more power than electronics or lighting.</p>
          </article>
          <article>
            <span>Recharge plan</span>
            <h3>What happens after the battery is empty?</h3>
            <p>Outlet charging, vehicle charging, generator support, or solar may matter depending on how long the disruption lasts and where the operation is located.</p>
          </article>
        </div>
      </section>

      <section className={styles.fitSection}>
        <div>
          <p className={styles.eyebrow}>Decision check</p>
          <h2>BLUETTI belongs on the shortlist when the load makes sense.</h2>
        </div>
        <div className={styles.fitGrid}>
          <article>
            <span>Stronger fit</span>
            <ul>
              <li>You have a defined critical load.</li>
              <li>You know the running watts and startup behavior.</li>
              <li>You have a realistic backup-hour target.</li>
              <li>Portable, rechargeable power is useful for the operation.</li>
            </ul>
          </article>
          <article>
            <span>Compare first</span>
            <ul>{compareFirst.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.eyebrow}>The Chef Gringo rule</p>
          <h2>Size the load. Protect the food. Then choose the power.</h2>
          <p>
            If BLUETTI fits the numbers, use the approved referral route below to compare current portable-power options.
          </p>
        </div>
        <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.finalButton}>
          Compare BLUETTI options →
        </a>
        <p className={styles.disclosure}>
          Chef Gringo participates in the BLUETTI affiliate program and may receive compensation from qualifying purchases made through this link. This relationship does not determine Chef Gringo recommendations. Product specifications, pricing, promotions, and availability can change. Confirm current details with BLUETTI before purchasing. Backup-power suitability depends on the actual electrical load and application requirements.
        </p>
      </section>

      <footer className={styles.footer}>
        <Link href="/">Chef Gringo</Link>
        <span>Food-service backup power · practical fit first</span>
      </footer>
    </main>
  );
}
