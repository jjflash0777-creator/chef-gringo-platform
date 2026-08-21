import type { MarketplaceCategory } from "./taxonomy.ts";
import type { WorkflowId } from "./catalog";
import type { OperatingEnvironment } from "./taxonomy.ts";

/**
 * The primary shelves and the guided goals that lead into them.
 *
 * Three shelves are declared but hold nothing: the research programme has not
 * covered food and ingredients, business startup, or home growing. They stay
 * visible with an honest explanation rather than being hidden (which would
 * pretend the gap does not exist) or padded with loosely related equipment
 * (which would be a fabrication).
 */

export type CategoryDefinition = {
  id: MarketplaceCategory;
  label: string;
  blurb: string;
  /** Set when the catalogue holds nothing for this shelf. Shown to the reader verbatim. */
  emptyReason?: string;
};

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: "equipment",
    label: "Equipment",
    blurb: "Researched commercial and home equipment, from smallwares to major production machines.",
  },
  {
    id: "food-safety-and-compliance",
    label: "Food safety and compliance",
    blurb: "Thermometers, labeling, sanitation, and warewashing — the tools that keep service defensible.",
  },
  {
    id: "software-and-operations",
    label: "Software and operations",
    blurb: "Point of sale, inventory, scheduling, and food-cost platforms for running the business.",
  },
  {
    id: "food-and-ingredients",
    label: "Food and ingredients",
    blurb: "Ingredients, pantry, and specialty food sourcing.",
    emptyReason:
      "Chef Gringo has not researched any ingredients or food products yet. This shelf stays empty until real sourcing research exists rather than being filled with equipment that happens to touch food.",
  },
  {
    id: "business-startup",
    label: "Business startup",
    blurb: "Licensing, formation, financing, and the first build-out.",
    emptyReason:
      "No startup, licensing, or financing products have been researched. Equipment for a new kitchen is on the Equipment shelf; this shelf will stay empty until genuine startup resources are reviewed.",
  },
  {
    id: "home-growing",
    label: "Home growing and self-sufficiency",
    blurb: "Growing, preserving, and producing food at home.",
    emptyReason:
      "Nothing here yet. No growing, preserving, or self-sufficiency products have been researched, and none of the existing commercial catalogue honestly belongs on this shelf.",
  },
];

export type GoalQuery = {
  workflows?: WorkflowId[];
  categories?: MarketplaceCategory[];
  environments?: OperatingEnvironment[];
};

export type Goal = {
  id: string;
  label: string;
  /** What selecting this actually does, in plain terms. */
  description: string;
  query?: GoalQuery;
  /** Set when the honest answer is to send someone somewhere other than the catalogue. */
  destination?: { href: string; label: string };
  /** A limit of the underlying data that the reader deserves to know up front. */
  caveat?: string;
};

export const GOALS: Goal[] = [
  {
    id: "start-a-food-business",
    label: "Start a food business",
    description: "Major equipment, operations software, and the smallwares a new kitchen actually needs.",
    query: { workflows: ["high-aov-equipment", "operator-software", "countertop-equipment", "smallwares"] },
    caveat: "Chef Gringo has not researched licensing, formation, financing, or permits. This shows equipment and software only.",
  },
  {
    id: "equip-a-food-truck",
    label: "Equip a food truck",
    description: "Researched equipment recorded as suitable for mobile or outdoor service.",
    query: { environments: ["mobile-or-outdoor"] },
    caveat: "Fit is inferred from catering and mobile service notes. Vehicle dimensions, power draw, propane, and local mobile-vending rules have not been verified.",
  },
  {
    id: "replace-or-repair-equipment",
    label: "Replace or repair equipment",
    description: "Diagnostic tools, service parts, and maintenance routes before you buy new.",
    query: { workflows: ["repair-maintenance"] },
  },
  {
    id: "improve-food-safety",
    label: "Improve food safety",
    description: "Thermometers, labeling, sanitation, and warewashing.",
    query: { categories: ["food-safety-and-compliance"] },
  },
  {
    id: "reduce-food-or-labor-costs",
    label: "Reduce food or labor costs",
    description: "Food-cost, inventory, and scheduling platforms that make spend visible.",
    query: { workflows: ["operator-software"] },
    caveat: "Chef Gringo has not measured savings for any of these platforms. Pricing and contract terms need direct confirmation.",
  },
  {
    id: "choose-a-thermometer",
    label: "Choose a thermometer",
    description: "The five researched instant-read and probe thermometers, compared.",
    query: { workflows: ["better-thermometer"] },
  },
  {
    id: "find-software",
    label: "Find software",
    description: "Point of sale, inventory, scheduling, and operations platforms.",
    query: { categories: ["software-and-operations"] },
  },
  {
    id: "compare-commercial-equipment",
    label: "Compare commercial equipment",
    description: "Equipment recorded as suited to a commercial kitchen.",
    query: { categories: ["equipment"], environments: ["commercial-kitchen"] },
  },
  {
    id: "learn-a-culinary-skill",
    label: "Learn a culinary skill",
    description: "Technique lives in the knowledge layer, not the catalogue.",
    destination: { href: "/learn", label: "Go to Learn" },
  },
  {
    id: "grow-food-at-home",
    label: "Grow food at home",
    description: "Growing, preserving, and self-sufficiency.",
    query: { categories: ["home-growing"] },
    caveat: "Nothing has been researched here yet.",
  },
  {
    id: "find-an-ingredient",
    label: "Find an ingredient or specialty product",
    description: "Ingredients, pantry, and specialty sourcing.",
    query: { categories: ["food-and-ingredients"] },
    caveat: "Nothing has been researched here yet.",
  },
];

export function goalById(id: string | undefined) {
  return GOALS.find((goal) => goal.id === id);
}

export function categoryById(id: string | undefined) {
  return CATEGORY_DEFINITIONS.find((category) => category.id === id);
}
