import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateDisclosure } from "../../components/AffiliateDisclosure";
import styles from "./kitchen-workhorses.module.css";

export const metadata: Metadata = {
  title: "Two Kitchen Tools I'd Rather Replace Last | Chef Gringo",
  description:
    "A practical Chef Gringo guide to two simple kitchen workhorses: the Victorinox Fibrox 8-inch chef's knife and OXO Good Grips swivel peeler.",
  alternates: { canonical: "/marketplace/kitchen-workhorses" },
  openGraph: {
    title: "Two Kitchen Tools I'd Rather Replace Last | Chef Gringo",
    description: "Simple tools. Real value. They just work.",
    url: "/marketplace/kitchen-workhorses",
  },
};

const tools = [
  {
    name: "Victorinox Fibrox 8” Chef’s Knife",
    eyebrow: "Everyday knife",
    bestFor: "Daily chopping, slicing, prep, and general-purpose kitchen work.",
    why: "A simple workhorse format with a practical handle and familiar chef-knife profile.",
    limitation: "It is utilitarian rather than luxurious, and edge maintenance still matters.",
    skip: "Skip it if you specifically want a heavier forged knife, premium handle materials, or a collector-style finish.",
    care: [
      "Hand wash and dry promptly.",
      "Use a cutting board that is kind to the edge.",
      "Hone as needed and sharpen when the edge stops performing cleanly.",
    ],
    href: "/marketplace/products/victorinox-fibrox-8",
  },
  {
    name: "OXO Good Grips Swivel Peeler",
    eyebrow: "Prep workhorse",
    bestFor: "Fast everyday peeling of fruits and vegetables.",
    why: "The job is simple, repetitive, and grip comfort matters more than complicated features.",
    limitation: "A swivel peeler is intentionally narrow-purpose; it is not a substitute for a knife or specialty prep tool.",
    skip: "Skip it if you need a julienne blade, specialty garnish tool, or a different handle geometry.",
    care: [
      "Rinse residue off soon after use.",
      "Keep the blade clean so it can move freely.",
      "Replace it when the blade drags instead of cutting cleanly.",
    ],
    href: "/marketplace/products/oxo-good-grips-peeler",
  },
] as const;

export default function KitchenWorkhorsesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <p className={styles.kicker}>Chef Gringo practical gear</p>
            <h1>Two kitchen tools I’d rather replace last.</h1>
            <p className={styles.deck}>Simple tools. Real value. They just work.</p>
            <p className={styles.subdeck}>
              You do not need every gadget in the aisle. Start with the tools that earn their place by doing useful work over and over again.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href="#tools">See the two picks</a>
              <a className={styles.secondary} href="#care">Care + maintenance</a>
            </div>
            <AffiliateDisclosure />
          </div>
          <aside className={styles.heroNote}>
            <span>Chef Gringo rule</span>
            <strong>Useful beats flashy.</strong>
            <p>If a tool saves time, feels good in the hand, and keeps doing the same job well, it has earned its drawer space.</p>
          </aside>
        </div>
      </section>

      <section className={styles.whySection}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Why these two?</p>
          <h2>Because most prep work is repetitive, not glamorous.</h2>
          <p>These are the kinds of tools that get touched constantly in a real kitchen. That makes comfort, simplicity, and replaceability matter.</p>
        </div>
        <div className={styles.reasonGrid}>
          <article><span>01</span><h3>They solve common jobs</h3><p>Cutting and peeling happen every day in home and professional kitchens.</p></article>
          <article><span>02</span><h3>They do not need a learning curve</h3><p>Good tools should make the task easier without demanding a manual.</p></article>
          <article><span>03</span><h3>They are easy to judge</h3><p>You know quickly whether a knife cuts cleanly or a peeler glides comfortably.</p></article>
        </div>
      </section>

      <section className={styles.toolsSection} id="tools">
        <div className={styles.toolsInner}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>The two workhorses</p>
            <h2>Different jobs. Same philosophy.</h2>
          </div>

          <div className={styles.toolGrid}>
            {tools.map((tool) => (
              <article className={styles.toolCard} key={tool.name}>
                <span className={styles.badge}>{tool.eyebrow}</span>
                <h3>{tool.name}</h3>
                <dl>
                  <div><dt>Best for</dt><dd>{tool.bestFor}</dd></div>
                  <div><dt>Why it made the cut</dt><dd>{tool.why}</dd></div>
                  <div><dt>Main limitation</dt><dd>{tool.limitation}</dd></div>
                  <div><dt>Who should skip it</dt><dd>{tool.skip}</dd></div>
                </dl>
                <Link className={styles.primary} href={tool.href}>See full product details</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.compareSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>What these tools have in common</p>
          <h2>They disappear into the workflow.</h2>
        </div>
        <div className={styles.compareGrid}>
          <article><strong>Comfort</strong><p>If a handle fights your hand, you notice it every shift.</p></article>
          <article><strong>Simplicity</strong><p>No apps. No charging. No complicated setup. Just use the tool.</p></article>
          <article><strong>Value</strong><p>Value is not just low price. It is how often the tool earns its cost back in use.</p></article>
          <article><strong>Replaceability</strong><p>Workhorses should be easy to replace when they finally wear out.</p></article>
        </div>
      </section>

      <section className={styles.careSection} id="care">
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Keep them useful</p>
          <h2>Care matters more than hype.</h2>
          <p>A mediocre tool with good care can outlast an expensive tool that gets abused.</p>
        </div>
        <div className={styles.careGrid}>
          {tools.map((tool) => (
            <article key={tool.name}>
              <h3>{tool.name}</h3>
              <ul>{tool.care.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.fitSection}>
        <div>
          <p className={styles.kicker}>Who is this for?</p>
          <h2>Almost anyone who cooks often.</h2>
        </div>
        <div className={styles.fitGrid}>
          <article><span>Home cooks</span><p>Simple, repeatable prep without buying a drawer full of specialty tools.</p></article>
          <article><span>Professional kitchens</span><p>Useful for high-frequency prep where comfort and consistency matter.</p></article>
          <article><span>Food trucks</span><p>Compact, familiar tools that earn their limited storage space.</p></article>
          <article><span>Catering</span><p>Easy to pack, easy to understand, and useful across many menus.</p></article>
        </div>
      </section>

      <section className={styles.trustSection}>
        <div>
          <p className={styles.kicker}>How Chef Gringo recommends gear</p>
          <h2>Practical fit first.</h2>
        </div>
        <div>
          <p>Chef Gringo looks at what the tool is for, where it fits, what its limitations are, and whether a cheaper or simpler option would solve the same problem.</p>
          <p>Some product links may earn Chef Gringo a commission at no additional cost to you. That relationship does not determine the recommendation order.</p>
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>Better tools should make cooking easier.</h2>
        <p>See the full product records, limitations, and current buying information before deciding.</p>
        <div className={styles.heroActions}>
          <Link className={styles.primary} href="/marketplace/products/victorinox-fibrox-8">Victorinox details</Link>
          <Link className={styles.secondary} href="/marketplace/products/oxo-good-grips-peeler">OXO peeler details</Link>
        </div>
      </section>
    </main>
  );
}
