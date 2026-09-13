import type { Metadata } from "next";
import Link from "next/link";
import { PRIMARY_NAV } from "../lib/public-ia";

export const metadata: Metadata = {
  title: "Tools",
  description: "Live tools and honest previews: Ask Chef Gringo, recipe scaling, repair briefs, comparison, and Cut Intelligence.",
};

export default function ToolsHubPage() {
  const tools = PRIMARY_NAV.find((entry) => entry.id === "tools");
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Tools</p>
      <p className="eyebrow">Use what is live. Preview what is not.</p>
      <h1>Tools that earn a place on the line.</h1>
      <p className="lede">The recipe scaler is deterministic and live. Ask Chef Gringo is live. The repair-or-replace brief is a paid pilot. Cut Intelligence is a preview. Senior-living clipboard tools remain on their own shelf.</p>
      <ul className="cg-hub-list">
        {tools?.items.map((item) => (
          <li key={`${item.href}-${item.label}`}>
            <Link href={item.href}>
              <strong>{item.label}{item.status === "preview" ? " · Preview" : ""}</strong>
              <span>{item.description}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p><Link href="/culinary-director-tools">Culinary director tools</Link> — scaler live, the rest marked upcoming.</p>
    </div>
  );
}
