import type { Metadata } from "next";
import Link from "next/link";
import { MenuExperienceEngine } from "../specialized-diets/MenuExperienceEngine";
import styles from "./menus.module.css";

export const metadata: Metadata = {
  title: "Chef Gringo Menus — Pick dinner. Finish the decision.",
  description: "Discover complete restaurant-style menus, scale them to your party, consolidate the shopping list, customize the experience, then cook, order, or book.",
};

export default function MenusPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>CHEF GRINGO MENUS</p>
          <h1>Dinner is a decision. <em>Chef Gringo finishes it.</em></h1>
          <p className={styles.lede}>
            Pick a complete menu, tell us who is eating, and Chef Gringo turns the whole experience into the next action — cook it, shop it, order something similar, or find a restaurant worth leaving home for.
          </p>
          <div className={styles.actions}>
            <a href="#menu-experiences" className={styles.primary}>Build tonight&apos;s dinner →</a>
            <Link href="/specialized-diets" className={styles.secondary}>Specialized diet tools</Link>
          </div>
        </div>
      </section>

      <section className={styles.promise} aria-label="How Chef Gringo Menus works">
        <article><span>01</span><strong>Discover</strong><p>Browse complete menus by cuisine, occasion, mood, format, or responsibly sourced cultural inspiration.</p></article>
        <article><span>02</span><strong>Customize</strong><p>Set the party size and layer in dietary direction without dismantling the experience.</p></article>
        <article><span>03</span><strong>Make it</strong><p>Scale every course and merge the ingredients into one practical shopping list.</p></article>
        <article><span>04</span><strong>Get it</strong><p>Use the same dining intent to route toward grocery, delivery, or a matching restaurant experience.</p></article>
      </section>

      <MenuExperienceEngine />

      <section className={styles.commercial}>
        <div>
          <p className={styles.kicker}>THE BUSINESS MODEL IS INSIDE THE DECISION</p>
          <h2>One dinner can create several legitimate revenue routes.</h2>
        </div>
        <div className={styles.routeList}>
          <p><strong>Cook:</strong> grocery and kitchen-product handoff.</p>
          <p><strong>Order:</strong> delivery or takeout matching the chosen menu.</p>
          <p><strong>Book:</strong> restaurant discovery and reservation intent.</p>
          <p><strong>Transform:</strong> specialized-diet, professional, and premium template tools.</p>
        </div>
      </section>

      <section className={styles.note}>
        <strong>Built to stay provider-neutral.</strong>
        <p>Chef Gringo owns the menu and decision model. Grocery, delivery, and reservation partners are adapters, so a future commercial relationship can be changed without rebuilding the product.</p>
      </section>
    </main>
  );
}
