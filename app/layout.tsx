import type { Metadata } from "next";
import "./globals.css";
import "./styles/design-system.css";
import "./styles/homepage-v4.css";
import { AnalyticsBridge } from "./components/AnalyticsBridge";
import { PublicShell } from "./components/PublicShell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Chef Gringo | Recipes, Technique & Tools Worth Buying", template: "%s | Chef Gringo" },
  description: "A working chef's blog: recipes, technique, and the tools actually worth buying — with affiliate relationships disclosed in plain language.",
  verification: {
    other: {
      "p:domain_verify": "956e31826811b4dba130a8932d2028fd",
    },
  },
  openGraph: {
    title: "Chef Gringo — Recipes, technique, and tools worth buying",
    description: "Recipes, technique, and the tools actually worth buying, from a working culinary director.",
    type: "website",
    images: [{ url: "/og-foundation.png", width: 1200, height: 630, alt: "Chef Gringo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chef Gringo — Recipes, technique, and tools worth buying",
    description: "Recipes, technique, and the tools actually worth buying.",
    images: ["/og-foundation.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PublicShell>{children}</PublicShell>
        <AnalyticsBridge />
      </body>
    </html>
  );
}
