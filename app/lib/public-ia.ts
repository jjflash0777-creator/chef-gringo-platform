export type NavStatus = "live" | "preview";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  status?: NavStatus;
};

export type PrimaryNavEntry = {
  id: "blog" | "recipes" | "guides" | "shop" | "about";
  label: string;
  href: string;
  items: NavItem[];
};

/**
 * Public information architecture, rebuilt 2026-11-05 per the approved
 * redesign blueprint: the site is a blog, not a platform. Five entries —
 * Blog, Recipes, Guides & Charts, Shop My Kitchen, About. The old
 * question intake, the live feed, Marketplace-as-architecture, Tools, and
 * Build a Food Business are no longer top-level destinations; their surviving content
 * lives in posts, guides, downloads, and the partner pages.
 */
export const PRIMARY_NAV: PrimaryNavEntry[] = [
  {
    id: "blog",
    label: "Blog",
    href: "/",
    items: [],
  },
  {
    id: "recipes",
    label: "Recipes",
    href: "/recipes",
    items: [],
  },
  {
    id: "guides",
    label: "Guides & Charts",
    href: "/learn",
    items: [
      { href: "/learn/mirepoix-foundations-of-flavor", label: "Mirepoix: Foundations of Flavor", description: "Foundations of Flavor No. 1 — the 300-year story under your dinner." },
      { href: "/learn/mother-sauces-foundations-of-flavor", label: "Mother Sauces", description: "Foundations of Flavor No. 2 — five bases, a thousand dinners." },
      { href: "/learn/mother-sauces-family-tree", label: "Mother Sauces family tree", description: "The free printable: five mothers and their derivatives on one sheet." },
      { href: "/downloads", label: "Downloads & charts", description: "The Kitchen Reference Chart Set and the professional toolkits." },
      { href: "/tools/recipe-scaler", label: "Recipe scaler", description: "Deterministic recipe conversion and scaling — live." },
    ],
  },
  {
    id: "shop",
    label: "Shop My Kitchen",
    href: "/partners",
    items: [],
  },
  {
    id: "about",
    label: "About",
    href: "/about",
    items: [],
  },
];

export const FOOTER_GROUPS = [
  {
    label: "Read",
    links: [
      { href: "/", label: "Blog" },
      { href: "/recipes", label: "Recipes" },
      { href: "/learn", label: "Guides & Charts" },
      { href: "/learn/mirepoix-foundations-of-flavor", label: "Mirepoix: Foundations of Flavor" },
      { href: "/learn/mother-sauces-foundations-of-flavor", label: "Mother Sauces" },
      { href: "/links", label: "Link hub" },
    ],
  },
  {
    label: "Partners",
    links: [
      { href: "/partners", label: "Shop My Kitchen" },
      { href: "/go/thermoworks", label: "ThermoWorks" },
      { href: "/go/chefiq", label: "Chef iQ" },
      { href: "/go/bluetti", label: "Bluetti" },
      { href: "/go/gustus-vitae", label: "Gustus Vitae" },
      { href: "/go/toast", label: "Toast" },
      { href: "/go/kitchen-os", label: "Kitchen OS" },
    ],
  },
  {
    label: "Downloads",
    links: [
      { href: "/downloads", label: "All downloads" },
      { href: "/downloads#kitchen-reference-chart-set", label: "Kitchen Reference Chart Set" },
      { href: "/downloads#healthcare-kitchen-starter-pack", label: "Healthcare Kitchen Starter Pack" },
      { href: "/downloads#recipe-calculator", label: "Recipe Calculator" },
      { href: "/downloads#foodservice-schedule-pack", label: "Foodservice Schedule Pack" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/about", label: "About the chef" },
      { href: "/partners#work-with-chef-gringo", label: "Work with Chef Gringo" },
      { href: "/newsletter", label: "Field Notes newsletter" },
    ],
  },
  {
    label: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/affiliate-disclosure", label: "Affiliate disclosure" },
      { href: "/medical-and-nutrition-disclaimer", label: "Medical & nutrition disclaimer" },
    ],
  },
] as const;

export const HOMEPAGE_GOALS = [
  {
    id: "cook",
    label: "Cook or learn something",
    detail: "Start with the published recipes and technique notes.",
    actions: [
      { href: "/recipes", label: "Open the recipe shelf" },
      { href: "/learn", label: "See what learning exists" },
      { href: "/learn", label: "Browse the guides" },
    ],
  },
  {
    id: "equipment",
    label: "Solve an equipment problem",
    detail: "Troubleshoot first, then compare repair and replacement routes.",
    actions: [
      { href: "/services/repair-or-replace", label: "Repair-or-replace brief" },
      { href: "/services/repair-or-replace", label: "Repair-or-replace brief" },
      { href: "/marketplace?goal=replace-or-repair-equipment", label: "Repair records" },
    ],
  },
  {
    id: "product",
    label: "Choose a product or service",
    detail: "Marketplace is organized around the job, with evidence and commercial status in the open.",
    actions: [
      { href: "/marketplace", label: "Open Marketplace" },
      { href: "/marketplace?view=problems", label: "Solve a problem" },
      { href: "/marketplace?all=1", label: "Compare records" },
    ],
  },
  {
    id: "business",
    label: "Start or grow a food business",
    detail: "Local rules still govern. Chef Gringo can name the questions and show researched equipment.",
    actions: [
      { href: "/business", label: "Start here" },
      { href: "/marketplace?goal=start-a-food-business", label: "Equipment for a new kitchen" },
      { href: "/learn", label: "Browse the guides" },
    ],
  },
  {
    id: "operate",
    label: "Improve an operation",
    detail: "Food cost, software, sanitation, and the scaler that already does arithmetic.",
    actions: [
      { href: "/tools", label: "Open tools" },
      { href: "/marketplace?goal=reduce-food-or-labor-costs", label: "Cost platforms" },
      { href: "/tools/recipe-scaler", label: "Scale a recipe" },
    ],
  },
  {
    id: "butchery",
    label: "Explore cuts and butchery",
    detail: "Butchery coverage lives in the guides for now — no separate product exists yet.",
    actions: [
      { href: "/learn", label: "Guides & charts" },
      { href: "/learn/techniques", label: "Cooking techniques" },
      { href: "/learn", label: "Browse the guides" },
    ],
  },
] as const;

export function publicHrefs() {
  const hrefs = new Set<string>();
  for (const entry of PRIMARY_NAV) {
    hrefs.add(entry.href);
    for (const item of entry.items) hrefs.add(item.href);
  }
  for (const group of FOOTER_GROUPS) {
    for (const link of group.links) hrefs.add(link.href);
  }
  return [...hrefs];
}

export function isCurrentNavHref(pathname: string, href: string) {
  const path = href.split("#")[0].split("?")[0];
  if (!path || path === "/") return pathname === "/";
  if (path === "/recipes") return pathname === "/recipes" || pathname.startsWith("/recipes/");
  if (path === "/learn") return pathname === "/learn" || pathname.startsWith("/learn/") || pathname === "/downloads" || pathname === "/tools/recipe-scaler";
  if (path === "/partners") return pathname === "/partners" || pathname.startsWith("/go/");
  return pathname === path;
}
