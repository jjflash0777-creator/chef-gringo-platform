export type EditorialSectionId =
  | "front-of-house"
  | "back-of-house"
  | "independent-mobile"
  | "health-better-living"
  | "food-intelligence";

export type EditorialSection = {
  id: EditorialSectionId;
  label: string;
  shortLabel: string;
  color: string;
  href: string;
};

export type EditorialStory = {
  slug: string;
  section: EditorialSectionId;
  title: string;
  dek: string;
  image: string;
  imageAlt: string;
  href: string;
  publishedAt: string;
  author: string;
  format: "Quick Take" | "Field Note" | "Deep Dive";
  destination?: {
    label: string;
    href: string;
  };
};

export const editorialSections: EditorialSection[] = [
  { id: "front-of-house", label: "Front of House", shortLabel: "FOH", color: "#c7392f", href: "/#front-of-house" },
  { id: "back-of-house", label: "Back of House", shortLabel: "BOH", color: "#138449", href: "/#back-of-house" },
  { id: "independent-mobile", label: "Independent & Mobile", shortLabel: "Mobile", color: "#ed6a24", href: "/#independent-mobile" },
  { id: "health-better-living", label: "Health & Better Living", shortLabel: "Health", color: "#2387d9", href: "/#health-better-living" },
  { id: "food-intelligence", label: "Food Intelligence", shortLabel: "Intel", color: "#7440a7", href: "/#food-intelligence" },
];

export const featuredStory = {
  eyebrow: "Featured story of the week",
  title: "What Nearly 30 Years in Hospitality Taught Me About People",
  dek: "The lessons, the mistakes, and the things I would do differently if I could walk back through every dining room and kitchen again.",
  image: "/brand/editorial/hero-kitchen.jpg",
  imageAlt: "Chef working the line in a professional kitchen",
  href: "/about",
  author: "Josh Freeman",
  byline: "Chef · Operator · Storyteller",
} as const;

export const dailyStories: EditorialStory[] = [
  {
    slug: "best-server-barely-talked",
    section: "front-of-house",
    title: "The Best Server I Ever Worked With Barely Talked",
    dek: "What she did instead changed the way I think about hospitality.",
    image: "/images/editorial/restaurant-kitchen-service.jpg",
    imageAlt: "Hospitality professional working during restaurant service",
    href: "/about",
    publishedAt: "Today",
    author: "Josh Freeman",
    format: "Field Note",
    destination: { label: "See the Toast operator page", href: "/go/toast" },
  },
  {
    slug: "walk-in-tells-me-more",
    section: "back-of-house",
    title: "Your Walk-In Tells Me More About Your Kitchen Than Your Menu",
    dek: "If your storage is a mess, you usually have bigger problems than food cost.",
    image: "/brand/editorial/refrigeration.jpg",
    imageAlt: "Commercial refrigeration inside a working kitchen",
    href: "/culinary-director-tools",
    publishedAt: "Today",
    author: "Josh Freeman",
    format: "Quick Take",
    destination: { label: "See tools I actually use", href: "/go/thermoworks" },
  },
  {
    slug: "mobile-hospitality-is-bigger-than-food-trucks",
    section: "independent-mobile",
    title: "Food Trucks Are Only the Beginning of Mobile Hospitality",
    dek: "Boats, trailers, pop-ups, concessions and mobile kitchens all live or die by the same thing: solving the operation before buying the toys.",
    image: "/brand/editorial/food-truck.jpg",
    imageAlt: "Cook working inside a food truck kitchen",
    href: "/business#food-truck",
    publishedAt: "Today",
    author: "Josh Freeman",
    format: "Field Note",
    destination: { label: "Browse equipment routes", href: "/go/crazy-good-buy" },
  },
  {
    slug: "healthy-food-doesnt-have-to-taste-like-punishment",
    section: "health-better-living",
    title: "Healthy Food Doesn't Have to Taste Like Punishment",
    dek: "Better choices still need texture, seasoning, contrast and enough satisfaction that people actually want to eat them.",
    image: "/brand/editorial/senior-living.jpg",
    imageAlt: "Chef and team preparing organized meal service",
    href: "/senior-caregiver-kitchen",
    publishedAt: "Today",
    author: "Josh Freeman",
    format: "Field Note",
  },
  {
    slug: "food-cost-isnt-just-purchasing",
    section: "food-intelligence",
    title: "Your Food Cost Isn't Just a Purchasing Problem",
    dek: "Waste, overproduction, portion creep, storage, labor and bad systems can destroy a budget before the invoice ever lands.",
    image: "/brand/editorial/operator-intelligence.jpg",
    imageAlt: "Chef reviewing operating notes and kitchen data after service",
    href: "/culinary-director-tools",
    publishedAt: "Today",
    author: "Josh Freeman",
    format: "Deep Dive",
    destination: { label: "Compare operator tools", href: "/marketplace" },
  },
];

export const recentStories: EditorialStory[] = [
  {
    slug: "bar-program-can-save-a-struggling-restaurant",
    section: "front-of-house",
    title: "Why a Great Bar Program Can Save a Struggling Restaurant",
    dek: "Beverage is margin, theater and repeat traffic when it is run well.",
    image: "/brand/editorial/empty-kitchen.jpg",
    imageAlt: "Quiet hospitality space after service",
    href: "/business",
    publishedAt: "Yesterday",
    author: "Josh Freeman",
    format: "Quick Take",
  },
  {
    slug: "one-pan-every-line-cook-should-own",
    section: "back-of-house",
    title: "The One Pan Every Line Cook Should Own",
    dek: "Not glamorous. Just useful every single shift.",
    image: "/brand/editorial/cooking-line.jpg",
    imageAlt: "Active commercial cooking line with open flame",
    href: "/marketplace?workflow=smallwares",
    publishedAt: "Yesterday",
    author: "Josh Freeman",
    format: "Quick Take",
  },
  {
    slug: "feeding-guests-on-water",
    section: "independent-mobile",
    title: "Feeding Guests on Water: A Look Inside a Floating Kitchen",
    dek: "Mobile hospitality gets more interesting when the road disappears.",
    image: "/brand/editorial/food-truck.jpg",
    imageAlt: "Compact mobile food operation",
    href: "/business#food-truck",
    publishedAt: "Yesterday",
    author: "Josh Freeman",
    format: "Field Note",
  },
  {
    slug: "simple-swaps-healthier-holiday-season",
    section: "health-better-living",
    title: "Simple Swaps for a Healthier Holiday Season",
    dek: "Small changes that do not ruin the meal.",
    image: "/brand/editorial/prep-station.jpg",
    imageAlt: "Ingredient prep station with mise en place",
    href: "/recipes",
    publishedAt: "Yesterday",
    author: "Josh Freeman",
    format: "Quick Take",
  },
  {
    slug: "recall-response-operator-checklist",
    section: "food-intelligence",
    title: "A Food Recall Hits. What Should an Operator Check First?",
    dek: "Lot numbers, storage, service records and communication before panic.",
    image: "/brand/editorial/refrigeration.jpg",
    imageAlt: "Commercial cold storage used in food operations",
    href: "/learn/food-safety",
    publishedAt: "Yesterday",
    author: "Josh Freeman",
    format: "Field Note",
  },
];

export function sectionFor(id: EditorialSectionId) {
  return editorialSections.find((section) => section.id === id)!;
}
