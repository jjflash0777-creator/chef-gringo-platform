import Link from "next/link";

export function TrustDisclosure() {
  return (
    <aside className="trust-disclosure" aria-labelledby="trust-disclosure-title">
      <span aria-hidden="true">CG</span>
      <div>
        <p className="eyebrow" id="trust-disclosure-title">How recommendations work</p>
        <h2>Professional judgment comes before commission.</h2>
        <p>We evaluate the customer problem, operating context, evidence, drawbacks, and product fit before considering where an item can be purchased. Affiliate relationships never determine inclusion or ranking.</p>
        <p><Link href="/affiliate-disclosure">Read the affiliate and commercial disclosure.</Link></p>
      </div>
    </aside>
  );
}
