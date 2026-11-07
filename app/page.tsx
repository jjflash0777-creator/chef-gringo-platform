import Image from "next/image";
import Link from "next/link";
import { PartnerBand } from "./components/PartnerBand";
import { FieldNotesCapture } from "./components/FieldNotesCapture";
import { RecipeOfTheDay } from "./components/RecipeOfTheDay";
import { brandImages } from "./home/brand-images";
import { editorialFeatures, latestEditorial } from "./lib/editorial-registry";
import { DOWNLOAD_PRODUCTS } from "./lib/downloads";
import { PUBLISHED_RECIPES } from "./lib/recipe-registry";

/**
 * Homepage, rebuilt 2026-11-05 per the approved redesign blueprint:
 * the homepage IS the blog. Seven blocks — hero featured post, Start
 * Here Foundations track, latest post grid, Shop My Kitchen, Downloads,
 * Field Notes capture, footer (in the shell). The question intake and
 * the live feed are gone from the public site.
 */
const startHere = [
  {
    step: "No. 1",
    title: "Mirepoix: Foundations of Flavor",
    copy: "The 300-year story hiding under your dinner — history, food science, cut size, and heat. Start the Foundations of Flavor track here.",
    href: "/learn/mirepoix-foundations-of-flavor",
    image: "/images/editorial/mirepoix-foundations-of-flavor/rustic_mirepoix_saute_in_copper_pan.png",
    imageAlt: "Onion, carrot and celery beside mirepoix sautéing in a copper pan",
  },
  {
    step: "No. 2",
    title: "Mother Sauces: Five Bases, a Thousand Dinners",
    copy: "Carême had four grandes sauces; the famous five arrived with Escoffier. Roux science, emulsion science, and the derivatives that follow.",
    href: "/learn/mother-sauces-foundations-of-flavor",
    image: "/images/editorial/mother-sauces-foundations-of-flavor/mother_sauces_five_sauciers_overhead.png",
    imageAlt: "Five sauces in small sauciers on a warm wooden board — a pale béchamel, a blond velouté, a deep brown espagnole, a red sauce tomate and a yellow hollandaise",
  },
  {
    step: "Take it to the wall",
    title: "The Mother Sauces Family Tree — free printable",
    copy: "Five mothers and their derivatives on one sheet. Print it, post it, cook from it. Yours when you join Field Notes.",
    href: "/learn/mother-sauces-family-tree",
    image: "/images/editorial/mother-sauces-2026/slide-1-family.webp",
    imageAlt: "The five mother sauces in small steel sauciers on a wooden board",
  },
] as const;

/**
 * Decorative covers for the Downloads band, keyed by product id.
 * Kitchen photography of the work each toolkit is for — the products
 * are files, and the covers never pretend otherwise.
 */
const downloadCovers: Record<string, { image: string; imageAlt: string }> = {
  "kitchen-reference-chart-set": {
    image: "/brand/editorial/prep-station.jpg",
    imageAlt: "Ingredient prep station with commercial food processor and mise en place",
  },
  "healthcare-kitchen-starter-pack": {
    image: "/brand/editorial/senior-living.jpg",
    imageAlt: "Chef and team preparing organized meal service",
  },
  "recipe-calculator": {
    image: "/brand/editorial/cooking-line.jpg",
    imageAlt: "Active commercial cooking line with open flame",
  },
  "foodservice-schedule-pack": {
    image: "/images/editorial/restaurant-kitchen-service.jpg",
    imageAlt: "Restaurant kitchen during service",
  },
};

/** Proof strip counts, computed from the same registries the page renders. */
const sauceRecipeCount = PUBLISHED_RECIPES.filter((recipe) => recipe.href.startsWith("/recipes/")).length;
const foundationsCount = editorialFeatures.filter((feature) => feature.section.includes("Foundations of Flavor")).length;

const morePosts = [
  ...editorialFeatures.slice(1),
  {
    publishedAt: "2026-11-04",
    section: "Recipe · Mother Sauces",
    title: "Béchamel, the complete recipe",
    href: "/recipes/bechamel",
    summary: "White roux, milk, and the discipline to let it finish cooking — with mornay and the other derivatives.",
    image: "/images/editorial/mother-sauces-foundations-of-flavor/recipe_bechamel.png",
    imageAlt: "Finished béchamel in a white ceramic saucier, coating the back of a spoon",
    notes: [],
  },
  {
    publishedAt: "2026-11-04",
    section: "Recipe · Mother Sauces",
    title: "Hollandaise, the complete recipe",
    href: "/recipes/hollandaise",
    summary: "The emulsion mother, built patiently — and what to do when it breaks, because eventually it breaks.",
    image: "/images/editorial/mother-sauces-foundations-of-flavor/recipe_hollandaise.png",
    imageAlt: "Finished hollandaise in a small saucier",
    notes: [],
  },
] as const;

export default function Home() {
  return (
    <div className="cg-approved-home cg-home-v4">
      <section className="cg-approved-hero" aria-labelledby="approved-home-title">
        <div className="cg-approved-hero-image" aria-hidden="true">
          <Image unoptimized src={brandImages.heroKitchen.src} alt="" width={1600} height={1067} priority />
        </div>
        <div className="cg-approved-hero-shade" aria-hidden="true" />
        <div className="cg-width-wide cg-approved-hero-inner">
          <div className="cg-home-v4-hero-copy">
            <p className="cg-approved-kicker">Chef Gringo — a working chef&apos;s blog.</p>
            <h1 id="approved-home-title">Recipes, technique, and the tools <em>actually worth buying.</em></h1>
            <p className="cg-approved-hero-copy">Written by a working culinary director. No generic marketing language, no invented experience — what works in a real kitchen, and what it costs when it doesn&apos;t.</p>
            <div className="cg-approved-actions">
              <Link className="cg-button cg-button-primary" href={latestEditorial.href}>Read the latest post <span aria-hidden="true">→</span></Link>
              <Link className="cg-button cg-button-secondary" href="/recipes">Browse the recipes</Link>
            </div>
            <ul className="cg-hero-proof" aria-label="What is on the site">
              <li><strong>{sauceRecipeCount} mother sauces</strong>, each with a complete recipe</li>
              <li><strong>{PUBLISHED_RECIPES.length} complete recipes</strong> on the shelf</li>
              <li><strong>{foundationsCount} Foundations of Flavor flagships</strong></li>
              <li><strong>{DOWNLOAD_PRODUCTS.length} working toolkits</strong> in Downloads</li>
            </ul>
          </div>
          <aside className="cg-home-v4-hero-board" aria-label="Latest post">
            <div className="cg-approved-quote">
              <strong>{latestEditorial.title}</strong>
              <small>{latestEditorial.section}</small>
            </div>
            <div className="cg-home-v4-proof-card">
              <span>Latest post</span>
              <p>{latestEditorial.summary}</p>
              <Link href={latestEditorial.href}><strong>Read it →</strong></Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="cg-home-pathways" aria-labelledby="start-here-title">
        <div className="cg-width-wide">
          <div className="cg-home-pathways-head">
            <p className="cg-type-operational">Start here</p>
            <h2 id="start-here-title">Foundations of Flavor, in order.</h2>
            <p>New here? This is the binge path: the two flagship features in sequence, then the printable that puts the second one on your wall. It is also the table of contents of the paid guide being built from this track.</p>
          </div>
          <div className="cg-home-pathway-grid">
            {startHere.map((item) => (
              <Link href={item.href} key={item.href}>
                <div className="cg-card-media">
                  <Image src={item.image} alt={item.imageAlt} width={640} height={400} sizes="(max-width: 46rem) 100vw, (max-width: 64rem) 50vw, 33vw" />
                </div>
                <small>{item.step}</small>
                <strong>{item.title}</strong>
                <span>{item.copy}</span>
                <em>Read →</em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="cg-food-intelligence" id="latest-posts" aria-labelledby="latest-posts-title">
        <div className="cg-width-wide">
          <div className="cg-food-intelligence-head">
            <div>
              <p className="cg-type-operational">The blog</p>
              <h2 id="latest-posts-title">Latest posts</h2>
            </div>
            <Link href="/learn">All guides &amp; charts →</Link>
          </div>
          <RecipeOfTheDay initialInstant={new Date().toISOString()} />
          <div className="cg-food-note-rail" aria-label="Latest Chef Gringo posts">
            {morePosts.map((post) => (
              <article key={post.href}>
                <div className="cg-card-media">
                  <Image src={post.image} alt={post.imageAlt} width={640} height={400} sizes="(max-width: 64rem) 100vw, 33vw" />
                </div>
                <span>{post.section}</span>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <Link href={post.href}>Read →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PartnerBand />

      <section className="cg-home-pathways" aria-labelledby="downloads-title">
        <div className="cg-width-wide">
          <div className="cg-home-pathways-head">
            <p className="cg-type-operational">Downloads</p>
            <h2 id="downloads-title">Charts and toolkits, built to be used.</h2>
            <p>The reference charts and kitchen toolkits from Chef Gringo — printable, fillable, and made from public standards, not somebody else&apos;s paperwork.</p>
          </div>
          <div className="cg-home-pathway-grid">
            {DOWNLOAD_PRODUCTS.map((product) => (
              <Link href={`/downloads#${product.id}`} key={product.id}>
                <div className="cg-card-media">
                  <Image src={downloadCovers[product.id].image} alt={downloadCovers[product.id].imageAlt} width={640} height={400} sizes="(max-width: 46rem) 100vw, (max-width: 64rem) 50vw, 25vw" />
                </div>
                <small>{product.format}</small>
                <strong>{product.name}</strong>
                <span>{product.audience}</span>
                <em>See it →</em>
              </Link>
            ))}
          </div>
          <p><Link href="/downloads"><strong>All downloads →</strong></Link></p>
        </div>
      </section>

      <section className="cg-home-evidence" aria-labelledby="field-notes-title">
        <div className="cg-width-wide">
          <FieldNotesCapture
            bare
            heading="Good cooking is a system. Learn it one foundation at a time."
            copy="Field Notes is Chef Gringo's email for people who cook: practical cooking missions, new features and new downloads as they publish — starting with the mother sauces family tree, the whole five-sauce system on one printable sheet. No noise, no invented urgency, just the next useful thing, when it is ready."
          />
        </div>
      </section>
    </div>
  );
}
