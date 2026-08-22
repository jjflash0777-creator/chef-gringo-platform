import type { Metadata } from "next";
import "./globals.css";
import "./styles/public-design.css";
import "./styles/approved-home.css";
import "./styles/ai-runtime.css";
import "./styles/ai-conversation.css";
import { AnalyticsBridge } from "./components/AnalyticsBridge";
import { PublicShell } from "./components/PublicShell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Chef Gringo | Hospitality Intelligence", template: "%s | Chef Gringo" },
  description: "Chef Gringo turns hospitality questions into useful action across cooking, shopping, equipment, purchasing, software, and operations.",
  alternates: { canonical: "/" },
  verification: {
    other: {
      "p:domain_verify": "956e31826811b4dba130a8932d2028fd",
    },
  },
  openGraph: {
    title: "Chef Gringo — Know More. Waste Less. Operate Better.",
    description: "Hospitality intelligence that helps you cook, compare, shop, source, troubleshoot, and act with better information.",
    type: "website",
    images: [{ url: "/og-foundation.png", width: 1200, height: 630, alt: "Chef Gringo hospitality intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chef Gringo — Know More. Waste Less. Operate Better.",
    description: "Hospitality intelligence that turns questions into useful action.",
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
