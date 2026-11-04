export type EditorialFeature = {
  publishedAt: string;
  section: string;
  title: string;
  href: string;
  summary: string;
  image: string;
  imageAlt: string;
  notes: readonly { label: string; copy: string }[];
};

export const editorialFeatures: readonly EditorialFeature[] = [
  {
    publishedAt: "2026-11-04",
    section: "Food Intelligence · Foundations of Flavor",
    title: "Mother Sauces: Five Bases, a Thousand Dinners",
    href: "/learn/mother-sauces-foundations-of-flavor",
    summary: "Carême had four grandes sauces; the famous five arrived in Escoffier's English edition. Roux science, emulsion science, derivatives, and why the list is a system, not a memory test.",
    image: "/images/editorial/mother-sauces-foundations-of-flavor/mother_sauces_five_sauciers_overhead.png",
    imageAlt: "Five sauces in small sauciers on a warm wooden board — a pale béchamel, a blond velouté, a deep brown espagnole, a red sauce tomate and a yellow hollandaise",
    notes: [
      { label: "History", copy: "Carême filed four grandes sauces; the canonical five trace to the 1907 English edition of Escoffier's Guide, where hollandaise joined the basics and allemande stayed demoted." },
      { label: "Technique", copy: "Three mothers are roux work at three colors, one is a patient cooking-down of tomato, and one is an emulsion with no flour at all." },
      { label: "Food science", copy: "Starch gelatinization sets a roux sauce's body — and deeper roux color trades thickening power for flavor; yolk emulsification, not flour, holds hollandaise." },
      { label: "Chef rule", copy: "A derivative is a decision, not a recipe. Learn what each base is doing and the small sauces take care of themselves." },
    ],
  },
  {
    publishedAt: "2026-11-02",
    section: "Food Intelligence · Foundations of Flavor",
    title: "Mirepoix: The 300-Year Story Hiding Under Your Dinner",
    href: "/learn/mirepoix-foundations-of-flavor",
    summary: "History, food science, cut size, heat, and why the modern 2:1:1 formula is only the beginning.",
    image: "/images/editorial/mirepoix-foundations-of-flavor/rustic_mirepoix_saute_in_copper_pan.png",
    imageAlt: "Onion, carrot and celery beside mirepoix sautéing in a copper pan",
    notes: [
      { label: "History", copy: "The famous 2:1:1 vegetable shorthand is the modern chapter, not the whole origin story." },
      { label: "Technique", copy: "Cut size controls extraction; heat decides whether the base stays delicate or develops roasted depth." },
      { label: "Food science", copy: "Onion, carrot and celery bring different aromatic chemistry to the same foundation." },
      { label: "Chef rule", copy: "Understand what the base is doing before you start changing the formula." },
    ],
  },
  {
    publishedAt: "2026-10-08",
    section: "The Food We Eat",
    title: "What Are We Feeding Our Kids?",
    href: "/learn/what-are-we-feeding-our-kids",
    summary: "Digestive symptoms, ultra-processed foods, additives, the microbiome, and what the evidence actually supports.",
    image: "/images/editorial/what-are-we-feeding-our-kids/child-grocery-aisle.jpg",
    imageAlt: "Young child standing in a grocery aisle surrounded by packaged foods",
    notes: [
      { label: "Evidence", copy: "Separate strong evidence from emerging hypotheses and unsupported claims." },
      { label: "Practicality", copy: "The point is better food decisions, not fear." },
    ],
  },
  {
    publishedAt: "2026-09-01",
    section: "Food Intelligence · ingredient",
    title: "Beets: More Than a Beautiful Root",
    href: "/learn/beets-more-than-a-beautiful-root",
    summary: "Flavor, color, nutrition, nitrate research, preparation, storage, and menu use.",
    image: "/images/editorial/beets/hero.jpg",
    imageAlt: "Fresh beets prepared for cooking",
    notes: [
      { label: "Roast", copy: "Concentrate sweetness and keep the preparation simple." },
      { label: "Use the greens", copy: "Treat them like chard instead of sending usable food to the bin." },
    ],
  },
];

export const latestEditorial = editorialFeatures[0];
export const editorialRoutes = editorialFeatures.map((item) => item.href);
