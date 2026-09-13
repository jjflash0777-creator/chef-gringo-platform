import Link from "next/link";
import styles from "./bluetti.module.css";

const BLUETTI_REFERRAL = "https://bluettius.sjv.io/YVvooe";

const jobs = [
  {
    label: "FOOD TRUCK",
    title: "Power where the kitchen actually works.",
    detail: "Start with the loads that matter — refrigeration, POS, lights, prep equipment, charging and service-hour runtime — then size the power system around the operation.",
    icon: "⚡",
  },
  {
    label: "REFRIGERATION BACKUP",
    title: "Protect the cold side when the grid disappears.",
    detail: "Portable backup can buy time for refrigerators, freezers and other critical loads during outages. Runtime depends on the appliance, duty cycle and battery system.",
    icon: "❄",
  },
  {
    label: "OFF-GRID KITCHEN",
    title: "Build power into the food system.",
    detail: "For cabins, homesteads and remote kitchens, solar-ready storage can become part of a broader plan for refrigeration, lighting, communications and daily food preparation.",
    icon: "☀",
  },
  {
    label: "HOME BACKUP",
    title: "Keep essential food systems alive.",
    detail: "A properly sized system can prioritize the refrigerator, freezer, communications and selected kitchen loads instead of trying to power everything indiscriminately.",
    icon: "⌂",
  },
] as const;

const strongerFit = [
  "You have a defined load you need to keep running during outages, mobile service or off-grid use.",
  "Refrigeration, freezer protection or food-service continuity matters enough to justify backup planning.",
  "You want battery + solar options without relying exclusively on a gasoline generator.",
  "You are willing to size the system around watts, watt-hours, startup surge and desired runtime instead of buying by headline capacity alone.",
] as const;

const compareFirst = [
  "You have not identified what equipment must run or how long it needs to run.",
  "Your cooking equipment is dominated by very high-draw electric heat loads and you expect a small portable unit to run everything.",
  "A permanently installed generator or electrical system may be the more appropriate solution for your application.",
  "You are choosing only from a sale price without checking output, capacity, ports, charging method and real-world appliance demand.",
] as const;

export default function BluettiCampaignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>Chef Gringo</Link>
        <span>Power intelligence · kitchen continuity + off-grid</span>
        <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.topCta}>Shop BLUETTI →</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroPhoto} aria-hidden="true" />
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Chef Gringo × BLUETTI</p>
          <h1>KEEP THE<br/><em>KITCHEN</em><br/>RUNNING.</h1>
          <p className={styles.deck}>Food trucks. Refrigerators. Freezers. Outages. Off-grid kitchens. Start with what cannot stop — then build the power around it.</p>
          <div className={styles.heroActions}>
            <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.primary}>Shop BLUETTI →</a>
            <a href="#size" className={styles.secondary}>Size the problem first</a>
          </div>
          <p className={styles.disclosureMini}>Chef Gringo may earn compensation from qualifying purchases through this referral link.</p>
        </div>
        <div className={styles.heroPanel}>
          <span className={styles.liveDot}>● POWER PLAN</span>
          <strong>Don’t start with the battery.</strong>
          <p>Start with the equipment.</p>
          <div className={styles.loadStack}>
            <div><span>01</span><b>What must stay on?</b></div>
            <div><span>02</span><b>How many watts?</b></div>
            <div><span>03</span><b>How many hours?</b></div>
            <div><span>04</span><b>How will you recharge?</b></div>
          </div>
        </div>
      </section>

      <section className={styles.signalStrip}>
        <div><strong>BACKUP</strong><span>when utility power fails</span></div>
        <div><strong>MOBILE</strong><span>food-truck + remote service</span></div>
        <div><strong>SOLAR</strong><span>recharge beyond the outlet</span></div>
        <div><strong>COLD SIDE</strong><span>protect food + inventory</span></div>
      </section>

      <section className={styles.jobSection} id="size">
        <div className={styles.sectionLead}>
          <p className={styles.eyebrowDark}>Choose by job, not hype</p>
          <h2>What are you trying to keep alive?</h2>
          <p>Portable power is useful only when it matches the load. Chef Gringo routes the decision through the kitchen problem first, then the hardware.</p>
        </div>
        <div className={styles.jobGrid}>
          {jobs.map((job, index) => (
            <article key={job.label} className={styles.jobCard}>
              <div className={styles.jobTop}><span className={styles.jobIcon}>{job.icon}</span><b>0{index + 1}</b></div>
              <p>{job.label}</p>
              <h3>{job.title}</h3>
              <span>{job.detail}</span>
              <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer">Explore BLUETTI →</a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.visualBreak}>
        <div className={styles.solarPhoto} aria-hidden="true" />
        <div className={styles.visualCopy}>
          <p className={styles.eyebrow}>Energy that can come back tomorrow</p>
          <h2>Battery today.<br/>Solar tomorrow.</h2>
          <p>For mobile and off-grid food systems, the recharge plan matters as much as the battery. BLUETTI sells portable power stations and solar-generator configurations across a wide range of capacities.</p>
          <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer">See current solar + power options →</a>
        </div>
      </section>

      <section className={styles.productSection}>
        <div className={styles.productHeading}>
          <p className={styles.eyebrowDark}>A useful middle ground</p>
          <h2>Enough power to be interesting. Still portable enough to move.</h2>
        </div>
        <div className={styles.productGrid}>
          <article className={styles.productHeroCard}>
            <div className={styles.productBadge}>ELITE 200 V2</div>
            <div className={styles.fakeUnit} aria-label="Stylized portable power station illustration">
              <div className={styles.handle} />
              <div className={styles.screen}>2600W</div>
              <div className={styles.ports}><i/><i/><i/><i/></div>
              <span>BLUETTI</span>
            </div>
            <div className={styles.productFacts}>
              <div><strong>2,600W</strong><span>rated output</span></div>
              <div><strong>2,073.6Wh</strong><span>capacity</span></div>
            </div>
            <p>BLUETTI currently lists the Elite 200 V2 at 2,600W output and 2,073.6Wh capacity. That makes it a useful reference point for comparing medium-to-large portable-power needs — but actual runtime depends on the equipment connected.</p>
            <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer">See current Elite 200 V2 options →</a>
          </article>

          <article className={styles.runtimeCard}>
            <p className={styles.cardLabel}>CHEF GRINGO RULE</p>
            <h3>Watts tell you if it can run.<br/>Watt-hours help tell you for how long.</h3>
            <div className={styles.formula}>
              <span>BATTERY ENERGY</span><b>÷</b><span>REAL LOAD</span><b>=</b><span>ROUGH RUNTIME</span>
            </div>
            <p>Real-world runtime is lower than a simple division because of conversion losses, compressor cycling, surge demand, temperature and other factors. That is why we should calculate before recommending.</p>
            <Link href="/?audience=food-truck#operator-question" className={styles.askLink}>Ask Chef Gringo to size a load →</Link>
          </article>
        </div>
      </section>

      <section className={styles.fitSection}>
        <div className={styles.fitHeading}>
          <p className={styles.eyebrowDark}>Decision check</p>
          <h2>Should BLUETTI even be on your shortlist?</h2>
        </div>
        <div className={styles.fitGrid}>
          <article>
            <span>STRONGER FIT</span>
            <h3>Yes, especially if…</h3>
            <ul>{strongerFit.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
          <article>
            <span>COMPARE FIRST</span>
            <h3>Slow down if…</h3>
            <ul>{compareFirst.map(item => <li key={item}>{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className={styles.powerRail}>
        <div className={styles.railIntro}>
          <p className={styles.eyebrow}>Chef Gringo power paths</p>
          <h2>One brand.<br/>Different jobs.</h2>
        </div>
        <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer"><span>01</span><strong>Portable Power</strong><small>mobile kitchens + targeted backup</small></a>
        <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer"><span>02</span><strong>Solar Generator Kits</strong><small>battery + renewable recharge</small></a>
        <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer"><span>03</span><strong>Home Backup</strong><small>larger essential-load planning</small></a>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.eyebrow}>Power is part of the kitchen now</p>
          <h2>KEEP WHAT MATTERS ON.</h2>
          <p>See BLUETTI’s current portable-power, solar and backup systems through Chef Gringo’s approved referral route.</p>
        </div>
        <a href={BLUETTI_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.finalButton}>Shop BLUETTI →</a>
        <p className={styles.disclosure}>Chef Gringo participates in the BLUETTI affiliate program and may receive compensation from qualifying purchases made through this link. This relationship does not determine Chef Gringo’s recommendations. Product specifications, pricing, promotions and availability can change; confirm current details with BLUETTI before purchasing. Backup-power suitability depends on the actual electrical load and installation/application requirements.</p>
      </section>

      <footer className={styles.footer}>
        <Link href="/">Chef Gringo</Link>
        <span>Size the load. Protect the food. Choose the power.</span>
      </footer>
    </main>
  );
}
