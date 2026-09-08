import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Beets: More Than a Beautiful Root",
  description: "Chef Gringo food intelligence on beet nutrition, nitrate research, preparation, flavor pairing, storage, and menu use.",
};

export default function BeetsFoodIntelligencePage() {
  return (
    <article className="page-shell container narrow">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/learn">Learn</Link> / Beets</p>
      <p className="eyebrow">Food intelligence · ingredient</p>
      <h1>Beets: More Than a Beautiful Root</h1>
      <p className="lead">Beets are useful because they sit at the intersection of flavor, color, nutrition, technique, and low-waste cooking. The point is not to turn them into a miracle food. The point is to understand what they actually bring to the kitchen.</p>

      <section>
        <h2>What makes beets interesting</h2>
        <p>Beets are naturally sweet and earthy, with edible roots and greens. They provide fiber and folate, and they also contain naturally occurring inorganic nitrate. That nitrate is the reason beetroot juice has been studied for possible effects on blood pressure and exercise physiology.</p>
        <p>The evidence is more specific than the internet usually makes it sound. A 2024 systematic review and meta-analysis of adults with hypertension found a reduction in clinical systolic blood pressure with beetroot juice, while certainty of evidence was rated low and effects were not significant for all blood-pressure measures. That makes beets interesting food — not a replacement for medical care.</p>
      </section>

      <section>
        <h2>How chefs can use them better</h2>
        <ul>
          <li><strong>Roast:</strong> concentrate sweetness and develop a cleaner, less watery texture.</li>
          <li><strong>Pair with acid:</strong> citrus, vinegar, yogurt, cultured dairy, and pickles balance the earthy profile.</li>
          <li><strong>Use contrasting texture:</strong> nuts, seeds, crisp grains, apples, fennel, and toasted bread keep beet dishes from feeling flat.</li>
          <li><strong>Use the greens:</strong> sauté or braise them like chard instead of treating them as trim waste.</li>
          <li><strong>Go beyond salad:</strong> use beets in purées, soups, grain bowls, relishes, sandwiches, dips, composed entrées, and vegetable-forward sauces.</li>
        </ul>
      </section>

      <section>
        <h2>What operators should think about</h2>
        <p>Beets can be inexpensive, hold reasonably well under refrigeration, create strong visual impact, and generate multiple usable components from one purchase. That makes them worth considering in menus where color, vegetable utilization, and cross-use matter.</p>
        <p>The operational question is not “Are beets healthy?” It is “Can this ingredient earn its place across enough dishes, with enough utilization, to justify carrying it?”</p>
      </section>

      <section>
        <h2>Evidence worth reading</h2>
        <p><a href="https://pubmed.ncbi.nlm.nih.gov/39069465/" target="_blank" rel="noreferrer">2024 systematic review and meta-analysis on beetroot juice and blood pressure in hypertension ↗</a></p>
        <p><a href="https://pubmed.ncbi.nlm.nih.gov/35369064/" target="_blank" rel="noreferrer">Systematic review and meta-analysis of nitrate-rich beetroot juice in hypertension ↗</a></p>
      </section>

      <aside className="notice-card">
        <strong>Nutrition note</strong>
        <p>This article is educational and culinary in nature. It is not medical advice and should not be used to diagnose, treat, or replace care from a qualified clinician.</p>
      </aside>

      <p><Link href="/#operator-question">Ask Chef Gringo how to use beets in your menu →</Link></p>
    </article>
  );
}
