import type { Metadata } from "next";
import Link from "next/link";
import styles from "./links.module.css";

export const metadata: Metadata = {
  title: "Links",
  description:
    "Every Chef Gringo route in one place — the flagship feature, recipes, marketplace research, partner pages, Field Notes newsletter, and social profiles.",
  alternates: { canonical: "/links" },
  openGraph: {
    title: "Chef Gringo Links",
    description:
      "The publication, the recipes, the research, and the partners — every Chef Gringo route in one place.",
    url: "/links",
  },
};

type LinkCard = {
  href: string;
  tag: string;
  title: string;
  detail: string;
  external?: boolean;
  partner?: boolean;
};

const groups: readonly { heading: string; cards: readonly LinkCard[] }[] = [
  {
    heading: "Read",
    cards: [
      {
        href: "/learn/mirepoix-foundations-of-flavor",
        tag: "Flagship feature",
        title: "Mirepoix: Foundations of Flavor",
        detail: "The 300-year story hiding under your dinner — history, food science, cut size, and heat.",
      },
      {
        href: "/recipes",
        tag: "Recipes",
        title: "The recipe shelf",
        detail: "Complete recipes, honestly labeled. Not a library — what is published is finished.",
      },
    ],
  },
  {
    heading: "Shop the research",
    cards: [
      {
        href: "/marketplace",
        tag: "Marketplace",
        title: "Researched products, problem first",
        detail: "Start with the problem. The product comes second. Commercial status is shown on every record.",
      },
    ],
  },
  {
    heading: "Partner pages",
    cards: [
      {
        href: "/go/thermoworks",
        tag: "Partner link",
        title: "ThermoWorks — temperature tools",
        detail: "Instant-read, leave-in probes, and monitoring, matched to the job instead of the hype.",
        partner: true,
      },
      {
        href: "/go/bluetti",
        tag: "Partner link",
        title: "BLUETTI — power that keeps kitchens running",
        detail: "Portable power and backup for food trucks, refrigeration, and off-grid kitchens.",
        partner: true,
      },
      {
        href: "/go/chefiq",
        tag: "Partner link",
        title: "Chef iQ — guided smart cooking",
        detail: "Guided recipes and connected temperature tracking across the Chef iQ and Chefman ecosystem.",
        partner: true,
      },
      {
        href: "/go/gustus-vitae",
        tag: "Partner link",
        title: "Gustus Vitae — seasonings & finishing salts",
        detail: "Small-batch blends, rubs, and finishing salts for cooks who season in layers.",
        partner: true,
      },
    ],
  },
  {
    heading: "Stay in the loop",
    cards: [
      {
        href: "/newsletter",
        tag: "Newsletter",
        title: "Field Notes",
        detail: "Practical cooking missions, equipment investigations, and new downloads as they publish. No invented urgency.",
      },
    ],
  },
  {
    heading: "Follow",
    cards: [
      {
        href: "https://www.tiktok.com/@thechefgringo",
        tag: "TikTok",
        title: "@thechefgringo",
        detail: "Short-form kitchen intelligence and recipe work.",
        external: true,
      },
      {
        href: "https://www.instagram.com/thechefgringo",
        tag: "Instagram",
        title: "@thechefgringo",
        detail: "Features, carousels, and what is cooking.",
        external: true,
      },
      {
        href: "https://www.facebook.com/101176522888269",
        tag: "Facebook",
        title: "Chef Gringo's",
        detail: "The Chef Gringo page on Facebook.",
        external: true,
      },
    ],
  },
];

export default function LinksPage() {
  return (
    <div className="page-shell container narrow">
      <p className="breadcrumbs"><Link href="/">Home</Link> / Links</p>
      <p className="eyebrow">Chef Gringo · Link hub</p>
      <h1>Chef Gringo</h1>
      <p className={styles.tagline}>Know More. Waste Less. Operate Better.</p>
      <p className={styles.intro}>
        Hospitality intelligence for cooks, operators, and food-business builders — the publication, the recipes, the research, and the partners, in one place.
      </p>

      {groups.map((group) => (
        <section key={group.heading} className={styles.group}>
          <h2 className={styles.groupHeading}>{group.heading}</h2>
          <div className={styles.cardList}>
            {group.cards.map((card) =>
              card.external ? (
                <a key={card.href + card.title} href={card.href} target="_blank" rel="noreferrer" className={styles.card}>
                  <span className={styles.cardTag}>{card.tag}</span>
                  <strong className={styles.cardTitle}>{card.title}</strong>
                  <span className={styles.cardDetail}>{card.detail}</span>
                  <span className={styles.cardArrow} aria-hidden="true">→</span>
                </a>
              ) : (
                <Link key={card.href + card.title} href={card.href} className={styles.card}>
                  <span className={styles.cardTag}>{card.tag}</span>
                  <strong className={styles.cardTitle}>{card.title}</strong>
                  <span className={styles.cardDetail}>{card.detail}</span>
                  <span className={styles.cardArrow} aria-hidden="true">→</span>
                </Link>
              ),
            )}
          </div>
        </section>
      ))}

      <p className={styles.disclosure}>
        Some links on this page are partner links. Chef Gringo may earn a commission from qualifying purchases made through them, at no additional cost to you. Recommendations are never ranked by commission, and a product can be criticized or omitted despite a commercial relationship. Full details: <Link href="/affiliate-disclosure">Affiliate disclosure</Link>.
      </p>
    </div>
  );
}
