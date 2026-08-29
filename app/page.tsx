import Image from "next/image";
import Link from "next/link";
import styles from "./commerce-home.module.css";
import { editorialImages } from "./home/editorial-images";
import { marketplaceCatalog } from "./marketplace/catalog";
import { purchaseLink } from "./marketplace/commercial-links";
import { CommercialLinkAction } from "./marketplace/components/CommercialLink";

export const metadata = {
  title: "Chef Gringo | Buy smarter. Solve kitchen problems.",
  description: "Independent hospitality buying intelligence, equipment research, problem solving, and real-world operator guidance.",
};

const problems = [
  ["❄️", "Freezer running warm", "Work the problem before buying anything.", "/start?path=fix"],
  ["🧊", "Ice machine stopped making ice", "Narrow the cause and the next useful check.", "/start?path=fix"],
  ["⚡", "Need food-truck power", "Size the load before choosing a generator.", "/marketplace?view=problems"],
  ["🛠️", "Repair or replace equipment?", "Compare downtime, repair life, replacement cost, and risk.", "/services/repair-or-replace"],
  ["💳", "Cut restaurant software costs", "Compare POS, inventory, scheduling, and back-office tools.", "/marketplace?view=problems"],
] as const;

const prompts = [
  ["🧊", "Best commercial ice machine for my budget", "/marketplace?view=problems"],
  ["🥣", "Commercial mixer that fits my volume", "/marketplace?view=problems"],
  ["❄️", "My freezer isn't staying cold", "/start?path=fix"],
  ["⚡", "Best generator for a food truck", "/marketplace?view=problems"],
  ["💳", "Restaurant POS without insane fees", "/marketplace?view=problems"],
] as const;

const smarter = [
  ["🏭", "Domestic vs. factory direct", "See when the low sticker price survives freight, duties, service, and warranty."],
  ["💰", "True landed cost", "Shipping, liftgate, taxes, install, accessories, downtime, and the things quotes hide."],
  ["🏢", "Commercial vs. residential", "Not just bigger. Different duty cycle, sanitation, service, and operating expectations."],
  ["♻️", "New vs. used", "Use the expected life and repair exposure, not the discount alone."],
  ["🔧", "Repair vs. replace", "Compare what the repair buys you against replacement cost and downtime."],
] as const;

function iconFor(category: string) {
  const value = category.toLowerCase();
  if (value.includes("therm")) return "🌡️";
  if (value.includes("refriger") || value.includes("ice")) return "❄️";
  if (value.includes("mixer") || value.includes("blend")) return "🥣";
  if (value.includes("software") || value.includes("pos")) return "💳";
  return "⚙️";
}

export default function Home() {
  const bestFinds = [...marketplaceCatalog.products]
    .filter((product) => product.status === "published")
    .sort((a, b) => (b.scores.value + b.scores.evidenceQuality + b.scores.workflowFit) - (a.scores.value + a.scores.evidenceQuality + a.scores.workflowFit))
    .slice(0, 3);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <Image className={styles.heroImage} unoptimized src={editorialImages.prep.src} alt={editorialImages.prep.alt} width={1600} height={1067} priority />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={`cg-width-wide ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Independent hospitality buying intelligence</p>
            <h1>Intelligent picks.<br />Real savings.</h1>
            <p className={styles.lede}>Chef Gringo combines operator experience, evidence, pricing context, and total-cost thinking to help you buy the right equipment, solve kitchen problems, and avoid expensive mistakes.</p>
            <div className={styles.actions}>
              <Link className={styles.primary} href="/marketplace">Shop researched picks</Link>
              <Link className={styles.secondary} href="/start?path=fix">Solve a kitchen problem</Link>
            </div>
          </div>
          <div className={styles.proofs} aria-label="Why Chef Gringo is different">
            <div className={styles.proof}><strong>✓ Evidence-based picks</strong><span>Research and operating fit come before commercial routing.</span></div>
            <div className={styles.proof}><strong>$ True landed cost</strong><span>Look past sticker price to freight, service, install, and ownership risk.</span></div>
            <div className={styles.proof}><strong>♜ Operator first</strong><span>Built around the job you need done, not the product somebody wants to sell.</span></div>
          </div>
        </div>
      </section>

      <section className={styles.searchStrip} aria-label="Popular starting points">
        <div className={styles.searchBox}>
          <div className={styles.searchIntro}><span>Start here</span><strong>Find what you need or solve a problem</strong></div>
          <div className={styles.promptGrid}>
            {prompts.map(([icon, label, href]) => <Link className={styles.prompt} href={href} key={label}><span className={styles.promptIcon}>{icon}</span><span>{label}</span></Link>)}
          </div>
        </div>
      </section>

      <div className={styles.content}>
        <div className={styles.mainGrid}>
          <section aria-labelledby="best-finds-title">
            <div className={styles.sectionTitle}><h2 id="best-finds-title">Today's best researched finds</h2><Link href="/marketplace">View all researched products</Link></div>
            <div className={styles.dealGrid}>
              {bestFinds.map((product) => {
                const commercial = purchaseLink(product);
                return (
                  <article className={styles.dealCard} key={product.id}>
                    <div className={styles.dealVisual} aria-hidden="true">{iconFor(product.category)}</div>
                    <div className={styles.dealBody}>
                      <span className={styles.badge}>{product.editorial.badge}</span>
                      <h3>{product.name}</h3>
                      <div className={styles.price}>{product.price.context}</div>
                      <div className={styles.merchant}>{product.merchants[0]?.name ?? "Merchant not established"}</div>
                      <p className={styles.commercial}>{commercial.note}</p>
                      <Link href={`/marketplace/products/${product.id}`}>See Chef Gringo's full read →</Link>
                      {commercial.kind === "affiliate" ? <CommercialLinkAction link={commercial} className="cg-text-action" /> : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <section className={styles.smartSection} aria-labelledby="buy-smarter-title">
              <div className={styles.sectionTitle}><h2 id="buy-smarter-title">Buy smarter</h2><Link href="/marketplace">Explore the intelligence</Link></div>
              <div className={styles.smartGrid}>
                {smarter.map(([icon, title, copy]) => <article className={styles.smart} key={title}><div className={styles.smartIcon}>{icon}</div><strong>{title}</strong><span>{copy}</span></article>)}
              </div>
            </section>
          </section>

          <aside>
            <section className={styles.problems} aria-labelledby="problems-title">
              <h2 id="problems-title">Problems worth solving</h2>
              {problems.map(([icon, title, copy, href]) => <Link className={styles.problem} href={href} key={title}><span>{icon}</span><span><strong>{title}</strong><span>{copy}</span></span></Link>)}
            </section>
            <section className={styles.newsletter}>
              <h3>Better picks. Fewer expensive mistakes.</h3>
              <p>Get Chef Gringo Field Notes: useful finds, operator guidance, and product intelligence without the catalog spam.</p>
              <Link href="/newsletter">Join Field Notes</Link>
            </section>
          </aside>
        </div>

        <section className={styles.trust} aria-label="Marketplace standards">
          <div><strong>Real sources</strong><span>Products are tied to manufacturer or merchant evidence, not invented listings.</span></div>
          <div><strong>Evidence over hype</strong><span>Recommendation quality stays separate from commercial relationships.</span></div>
          <div><strong>Safe professional boundaries</strong><span>Chef Gringo separates operator-safe checks from qualified service work.</span></div>
          <div><strong>Affiliate transparency</strong><span>When a live affiliate relationship exists, the link is labeled and tracked as such.</span></div>
        </section>
      </div>
    </div>
  );
}
