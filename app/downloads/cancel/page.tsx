import type { Metadata } from "next";
import Link from "next/link";
import styles from "../downloads.module.css";

export const metadata: Metadata = {
  title: "Checkout cancelled",
  robots: { index: false, follow: false },
};

export default function DownloadsCancelPage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/downloads">Downloads</Link> / Checkout</p>
      <p className="eyebrow">Downloads</p>
      <h1>Checkout cancelled — nothing was charged.</h1>
      <div className="prose">
        <p className="lede">
          You backed out of Stripe checkout before paying, so there is no order and no charge. The downloads
          are still on the shelf whenever you&apos;re ready.
        </p>
        <p>
          If something about a product is unclear — what&apos;s inside it, whether it fits your operation, how the
          license works — ask first: <a href="mailto:hello@chefgringo.com">hello@chefgringo.com</a>. A straight
          answer is cheaper than the wrong download.
        </p>
      </div>
      <p>
        <Link className="cg-button cg-button-primary" href="/downloads">Back to downloads</Link>
      </p>
      <p className={styles.support}>
        Problems with an order you did complete? Same address — refunds are handled case by case.
      </p>
    </div>
  );
}
