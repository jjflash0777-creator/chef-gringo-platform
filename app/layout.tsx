import type { Metadata } from "next";
import "./globals.css";
import "./styles/design-system.css";
import "./styles/recipes.css";
import "./styles/publication-home.css";
import { AnalyticsBridge } from "./components/AnalyticsBridge";
import { PublicShell } from "./components/PublicShell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Chef Gringo | Real-World Hospitality", template: "%s | Chef Gringo" },
  description: "Real-world hospitality stories, operator advice, kitchen knowledge, health guidance, food intelligence, gear and independent food-business coverage.",
  verification: {
    other: {
      "p:domain_verify": "956e31826811b4dba130a8932d2028fd",
    },
  },
  openGraph: {
    title: "Chef Gringo — Real-World Hospitality",
    description: "Front of house, back of house, independent hospitality, health, food intelligence, gear and stories from the industry.",
    type: "website",
    images: [{ url: "/og-foundation.png", width: 1200, height: 630, alt: "Chef Gringo real-world hospitality" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chef Gringo — Real-World Hospitality",
    description: "Real-world hospitality stories, operator advice, food intelligence and useful gear.",
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
