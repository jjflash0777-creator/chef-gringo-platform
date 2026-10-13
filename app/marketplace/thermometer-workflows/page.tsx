import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateDisclosure } from "../../components/AffiliateDisclosure";
import styles from "./thermometer-workflows.module.css";

export const metadata: Metadata = {
  title: "Which Thermometer Fits Your Kitchen? | Chef Gringo",
  description:
    "Compare instant-read and leave-in temperature tools by workflow, tradeoffs, and who each option actually fits.",
  alternates: { canonical: "/marketplace/thermometer-workflows" },
  openGraph: {
    title: "Which Thermometer Fits Your Kitchen? | Chef Gringo",
    description: "Three different temperature tools for three different jobs.",
    url: "/marketplace/thermometer-workflows",
  },
};

const choices = [
  {
    name: "Thermapen ONE",
    label: "Fast premium instant-read",
    bestFor: "Frequent spot checks where speed matters during active cooking or service.",
    limitation: "Premium price compared with simpler instant-read thermometers.",
    who: "Working cooks, serious home cooks, grillers, and food-safety routines with repeated checks.",
    href: "/marketplace/products/thermoworks-thermapen-one",
    verified: ["ThermoWorks publishes one-second readings.", "ThermoWorks publishes ±0.5°F accuracy."],
  },
  {
    name: "ThermoPop 2",
    label: "Best-value instant-read",
    bestFor: "Everyday instant temperature checks without buying the premium option.",
    limitation: "A value-oriented choice rather than the fastest premium workflow.",
    who: "Home cooks and practical buyers who want a dedicated instant-read tool at a lower price point.",
    href: "/marketplace/products/thermoworks-thermopop-2",
    verified: ["Use it for spot checks, not continuous monitoring.", "Compare current specs and price before purchase."],
  },
  {
    name: "ChefAlarm",
    label: "Leave-in monitoring",
    bestFor: "Monitoring food while it cooks instead of repeatedly opening the oven, smoker, or grill.",
    limitation: "It serves a different job from an instant-read thermometer; it does not replace one for every task.",
    who: "Roasts, smoking, long cooks, and anyone who wants alarms while food stays in the cooker.",
    href: "/marketplace/products/thermoworks-chefalarm",
    verified: ["Designed around leave-in probe monitoring.", "Compare current alarm and probe specifications before purchase."],
  },
] as const;

const useCases = [
  {
    question: "I check steaks, chicken, fish, reheating, or line temperatures.",
    answer: "Start with an instant-read thermometer.",
    detail: "You need a reading now, then you remove the probe and keep cooking.",
  },
  {
    question: "I want the fastest premium instant checks.",
    answer: "Thermapen ONE is the stronger fit.",
    detail: "Its published one-second reading time is useful when you are taking repeated checks during active cooking.",
  },
  {
    question: "I want a practical instant-read without paying for the premium option.",
    answer: "ThermoPop 2 is the comparison to make.",
    detail: "It is positioned as the value-focused instant-read choice in this three-tool workflow.",
  },
  {
    question: "I want to monitor a roast, smoker, or oven cook over time.",
    answer: "ChefAlarm is the relevant category.",
    detail: "A leave-in probe solves a different problem from a handheld spot-check thermometer.",
  },
] as const;

export default function ThermometerWorkflowsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <p className={styles.kicker}>Chef Gringo comparison guide</p>
            <h1>Which thermometer actually fits your kitchen?</h1>
            <p className={styles.deck}>Three good tools. Three different jobs. Start with how you cook, then choose the thermometer.</p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href="#compare">Compare the three</a>
              <a className={styles.secondary} href="#choose">Help me choose</a>
            </div>
            <AffiliateDisclosure />
          </div>
          <aside className={styles.heroDecision}>
            <span className={styles.smallLabel}>Fast answer</span>
            <strong>Instant-read and leave-in thermometers are not interchangeable.</strong>
            <p>One gives you a quick spot check. The other stays in the food and monitors the cook.</p>
          </aside>
        </div>
      </section>

      <section className={styles.choose} id="choose">
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Choose by workflow</p>
          <h2>What are you actually trying to do?</h2>
          <p>Skip the spec-sheet maze. Pick the job first.</p>
        </div>
        <div className={styles.useCaseGrid}>
          {useCases.map((item) => (
            <article key={item.question}>
              <h3>{item.question}</h3>
              <strong>{item.answer}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.compareSection} id="compare">
        <div className={styles.compareInner}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>Side-by-side</p>
            <h2>Three tools, three roles.</h2>
            <p>Recommendations are ordered by practical fit, not commission.</p>
          </div>

          <div className={styles.cardGrid}>
            {choices.map((choice) => (
              <article key={choice.name} className={styles.productCard}>
                <div>
                  <span className={styles.badge}>{choice.label}</span>
                  <h3>{choice.name}</h3>
                </div>

                <dl>
                  <div>
                    <dt>Best for</dt>
                    <dd>{choice.bestFor}</dd>
                  </div>
                  <div>
                    <dt>Main limitation</dt>
                    <dd>{choice.limitation}</dd>
                  </div>
                  <div>
                    <dt>Who should consider it</dt>
                    <dd>{choice.who}</dd>
                  </div>
                </dl>

                <div className={styles.verifiedBox}>
                  <span>What we can say confidently</span>
                  <ul>{choice.verified.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>

                <Link className={styles.primary} href={choice.href}>See full details</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.explainer}>
        <div>
          <p className={styles.kicker}>Instant-read vs leave-in</p>
          <h2>These solve different problems.</h2>
        </div>
        <div className={styles.explainerGrid}>
          <article>
            <span>Instant-read</span>
            <h3>Insert. Read. Remove.</h3>
            <p>Use it for steaks, poultry, fish, reheating, frying, line checks, and other moments when you need a fast internal temperature right now.</p>
          </article>
          <article>
            <span>Leave-in probe</span>
            <h3>Insert. Leave it. Monitor.</h3>
            <p>Use it when the probe should stay in the food while the cook continues and an alarm or ongoing reading is useful.</p>
          </article>
        </div>
      </section>

      <section className={styles.quickPick}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Which one should I buy?</p>
          <h2>A practical shortcut.</h2>
        </div>
        <div className={styles.quickGrid}>
          <article><span>Most home cooks</span><strong>ThermoPop 2</strong><p>A sensible place to start if you primarily need everyday spot checks.</p></article>
          <article><span>Serious home cook / working cook</span><strong>Thermapen ONE</strong><p>Worth comparing when fast, repeated checks are part of how you cook.</p></article>
          <article><span>Roasts / smoking / long cooks</span><strong>ChefAlarm</strong><p>Choose a leave-in monitor when watching the cook over time is the actual problem.</p></article>
          <article><span>Professional workflow</span><strong>Often more than one tool</strong><p>An instant-read and a leave-in monitor can cover different temperature jobs instead of forcing one device to do everything.</p></article>
        </div>
      </section>

      <section className={styles.trust}>
        <div>
          <p className={styles.kicker}>How Chef Gringo recommends products</p>
          <h2>Useful first. Commercial second.</h2>
        </div>
        <div>
          <p>Recommendations are based on practical fit, published specifications, known limitations, and the job the reader is trying to solve.</p>
          <p>Some product links may earn Chef Gringo a commission at no additional cost to you. That commercial relationship does not determine the order of recommendations.</p>
          <p>Prices, promotions, specifications, and availability can change. Verify current details before buying.</p>
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>Still not sure?</h2>
        <p>Start with the problem you are trying to solve, not the product name.</p>
        <div className={styles.heroActions}>
          <Link className={styles.primary} href="/go/thermoworks">See the broader ThermoWorks guide</Link>
          <Link className={styles.secondary} href="/#operator-question">Ask Chef Gringo</Link>
        </div>
      </section>
    </main>
  );
}
