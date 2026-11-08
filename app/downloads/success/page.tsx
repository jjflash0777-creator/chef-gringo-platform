import type { Metadata } from "next";
import Link from "next/link";
import { recordDownloadOrder } from "../../../db/download-orders-repository.ts";
import { getD1Binding } from "../../../db/index.ts";
import { getDownloadProduct } from "../../lib/downloads";
import { createDownloadToken, DOWNLOAD_TOKEN_TTL_SECONDS } from "../../lib/payments/downloadTokens.ts";
import { retrieveStripeCheckoutSession } from "../../lib/payments/stripeCheckout.ts";
import styles from "../downloads.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

const SUPPORT_LINE = (
  <p className={styles.support}>
    Anything wrong — a link that misbehaves, the wrong file, second thoughts? Email{" "}
    <a href="mailto:hello@chefgringo.com">hello@chefgringo.com</a> with the email you checked out with and
    we&apos;ll sort it out. Refunds are handled case by case, and a broken file gets replaced, not argued about.
  </p>
);

function Shell({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/downloads">Downloads</Link> / Order</p>
      <p className="eyebrow">Downloads</p>
      <h1>{heading}</h1>
      {children}
    </div>
  );
}

export default async function DownloadsSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <Shell heading="We can&apos;t find that checkout.">
        <div className="prose">
          <p>
            This page needs the checkout reference Stripe sends back after payment, and this visit doesn&apos;t
            carry one. If you just paid, use the link from the page Stripe returned you to — or email us and
            we&apos;ll re-issue your downloads.
          </p>
        </div>
        {SUPPORT_LINE}
      </Shell>
    );
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return (
      <Shell heading="Checkout is being connected.">
        <div className="prose">
          <p>
            The storefront isn&apos;t wired to Stripe on this deployment yet, so this payment can&apos;t be verified
            here. If you believe you were charged, email us — no buyer gets left holding a charge without files.
          </p>
        </div>
        {SUPPORT_LINE}
      </Shell>
    );
  }

  let session;
  try {
    session = await retrieveStripeCheckoutSession({ secretKey, sessionId });
  } catch {
    return (
      <Shell heading="We couldn&apos;t verify that payment yet.">
        <div className="prose">
          <p>
            Stripe didn&apos;t confirm this checkout just now. That is not a lost order — give it a minute and
            reload this page, and if it still won&apos;t verify, email us with the address you checked out with.
          </p>
        </div>
        {SUPPORT_LINE}
      </Shell>
    );
  }

  if (session.payment_status !== "paid") {
    return (
      <Shell heading="That checkout isn&apos;t paid yet.">
        <div className="prose">
          <p>
            Stripe shows this checkout as {session.payment_status ?? "unpaid"}, so there are no files to
            release. If you completed payment and see this, reload once — verification can lag a few
            seconds — and then email us if it persists.
          </p>
        </div>
        {SUPPORT_LINE}
      </Shell>
    );
  }

  const product = getDownloadProduct(session.metadata.product_id || "");
  if (!product || typeof session.amount_total !== "number" || !session.customerEmail) {
    return (
      <Shell heading="That payment doesn&apos;t match a downloads product.">
        <div className="prose">
          <p>
            The payment verified, but it doesn&apos;t line up with a product in the downloads catalog, so this
            page can&apos;t release files for it. Email us with the address you checked out with and we&apos;ll fix
            it by hand.
          </p>
        </div>
        {SUPPORT_LINE}
      </Shell>
    );
  }

  let order;
  try {
    order = await recordDownloadOrder(getD1Binding(), {
      productId: product.id,
      buyerEmail: session.customerEmail,
      amountTotal: session.amount_total,
      currency: session.currency || product.currency,
      checkoutSessionId: session.id,
      paymentIntentId: session.payment_intent,
      paidAt: new Date().toISOString(),
    });
  } catch {
    return (
      <Shell heading="Paid — and we hit a snag recording it.">
        <div className="prose">
          <p>
            Stripe confirms your payment for <strong>{product.name}</strong>. Our order book hiccuped before
            it could unlock the downloads, which is our problem, not yours: email us with the address you
            checked out with and the files will come straight to you.
          </p>
        </div>
        {SUPPORT_LINE}
      </Shell>
    );
  }

  const linkSecret = process.env.DOWNLOAD_LINK_SECRET;
  if (!linkSecret) {
    return (
      <Shell heading={`Paid — thank you. ${product.name} is yours.`}>
        <div className="prose">
          <p>
            Your payment is confirmed and the order is on the books. The self-serve download links are
            still being connected on this deployment, so this once, email{" "}
            <a href="mailto:hello@chefgringo.com">hello@chefgringo.com</a> with the address you checked out
            with and the files will be sent straight over.
          </p>
        </div>
        {SUPPORT_LINE}
      </Shell>
    );
  }

  const token = await createDownloadToken({ secret: linkSecret, orderId: order.id, productId: product.id });
  const hours = Math.round(DOWNLOAD_TOKEN_TTL_SECONDS / 3600);

  return (
    <Shell heading={`Thank you — ${product.name} is yours.`}>
      <div className="prose">
        <p className="lede">
          Payment confirmed. Your files are below — download them now and keep them anywhere you&apos;ll find
          them again. These links stay live for {hours} hours; after that, one email gets them re-issued.
        </p>
        <p>
          Stripe has emailed your receipt to {order.buyerEmail}. The license is single-facility: put it to
          work in your kitchen, and talk to us about multi-facility use instead of passing copies around.
        </p>
      </div>
      <ul className={styles.fileList}>
        {product.files.map((file) => (
          <li key={file.id}>
            <span className={styles.fileLabel}>{file.label}</span>
            <a
              className="cg-button cg-button-primary"
              href={`/api/downloads/file?token=${encodeURIComponent(token)}&file=${encodeURIComponent(file.id)}`}
            >
              Download
            </a>
          </li>
        ))}
      </ul>
      {SUPPORT_LINE}
    </Shell>
  );
}
