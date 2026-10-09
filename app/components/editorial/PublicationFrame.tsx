import Image from "next/image";
import Link from "next/link";
import { NewsletterForm } from "../NewsletterForm";
import { SECTION_META, type EditorialSectionId } from "../../editorial/types";

const navOrder: EditorialSectionId[] = [
  "front-of-house",
  "back-of-house",
  "independent-mobile",
  "health-better-living",
  "food-intelligence",
];

export function PublicationFrame({ children, newsletter = false }: { children: React.ReactNode; newsletter?: boolean }) {
  return (
    <div className="cg-publication-home">
      <header className="cg-pub-header">
        <div className="cg-pub-header-inner">
          <Link className="cg-pub-logo" href="/" aria-label="Chef Gringo home">
            <Image unoptimized src="/brand/cg-horizontal-lockup.png" alt="Chef Gringo" width={736} height={200} priority />
            <span>Real-world hospitality. No bullshit.</span>
          </Link>
          <nav className="cg-pub-nav" aria-label="Editorial sections">
            {navOrder.map((id) => <Link href={SECTION_META[id].route} key={id}>{SECTION_META[id].label}</Link>)}
          </nav>
          <div className="cg-pub-header-actions">
            <Link className="cg-pub-search" href="/discover" aria-label="Search Chef Gringo">⌕</Link>
            <Link className="cg-pub-marketplace-button" href="/marketplace">The Marketplace <span>→</span></Link>
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      {newsletter ? (
        <section className="cg-pub-global-newsletter">
          <div className="cg-pub-width cg-pub-global-newsletter-inner">
            <div>
              <p>Join the crew</p>
              <h2>One useful email. No corporate sludge.</h2>
              <span>Stories, tools, deals and hospitality insights from Chef Gringo.</span>
            </div>
            <NewsletterForm source="publication-footer" buttonLabel="Subscribe" />
          </div>
        </section>
      ) : null}

      <footer className="cg-pub-footer">
        <div className="cg-pub-width cg-pub-footer-grid">
          <div className="cg-pub-footer-brand">
            <Image unoptimized src="/brand/cg-horizontal-lockup.png" alt="Chef Gringo" width={736} height={200} />
            <p>Real-world hospitality. No bullshit.</p>
          </div>
          <blockquote>“Same industry. A little more truth.”</blockquote>
          <nav aria-label="Footer links">
            <Link href="/about">About</Link>
            <a href="mailto:hello@chefgringo.com">Contact</a>
            <Link href="/affiliate-disclosure">Affiliate disclosure</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
