import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AnalyticsBridge } from "./components/AnalyticsBridge";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Chef Gringo | Familiar food, thoughtfully adapted", template: "%s | Chef Gringo" },
  description: "Practical favorite-food makeovers, senior and caregiver recipes, and culinary director tools.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Chef Gringo — Keep the food they love",
    description: "Favorite-food makeovers and practical culinary tools from real senior-living foodservice experience.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Chef Gringo — Keep the food they love" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <header className="site-header">
          <div className="container nav-wrap">
            <Link className="brand" href="/" aria-label="Chef Gringo home">
              <span className="brand-mark">CG</span>
              <span>Chef Gringo<small>Real food. Practical moves.</small></span>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/favorite-food-makeovers">Makeovers</Link>
              <Link href="/senior-caregiver-kitchen">Caregiver Kitchen</Link>
              <Link href="/culinary-director-tools">Pro Tools</Link>
              <Link href="/recipes">Recipes</Link>
              <Link href="/about">About</Link>
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <div className="container footer-grid">
            <div>
              <Link className="brand footer-brand" href="/"><span className="brand-mark">CG</span><span>Chef Gringo</span></Link>
              <p>Familiar food, useful tools, and a practical hand in the kitchen.</p>
            </div>
            <div>
              <h2>Explore</h2>
              <Link href="/newsletter">Newsletter</Link>
              <Link href="/tools/recipe-scaler">Recipe scaler</Link>
              <Link href="/medical-and-nutrition-disclaimer">Medical & nutrition disclaimer</Link>
            </div>
            <p className="fine-print">General educational cooking information only. Individual needs differ; follow guidance from your qualified clinicians.</p>
          </div>
          <div className="container copyright">© {new Date().getFullYear()} Chef Gringo. Built for good food and real life.</div>
        </footer>
        <AnalyticsBridge />
      </body>
    </html>
  );
}
