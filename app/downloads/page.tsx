import type { Metadata } from "next";
import Link from "next/link";
import { FieldNotesCapture } from "../components/FieldNotesCapture";
import { DOWNLOAD_PRODUCTS, formatDownloadPrice } from "../lib/downloads";
import { BuyButton } from "./BuyButton";
import styles from "./downloads.module.css";

export const metadata: Metadata = {
  title: "Downloads",
  description:
    "Chef Gringo digital products: the Kitchen Reference Chart Set, the Healthcare Kitchen Starter Pack, and the Foodservice Schedule Pack.",
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
          wall, the log that survives a survey, the schedule grid that totals its own hours.
          Built from public standards and a working culinary director&apos;s daily practice — never from any employer&apos;s documents.
        </p>
        <p>
          Every product is a digital download. Checkout is handled by Stripe; the moment it clears, your
          files are on the confirmation page, and the download links stay live for 72 hours. Stripe emails
          your receipt. The free{" "}
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
            <div className={styles.buyRow}>
              <span className={styles.price}>{formatDownloadPrice(product)}</span>
              <BuyButton productId={product.id} priceLabel={formatDownloadPrice(product)} />
            </div>
            <p className={styles.buyNote}>Digital download, delivered on the confirmation page after checkout.</p>
          </article>
        ))}
      </div>

      <p className={styles.support}>
        Questions before you buy, or a problem with an order? Email{" "}
        <a href="mailto:hello@chefgringo.com">hello@chefgringo.com</a> — refunds are handled case by case,
        and a broken file gets replaced, not argued about.
      </p>

      <div className={styles.launch}>
        <FieldNotesCapture
          heading="Get Field Notes."
          copy="Field Notes is Chef Gringo's email for people who cook — and for the managers who run kitchens. New downloads and guides go to subscribers first, starting with the mother sauces family tree printable, free. No noise, no invented urgency, just the next useful thing, when it is ready."
        />
      </div>
    </div>
  );
}
