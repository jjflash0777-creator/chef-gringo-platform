export const EDITORIAL_SECTIONS = [
  "front-of-house",
  "back-of-house",
  "independent-mobile",
  "health-better-living",
  "food-intelligence",
] as const;

export type EditorialSectionId = typeof EDITORIAL_SECTIONS[number];

export const ARTICLE_FORMATS = [
  "Quick Take",
  "Field Note",
  "Personal Story",
  "Recommendation",
  "Industry Alert",
  "News Reaction",
  "Recipe",
  "Business Spotlight",
  "Deep Dive",
  "Entertainment / Humor",
] as const;

export type ArticleFormat = typeof ARTICLE_FORMATS[number];

export type EditorialArticle = {
  id: string;
  slug: string;
  headline: string;
  deck: string;
  section: EditorialSectionId;
  format: ArticleFormat;
  author: string;
  authorRole: string;
  publishedAt: string;
  updatedAt: string;
  status: "draft" | "published";
  featured: boolean;
  homepageSlot: "featured" | "daily" | null;
  heroImage: string;
  heroImageAlt: string;
  imageCredit: string;
  imageRightsStatus: "owned" | "licensed" | "approved-partner" | "generated-editorial";
  body: string[];
  joshTake?: string;
  tags: string[];
  relatedTopics: string[];
  relatedStories: string[];
  commercialDestination?: {
    label: string;
    href: string;
  };
  cta?: {
    label: string;
    href: string;
  };
  socialPackageStatus: "not-started" | "drafted" | "approved" | "scheduled" | "published";
  seoTitle: string;
  seoDescription: string;
  socialImage: string;
  analyticsContentId: string;
};

export const SECTION_META: Record<EditorialSectionId, {
  label: string;
  description: string;
  color: string;
  route: string;
}> = {
  "front-of-house": {
    label: "Front of House",
    description: "Service, guest experience, leadership, sales, people and the part of hospitality customers actually see.",
    color: "#c7392f",
    route: "/front-of-house",
  },
  "back-of-house": {
    label: "Back of House",
    description: "Kitchens, chefs, prep, systems, equipment, production, food safety and what really happens behind the doors.",
    color: "#138449",
    route: "/back-of-house",
  },
  "independent-mobile": {
    label: "Independent & Mobile",
    description: "Food trucks, boats, trailers, caterers, pop-ups, mobile concepts and independent operators building something of their own.",
    color: "#ed6a24",
    route: "/independent-mobile",
  },
  "health-better-living": {
    label: "Health & Better Living",
    description: "Better food, practical nutrition, healthier recipes, senior-living ideas and guidance that still has to taste good.",
    color: "#2387d9",
    route: "/health",
  },
  "food-intelligence": {
    label: "Food Intelligence",
    description: "Food cost, recalls, pricing, shortages, supply, restaurant economics and the information operators need before it hurts.",
    color: "#7440a7",
    route: "/food-intelligence",
  },
};
