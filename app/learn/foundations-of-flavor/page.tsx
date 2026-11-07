import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FieldNotesCapture } from "../../components/FieldNotesCapture";
import { editorialFeatures, type EditorialFeature } from "../../lib/editorial-registry";

export const metadata: Metadata = {
  title: "Foundations of Flavor | Chef Gringo",
  description:
    "The Foundations of Flavor track: Chef Gringo's numbered series on the bases everything else stands on. No. 1 Mirepoix, No. 2 Mother Sauces — read them in order.",
  openGraph: {
    title: "Foundations of Flavor",
    description: "One foundation at a time — the history, the science, and the part where you cook it.",
    images: ["/images/editorial/mother-sauces-foundations-of-flavor/mother_sauces_five_sauciers_overhead.png"],
  },
};

const mirepoix = editorialFeatures.find((feature: EditorialFeature) => feature.href === "/learn/mirepoix-foundations-of-flavor")!;
const motherSauces = editorialFeatures.find((feature: EditorialFeature) => feature.href === "/learn/mother-sauces-foundations-of-flavor")!;

const sauceRecipes = [
  { href: "/recipes/bechamel", label: "Béchamel" },
  { href: "/recipes/veloute", label: "Velouté" },
  { href: "/recipes/espagnole", label: "Espagnole" },
  { href: "/recipes/sauce-tomate", label: "Sauce Tomate" },
  { href: "/recipes/hollandaise", label: "Hollandaise" },
] as const;

export default function FoundationsOfFlavorPage() {
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/learn">Guides &amp; Charts</Link> / Foundations of Flavor</p>
      <p className="eyebrow">Foundations of Flavor · The series</p>
      <h1>The bases everything else stands on.</h1>
      <p className="lede">
        Foundations of Flavor is a numbered series about the preparations the rest of cooking is built on.
        One foundation at a time, taken apart properly — the history, the science, and the part where you
        cook it. Read them in order and the rest of the kitchen gets quieter: fewer recipes to memorize,
        more systems you actually understand.
      </p>

      <section className="branch-note" style={{ marginBottom: "2rem" }}>
        <p className="eyebrow">No. 1 · Published</p>
        <h2 style={{ fontSize: "2.4rem" }}>{mirepoix.title}</h2>
        <Image unoptimized src={mirepoix.image} alt={mirepoix.imageAlt} width={1672} height={941} style={{ width: "100%", height: "auto", borderRadius: "12px" }} />
        <p>{mirepoix.summary} The flavor base under soups, braises, sauces and half the Western canon — where the track starts.</p>
        <p><Link href={mirepoix.href}><strong>Read No. 1 →</strong></Link></p>
      </section>

      <section className="branch-note" style={{ marginBottom: "2rem" }}>
        <p className="eyebrow">No. 2 · Published</p>
        <h2 style={{ fontSize: "2.4rem" }}>{motherSauces.title}</h2>
        <Image unoptimized src={motherSauces.image} alt={motherSauces.imageAlt} width={1672} height={941} style={{ width: "100%", height: "auto", borderRadius: "12px" }} />
        <p>{motherSauces.summary}</p>
        <p><Link href={motherSauces.href}><strong>Read No. 2 →</strong></Link></p>
        <p>
          The five complete recipes:{" "}
          {sauceRecipes.map((recipe, index) => (
            <span key={recipe.href}>
              {index > 0 ? " · " : ""}
              <Link href={recipe.href}>{recipe.label}</Link>
            </span>
          ))}
        </p>
        <p>
          The issue&apos;s takeaway:{" "}
          <Link href="/learn/mother-sauces-family-tree">
            <strong>The Mother Sauces Family Tree</strong> — the whole system on one printable sheet, free →
          </Link>
        </p>
      </section>

      <section className="branch-note" style={{ marginBottom: "2rem" }}>
        <p className="eyebrow">No. 3 · Next</p>
        <h2 style={{ fontSize: "2.4rem" }}>To be announced</h2>
        <p>
          The next foundation is chosen the same way the first two were: it has to be a base other cooking
          stands on, and it has to survive being taken apart. No topic and no date until it clears that bar —
          Field Notes subscribers hear it first.
        </p>
      </section>

      <p>
        Where the track is going: when there are enough issues to bind, they collect into a printable
        Foundations of Flavor guide. Nothing to buy today — the series comes first, and the guide gets
        announced in Field Notes when it exists.
      </p>

      <FieldNotesCapture
        heading="Follow the track, one foundation at a time."
        copy="Field Notes is Chef Gringo's email for people who cook: each new Foundations of Flavor issue as it publishes, the printable takeaways that come with it, and the guide when the track is ready to bind. No noise, no invented urgency, just the next useful thing, when it is ready."
      />
    </div>
  );
}
