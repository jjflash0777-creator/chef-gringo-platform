import Link from "next/link";
import styles from "./crazy-good-buy.module.css";

const CGB_REFERRAL = "https://www.crazygoodbuy.com?sca_ref=12203472.rfWyIkVl4i4Uf";

const categories = [
  { label: "REFRIGERATION", title: "Cold-side equipment without the retail markup.", detail: "Reach-ins, undercounters, prep tables and refrigerated work surfaces can dominate an opening or replacement budget. Compare current inventory before paying full dealer pricing.", icon: "❄" },
  { label: "COOKING", title: "Put money into the line — not the markup.", detail: "Ranges, charbroilers, ovens, fryers and countertop cooking equipment are where a smart buy can materially change startup cost.", icon: "🔥" },
  { label: "ICE", title: "High-output equipment can get expensive fast.", detail: "Ice machines are easy to undersize and expensive to replace. Start with daily production and storage need, then compare the current deal.", icon: "◆" },
  { label: "FOOD TRUCK", title: "Build the equipment package around the menu.", detail: "Crazy Good Buy carries equipment used in food-truck builds, and Chef Gringo can help work backward from menu, space, load and service volume.", icon: "⚡" },
] as const;

const fit = [
  "You are opening, replacing or expanding a commercial kitchen and total equipment cost matters.",
  "You are willing to compare new, used, refurbished, overstock and sourced equipment instead of defaulting to one retail channel.",
  "You know the model/spec requirements or are willing to verify them before purchase.",
  "You value direct-from-warehouse pricing and can plan around freight, installation and return restrictions for commercial equipment.",
] as const;

const compare = [
  "You have not verified voltage, phase, gas type, dimensions, ventilation, plumbing or local-code requirements.",
  "You need white-glove installation, local service coverage or a specific dealer support contract that is not included.",
  "You are buying solely because a discount percentage looks large without checking the actual model and current market price.",
  "You may need to return the equipment after installation; commercial-equipment return rules are much tighter than consumer retail.",
] as const;

export default function CrazyGoodBuyCampaignPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>Chef Gringo</Link>
        <span>Commercial equipment intelligence · deal hunting + operator economics</span>
        <a href={CGB_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.topCta}>Shop Crazy Good Buy →</a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroPhoto} aria-hidden="true" />
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Chef Gringo × Crazy Good Buy</p>
          <h1>STOP PAYING<br/><em>RETAIL</em><br/>FOR THE KITCHEN.</h1>
          <p className={styles.deck}>Commercial equipment can eat your opening budget alive. Compare the smarter route first — new, used, refurbished, overstock, auction and sourced equipment.</p>
          <div className={styles.heroActions}>
            <a href={CGB_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.primary}>See current equipment →</a>
            <a href="#compare" className={styles.secondary}>Compare the buying routes</a>
          </div>
          <p className={styles.disclosureMini}>Chef Gringo may earn compensation from qualifying purchases made through this referral link.</p>
        </div>
        <div className={styles.heroPanel}>
          <span className={styles.liveDot}>● OPERATOR RULE</span>
          <strong>Price is only one part of the deal.</strong>
          <p>Check the equipment before you check out.</p>
          <div className={styles.loadStack}>
            <div><span>01</span><b>Right model?</b></div>
            <div><span>02</span><b>Right utilities?</b></div>
            <div><span>03</span><b>Right dimensions?</b></div>
            <div><span>04</span><b>Right landed cost?</b></div>
          </div>
        </div>
      </section>

      <section className={styles.signalStrip}>
        <div><strong>NEW + USED</strong><span>more than one buying lane</span></div>
        <div><strong>OVERSTOCK</strong><span>discount inventory opportunities</span></div>
        <div><strong>AUCTION</strong><span>weekday Daily Deal format</span></div>
        <div><strong>SOURCING</strong><span>ask for equipment not listed</span></div>
      </section>

      <section className={styles.categorySection}>
        <div className={styles.sectionLead}>
          <div>
            <p className={styles.eyebrowDark}>Start with the kitchen job</p>
            <h2>Where can the equipment budget move the most?</h2>
          </div>
          <p>Crazy Good Buy currently focuses on commercial refrigeration, cooking equipment, ice machines, kitchen tools and food-truck-oriented bundles. Chef Gringo’s job is to help you decide what you actually need before the price tag distracts you.</p>
        </div>
        <div className={styles.categoryGrid}>
          {categories.map((item, i) => (
            <article key={item.label} className={styles.categoryCard}>
              <div className={styles.cardTop}><span>{item.icon}</span><b>0{i + 1}</b></div>
              <p>{item.label}</p>
              <h3>{item.title}</h3>
              <span>{item.detail}</span>
              <a href={CGB_REFERRAL} target="_blank" rel="sponsored noreferrer">Browse current inventory →</a>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.visualBreak}>
        <div className={styles.kitchenPhoto} aria-hidden="true" />
        <div className={styles.visualCopy}>
          <p className={styles.eyebrow}>The operator economics angle</p>
          <h2>BUILD THE KITCHEN.<br/>KEEP THE CASH.</h2>
          <p>Crazy Good Buy says it buys directly from manufacturers, overstock and volume inventory and ships from its Cleveland warehouse. Their current site advertises pricing substantially below traditional dealer channels on many items.</p>
          <a href={CGB_REFERRAL} target="_blank" rel="sponsored noreferrer">See today’s equipment deals →</a>
        </div>
      </section>

      <section className={styles.routeSection} id="compare">
        <div className={styles.routeHeading}>
          <p className={styles.eyebrowDark}>Buy route matters</p>
          <h2>NEW vs USED vs REFURBISHED vs AUCTION vs SOURCE IT.</h2>
        </div>
        <div className={styles.routeGrid}>
          <article><span>01</span><h3>New</h3><p>Best when warranty, predictable condition and install timing matter more than the absolute lowest acquisition cost.</p></article>
          <article><span>02</span><h3>Used</h3><p>Can reduce upfront cost significantly, but condition, remaining life, serviceability and transport risk matter more.</p></article>
          <article><span>03</span><h3>Refurbished</h3><p>Potential middle ground when you want lower cost with more confidence than an unknown used unit.</p></article>
          <article><span>04</span><h3>Daily Deal Auction</h3><p>Crazy Good Buy currently runs weekday deal auctions on selected commercial equipment. Inventory changes, so treat it as opportunity rather than supply planning.</p></article>
          <article><span>05</span><h3>Source It</h3><p>If the unit is not listed, Crazy Good Buy says its team may be able to source required equipment. That is useful when a spec is fixed but current inventory is not.</p></article>
        </div>
      </section>

      <section className={styles.dealSection}>
        <div className={styles.dealPhoto} aria-hidden="true" />
        <div className={styles.dealPanel}>
          <p className={styles.eyebrow}>Real current examples</p>
          <h2>Don’t buy the percentage. Buy the right machine.</h2>
          <div className={styles.dealFacts}>
            <div><strong>36%–76%</strong><span>examples of current listed savings on selected products we checked</span></div>
            <div><strong>2–3 days</strong><span>current advertised shipping window on many in-stock items</span></div>
          </div>
          <p>We found current listings with large advertised discounts across refrigeration, charbroilers, prep tables and ice machines. Those deals can be real opportunities — but the spec, warranty, freight, installation and return terms still decide whether the purchase is actually good.</p>
          <a href={CGB_REFERRAL} target="_blank" rel="sponsored noreferrer">Compare current listings →</a>
        </div>
      </section>

      <section className={styles.fitSection}>
        <div className={styles.fitHeading}>
          <p className={styles.eyebrowDark}>Decision check</p>
          <h2>Is Crazy Good Buy the right route?</h2>
        </div>
        <div className={styles.fitGrid}>
          <article>
            <span>STRONGER FIT</span>
            <h3>Yes, especially if…</h3>
            <ul>{fit.map(x => <li key={x}>{x}</li>)}</ul>
          </article>
          <article>
            <span>COMPARE FIRST</span>
            <h3>Slow down if…</h3>
            <ul>{compare.map(x => <li key={x}>{x}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className={styles.operatorRail}>
        <div className={styles.railIntro}>
          <p className={styles.eyebrow}>Chef Gringo equipment paths</p>
          <h2>One marketplace.<br/>Different jobs.</h2>
        </div>
        <a href={CGB_REFERRAL} target="_blank" rel="sponsored noreferrer"><span>01</span><strong>Open a Kitchen</strong><small>build a whole package around the concept</small></a>
        <a href={CGB_REFERRAL} target="_blank" rel="sponsored noreferrer"><span>02</span><strong>Replace a Failure</strong><small>repair vs replace vs refurbished</small></a>
        <a href={CGB_REFERRAL} target="_blank" rel="sponsored noreferrer"><span>03</span><strong>Build a Food Truck</strong><small>equipment around menu, load + space</small></a>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.eyebrow}>Equipment is capital</p>
          <h2>BUY LIKE AN OPERATOR.</h2>
          <p>Compare Crazy Good Buy’s current commercial-kitchen inventory through Chef Gringo’s approved referral route.</p>
        </div>
        <a href={CGB_REFERRAL} target="_blank" rel="sponsored noreferrer" className={styles.finalButton}>Shop Crazy Good Buy →</a>
        <p className={styles.disclosure}>Chef Gringo participates in the Crazy Good Buy affiliate program and may receive compensation from qualifying purchases made through this link. This relationship does not determine Chef Gringo’s recommendations. Prices, discounts, inventory, shipping, financing, warranty and promotions can change. Verify model specifications, utility requirements, dimensions, freight, installation needs and return eligibility before purchasing commercial equipment.</p>
      </section>

      <footer className={styles.footer}>
        <Link href="/">Chef Gringo</Link>
        <span>Compare the equipment. Protect the budget. Buy the right machine.</span>
      </footer>
    </main>
  );
}
