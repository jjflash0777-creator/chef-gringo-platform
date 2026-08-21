import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PreviewBanner } from "../../components/PreviewBanner";

const TOPICS = {
  techniques: {
    title: "Cooking techniques",
    description: "How dishes actually get made — preview, not a technique encyclopedia.",
    today: "The Carbonara knowledge page is the only technique treatment with real depth: emulsion, residual heat, and holding limits.",
    later: "A technique shelf for sauces, heat management, butchery prep, and production — written as practice, not as filler cards.",
    links: [
      { href: "/knowledge/dishes/carbonara", label: "Carbonara technique page" },
      { href: "/#operator-question", label: "Ask Chef Gringo" },
    ],
  },
  "food-safety": {
    title: "Food safety",
    description: "Time, temperature, and when to stop — preview notes, not a certification.",
    today: "Ask Chef Gringo will refuse to bless food that cannot be established as safe. Marketplace has researched thermometers and sanitation equipment.",
    later: "Sourced holding, cooling, and allergen-control guides. Those pages do not exist yet.",
    links: [
      { href: "/marketplace?path=food-safety-and-compliance", label: "Food-safety equipment" },
      { href: "/medical-and-nutrition-disclaimer", label: "Medical and nutrition limits" },
      { href: "/#operator-question", label: "Ask Chef Gringo" },
    ],
  },
  ingredients: {
    title: "Ingredients and substitutions",
    description: "What to use, and what not to invent.",
    today: "Carbonara names guanciale, pecorino, and eggs with honest substitutions. The Marketplace food-and-ingredients shelf is empty on purpose.",
    later: "A substitution index with dietary and allergen boundaries. It will not be padded with unrelated equipment.",
    links: [
      { href: "/knowledge/dishes/carbonara", label: "Carbonara ingredients" },
      { href: "/marketplace?path=food-and-ingredients", label: "Ingredients shelf (empty)" },
    ],
  },
  careers: {
    title: "Culinary careers",
    description: "Paths into kitchens and food businesses — preview.",
    today: "There is no career curriculum yet. The founder page and business hub are the honest places to start.",
    later: "Role maps for line cook, culinary director, and owner-operator — when they are written, not before.",
    links: [
      { href: "/about", label: "Founder" },
      { href: "/business", label: "Build a food business" },
    ],
  },
} as const;

type Topic = keyof typeof TOPICS;

export function generateStaticParams() {
  return Object.keys(TOPICS).map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = TOPICS[slug as Topic];
  return topic
    ? { title: `${topic.title} · Preview`, description: topic.description }
    : { title: "Learn" };
}

export default async function LearnTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params;
  const topic = TOPICS[slug as Topic];
  if (!topic) notFound();
  return (
    <div className="page-shell container">
      <p className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/learn">Learn</Link> / {topic.title}</p>
      <PreviewBanner product={topic.title} />
      <h1>{topic.title}</h1>
      <p className="lede">{topic.description}</p>
      <h2>What you can do today</h2>
      <p>{topic.today}</p>
      <h2>What is not here yet</h2>
      <p>{topic.later}</p>
      <ul className="cg-hub-list">
        {topic.links.map((link) => (
          <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
