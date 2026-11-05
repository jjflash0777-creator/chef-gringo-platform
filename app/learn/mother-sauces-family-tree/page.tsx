import type { Metadata } from "next";
import Link from "next/link";
import { FieldNotesCapture } from "../../components/FieldNotesCapture";
import { PrintButton } from "../../components/PrintButton";
export const metadata: Metadata = {
  title: "The Mother Sauces Family Tree | Chef Gringo",
  description:
    "The five mother sauces on one printable sheet: Carême's four grandes sauces, Escoffier's five, allemande's demotion, and the derivatives each mother divides into.",
  openGraph: {
    title: "The Mother Sauces Family Tree",
    description:
      "Carême's four, Escoffier's five, one demotion — the whole sauce system on one printable sheet.",
    images: ["/images/editorial/mother-sauces-2026/slide-1-family.webp"],
  },
};

const careme = ["Béchamel", "Velouté", "Espagnole", "Allemande"] as const;

const mothers = [
  {
    name: "Béchamel",
    builtOn: "Milk + white roux",
    job: "Carries and coats",
    derivatives: [{ name: "Mornay", note: "Béchamel finished with grated cheese" }],
    recipe: "/recipes/bechamel",
  },
  {
    name: "Velouté",
    builtOn: "Light stock + blond roux",
    job: "Carries delicately",
    derivatives: [
      { name: "Suprême", note: "Chicken velouté, reduced and enriched" },
      { name: "Allemande", note: "Velouté finished with egg yolk and lemon — Carême's grande sauce, demoted by Escoffier" },
    ],
    recipe: "/recipes/veloute",
  },
  {
    name: "Espagnole",
    builtOn: "Brown stock + brown roux",
    job: "The foundation step",
    derivatives: [
      { name: "Demi-glace", note: "Espagnole plus brown stock, reduced — Escoffier's base of all the smaller brown sauces" },
    ],
    recipe: "/recipes/espagnole",
  },
  {
    name: "Sauce Tomate",
    builtOn: "Tomatoes, vegetables and stock, long-simmered",
    job: "Built on patience",
    derivatives: [{ name: "Served as itself", note: "Escoffier's addition earns its place as a sauce, not a base for derivatives" }],
    recipe: "/recipes/sauce-tomate",
  },
  {
    name: "Hollandaise",
    builtOn: "Egg yolk + butter emulsion — no flour",
    job: "Emulsifies",
    derivatives: [{ name: "Béarnaise", note: "The acid swapped for a tarragon and shallot reduction" }],
    recipe: "/recipes/hollandaise",
  },
] as const;

export default function MotherSaucesFamilyTreePage() {
  return (
    <main className="shell section">
      <div className="container article-measure">
        <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/learn">Learn</Link> / Mother sauces family tree</p>
        <p className="eyebrow">Foundations of Flavor · Printable reference</p>
        <h1>The mother sauces family tree</h1>
        <p className="lede">
          Two editors, two centuries, one argument about what counts as a foundation. Carême organized his
          grandes sauces around four. Escoffier kept three, demoted the fourth, and added two of his own.
          This is the whole system on one sheet — print it, save it as a PDF, stick it inside a cupboard door.
        </p>
        <p className="ft-actions">
          <PrintButton label="Print / save as PDF" eventName="family_tree_print" />
          <Link className="text-link" href="/learn/mother-sauces-foundations-of-flavor">Read the full feature: Mother Sauces: Five Bases, a Thousand Dinners</Link>
        </p>

        <h2>Two systems</h2>
        <div className="ft-systems">
          <div className="ft-system">
            <h3>Carême&apos;s four grandes sauces</h3>
            <ul>{careme.map((sauce) => <li key={sauce}>{sauce}</li>)}</ul>
          </div>
          <div className="ft-system">
            <h3>Escoffier&apos;s five mother sauces</h3>
            <ul>{mothers.map((mother) => <li key={mother.name}>{mother.name}</li>)}</ul>
            <p className="ft-note">Allemande is demoted to a derivative of velouté. Tomate and hollandaise join the family.</p>
          </div>
        </div>

        <h2>The five, and what divides from them</h2>
        <div className="ft-mothers">
          {mothers.map((mother) => (
            <article className="ft-card" key={mother.name}>
              <h3>{mother.name}</h3>
              <dl>
                <div><dt>Built on</dt><dd>{mother.builtOn}</dd></div>
                <div><dt>The job</dt><dd>{mother.job}</dd></div>
              </dl>
              <h4>Divides into</h4>
              <ul>
                {mother.derivatives.map((derivative) => (
                  <li key={derivative.name}><strong>{derivative.name}</strong> — {derivative.note}</li>
                ))}
              </ul>
              <p><Link className="text-link" href={mother.recipe}>The {mother.name.toLowerCase()} recipe</Link></p>
            </article>
          ))}
        </div>

        <div className="ft-roux">
          <h2>The roux rule</h2>
          <p>
            White → blond → brown. The darker a roux cooks, the more it tastes and the less it thickens.
            Color is not a style choice; it is the trade you are making. <Link className="text-link" href="/learn/mother-sauces-foundations-of-flavor">Why, in the feature</Link>.
          </p>
        </div>

        <FieldNotesCapture
          heading="Get the next foundation by email."
          copy="Field Notes is Chef Gringo's email for people who cook: practical cooking missions, new Food Intelligence features and new downloads — like this family tree — as they publish. No noise, no invented urgency, just the next useful thing, when it is ready. Join and the printable references keep coming."
        />
      </div>
    </main>
  );
}
