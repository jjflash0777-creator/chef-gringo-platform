import Link from "next/link";
import styles from "./thermoworks.module.css";

const THERMOWORKS_REFERRAL = "https://thermoworks.sjv.io/k41o50";
const TRACK_COOKING = "https://thermoworks.sjv.io/c/7640961/3270375/39638";
const TRACK_MONITORING = "https://thermoworks.sjv.io/c/7640961/3269923/39638";
const TRACK_ALT_ONE = "https://thermoworks.sjv.io/c/7640961/3262574/39638";
const TRACK_ALT_TWO = "https://thermoworks.sjv.io/c/7640961/3259031/39638";

const jobs = [
  {
    eyebrow: "COOKING",
    title: "Hit the doneness you actually wanted.",
    detail: "Fast spot checks for steaks, chicken, roasts, bread, frying and other cooks where a few degrees change the result.",
    image: "https://a.impactradius-go.com/display-ad/39638-3270375",
    href: TRACK_COOKING,
  },
  {
    eyebrow: "BBQ + SMOKING",
    title: "Watch the cook without living at the pit.",
    detail: "Leave-in probes and multi-channel monitoring make long cooks easier to manage without guessing what is happening inside.",
    image: "https://a.impactradius-go.com/display-ad/39638-3262574",
    href: TRACK_ALT_ONE,
  },
  {
    eyebrow: "REFRIGERATION",
    title: "Know when the cold side starts drifting.",
    detail: "Monitoring tools can help surface refrigerator, freezer and walk-in temperature changes before they become a larger operational problem.",
    image: "https://a.impactradius-go.com/display-ad/39638-3269923",
    href: TRACK_MONITORING,
  },
  {
    eyebrow: "PRO KITCHEN",
    title: "Make temperature part of the system.",
    detail: "Use the right tool for cooking, cooling, holding and other temperature-sensitive checkpoints instead of relying on one generic probe.",
    image: "https://a.impactradius-go.com/display-ad/39638-3259031",
    href: TRACK_ALT_TWO,
  },
] as const;

const fit = [
  "Temperature directly affects the quality or safety of what you cook, hold, cool, smoke or store.",
  "You cook often enough that speed, repeatability, alarms or remote monitoring have real value.",
  "You manage a restaurant, food truck, smoker, refrigerator, freezer or other temperature-sensitive operation.",
] as const;

const compare = [
  "You only need a thermometer a few times a year and a basic check is enough.",
  "Lowest possible purchase price matters more than speed, monitoring or repeatability.",
  "You have not identified the actual temperature problem you are trying to solve yet.",
] as const;

export default function ThermoWorksCampaignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>Chef Gringo</Link>
        <div className={styles.partnerMark}><span>×</span> ThermoWorks</div>
        <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.topCta}>Shop ThermoWorks →</a>
      </header>

      <section className={styles.hero}>
        <img className={styles.heroImage} src="https://a.impactradius-go.com/display-ad/39638-3270375" alt="ThermoWorks temperature tool being used while cooking" />
        <div className={styles.heroShade} />
        <div className={styles.heroContent}>
          <p className={styles.heroKicker}>CHEF GRINGO × THERMOWORKS</p>
          <h1>KNOW THE<br />TEMPERATURE.<br /><em>NAIL THE COOK.</em></h1>
          <p className={styles.heroDeck}>Professional temperature tools for the grill, kitchen, smoker and cold side — matched to the job instead of the hype.</p>
          <div className={styles.heroActions}>
            <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.yellowButton}>SHOP THERMOWORKS →</a>
            <a href="#choose" className={styles.ghostButton}>COMPARE BY JOB ↓</a>
          </div>
          <p className={styles.heroDisclosure}>Chef Gringo may earn compensation from qualifying purchases through this referral link.</p>
        </div>
        <div className={styles.heroProof}>
          <div><span>FAST</span><strong>1 second</strong><p>ThermoWorks currently lists one-second readings for Thermapen ONE.</p></div>
          <div><span>PRECISE</span><strong>±0.5°F</strong><p>Current published Thermapen ONE accuracy specification.</p></div>
          <div><span>CONNECTED</span><strong>NODE</strong><p>Wi-Fi/cloud monitoring, alerts and temperature history.</p></div>
        </div>
      </section>

      <section className={styles.chooseIntro} id="choose">
        <div>
          <p className={styles.kicker}>CHOOSE BY JOB, NOT HYPE</p>
          <h2>What are you actually trying to control?</h2>
        </div>
        <p>One quick steak check and one overnight brisket are different problems. A walk-in refrigerator is another problem entirely. Start with the job, then choose the tool.</p>
      </section>

      <section className={styles.jobGrid}>
        {jobs.map((job) => (
          <a key={job.eyebrow} href={job.href} target="_blank" rel="sponsored noreferrer" className={styles.jobCard}>
            <div className={styles.jobImageWrap}><img src={job.image} alt={`${job.eyebrow} ThermoWorks use case`} /></div>
            <div className={styles.jobCopy}>
              <span>{job.eyebrow}</span>
              <h3>{job.title}</h3>
              <p>{job.detail}</p>
              <b>EXPLORE TOOLS →</b>
            </div>
          </a>
        ))}
      </section>

      <section className={styles.productBand}>
        <article className={styles.productFeature}>
          <div className={styles.productImage}><img src="https://a.impactradius-go.com/display-ad/39638-3270153" alt="ThermoWorks instant-read thermometer" /></div>
          <div>
            <p className={styles.yellowKicker}>INSTANT-READ BENCHMARK</p>
            <h2>Thermapen ONE</h2>
            <p>ThermoWorks currently describes Thermapen ONE as delivering one-second readings with ±0.5°F accuracy. That matters when the reading needs to happen during active cooking or service, not after the moment has passed.</p>
            <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer">SEE CURRENT OPTIONS →</a>
          </div>
        </article>
        <article className={styles.productFeature}>
          <div className={styles.productImage}><img src="https://a.impactradius-go.com/display-ad/39638-3269923" alt="ThermoWorks remote temperature monitoring" /></div>
          <div>
            <p className={styles.yellowKicker}>COLD-SIDE MONITORING</p>
            <h2>NODE</h2>
            <p>NODE products serve a different job: Wi-Fi/cloud temperature monitoring, configurable alerts and history for environments such as refrigerators and freezers while you are somewhere else.</p>
            <a href={TRACK_MONITORING} target="_blank" rel="sponsored noreferrer">EXPLORE MONITORING →</a>
          </div>
        </article>
      </section>

      <section className={styles.decisionSection}>
        <div className={styles.decisionHeading}>
          <p className={styles.kicker}>CHEF GRINGO DECISION CHECK</p>
          <h2>A better thermometer is useful only if it solves your problem.</h2>
        </div>
        <div className={styles.decisionGrid}>
          <article className={styles.yesCard}>
            <span>STRONGER FIT</span>
            <h3>ThermoWorks makes more sense if…</h3>
            <ul>{fit.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <article className={styles.noCard}>
            <span>COMPARE FIRST</span>
            <h3>Slow down before buying if…</h3>
            <ul>{compare.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <p>COOK WITH A NUMBER, NOT A HUNCH.</p>
        <h2>Measure it. Then make the call.</h2>
        <div className={styles.finalActions}>
          <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.yellowButton}>SHOP THERMOWORKS →</a>
          <Link href="/?audience=restaurant#operator-question" className={styles.finalSecondary}>Not sure what you need? Ask Chef Gringo →</Link>
        </div>
        <p className={styles.disclosure}>Chef Gringo participates in the ThermoWorks affiliate program and may receive compensation from qualifying purchases made through these links. This relationship does not determine Chef Gringo recommendations. Product pricing, promotions, availability and specifications can change; verify current details with ThermoWorks before purchasing.</p>
      </section>

      <footer className={styles.footer}><Link href="/">Chef Gringo</Link><span>Decision first. Commercial route second.</span></footer>
    </main>
  );
}
