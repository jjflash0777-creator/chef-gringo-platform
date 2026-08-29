import type { Metadata } from "next";
import Link from "next/link";
import { MenuConversionStudio } from "./MenuConversionStudio";
import { MenuExperienceEngine } from "./MenuExperienceEngine";
import styles from "./specialized-diets.module.css";

export const metadata: Metadata = { title: "Chef Gringo Specialized Diets", description: "Evidence-led menu discovery, menu conversion tools, specialized-diet templates, nutrition education, and clinically sourced food guidance." };

const dietTools = [
  { title: "Menu Experiences", status: "Live prototype", href: "#menu-experiences", copy: "Choose a complete restaurant-style menu, set party size, consolidate ingredients, and route the same dining intent toward cooking, ordering, or booking." },
  { title: "Menu Converter", status: "Live prototype", href: "#menu-converter", copy: "Convert an existing menu into lower-sodium, carbohydrate-conscious, heart-healthy, high-protein, allergen-aware, or texture-modified service plans while preserving kitchen reality." },
  { title: "Specialized Diet Templates", status: "Revenue-ready next", copy: "Printable cycle-menu templates, production notes, substitution guides, and resident-facing menu language designed for senior living and independent foodservice teams." },
  { title: "Evidence Map", status: "Research-backed", copy: "Map nutrients, foods, mechanisms, outcomes, evidence strength, and medication interactions without presenting food or supplements as a replacement for prescribed treatment." },
] as const;

const modules = [
  ["01", "Chef Gringo Menus", "Discover complete menu experiences by cuisine, occasion, format, or sourced public-figure inspiration. Party size, shopping-list consolidation, and action routing are native to the menu object."],
  ["02", "Menu Conversion Studio", "Start with the food people already eat. Convert recipes, portions, sides, sauces, textures, and service notes instead of handing kitchens an impractical clinical menu."],
  ["03", "Metabolic & Mitochondrial Nutrition", "Evidence-led explainers on energy metabolism, protein adequacy, fiber, micronutrients, dietary patterns, and where mechanistic claims do — and do not — translate into clinical outcomes."],
  ["04", "Food, Nutrient & Medication Evidence Map", "A searchable evidence database that distinguishes mechanism, human clinical evidence, interaction risk, uncertainty, and source quality. It never tells a user to stop or replace prescribed medication."],
  ["05", "Clinical Menu Library", "Condition-aware meal templates for professional kitchens with portions, substitutions, allergen notes, texture options, production guidance, and review status."],
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
  return <main className={styles.page}>
    <section className={styles.hero}><div className={styles.heroGrid}><div><p className={styles.kicker}>CHEF GRINGO · MENUS + SPECIALIZED DIETS</p><h1>Pick the dinner. We&apos;ll finish the decision.</h1><p className={styles.lede}>Discover a complete menu, size it for your table, transform it when needed, then cook it, shop it, order something similar, or find the restaurant experience nearby.</p><div className={styles.actions}><a className={styles.primary} href="#menu-experiences">Build a dinner</a><a className={styles.secondary} href="#menu-converter">Convert a menu</a><Link className={styles.secondary} href="/culinary-director-tools">Professional tools</Link></div></div><aside className={styles.manifesto}><span>THE PRODUCT LOOP</span><strong>Discover. Customize. Make it. Get it.</strong><p>One menu object can power recipes, shopping, dietary variants, content, delivery intent, and reservation intent.</p></aside></div></section>
    <section className={styles.intro}><div><p className={styles.eyebrow}>WHY THIS EXISTS</p><h2>Dinner is not one recipe. It is a chain of decisions.</h2></div><p>Chef Gringo can own that chain: what sounds good, how many people are eating, what needs to change, what ingredients are required, and whether the user wants to cook, order, or go experience it at a restaurant.</p></section>
    <MenuExperienceEngine />
    <MenuConversionStudio />
    <section className={styles.toolSection} id="tools"><div className={styles.sectionHeading}><p className={styles.eyebrow}>PRODUCT ROADMAP</p><h2>One consumer front door with professional and specialized-diet depth underneath.</h2></div><div className={styles.toolGrid}>{dietTools.map((tool) => <article key={tool.title} className={styles.toolCard}><span>{tool.status}</span><h3>{tool.title}</h3><p>{tool.copy}</p>{"href" in tool ? <a href={tool.href}><strong>Open prototype →</strong></a> : <small>Queued after conversion validation</small>}</article>)}</div></section>
    <section className={styles.matrixSection}><div className={styles.sectionHeading}><p className={styles.eyebrow}>THE LARGER CHEF GRINGO HEALTH + MENU SYSTEM</p><h2>Consumer discovery on the surface. Evidence and professional controls underneath.</h2></div><div className={styles.moduleList}>{modules.map(([number,title,copy]) => <article key={number} className={styles.moduleRow}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className={styles.evidenceSection}><div><p className={styles.eyebrow}>EVIDENCE CONTRACT</p><h2>Clinically skeptical. Commercially transparent. Explicit about uncertainty.</h2><p>The project can investigate pharmaceutical incentives, regulatory decisions, coverage gaps, settlements, and conflicts of interest — but allegations must be separated from documented findings, and health claims must be graded by the evidence actually available.</p></div><ul>{standards.map((standard) => <li key={standard}>{standard}</li>)}</ul></section>
    <section className={styles.conversionSection}><div><p className={styles.eyebrow}>REVENUE PATH</p><h2>Every menu can support multiple legitimate commercial routes.</h2><p>Cookers can route toward groceries and kitchen products. Non-cookers can route toward delivery or restaurant discovery. Professional users can move into templates and workflow tools. Specialized-diet users can transform the same menu before taking action.</p></div><div className={styles.funnel}><span>Menu discovery</span><b>→</b><span>Party size + personalization</span><b>→</b><span>Cook · Order · Book</span><b>→</b><span>Attributed commercial action</span></div></section>
    <section className={styles.disclaimer}><strong>Educational and culinary planning use only.</strong><p>Chef Gringo does not diagnose, treat, cure, or prevent disease and does not advise users to start, stop, replace, or alter prescription medication. Specialized diets may require individualized review by a physician, pharmacist, registered dietitian, speech-language pathologist, or other qualified professional.</p></section>
  </main>;
}
