/**
 * The Chef Gringo downloads catalog: digital products built from the same
 * kitchen work the blog teaches. One source of truth for the /downloads
 * page and the homepage downloads strip. No prices and no checkout here —
 * storefront and pricing are a separate founder decision; the page sells
 * with a Field Notes launch list until then.
 */
export type DownloadProduct = {
  id: string;
  name: string;
  audience: string;
  format: string;
  blurb: string;
  inside: readonly string[];
};

export const DOWNLOAD_PRODUCTS: readonly DownloadProduct[] = [
  {
    id: "kitchen-reference-chart-set",
    name: "Kitchen Reference Chart Set — Vol. 1",
    audience: "Home cooks and working line cooks",
    format: "9-page printable PDF, Letter",
    blurb:
      "The wall charts this blog keeps reaching for. Meat and poultry temperatures with USDA safe minimums printed separately from chef doneness — two different things, labeled as such — plus wine pairing by sauce and weight, gluten-free and allergen swaps with ratios, emergency substitutions, conversions, knife cuts with actual sizes, the mother sauces, and six house seasoning blends with cold-storage times.",
    inside: [
      "Meat & poultry temperatures: safe minimums vs. chef pull temps, rest times, thermometer calibration",
      "Wine pairing matrix — match the sauce first — with no-wine alternatives",
      "Gluten-free & allergen swaps with ratios and method, not just names",
      "Conversions & equivalents, knife cuts, mother sauces, seasoning blends, cold storage",
    ],
  },
  {
    id: "healthcare-kitchen-starter-pack",
    name: "Healthcare Kitchen Starter Pack",
    audience: "Dietary managers and CDMs in healthcare and senior living",
    format: "Word + Excel + print PDF bundle",
    blurb:
      "The dietary-department paperwork kit, built clean-room from public standards — FDA Food Code temperatures, cooling, and date-marking — never from any facility's own documents. Word files carry your logo header, facility name, and approval signature lines; the Excel half carries the logs and the census-based emergency-supply worksheet with working formulas.",
    inside: [
      "Emergency food & water supplies worksheet driven by your census, with inventory and rotation log",
      "Temperature, sanitizer, cleaning, receiving, opening/closing logs with automatic flags",
      "Prep lists, production sheets, five wall signs, and a weekly manager walk-through",
      "Single-facility license; multi-facility licensing available",
    ],
  },
  {
    id: "recipe-calculator",
    name: "Recipe Calculator — Diet & Texture MVP",
    audience: "Healthcare and senior-living kitchens scaling recipes by diet",
    format: "Excel workbook, 7 sheets",
    blurb:
      "Enter a base recipe once, then enter servings as counts by diet and texture — regular, carb-controlled, low-sodium, renal, cardiac, mechanical soft, purée, thickened liquids — and each batch scales separately, with one combined production list. Nutrition is summed ingredient-by-ingredient from USDA FoodData Central records, FDC ID on every row, and flagged against diet targets. Labeled for what it is: a calculated estimate for menu planning, to verify with your consulting dietitian.",
    inside: [
      "Per-diet batch scaling from one base recipe",
      "Per-serving calories, carbs, sodium, protein, potassium, phosphorus, and fluid per diet version",
      "Emergency-supplies engine: census by diet/texture plus staff, by days, minus on-hand",
      "62-ingredient USDA database built to grow with your own recipes",
    ],
  },
  {
    id: "foodservice-schedule-pack",
    name: "Foodservice Schedule Pack",
    audience: "Foodservice managers, front and back of house",
    format: "Excel workbook, 9 sheets",
    blurb:
      "Front of house scheduled the way dining rooms actually run — separate weekly grids for breakfast, lunch, and dinner — and back of house on a full-day grid, every position from executive chef to diet aide. Type in and out times; shift hours, weekly totals, overtime flags past 40, and per-meal coverage counts calculate themselves, including split shifts combined across areas.",
    inside: [
      "FOH weekly grids by meal period, plus daily section/station assignment sheets",
      "BOH weekly grid and daily production-staffing sheet by station",
      "Automatic hours, overtime flags, and coverage counts per meal period",
      "Editable position lists and employee roster on one setup sheet",
    ],
  },
];
