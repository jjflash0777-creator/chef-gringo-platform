import Link from "next/link";
import styles from "./thermoworks.module.css";

const THERMOWORKS_REFERRAL = "https://thermoworks.sjv.io/k41o50";

const useCases = [
  { label: "HOME COOKING", title: "Stop guessing at doneness.", detail: "Instant-read temperature checks give you a fast answer when steaks, chicken, roasts, bread, candy, or frying actually depend on temperature." },
  { label: "PRO KITCHEN", title: "Make temperature part of the system.", detail: "Use instant reads and alarm thermometers to verify cooking, cooling, holding, and other temperature-sensitive steps without slowing service." },
  { label: "BBQ + SMOKING", title: "Watch the cook without living at the smoker.", detail: "Multi-probe and alarm tools make long cooks easier to monitor while keeping the pit and food temperatures visible." },
  { label: "COLD HOLDING", title: "Know when refrigeration starts drifting.", detail: "Remote monitoring can surface fridge, freezer, and walk-in temperature changes before a small problem becomes product loss." },
] as const;

const fit = [
  "Temperature directly affects the quality or safety of what you cook, hold, cool, smoke, or store.",
  "You want purpose-built temperature tools rather than relying on a cheap generic probe as your only reference.",
  "You cook often enough that speed, repeatability, alarms, or remote monitoring have real value.",
  "You manage a commercial kitchen, food truck, smoker, refrigerator, freezer, or other temperature-sensitive operation.",
] as const;

const compare = [
  "You rarely cook foods where internal temperature matters and only need an occasional basic check.",
  "The lowest possible purchase price matters more than speed, monitoring, durability, or calibration documentation.",
  "You are shopping for a tool category ThermoWorks does not actually specialize in.",
  "A current product or promotion is the only reason you are considering the purchase — verify the real need first.",
] as const;

export default function ThermoWorksCampaignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>Chef Gringo</Link>
        <span>Temperature intelligence · cooking + food safety</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Chef Gringo × ThermoWorks</p>
          <h1>Know the temperature. <em>Lose the guesswork.</em></h1>
          <p className={styles.deck}>From a weeknight chicken breast to a walk-in refrigerator, temperature is one of the few kitchen variables you can actually measure. ThermoWorks builds tools around that measurement.</p>
          <div className={styles.actions}>
            <a className={styles.primary} href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer">Shop ThermoWorks →</a>
            <a className={styles.secondary} href="#choose">Find the right use case</a>
          </div>
          <p className={styles.disclosureMini}>Chef Gringo may earn compensation from qualifying purchases through this referral link.</p>
        </div>
        <div className={styles.heroProduct}>
          <div className={styles.productHalo} />
          <img src="https://a.impactradius-go.com/display-ad/39638-3270153" width="320" height="320" alt="ThermoWorks product" />
          <div className={styles.metric}><strong>Measure first.</strong><span>Decide second.</span></div>
        </div>
      </section>

      <section className={styles.truthStrip}>
        <span>INSTANT READ</span><span>ALARM + PROBE</span><span>BBQ / SMOKING</span><span>FRIDGE + FREEZER</span><span>REMOTE MONITORING</span>
      </section>

      <section className={styles.intro} id="choose">
        <div>
          <p className={styles.kicker}>Start with what you are trying to control</p>
          <h2>Not every cook needs the same thermometer.</h2>
        </div>
        <p>Chef Gringo’s job is not to push the most expensive tool. It is to match the temperature problem to the right category — quick spot checks, leave-in alarms, long-cook monitoring, or continuous refrigeration monitoring.</p>
      </section>

      <section className={styles.useCases}>
        {useCases.map((item, index) => (
          <article key={item.label} className={styles.useCard}>
            <div className={styles.cardIndex}>0{index + 1}</div>
            <p>{item.label}</p>
            <h3>{item.title}</h3>
            <span>{item.detail}</span>
            <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer">Explore tools →</a>
          </article>
        ))}
      </section>

      <section className={styles.featureSplit}>
        <div className={styles.featureDark}>
          <p className={styles.kicker}>Instant-read benchmark</p>
          <h2>Thermapen ONE</h2>
          <div className={styles.bigMetric}>1<span>second</span></div>
          <p>ThermoWorks currently describes Thermapen ONE as delivering one-second readings with ±0.5°F accuracy. That combination is useful when the check needs to happen quickly — especially during active cooking or service.</p>
          <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer">See current ThermoWorks options →</a>
        </div>
        <div className={styles.featureLight}>
          <p className={styles.kicker}>Continuous monitoring</p>
          <h2>Refrigeration should tell you when it starts going wrong.</h2>
          <p>ThermoWorks NODE products are designed for Wi-Fi/cloud monitoring with configurable alerts, historical data, and fridge/freezer applications. That is a different job from an instant-read probe: it watches the environment while you are somewhere else.</p>
          <div className={styles.monitorDiagram}>
            <div><strong>WALK-IN</strong><span>temperature</span></div>
            <b>→</b>
            <div><strong>NODE</strong><span>monitor + log</span></div>
            <b>→</b>
            <div><strong>ALERT</strong><span>respond earlier</span></div>
          </div>
        </div>
      </section>

      <section className={styles.fitSection}>
        <div className={styles.fitHeading}>
          <p className={styles.kicker}>Chef Gringo decision check</p>
          <h2>Is ThermoWorks worth considering for you?</h2>
        </div>
        <div className={styles.fitGrid}>
          <article>
            <span>STRONGER FIT</span>
            <h3>Yes, especially if…</h3>
            <ul>{fit.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <span>COMPARE FIRST</span>
            <h3>Slow down if…</h3>
            <ul>{compare.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className={styles.chooseSection}>
        <p className={styles.kicker}>Choose by job, not hype</p>
        <h2>What are you measuring?</h2>
        <div className={styles.choiceGrid}>
          <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer"><strong>Fast doneness checks</strong><span>Instant-read thermometers →</span></a>
          <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer"><strong>Oven / roast / fry</strong><span>Alarm + probe thermometers →</span></a>
          <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer"><strong>Smoking / BBQ</strong><span>Multi-probe monitoring →</span></a>
          <a href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer"><strong>Walk-in / fridge / freezer</strong><span>Remote monitoring →</span></a>
        </div>
        <Link className={styles.askLink} href="/?audience=restaurant#operator-question">Not sure which category fits? Ask Chef Gringo →</Link>
      </section>

      <section className={styles.finalCta}>
        <p className={styles.kicker}>Temperature is a decision tool</p>
        <h2>Measure what matters.</h2>
        <p>See ThermoWorks’ current products, pricing, and promotions through Chef Gringo’s approved referral route.</p>
        <a className={styles.finalButton} href={THERMOWORKS_REFERRAL} target="_blank" rel="sponsored noreferrer">Shop ThermoWorks →</a>
        <p className={styles.disclosure}>Chef Gringo participates in the ThermoWorks affiliate program and may receive compensation from qualifying purchases made through this link. This relationship does not determine Chef Gringo’s recommendations. Product pricing, promotions, availability, and specifications can change; verify current details with ThermoWorks before purchasing.</p>
      </section>

      <footer className={styles.footer}><Link href="/">Chef Gringo</Link><span>Decision first. Commercial route second.</span></footer>
    </main>
  );
}
