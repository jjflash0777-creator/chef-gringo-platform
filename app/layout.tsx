import type { Metadata } from "next";
import "./globals.css";
import "./styles/design-system.css";
import "./styles/homepage-v4.css";
import "./styles/publication-home.css";
import { AnalyticsBridge } from "./components/AnalyticsBridge";
import { PublicShell } from "./components/PublicShell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Chef Gringo — Food, Recipes & Kitchen Knowledge", template: "%s | Chef Gringo" },
  description: "A chef-led food publication for recipes, ingredients, cooking technique, food stories, and practical kitchen guidance — with honest buying help when a tool is part of the answer.",
  verification: {
    other: {
      "p:domain_verify": "956e31826811b4dba130a8932d2028fd",
    },
  },
  openGraph: {
    title: "Chef Gringo — Food worth understanding",
    description: "Recipes, food stories, cooking technique, and practical kitchen knowledge from Chef Gringo.",
    type: "website",
    images: [{ url: "/og-foundation.png", width: 1200, height: 630, alt: "Chef Gringo food publication" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chef Gringo — Food worth understanding",
    description: "Recipes, food stories, and kitchen knowledge worth keeping.",
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
