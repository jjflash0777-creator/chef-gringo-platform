export type NavStatus = "live" | "preview";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  status?: NavStatus;
};

export type PrimaryNavEntry = {
  id: "ask" | "learn" | "marketplace" | "business" | "tools";
  label: string;
  href: string;
  items: NavItem[];
};

/**
 * Public information architecture. Primary nav stays to five entries.
 * Items always point at a real page. Preview items are honest overviews,
 * never inert buttons.
 */
export const PRIMARY_NAV: PrimaryNavEntry[] = [
  {
    id: "ask",
    label: "Ask Chef Gringo",
    href: "/#operator-question",
    items: [],
  },
  {
    id: "learn",
    label: "Learn",
    href: "/learn",
    items: [
      { href: "/recipes", label: "Recipes", description: "The tested recipe shelf — two complete recipes today." },
      { href: "/learn/techniques", label: "Cooking techniques", description: "How dishes actually get made.", status: "preview" },
      { href: "/learn/food-safety", label: "Food safety", description: "Time, temperature, and when to stop.", status: "preview" },
      { href: "/learn/ingredients", label: "Ingredients and substitutions", description: "What to use, and what not to invent.", status: "preview" },
      { href: "/cut-intelligence", label: "Butchery & Cut Intelligence", description: "Beef-first cut education. Not built yet.", status: "preview" },
      { href: "/learn/careers", label: "Culinary careers", description: "Paths into kitchens and food businesses.", status: "preview" },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    href: "/marketplace",
    items: [
      { href: "/marketplace?view=problems", label: "Solve a problem", description: "Start from the job, not the SKU." },
      { href: "/marketplace?path=equipment", label: "Equipment", description: "Researched machines and smallwares." },
      { href: "/marketplace?path=food-and-ingredients", label: "Food and ingredients", description: "Empty until sourcing research exists." },
      { href: "/marketplace?path=software-and-operations", label: "Software and operations", description: "POS, inventory, scheduling, food cost." },
      { href: "/marketplace?path=food-safety-and-compliance", label: "Food safety and compliance", description: "Thermometers, labeling, sanitation." },
      { href: "/marketplace?path=home-growing", label: "Home growing and self-sufficiency", description: "Empty until growing research exists." },
      { href: "/marketplace?all=1", label: "Browse everything", description: "Every researched record, filterable." },
    ],
  },
  {
    id: "business",
    label: "Build a Food Business",
    href: "/business",
    items: [
      { href: "/business", label: "Start here", description: "What Chef Gringo can and cannot do for a new operation." },
      { href: "/business#cottage-food", label: "Home bakery or cottage food", description: "Local rules first, then product and channel." },
      { href: "/business#food-truck", label: "Food truck", description: "Mobile equipment notes — not a licensed-route planner." },
      { href: "/business#catering", label: "Catering", description: "Volume, holding, and transport questions." },
      { href: "/business#restaurant", label: "Restaurant or café", description: "Equipment and software that have been researched." },
      { href: "/business#cost", label: "Cost and budgeting", description: "Food cost and labor tools on file." },
      { href: "/business#licensing", label: "Licensing and compliance", description: "Questions to take to a regulator, not answers invented here." },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    href: "/tools",
    items: [
      { href: "/#operator-question", label: "Ask Chef Gringo", description: "The canonical conversation." },
      { href: "/services/repair-or-replace", label: "Repair or replace", description: "Paid decision-brief pilot for equipment." },
      { href: "/marketplace?all=1", label: "Product comparison", description: "Select two to four records on the catalogue." },
      { href: "/tools/recipe-scaler", label: "Recipe conversion/scaling", description: "Deterministic scaler — live." },
      { href: "/cut-intelligence", label: "Cut Intelligence", description: "Honest preview of the butchery product.", status: "preview" },
      { href: "/learn/food-safety", label: "Food-safety guidance", description: "Conservative practice notes, not a certification." },
    ],
  },
];

export const FOOTER_GROUPS = [
  {
    label: "Use",
    links: [
      { href: "/#operator-question", label: "Ask Chef Gringo" },
      { href: "/start", label: "Guided start" },
      { href: "/marketplace", label: "Marketplace" },
      { href: "/marketplace?all=1", label: "Compare products" },
      { href: "/services/repair-or-replace", label: "Repair or replace" },
    ],
  },
  {
    label: "Learn",
    links: [
      { href: "/learn", label: "Learn" },
      { href: "/recipes", label: "Recipes" },
      { href: "/cut-intelligence", label: "Cut Intelligence" },
      { href: "/discover", label: "Knowledge search" },
      { href: "/tools", label: "Tools" },
    ],
  },
  {
    label: "Build",
    links: [
      { href: "/business", label: "Build a food business" },
      { href: "/culinary-director-tools", label: "Culinary director tools" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/about", label: "Founder" },
      { href: "/vision", label: "Vision" },
      { href: "/partners", label: "Partners" },
      { href: "/newsletter", label: "Newsletter" },
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
    detail: "Start with the tested recipes, technique notes, or Ask Chef Gringo.",
    actions: [
      { href: "/recipes", label: "Open the recipe shelf" },
      { href: "/learn", label: "See what learning exists" },
      { href: "#operator-question", label: "Ask Chef Gringo" },
    ],
  },
  {
    id: "equipment",
    label: "Solve an equipment problem",
    detail: "Troubleshoot first, then compare repair and replacement routes.",
    actions: [
      { href: "#operator-question", label: "Describe the problem" },
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
      { href: "#operator-question", label: "Ask Chef Gringo" },
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
    detail: "Cut Intelligence is a planned product, not a live identifier.",
    actions: [
      { href: "/cut-intelligence", label: "Cut Intelligence preview" },
      { href: "/learn/techniques", label: "Cooking techniques" },
      { href: "#operator-question", label: "Ask Chef Gringo" },
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
  if (href.startsWith("/#") || href === "/#operator-question") return pathname === "/" || pathname === "/start";
  const path = href.split("#")[0].split("?")[0];
  if (!path || path === "/") return pathname === "/";
  if (path === "/marketplace") return pathname === "/marketplace" || pathname.startsWith("/marketplace/");
  if (path === "/learn") return pathname === "/learn" || pathname.startsWith("/learn/");
  if (path === "/tools") return pathname === "/tools" || pathname.startsWith("/tools/");
  if (path === "/business") return pathname === "/business";
  return pathname === path;
}
