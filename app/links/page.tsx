import type { Metadata } from "next";
import Link from "next/link";
import { latestEditorial } from "../lib/editorial-registry";
import { PARTNER_SHOWCASE } from "../lib/partners";
import { DOWNLOAD_PRODUCTS } from "../lib/downloads";
import styles from "./links.module.css";

export const metadata: Metadata = {
  title: "Links",
  description:
    "Every Chef Gringo route in one place — the latest post, the Foundations of Flavor track, Shop My Kitchen, downloads, Field Notes, and social profiles.",
  alternates: { canonical: "/links" },
  openGraph: {
    title: "Chef Gringo Links",
    description:
      "The latest post, the recipes, the tools, and the downloads — every Chef Gringo route in one place.",
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
    heading: "Latest",
    cards: [
      {
        href: latestEditorial.href,
        tag: "Latest post",
        title: latestEditorial.title,
        detail: latestEditorial.summary,
      },
      {
        href: "/recipes",
        tag: "Recipes",
        title: "The recipe shelf",
        detail: "Complete recipes, honestly labeled — what is published is finished.",
      },
    ],
  },
  {
    heading: "Start here — Foundations of Flavor",
    cards: [
      {
        href: "/learn/mirepoix-foundations-of-flavor",
        tag: "No. 1",
        title: "Mirepoix: Foundations of Flavor",
        detail: "The 300-year story hiding under your dinner — history, food science, cut size, and heat.",
      },
      {
        href: "/learn/mother-sauces-foundations-of-flavor",
        tag: "No. 2",
        title: "Mother Sauces: Five Bases, a Thousand Dinners",
        detail: "Five bases, their derivatives, and why the list is a system, not a memory test.",
      },
      {
        href: "/learn/mother-sauces-family-tree",
        tag: "Free printable",
        title: "The Mother Sauces Family Tree",
        detail: "The whole five-sauce system on one printable sheet.",
      },
    ],
  },
  {
    heading: "Shop my kitchen",
    cards: PARTNER_SHOWCASE.map((partner) => ({
      href: partner.href,
      tag: partner.kind,
      title: `${partner.name} — ${partner.role.toLowerCase()}`,
      detail: partner.blurb,
      partner: true,
    })),
  },
  {
    heading: "Downloads",
    cards: DOWNLOAD_PRODUCTS.map((product) => ({
      href: `/downloads#${product.id}`,
      tag: "Download",
      title: product.name,
      detail: `${product.audience} · ${product.format}`,
    })),
  },
  {
    heading: "Stay in the loop",
    cards: [
      {
        href: "/newsletter",
        tag: "Newsletter",
        title: "Field Notes",
        detail: "Practical cooking missions, new features, and new downloads as they publish. No invented urgency.",
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
        detail: "Short-form kitchen work and recipe clips.",
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
      <p className={styles.tagline}>Recipes, technique, and the tools actually worth buying.</p>
      <p className={styles.intro}>
        A working chef&apos;s blog — the latest post, the Foundations track, the kitchen I actually cook from, and the downloads, in one place.
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
        Some links on this page are affiliate links. Chef Gringo may earn a commission from qualifying purchases made through them, at no additional cost to you. Recommendations are never ranked by commission, and a product can be criticized or omitted despite a commercial relationship. Full details: <Link href="/affiliate-disclosure">Affiliate disclosure</Link>.
      </p>
    </div>
  );
}
