import type { Metadata } from "next";
import Link from "next/link";
import styles from "./specialized-diets.module.css";

export const metadata: Metadata = {
  title: "Chef Gringo Specialized Diets",
  description:
    "Evidence-led menu conversion tools, specialized-diet templates, nutrition education, and clinically sourced food guidance for professional kitchens.",
};

const dietTools = [
  {
    title: "Menu Converter",
    status: "Build first",
    copy: "Convert an existing menu into lower-sodium, carbohydrate-conscious, heart-healthy, high-protein, allergen-aware, or texture-modified versions while preserving cost, yield, and kitchen reality.",
  },
  {
    title: "Specialized Diet Templates",
    status: "Revenue-ready",
    copy: "Printable cycle-menu templates, production notes, substitution guides, and resident-facing menu language designed for senior living and independent foodservice teams.",
  },
  {
    title: "Evidence Map",
    status: "Research-backed",
    copy: "Map nutrients, foods, mechanisms, outcomes, evidence strength, and medication interactions without presenting food or supplements as a replacement for prescribed treatment.",
  },
  {
    title: "Ingredient & Interaction Checker",
    status: "Safety layer",
    copy: "Flag common medication-food and supplement-food interaction questions and route higher-risk decisions to a pharmacist, physician, or registered dietitian.",
  },
];

const modules = [
  ["01", "Menu Conversion Studio", "Start with the food people already eat. Convert recipes, portions, sides, sauces, textures, and service notes instead of handing kitchens an impractical clinical menu."],
  ["02", "Metabolic & Mitochondrial Nutrition", "Evidence-led explainers on energy metabolism, protein adequacy, fiber, micronutrients, dietary patterns, and where mechanistic claims do — and do not — translate into clinical outcomes."],
  ["03", "Food, Nutrient & Medication Evidence Map", "A searchable evidence database that distinguishes mechanism, human clinical evidence, interaction risk, uncertainty, and source quality. It never tells a user to stop or replace prescribed medication."],
  ["04", "Clinical Menu Library", "Condition-aware meal templates for professional kitchens with portions, substitutions, allergen notes, texture options, production guidance, and review status."],
  ["05", "Vetted Marketplace", "A small, evidence-screened marketplace for kitchen-use nutrition products, functional foods, and approved tools. Commercial relationships stay visually separate from evidence ratings."],
  ["06", "Health-System Accountability Desk", "Documented reporting on regulation, enforcement, conflicts of interest, settlements, coverage policy, private-equity ownership, and institutional incentives using primary records whenever possible."],
] as const;

const standards = [
  "Every clinical claim must carry a source trail and evidence-strength label.",
  "No food, supplement, or protocol is presented as a substitute for prescribed medication.",
  "No individualized supplement dosing from a quiz or automated stack builder.",
  "Affiliate compensation never changes evidence scoring or recommendation order.",
  "High-risk interactions, medication changes, renal restrictions, swallowing disorders, and other clinical decisions route to qualified care professionals.",
];

export default function SpecializedDietsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.kicker}>CHEF GRINGO · SPECIALIZED DIETS</p>
            <h1>Clinical nutrition translated into food people will actually eat.</h1>
            <p className={styles.lede}>
              Menu conversion, evidence-led nutrition education, professional templates, and commercial tools for kitchens that need something more useful than a stack of dietary restrictions.
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#tools">Explore the tools</a>
              <Link className={styles.secondary} href="/culinary-director-tools">Back to Culinary Director Tools</Link>
            </div>
          </div>
          <aside className={styles.manifesto}>
            <span>THE RULE</span>
            <strong>Evidence first. Food second. Monetization third.</strong>
            <p>Sharp claims require sharp sourcing. Uncertainty stays visible.</p>
          </aside>
        </div>
      </section>

      <section className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>WHY THIS EXISTS</p>
          <h2>Most “special diets” fail in the space between the care plan and the plate.</h2>
        </div>
        <p>
          Chef Gringo Specialized Diets is built for that gap: take clinical requirements, dietary goals, resident preferences, kitchen constraints, cost, staffing, texture, and service reality — then turn them into practical menus and decision tools.
        </p>
      </section>

      <section className={styles.toolSection} id="tools">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>FIRST COMMERCIAL LAYER</p>
          <h2>Tools that can become products, lead magnets, and recurring operator utilities.</h2>
        </div>
        <div className={styles.toolGrid}>
          {dietTools.map((tool) => (
            <article key={tool.title} className={styles.toolCard}>
              <span>{tool.status}</span>
              <h3>{tool.title}</h3>
              <p>{tool.copy}</p>
              <button type="button" disabled aria-disabled="true">Coming in this branch</button>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.matrixSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>THE MITOPHAGY PROJECT · REFRAMED FOR CHEF GRINGO</p>
          <h2>A health-sovereignty editorial layer without pretending nutrition is a prescription pad.</h2>
        </div>
        <div className={styles.moduleList}>
          {modules.map(([number, title, copy]) => (
            <article key={number} className={styles.moduleRow}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.evidenceSection}>
        <div>
          <p className={styles.eyebrow}>EVIDENCE CONTRACT</p>
          <h2>Clinically skeptical. Commercially transparent. Explicit about uncertainty.</h2>
          <p>
            The project can investigate pharmaceutical incentives, regulatory decisions, coverage gaps, settlements, and conflicts of interest — but allegations must be separated from documented findings, and health claims must be graded by the evidence actually available.
          </p>
        </div>
        <ul>
          {standards.map((standard) => <li key={standard}>{standard}</li>)}
        </ul>
      </section>

      <section className={styles.conversionSection}>
        <div>
          <p className={styles.eyebrow}>REVENUE PATH</p>
          <h2>Make the menu tools the front door.</h2>
          <p>
            Free conversion tools and templates attract culinary directors and operators. Premium template packs, professional workflow tools, qualified product referrals, and partner services monetize the same workflow without turning the site into a supplement catalog.
          </p>
        </div>
        <div className={styles.funnel}>
          <span>Free menu converter</span>
          <b>→</b>
          <span>Email / saved plan</span>
          <b>→</b>
          <span>Premium templates</span>
          <b>→</b>
          <span>Qualified commercial routes</span>
        </div>
      </section>

      <section className={styles.disclaimer}>
        <strong>Educational and culinary planning use only.</strong>
        <p>
          Chef Gringo does not diagnose, treat, cure, or prevent disease and does not advise users to start, stop, replace, or alter prescription medication. Specialized diets may require individualized review by a physician, pharmacist, registered dietitian, speech-language pathologist, or other qualified professional.
        </p>
      </section>
    </main>
  );
}
