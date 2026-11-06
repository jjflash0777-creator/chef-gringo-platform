import type { Metadata } from "next";
import Link from "next/link";
import { FieldNotesCapture } from "../components/FieldNotesCapture";
import { DOWNLOAD_PRODUCTS } from "../lib/downloads";
import styles from "./downloads.module.css";

export const metadata: Metadata = {
  title: "Downloads",
  description:
    "Chef Gringo digital products: the Kitchen Reference Chart Set, the Healthcare Kitchen Starter Pack, the diet-and-texture Recipe Calculator, and the Foodservice Schedule Pack.",
  alternates: { canonical: "/downloads" },
};

export default function DownloadsPage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Downloads</p>
      <p className="eyebrow">Downloads</p>
      <h1>Tools you can print, post, and run a kitchen with.</h1>
      <div className="prose">
        <p className="lede">
          Everything here started as something a working kitchen actually needed: the chart that belongs on the
          wall, the log that survives a survey, the calculator that scales a recipe by diet instead of by hope.
          Built from public standards and a working culinary director&apos;s daily practice — never from any employer&apos;s documents.
        </p>
        <p>
          The storefront is being set up now. Until checkout opens, the Field Notes list below is the launch
          list: subscribers hear first when each product goes on sale, and the free{" "}
          <Link href="/learn/mother-sauces-family-tree">mother sauces family tree</Link> printable is the taste
          of how these are made.
        </p>
      </div>

      <div className={styles.grid}>
        {DOWNLOAD_PRODUCTS.map((product) => (
          <article className={styles.card} key={product.id} id={product.id}>
            <div className={styles.cardTop}>
              <h2 className={styles.cardName}>{product.name}</h2>
              <span className={styles.format}>{product.format}</span>
            </div>
            <p className={styles.audience}>For: {product.audience}</p>
            <p className={styles.blurb}>{product.blurb}</p>
            <ul className={styles.inside}>
              {product.inside.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className={styles.launch}>
        <FieldNotesCapture
          heading="Get on the launch list."
          copy="Field Notes is Chef Gringo's email for people who cook — and for the managers who run kitchens. Downloads go to subscribers first, starting with the mother sauces family tree printable, free. No noise, no invented urgency, just the next useful thing, when it is ready."
        />
      </div>
    </div>
  );
}
