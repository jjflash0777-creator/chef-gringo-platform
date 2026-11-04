import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { NewsletterForm } from "../../components/NewsletterForm";
import { AffiliateDisclosure } from "../../components/AffiliateDisclosure";

export const metadata: Metadata = {
  title: "Mother Sauces: Five Bases, a Thousand Dinners | Chef Gringo",
  description:
    "A deep historical and culinary-science guide to the five mother sauces: Carême's four grandes sauces, Escoffier's edit, roux science, emulsion science, derivatives, troubleshooting, and five complete Chef Gringo recipes.",
  openGraph: {
    title: "Mother Sauces: Five Bases, a Thousand Dinners",
    description:
      "Roux, reduction, emulsion — and why the famous list of five was edited before it was ever memorized.",
    images: ["/images/editorial/mother-sauces-foundations-of-flavor/mother_sauces_five_sauciers_overhead.png"],
  },
};

const Source = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="article-source">
    {children}
  </a>
);

const Rule = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="notice-card">
    <strong>{title}</strong>
    <div>{children}</div>
  </div>
);

export default function MotherSaucesFoundationsOfFlavorPage() {
  return (
    <main className="editorial-article mother-sauces-feature">
      <header className="editorial-hero">
        <div className="editorial-hero-copy">
          <p className="breadcrumbs">
            <Link href="/">Home</Link> / <Link href="/learn">Learn</Link> / Foundations of Flavor
          </p>
          <p className="eyebrow">Food Intelligence · Foundations of Flavor No. 2</p>
          <h1>Mother Sauces: Five Bases, a Thousand Dinners</h1>
          <p className="editorial-deck">
            Roux, reduction, emulsion — and why the famous list of five was edited before it was ever memorized.
          </p>
          <div className="editorial-meta">
            <span>Chef Gringo Editorial</span>
            <span>History · technique · food science</span>
          </div>
        </div>
        <figure className="editorial-hero-image">
          <img
            src="/images/editorial/mother-sauces-foundations-of-flavor/mother_sauces_five_sauciers_overhead.png"
            alt="Editorial photograph of five sauces in small sauciers arranged on a warm wooden board — a pale béchamel, a blond velouté, a deep brown espagnole, a red sauce tomate and a yellow hollandaise"
          />
        </figure>
      </header>

      <div className="editorial-body">
        <p className="article-kicker">
          Every culinary student learns the same list: béchamel, velouté, espagnole, sauce tomate,
          hollandaise. Five “mother sauces.” Recite them in the right order and you pass.
        </p>

        <p>
          That list is useful. It is also the least interesting part of the story.
        </p>

        <p>
          The mother sauces are not really five recipes. They are a way of controlling <strong>thickness,
          richness, acidity and temperature</strong> — a small set of bases that professional kitchens
          divide, enrich and re-season into hundreds of working sauces. The list came later; the system
          is older, more practical, and it was edited at least once by the most famous cookbook in
          French cooking.
        </p>

        <Rule title="Chef Gringo source rule">
          <p>
            The mother-sauce classification is a documented convention from named cookbooks, not a
            discovered law of cooking. Carême&apos;s system and Escoffier&apos;s system differ, and both are
            cited here from the works themselves or reputable reference editions. Origin stories attached
            to individual sauces — including the popular claim that hollandaise is simply a Dutch sauce
            imported to France — are tradition, not established fact, and are labeled that way wherever
            they appear.
          </p>
        </Rule>

        <h2>Carême had four</h2>

        <p>
          In the early nineteenth century, French professional cooking was drowning in sauces — hundreds
          of them, each with a name, most of them built from a handful of others. Marie-Antoine Carême,
          the most systematic cook of his generation, did what a good kitchen manager does with chaos:
          he filed it. In <em>L&apos;Art de la cuisine française au XIXe siècle</em>, the multi-volume work
          begun in Paris in 1833 and completed after his death by his collaborator Plumerey, Carême
          organized the great sauces into four families — his <em>grandes sauces</em>: <strong>espagnole,
          velouté, allemande and béchamel</strong>. Everything else was a <em>petite sauce</em>, a smaller
          sauce composed from one of the four — and his smaller sauces already included tomate and
          hollandaise, working as derivatives rather than parents.{" "}
          <Source href="https://exhibits.library.cornell.edu/food/feature/gastronomy">
            Cornell University Library, “Not by Bread Alone”: Carême and the four sauce families
          </Source>
        </p>

        <p>
          Why a system at all? Because a professional kitchen runs on bases that can be held, divided and
          finished to order. A sauce family is an operations answer before it is a curriculum answer: make
          the base once, correctly, and a dozen finished sauces become a decision at the pass instead of a
          project at the stove.
        </p>

        <blockquote>
          Carême was not inventing sauces. He was filing them — and a good filing system is a kitchen tool.
        </blockquote>

        <h2>Escoffier made it five — in translation</h2>

        <p>
          Seventy years later, Auguste Escoffier rebuilt the filing system in <em>Le Guide Culinaire</em> (1903),
          the book that organized professional French cooking for the twentieth century. Read the French text
          carefully and the story is more interesting than the classroom version. Escoffier&apos;s own foundation
          sauces were espagnole, velouté, béchamel and tomate, with mayonnaise treated as a mother for cold
          sauces — and hollandaise still filed among the derivatives. What he did change, decisively, was
          allemande. In his own words, introducing the recipe: “Allemande Sauce is not, strictly speaking, a
          basic sauce,” so he gives it “after the Veloutés, from which it is derived.” Allemande — velouté
          finished with egg yolks, lemon and mushroom liquor — was demoted from parent to child.{" "}
          <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/47">
            Escoffier, A Guide to Modern Cookery: allemande, “not, strictly speaking, a basic sauce”
          </Source>
        </p>

        <p>
          The famous five arrived four years later, in print, when the Guide was abridged and translated for
          English readers. <em>A Guide to Modern Cookery</em> (1907) lists them in one flat sentence: “The
          basic sauces: Espagnole, Velouté, Béchamel, Tomato, and Hollandaise.” Mayonnaise&apos;s cold-sauce
          note is gone; hollandaise stands among the basics. That is the list — word for word — that culinary
          students have been memorizing ever since.{" "}
          <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/28">
            Escoffier, A Guide to Modern Cookery (1907): the basic sauces list
          </Source>{" "}
          <Source href="https://en.wikipedia.org/wiki/Sauce">
            Classification history cross-check: the French editions&apos; four and the 1907 English five
          </Source>
        </p>

        <p>
          Notice what the five actually are, structurally. Three are roux sauces at three depths of color.
          One is a long cooking-down of tomato. One contains no flour at all. Escoffier&apos;s list — or his
          translators&apos; list — groups by kitchen function, not by a single technique. That is the tell
          that it was always a working system rather than a taxonomy of nature.
        </p>

        <blockquote>
          Same kitchen logic. Revised paperwork. Culinary school has been teaching the revision for over a century.
        </blockquote>

        <h2>A short timeline of how five became the list</h2>

        <div className="evidence-grid">
          <div className="notice-card">
            <strong>1833 · Carême</strong>
            <p>
              <em>L&apos;Art de la cuisine française au XIXe siècle</em> begins publication in Paris. Four
              grandes sauces — espagnole, velouté, allemande, béchamel — head the system; the work is
              completed posthumously by Plumerey (1833–1844).
            </p>
          </div>
          <div className="notice-card">
            <strong>1903 · Escoffier</strong>
            <p>
              <em>Le Guide Culinaire</em> publishes. The French text builds its foundations on espagnole,
              velouté, béchamel and tomate, treats mayonnaise as a mother of cold sauces, and files
              allemande under velouté.
            </p>
          </div>
          <div className="notice-card">
            <strong>1907 · The English edition</strong>
            <p>
              <em>A Guide to Modern Cookery</em>, the abridged English translation, lists the basic sauces
              as five — hollandaise included. The list in current use traces to this page.
            </p>
          </div>
          <div className="notice-card">
            <strong>Twentieth century</strong>
            <p>
              The five-sauce list becomes the standard teaching list in professional training — the list
              most cooks are taught today descends from the 1907 English edition.
            </p>
          </div>
          <div className="notice-card">
            <strong>Today</strong>
            <p>
              Professional observation, not doctrine: most working kitchens lean hardest on the derivatives —
              demi-glace directions, mornay, béarnaise — and treat espagnole as a foundation step rather
              than a finished sauce.
            </p>
          </div>
        </div>

        <h2>The science of roux: starch, fat and time</h2>

        <p>
          A roux is flour cooked in fat, and it thickens for one reason: starch. Escoffier said it plainly —
          starch “is the only cohering principle” in a roux. When a roux meets hot liquid, the starch granules
          in the flour absorb water and swell until they burst, and it is that swelling that binds the sauce.
          Modern starch science describes the same event with better instruments: wheat starch gelatinizes at
          roughly 60 °C (about 140 °F), granules take up water and swell, amylose leaches out, and viscosity
          climbs. Two working rules fall straight out of the mechanism. First, a roux sauce must actually reach
          a simmer — below gelatinization, the granules never fully swell and the sauce stays thin and pasty.
          Second, the fat matters: cooking the flour in fat first coats the granules so they disperse into the
          liquid instead of clumping, which is the practical reason roux sauces resist lumps when the liquid
          goes in gradually and the whisk keeps moving.{" "}
          <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/43">
            Escoffier on roux: starch as “the only cohering principle”
          </Source>{" "}
          <Source href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4554620/">
            Review of starch gelatinization: granule swelling, amylose leaching and viscosity
          </Source>
        </p>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/mother-sauces-foundations-of-flavor/roux_stages_white_blond_brown.png"
            alt="Three saucepans of roux at white, blond and brown stages, showing the color progression"
          />
          <figcaption>
            White, blond, brown: the same flour and fat at three cooking times — with three different
            flavors and three different thickening powers.
          </figcaption>
        </figure>

        <p>
          The three stages are defined by color, and Escoffier&apos;s definitions are still the working ones.
          A <strong>white roux</strong> cooks only a few minutes — just long enough to remove the raw taste of
          flour. A <strong>pale or blond roux</strong> stops before any real coloring begins. A <strong>brown
          roux</strong> cooks to a light brown with a hazelnut scent. What changes along that road is a trade,
          and it is the most useful trade in sauce work: the longer a roux cooks, the deeper its flavor and
          color — and the <em>less</em> thickening power it keeps. Sustained heat and shear break starch
          granules down, and broken starch cannot hold viscosity. Escoffier saw the end of that road clearly:
          once starch is burned, its cohering principle is destroyed, double or treble the roux becomes
          necessary, and burnt starch adds a bitterness no later step can cure. This is why a brown-roux sauce
          needs more roux — or more reduction — than a white one at the same body.
        </p>

        <p>
          As for quantities: the working ratios taught today are a <strong>modern professional
          convention</strong>, stated as such. The conventional starting point for a medium-bodied sauce is
          roughly equal weights of butter and flour — about 60 g (2 oz) of each — per litre or quart of
          liquid, scaled from the standard béchamel formula in modern professional texts. More roux for a
          thicker sauce, less for a lighter one; a brown roux needs a heavier hand for the reason above.{" "}
          <Source href="https://resources.escoffier.edu/textbooks/gisslen/professional_cooking_07.pdf">
            Wayne Gisslen, Professional Cooking: sauce formulas and roux conventions
          </Source>
        </p>

        <Rule title="Chef Gringo field rule">
          <p>
            A roux&apos;s color is its flavor and its weakness. Choose the color for the dish, then respect
            what that choice costs you in thickness.
          </p>
        </Rule>

        <h2>The science of emulsion: why hollandaise plays by different rules</h2>

        <p>
          Hollandaise contains no flour, no roux, no starch at all. It is an emulsion: melted butter held in
          suspension in a small amount of watery phase — egg yolk, water, acid — instead of separating into
          grease. Yolk is what makes that truce possible; its components stabilize the boundary between fat
          and water, and lecithin is the emulsifier usually credited. Professional texts make the companion
          point: the egg in hollandaise does not thicken the sauce the way egg thickens a custard — the sauce
          works by emulsification, not coagulation.
        </p>

        <p>
          Which is why temperature is the whole control variable. Too cool, and the butter congeals before
          the emulsion sets; too hot, and the yolk proteins set on their own and the sauce splits. Escoffier&apos;s
          method respects the window without naming a number: yolks worked in a bain-marie until they thicken
          to a cream consistency, butter added gradually afterward “in a tepid place.” Butter added faster
          than the emulsion can take it breaks it just as surely as heat does — the third failure mode is
          ratio, and all three map to fixes in the troubleshooting table below.
        </p>

        <p>
          Egg sauces also carry a safety frame, and this one gets numbers because an institutional source
          provides them. Under the FDA Food Code (2022), hot-held food stays at 135 °F (57 °C) or above, and
          where time itself is used as the control, the food is served or discarded within four hours.
          Hollandaise is not a make-ahead-and-reheat sauce; the Hollandaise recipe page states the handling,
          holding and discard rules plainly.{" "}
          <Source href="https://www.fda.gov/food/fda-food-code/food-code-2022">
            FDA Food Code 2022: hot holding (§3-501.16) and time as a public health control (§3-501.19)
          </Source>
        </p>

        <h2>Béchamel: the gentle mother</h2>

        <p>
          White roux plus milk — the simplest construction of the five, and the one where restraint is the
          technique. Escoffier&apos;s béchamel is a reminder of how much richer the classical versions were:
          a pound of white roux, four and a half quarts of boiling milk poured onto it, and then lean veal and
          minced onion stewed into the sauce with nutmeg and thyme, simmered about an hour (the veal was left
          out in Lenten versions). The modern béchamel keeps the structure and drops the veal: roux, milk,
          salt, white pepper, and nutmeg as a convention rather than a law. Seasoning restraint is not timidity
          here — béchamel is a base that other flavors will be built on, and an aggressive béchamel argues with
          everything it carries.
        </p>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_bechamel.png"
            alt="Finished béchamel in a white ceramic saucier, coating the back of a spoon, with grated cheese and nutmeg beside it"
          />
          <figcaption>Béchamel at nappe: it coats a spoon and holds a soft ribbon.</figcaption>
        </figure>

        <p>
          Its most useful derivative is <strong>mornay</strong>: per quart of béchamel, modern professional
          convention stirs in about 125 g (4 oz) grated Gruyère and 60 g (2 oz) Parmesan until just melted,
          then finishes off the heat with butter — cheese added off a hard boil, or the sauce turns grainy and
          oily. Cream-sauce directions, mustard finishes and herb finishes all start from the same pan, which
          is exactly what the tasting exercise at the end of this article is built on.
        </p>

        <Rule title="Chef Gringo field rule">
          <p>
            If your béchamel tastes like flour, it hasn&apos;t finished cooking — that is time, not
            seasoning. Time first, salt second.
          </p>
        </Rule>

        <p>
          <Link href="/recipes/bechamel"><strong>Get the complete Chef Gringo béchamel recipe →</strong></Link>
        </p>

        <h2>Velouté: the quiet carrier</h2>

        <p>
          Blond roux plus white stock. Escoffier&apos;s velouté is pale roux dissolved in white veal stock,
          despumated — skimmed as it simmers — for about an hour and a half; his poultry and fish veloutés are
          the same method with the corresponding stock. There is nowhere for flavor to hide in a velouté,
          because there is almost nothing in it: the stock is the recipe, and a weak stock makes a weak
          velouté no whisk can rescue. That honesty is its job. Velouté is a carrier — it lends body and lets
          the stock, and whatever finishes it, do the talking.
        </p>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_veloute.png"
            alt="Finished velouté poured in a thin stream from a ladle into a steel pan, with a pot of stock behind"
          />
          <figcaption>Velouté: blond roux, white stock, and nothing to hide behind.</figcaption>
        </figure>

        <p>
          Enrich a chicken velouté and you get <strong>suprême</strong>: the velouté reduced by about a
          quarter, heavy cream tempered in, finished with butter and lemon and strained. And filed here —
          deliberately — is <strong>allemande</strong>: velouté finished with an egg-yolk liaison, lemon and
          mushroom liquor, enriched with cream. Escoffier adds a working caution that still earns its place:
          a thick sauce enriched with fat cannot be pushed past about 140 °F without risking decomposition,
          which is why a liaison goes in off the boil and never boils again.
        </p>

        <blockquote>
          Allemande lives in the velouté section now. This is where Escoffier filed it. Argue with him.
        </blockquote>

        <p>
          <Link href="/recipes/veloute"><strong>Get the complete Chef Gringo velouté recipe →</strong></Link>
        </p>

        <h2>Espagnole: the foundation, not the finish</h2>

        <p>
          Brown roux plus brown stock, built the slow way. Escoffier dissolves a pound of brown roux in six
          quarts of brown stock, skims through a long despumation, adds fresh tomatoes — or purée — and
          mirepoix, and reduces the whole to four quarts. Read that as what it is: not a sauce you would
          spoon over dinner, but a concentrated, cleaned-up foundation engineered to become other sauces.
          Its most important descendant is <strong>demi-glace</strong>: one quart of espagnole combined with
          one quart of first-class brown stock, reduced to nine-tenths of a quart and finished off the heat
          with a little sherry. Escoffier calls the result, without much ceremony, “the base of all the
          smaller brown sauces.”{" "}
          <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/44">
            Escoffier: espagnole, recipe and method
          </Source>{" "}
          <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/45">
            Escoffier: half glaze (demi-glace), “the base of all the smaller brown sauces”
          </Source>
        </p>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_espagnole.png"
            alt="Finished espagnole in a dark steel pan, deep glossy brown, with a spoon trailed through it"
          />
          <figcaption>Espagnole: deep, glossy, and built to be reduced into something else.</figcaption>
        </figure>

        <p>
          The Chef Gringo recipe is a practical home-and-small-kitchen version — same architecture, human
          scale, no stockpot program — and it is labeled that way. Make espagnole when you intend to go
          somewhere with it.
        </p>

        <Rule title="Chef Gringo field rule">
          <p>Espagnole is a means, not an end. Judge it by what it becomes.</p>
        </Rule>

        <p>
          <Link href="/recipes/espagnole"><strong>Get the complete Chef Gringo espagnole recipe →</strong></Link>
        </p>

        <h2>Sauce tomate: the slow one</h2>

        <p>
          The mother that asks for patience instead of technique. Escoffier&apos;s sauce tomate, per four
          quarts, starts with salted breast of pork, carrot and onion, bay and thyme; the tomatoes — ten
          pounds of them — cook with flour, butter and white stock under a lid in a moderate oven for an hour
          and a half before the sauce is sieved. (His tomato purée variant leaves the flour out entirely.)
          That is a long way from the modern weeknight tomato sauce, and the difference is the point: the
          classical version is a cooked, structured sauce in which tomato is the body, not a garnish.{" "}
          <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/48">
            Escoffier: sauce tomate, composition and oven method
          </Source>
        </p>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_sauce_tomate.png"
            alt="Finished sauce tomate in a rustic ceramic saucier with an olive-oil drizzle, thyme beside it and ripe tomatoes behind"
          />
          <figcaption>Sauce tomate, finished: brick-red, textured, the raw edge cooked out.</figcaption>
        </figure>

        <p>
          The modern convention — tomato cooked down with aromatics in olive oil, stock optional, no roux —
          is a legitimate sauce and the one the Chef Gringo recipe teaches; it is presented as the modern
          version, clearly separated from Escoffier&apos;s. Either way, the test is the same: cook until the
          raw, sharp acidity resolves into sweetness and depth. And honesty about family trees: tomate&apos;s
          offspring are variations more than a formal derivative system — Provençale-style directions with
          garlic and herbs, spicy versions, mushroom versions. Say so rather than inventing a dynasty.
        </p>

        <Rule title="Chef Gringo field rule">
          <p>
            Tomate is done when it stops tasting raw, not when the timer says so. Acidity resolves into
            sweetness; give it the time to get there.
          </p>
        </Rule>

        <p>
          <Link href="/recipes/sauce-tomate"><strong>Get the complete Chef Gringo sauce tomate recipe →</strong></Link>
        </p>

        <h2>Hollandaise: the emulsion mother</h2>

        <p>
          Tradition says hollandaise is a Dutch sauce that France adopted; like most sauce origin stories,
          that is tradition, not established fact, and it is labeled that way here. What is documented is
          Escoffier&apos;s method, and it is all temperature discipline: per quart, a pound and a half of
          butter and the yolks of six eggs, salt, a pinch of mignonette pepper, and three tablespoons of
          vinegar reduced by three-quarters. The yolks are worked in a bain-marie until they thicken to a
          cream consistency; the butter goes in gradually, in a tepid place; a drop of lemon juice finishes
          it, and the sauce is rubbed through a tammy. No flour, no roux, no shortcut — just an emulsion held
          together by whisking and warmth.{" "}
          <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/48">
            Escoffier: hollandaise, yolks in a bain-marie and butter added gradually
          </Source>
        </p>

        <figure className="editorial-inline-image">
          <img
            src="/images/editorial/mother-sauces-foundations-of-flavor/recipe_hollandaise.png"
            alt="Finished hollandaise ribboning from a spoon into a white saucier, with a halved lemon beside it"
          />
          <figcaption>Hollandaise at the ribbon stage: glossy, warm, holding together.</figcaption>
        </figure>

        <p>
          Its derivatives are decisions about the acid. <strong>Béarnaise</strong> swaps the plain acid for
          a strained reduction of vinegar, shallots, fresh chervil, fresh tarragon and crushed peppercorns —
          same emulsion, assertive new assignment; it is the sauce steak frites dreams about. <strong>Choron</strong>
          folds tomato purée into a béarnaise-style base, leaving the tarragon and chervil out. Both are
          described here at the level reference works support; both start from a hollandaise that is already
          under control.
        </p>

        <Rule title="Chef Gringo field rule">
          <p>
            Hollandaise is a temperature you hold, not a sauce you finish. Set the station up before the
            yolks go on the heat.
          </p>
        </Rule>

        <p>
          <Link href="/recipes/hollandaise"><strong>Get the complete Chef Gringo hollandaise recipe →</strong></Link>
        </p>

        <h2>Troubleshooting: five failures, five fixes</h2>

        <div className="cg-compare-scroll">
          <table className="cg-compare-table">
            <thead>
              <tr><th>Problem</th><th>Likely cause</th><th>Fix</th><th>Prevention</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Lumpy béchamel</strong></td>
                <td>Liquid added too fast, or roux and liquid at clashing temperatures with no whisking</td>
                <td>Whisk hard off heat; strain if needed — no shame in the strainer</td>
                <td>Add liquid gradually at the start; whisk continuously until it simmers</td>
              </tr>
              <tr>
                <td><strong>Broken hollandaise</strong></td>
                <td>Overheated yolk, or butter added faster than the emulsion accepts</td>
                <td>Whisk in a spoon of hot water; if that fails, start a fresh yolk and whisk the broken sauce into it</td>
                <td>Low, indirect heat; butter in a slow stream; hold warm, never hot</td>
              </tr>
              <tr>
                <td><strong>Skin on a held sauce</strong></td>
                <td>Surface evaporation during holding</td>
                <td>Whisk it back in for short holds; cover the surface for longer ones</td>
                <td>Cover with a lid or cartouche; hold at proper temperature and stir occasionally</td>
              </tr>
              <tr>
                <td><strong>Raw-flour taste</strong></td>
                <td>Roux undercooked or sauce never reached a simmer</td>
                <td>Simmer gently a few minutes more and re-taste</td>
                <td>Cook the roux to the intended stage and bring the finished sauce to a full simmer</td>
              </tr>
              <tr>
                <td><strong>Greasy velouté</strong></td>
                <td>Fat not fully incorporated, or an over-rich stock</td>
                <td>Skim; whisk in a splash of hot stock to re-emulsify</td>
                <td>Skim stock first; keep the sauce at a bare simmer, not a rolling boil</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="signup-panel">
          <div>
            <p className="eyebrow light">Field Notes</p>
            <h2>The mother sauces are one foundation. There are more.</h2>
            <p>
              Field Notes is Chef Gringo&apos;s email for people who cook: practical cooking missions, new
              Food Intelligence features and new downloads as they publish. No noise, no invented urgency —
              just the next useful thing, when it is ready.
            </p>
          </div>
          <NewsletterForm source="field-notes" buttonLabel="Join Field Notes" />
        </section>

        <h2>Want to understand derivatives instead of memorizing them? Taste the variables.</h2>

        <p>
          <strong>Make one béchamel and finish it three ways.</strong>
        </p>

        <p>
          One batch of béchamel, divided into three warm pans. Pan one: plain, seasoned only. Pan two: a
          handful of grated Gruyère off the heat — you have made mornay. Pan three: a spoon of Dijon and
          chopped herbs. Taste them in order and notice what actually changed: not the sauce&apos;s
          structure — its <em>assignment</em>. Same mother, three different jobs.
        </p>

        <Rule title="Chef Gringo field rule">
          <p>
            A derivative is a decision, not a recipe. When you can say what the addition is <em>for</em>,
            you are using the system the way it was designed.
          </p>
        </Rule>

        <h2>The bottom line</h2>

        <p>
          The five mothers were never a memory test. They are a short list of ways to control thickness,
          richness and temperature — written down by Carême, edited by Escoffier, and still doing quiet work
          every time a cook turns a base into a sauce with a decision instead of a recipe.
        </p>

        <blockquote>
          Learn what each one is doing. The small sauces will take care of themselves.
        </blockquote>

        <p>
          One more is coming: the Sauces volume of the Chef Gringo Food Bible series is <strong>in
          development</strong> — it does not exist yet, and when it does, Field Notes subscribers hear
          about it first.
        </p>

        <h2>Two recommendations this article actually uses</h2>

        <AffiliateDisclosure />

        <p>
          <strong>ThermoWorks, for temperature control.</strong> This article&apos;s hardest techniques are
          thermometer work: holding an emulsion in its narrow warm window, keeping a held sauce at a safe
          temperature, knowing a stock is at a bare simmer instead of guessing. When you are ready to buy
          the thermometer for that work, start at the Chef Gringo partner page.{" "}
          <Link href="/go/thermoworks"><strong>See ThermoWorks via Chef Gringo →</strong></Link>
        </p>

        <p>
          <strong>Gustus Vitae, for finishing seasoning.</strong> Mother sauces are deliberately
          under-seasoned bases; the finishing salt, pepper and spice decisions happen at the derivative
          stage — the mornay, the suprême, the béarnaise. That finishing work is where a well-built
          seasoning collection earns its shelf space.{" "}
          <Link href="/go/gustus-vitae"><strong>See Gustus Vitae via Chef Gringo →</strong></Link>
        </p>

        <h2>Sources &amp; further reading</h2>

        <ul>
          <li>
            <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/28">
              Auguste Escoffier, A Guide to Modern Cookery (1907)
            </Source>{" "}
            — the abridged English edition of Le Guide Culinaire; the basic sauces listed as Espagnole,
            Velouté, Béchamel, Tomato and Hollandaise.
          </li>
          <li>
            <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/43">
              Escoffier, A Guide to Modern Cookery: the roux discussion
            </Source>{" "}
            — starch as the cohering principle, granule swelling, and the cost of burned starch.
          </li>
          <li>
            <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/44">
              Escoffier: espagnole and the roux recipes
            </Source>{" "}
            — brown roux in brown stock with tomato and mirepoix; white, pale and brown roux defined.
          </li>
          <li>
            <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/45">
              Escoffier: half glaze (demi-glace)
            </Source>{" "}
            — equal parts espagnole and brown stock, reduced; “the base of all the smaller brown sauces.”
          </li>
          <li>
            <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/47">
              Escoffier: allemande and béchamel
            </Source>{" "}
            — allemande “not, strictly speaking, a basic sauce,” given after the veloutés; the classical
            béchamel with veal, onion, nutmeg and thyme.
          </li>
          <li>
            <Source href="https://en.wikisource.org/wiki/Page:Escoffier_-_A_Guide_to_Modern_Cookery.djvu/48">
              Escoffier: sauce tomate and hollandaise
            </Source>{" "}
            — tomate with salted pork, aromatics, stock and a slow oven; hollandaise built in a bain-marie
            with butter added gradually.
          </li>
          <li>
            <Source href="https://exhibits.library.cornell.edu/food/feature/gastronomy">
              Cornell University Library, “Not by Bread Alone” — Gastronomy
            </Source>{" "}
            — Carême&apos;s four primary sauce families and L&apos;Art de la cuisine française au XIXe
            siècle (Paris, 1833–1844).
          </li>
          <li>
            <Source href="https://en.wikipedia.org/wiki/Sauce">
              “Sauce” — classification history reference
            </Source>{" "}
            — cross-check for Carême&apos;s grandes sauces, the French Guide editions&apos; foundation list
            and mayonnaise, and the 1907 English edition&apos;s five.
          </li>
          <li>
            <Source href="https://resources.escoffier.edu/textbooks/gisslen/professional_cooking_07.pdf">
              Wayne Gisslen, Professional Cooking
            </Source>{" "}
            — modern professional convention: roux and béchamel formulas, mornay and suprême composition.
          </li>
          <li>
            <Source href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4554620/">
              Open-access review — starch gelatinization
            </Source>{" "}
            — granule swelling, amylose leaching and viscosity; wheat starch gelatinization near 60 °C.
          </li>
          <li>
            <Source href="https://www.fda.gov/food/fda-food-code/food-code-2022">
              FDA Food Code 2022
            </Source>{" "}
            — hot holding at 135 °F or above (§3-501.16) and time as a public health control, four hours
            maximum (§3-501.19).
          </li>
        </ul>

        <aside className="notice-card">
          <strong>Image and copyright note</strong>
          <p>
            All feature and recipe artwork on this page was created specifically for Chef Gringo.
            External historical and scientific materials are linked for reference and summarized in
            original language rather than reproduced as third-party editorial artwork.
          </p>
        </aside>

        <p>
          <Link href="/learn"><strong>Explore more Chef Gringo Food Intelligence →</strong></Link>
        </p>
      </div>
    </main>
  );
}
