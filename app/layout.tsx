import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AnalyticsBridge } from "./components/AnalyticsBridge";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Chef Gringo | Build Your Future in Hospitality", template: "%s | Chef Gringo" },
  description: "Chef Gringo helps people learn skills, build hospitality careers, lead stronger operations, and create hospitality businesses.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Chef Gringo — Build Your Future in Hospitality",
    description: "Learn. Work. Lead. Build. A practical career and operating platform for hospitality.",
    type: "website",
    images: [{ url: "/og-foundation.png", width: 1200, height: 630, alt: "Chef Gringo — Build Your Future in Hospitality" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-foundation.png"] },
};

const navigation = [
  { href: "/#platform", label: "Platform" },
  { href: "/vision", label: "Vision" },
  { href: "/about", label: "Founder" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header className="site-header">
          <div className="container nav-wrap">
            <Link className="brand" href="/" aria-label="Chef Gringo home">
              <span className="brand-mark" aria-hidden="true">CG</span>
              <span>Chef Gringo<small>Hospitality, from first shift to ownership.</small></span>
            </Link>
            <nav aria-label="Main navigation">
              {navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
              <Link className="nav-cta" href="/early-access" data-event="primary_cta_clicked">Join Early Access</Link>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container footer-grid">
            <div>
              <Link className="brand footer-brand" href="/"><span className="brand-mark">CG</span><span>Chef Gringo</span></Link>
              <p>Helping people learn, work, lead, and build businesses in hospitality.</p>
              <Link className="button button-light" href="/early-access">Join Early Access</Link>
            </div>
            <div>
              <h2>Foundation</h2>
              <Link href="/vision">The vision</Link>
              <Link href="/about">Founder story</Link>
              <Link href="/early-access">Early access</Link>
            </div>
            <div>
              <h2>Policies & contact</h2>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <a href="mailto:hello@chefgringo.com">Contact</a>
              <span className="footer-placeholder">Social channels coming soon</span>
            </div>
          </div>
          <div className="container copyright">© {new Date().getFullYear()} Chef Gringo. Practical value before promotion.</div>
        </footer>
        <AnalyticsBridge />
      </body>
    </html>
  );
}
