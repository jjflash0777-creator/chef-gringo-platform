import type { Metadata } from "next";
import "./globals.css";
import "./styles/public-design.css";
import { AnalyticsBridge } from "./components/AnalyticsBridge";
import { PublicShell } from "./components/PublicShell";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Chef Gringo | Operator Purchasing & Decision Intelligence", template: "%s | Chef Gringo" },
  description: "Chef Gringo helps operators find where they are losing money, compare better routes, verify the evidence, and act.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Chef Gringo — What's costing you money?",
    description: "Operator purchasing, savings, sourcing, and decision intelligence.",
    type: "website",
    images: [{ url: "/og-foundation.png", width: 1200, height: 630, alt: "Chef Gringo operator intelligence" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-foundation.png"] },
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
