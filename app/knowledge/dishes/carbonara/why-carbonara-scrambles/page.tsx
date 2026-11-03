import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why Your Carbonara Turns Into Scrambled Eggs",
  description:
    "Chef Gringo explains why Carbonara scrambles, how residual heat and pasta water control the sauce, and how to fix the workflow.",
  alternates: { canonical: "/knowledge/dishes/carbonara/why-carbonara-scrambles" },
};

export default function WhyCarbonaraScramblesPage() {
  return (
    <article className="editorial-article">
      <header className="editorial-hero">
        <div className="editorial-hero-copy">
          <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/knowledge/dishes/carbonara">Carbonara</Link> / Troubleshooting</p>
          <p className="eyebrow">Solve · Carbonara</p>
          <h1>Why your Carbonara turns into scrambled eggs.</h1>
          <p className="editorial-deck">
            If your Carbonara scrambled, the eggs probably were not the problem. Your pan was too damn hot.
            Carbonara is an emulsion built with residual heat—not an omelet hiding in pasta.
          </p>
        </div>
      </header>

      <div className="editorial-body">
        <p className="article-kicker">
          Fast answer: get the pan off direct heat, let the violent sizzling calm down, then add the egg-cheese mixture while tossing continuously and loosening with hot starchy pasta water.
        </p>

        <section>
          <h2>The failure usually happens before the eggs go in.</h2>
          <p>
            Guanciale or pancetta has been rendering in a hot pan. Pasta arrives straight from boiling water. The pan is already carrying a lot of stored heat.
            If the egg mixture hits that pan while it is still aggressively sizzling, the proteins set before the fat, cheese, starch, and water have time to become a sauce.
          </p>
          <p>
            That is why “cook it gently” is not enough advice. The important move is controlling <strong>residual heat</strong>.
            The burner can be off while the pan is still plenty hot enough to cook the sauce.
          </p>
        </section>

        <section>
          <h2>The five Carbonara mistakes I would check first.</h2>
          <ol>
            <li><strong>The pan is still on the burner.</strong> Direct heat makes your margin for error tiny.</li>
            <li><strong>You did not reserve enough pasta water.</strong> Starchy water is part of the sauce, not an emergency afterthought.</li>
            <li><strong>You stop tossing.</strong> Movement spreads heat and helps the sauce emulsify instead of setting in one place.</li>
            <li><strong>The cheese is too coarse.</strong> Finely grated cheese melts and disperses more easily.</li>
            <li><strong>You are finishing too much pasta at once.</strong> A crowded pan is harder to toss and harder to control.</li>
          </ol>
        </section>

        <section>
          <h2>A better workflow.</h2>
          <ol>
            <li><strong>Prep everything first.</strong> Egg mixture, grated cheese, rendered pork, serving bowls, and more pasta water than you think you need.</li>
            <li><strong>Cook the pasta just shy of done.</strong> It will keep cooking during the finish.</li>
            <li><strong>Move the pan off the burner.</strong> Let the harsh sizzling settle.</li>
            <li><strong>Add pasta and a splash of pasta water.</strong> Toss and let the pan cool slightly while coating the pasta with rendered fat.</li>
            <li><strong>Add the egg-cheese mixture while tossing constantly.</strong></li>
            <li><strong>Adjust with pasta water a little at a time.</strong> You are looking for glossy and fluid, not wet and not stiff.</li>
            <li><strong>Plate immediately.</strong> Carbonara keeps tightening as it sits.</li>
          </ol>
        </section>

        <section>
          <h2>Diagnose the sauce by what you see.</h2>
          <div className="evidence-grid">
            <article className="evidence-card evidence-not-supported">
              <p className="evidence-label">Scrambled</p>
              <p><strong>Cause:</strong> too much heat. Pull the pan earlier next time and let it cool before the egg mixture goes in.</p>
            </article>
            <article className="evidence-card evidence-moderate">
              <p className="evidence-label">Dry or tight</p>
              <p><strong>Cause:</strong> too little pasta water, too much cooling, or too much cheese. Loosen with warm starchy water while tossing.</p>
            </article>
            <article className="evidence-card evidence-emerging">
              <p className="evidence-label">Greasy</p>
              <p><strong>Cause:</strong> fat and water never emulsified. Add a small splash of pasta water and toss harder off heat.</p>
            </article>
            <article className="evidence-card evidence-strong">
              <p className="evidence-label">Glossy and flowing</p>
              <p><strong>That is the target.</strong> The sauce should cling to the pasta while still moving. Serve it now.</p>
            </article>
          </div>
        </section>

        <section>
          <h2>Can you rescue scrambled Carbonara?</h2>
          <p>
            Once the eggs are visibly curdled, you cannot fully turn them back into an emulsion. You can make the dish more pleasant by removing it from heat immediately,
            adding a little warm pasta water, and tossing, but the real fix is the next batch: lower residual heat and faster movement.
          </p>
        </section>

        <aside className="notice-card">
          <strong>Chef Gringo rule</strong>
          <p>If the pan is loudly sizzling when the egg mixture goes in, you are gambling. Give yourself a wider margin.</p>
        </aside>

        <section className="next-article">
          <p className="eyebrow">Keep cooking</p>
          <h2>Want the complete Carbonara workflow?</h2>
          <p>Use the full Chef Gringo Carbonara guide for ingredients, scaling, technique, and service guidance.</p>
          <p><Link href="/knowledge/dishes/carbonara"><strong>Open the complete Carbonara guide →</strong></Link></p>
        </section>
      </div>
    </article>
  );
}
