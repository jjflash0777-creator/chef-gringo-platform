import type { Metadata } from "next";
import Link from "next/link";
import { PreviewBanner } from "../components/PreviewBanner";

export const metadata: Metadata = {
  title: "Cut Intelligence · Preview",
  description: "Beef-first cut education. Planned, not built. No photo recognition and no fake cattle graphic.",
};

export default function CutIntelligencePage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/learn">Learn</Link> / Cut Intelligence</p>
      <PreviewBanner product="Cut Intelligence" />
      <p className="eyebrow">Butchery education · beef first</p>
      <h1>Know the cut before you choose the fire.</h1>
      <p className="lede">Cut Intelligence is a required future product. It is not in this codebase. There is no photo identifier, no anatomy engine, and no livestock illustration pretending otherwise.</p>

      <h2>Intended inputs</h2>
      <p>A package label you can type, or — later — a photo of the meat. Photo recognition is a larger commitment and will not gate the useful half. Package-wording lookup is the honest first floor.</p>

      <h2>Intended outputs</h2>
      <ul>
        <li>Likely cut, with confidence and named alternatives — never a bare assertion.</li>
        <li>Where the cut sits on the animal, with a sourced diagram and an accessible non-3D fallback.</li>
        <li>Flavor, fat, connective tissue, and chew.</li>
        <li>Cooking methods the cut actually suits, plus conservative food-safety boundaries.</li>
        <li>Better-value, premium, and substitute cuts.</li>
        <li>Provenance: what is sourced, what is judgment, what is unknown.</li>
      </ul>

      <h2>Scope</h2>
      <p>Beef is first. Pork, lamb, poultry, and seafood should fit the same architecture later without a rebuild. Livestock expansion is planned, not present.</p>

      <h2>Current development status</h2>
      <p>Not built. A repository-wide search found no recoverable implementation. This page is the public placeholder so the product can be found from Learn, Tools, and the homepage without faking progress.</p>

      <h2>What you can do today</h2>
      <ul className="cg-hub-list">
        <li><Link href="/#operator-question"><strong>Ask Chef Gringo</strong><span>Cooking method and safety questions, with honest limits.</span></Link></li>
        <li><Link href="/learn/techniques"><strong>Cooking techniques preview</strong><span>Carbonara is the deep technique page that exists.</span></Link></li>
        <li><Link href="/marketplace?goal=choose-a-thermometer"><strong>Choose a thermometer</strong><span>Researched probes — not a substitute for knowing the cut.</span></Link></li>
      </ul>
    </div>
  );
}
