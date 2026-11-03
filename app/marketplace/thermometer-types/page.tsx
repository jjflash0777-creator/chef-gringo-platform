import type { Metadata } from "next";
import Link from "next/link";
import { AffiliateDisclosure } from "../../components/AffiliateDisclosure";

export const metadata: Metadata = {
  title: "Instant-Read vs Leave-In vs Connected Thermometers",
  description:
    "Choose a kitchen thermometer by workflow: instant spot checks, leave-in monitoring, or connected remote monitoring.",
  alternates: { canonical: "/marketplace/thermometer-types" },
};

const types = [
  {
    title: "Instant-read",
    best: "Fast spot checks during active cooking or service.",
    use: "Steaks, chicken, fish, reheating, line checks, bread, sauces, and any job where you need a reading now.",
    skip: "Skip it as your only tool if you need to monitor a roast or smoker continuously.",
    examples: "Thermapen ONE and ThermoPop 2 fit this job at different price points.",
  },
  {
    title: "Leave-in",
    best: "Watching temperature during a longer cook without repeatedly opening the oven or smoker.",
    use: "Roasts, smoking, baking, and long cooks where an alarm matters.",
    skip: "Skip it as a replacement for fast spot checks across several foods.",
    examples: "ChefAlarm is the relevant ThermoWorks category here.",
  },
  {
    title: "Connected monitoring",
    best: "Remote alerts, multi-probe monitoring, or cooks where you want temperature information away from the appliance.",
    use: "Smoking, grilling, long roasts, and home cooks who value app-based monitoring.",
    skip: "Skip it if you do not want another app, account, charging routine, or connected device.",
    examples: "CHEF iQ belongs in this category; compare current probe count, range, app requirements, and pricing before buying.",
  },
] as const;

export default function ThermometerTypesPage() {
  return (
    <article className="editorial-article">
      <header className="editorial-hero">
        <div className="editorial-hero-copy">
          <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/marketplace">Shop</Link> / Thermometers</p>
          <p className="eyebrow">Shop · Choose by job</p>
          <h1>Instant-read, leave-in, or connected?</h1>
          <p className="editorial-deck">
            Stop shopping by gadget. Start with the job. These three thermometer categories solve different problems.
          </p>
          <AffiliateDisclosure />
        </div>
      </header>

      <div className="editorial-body">
        <p className="article-kicker">
          Fast answer: buy an instant-read thermometer for spot checks, a leave-in probe for continuous cooking, and connected monitoring only if remote alerts or multi-probe visibility actually improve your workflow.
        </p>

        <section>
          <h2>The three jobs.</h2>
          <div className="evidence-grid">
            {types.map((item) => (
              <article className="evidence-card evidence-moderate" key={item.title}>
                <p className="evidence-label">{item.title}</p>
                <p><strong>Best for:</strong> {item.best}</p>
                <p><strong>Use it for:</strong> {item.use}</p>
                <p><strong>Who should skip it:</strong> {item.skip}</p>
                <p><strong>Examples:</strong> {item.examples}</p>
              </article>
            ))}
          </div>
        </section>

        <section>
          <h2>Which one should I buy first?</h2>
          <p>
            For most people, start with an instant-read thermometer because it solves the widest range of everyday cooking and food-safety checks.
            Add a leave-in or connected system when your cooking style creates a specific monitoring problem.
          </p>
        </section>

        <section>
          <h2>Home kitchen versus working kitchen.</h2>
          <p>
            Connected features can be convenient at home. In a working kitchen, speed, sanitation, durability, calibration, battery reliability, and simple handoff between employees may matter more than app features.
            A professional tool does not have to be the most expensive one; it has to survive the workflow.
          </p>
        </section>

        <section>
          <h2>The products Chef Gringo is currently comparing.</h2>
          <ul>
            <li><Link href="/marketplace/products/thermoworks-thermapen-one"><strong>Thermapen ONE</strong></Link> — premium instant-read.</li>
            <li><Link href="/marketplace/products/thermoworks-thermopop-2"><strong>ThermoPop 2</strong></Link> — value-oriented instant-read.</li>
            <li><Link href="/marketplace/products/thermoworks-chefalarm"><strong>ChefAlarm</strong></Link> — leave-in monitoring.</li>
          </ul>
          <p>
            CHEF iQ is a confirmed Chef Gringo partner for connected cooking products. Chef Gringo may earn commissions from eligible purchases.
            Recommendations should still follow the cooking job, not the commission.
          </p>
        </section>

        <aside className="notice-card">
          <strong>Chef Gringo rule</strong>
          <p>If a simpler thermometer solves the problem, buy the simpler thermometer.</p>
        </aside>

        <section className="next-article">
          <p className="eyebrow">Affiliate disclosure</p>
          <h2>Compare before you buy.</h2>
          <p>Chef Gringo may earn a commission from qualifying affiliate purchases. That does not change the use-case-first recommendation standard.</p>
          <p><Link href="/marketplace?workflow=better-thermometer"><strong>Open the thermometer marketplace →</strong></Link></p>
        </section>
      </div>
    </article>
  );
}
