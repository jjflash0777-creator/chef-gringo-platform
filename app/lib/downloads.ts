/**
 * The Chef Gringo downloads catalog: digital products built from the same
 * kitchen work the blog teaches. One source of truth for the /downloads
 * page and the homepage downloads strip — and, since the own-site
 * storefront opened, for Stripe checkout: prices live here and only here,
 * and checkout sessions are created with inline price data from this
 * catalog, so a price change is a code change, never a dashboard edit.
 *
 * Plaintext delivery files are never in this repo and never at public
 * URLs. Each file ships as an AES-256-GCM encrypted bundle under
 * app/lib/download-bundles (keyed by the entry's stable key below) that
 * the signed-token download route decrypts in memory after a verified
 * payment, using the server-only DOWNLOAD_BUNDLE_KEY env var. See
 * docs/DOWNLOADS_CHECKOUT_SETUP.md for how bundles are produced.
 */
export type DownloadFile = {
  /** Stable per-product file id used in download links. */
  id: string;
  /** Buyer-facing label shown on the confirmation page. */
  label: string;
  /** Filename the buyer saves the file as. */
  fileName: string;
  /**
   * Stable delivery key (downloads/<product>/<file>): the encrypted
   * bundle manifest key, and the fallback R2 object key. Kept stable
   * across the delivery change so issued links and records don't move.
   */
  r2Key: string;
  contentType: string;
};

export type DownloadProduct = {
  id: string;
  name: string;
  audience: string;
  format: string;
  blurb: string;
  inside: readonly string[];
  /** Price in USD cents. The single source of truth for checkout. */
  priceCents: number;
  currency: "USD";
  /** Short description sent to Stripe for the hosted checkout page. */
  stripeDescription: string;
  files: readonly DownloadFile[];
};

export const DOWNLOAD_CURRENCY = "USD";

export function formatDownloadPrice(product: DownloadProduct): string {
  return `$${(product.priceCents / 100).toFixed(product.priceCents % 100 === 0 ? 0 : 2)}`;
}

export function getDownloadProduct(productId: string): DownloadProduct | null {
  return DOWNLOAD_PRODUCTS.find((product) => product.id === productId) ?? null;
}

export function getDownloadFile(product: DownloadProduct, fileId: string): DownloadFile | null {
  return product.files.find((file) => file.id === fileId) ?? null;
}

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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
    priceCents: 3500,
    currency: "USD",
    stripeDescription: "Nine printable kitchen reference charts (PDF): temperatures, wine pairing, allergen swaps, conversions, knife cuts, mother sauces, seasoning blends, cold storage.",
    files: [
      {
        id: "chart-set-pdf",
        label: "Kitchen Reference Chart Set — Vol. 1 (PDF, 9 pages)",
        fileName: "kitchen-reference-chart-set.pdf",
        r2Key: "downloads/kitchen-reference-chart-set/kitchen-reference-chart-set.pdf",
        contentType: PDF,
      },
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
    priceCents: 3900,
    currency: "USD",
    stripeDescription: "Healthcare Kitchen Starter Pack: editable Word checklists and signs, Excel logs and census-based emergency-supply worksheet, plus the print-ready PDF. Single-facility license.",
    files: [
      {
        id: "starter-pack-pdf",
        label: "Starter Pack — print-ready PDF (17 pages)",
        fileName: "healthcare-kitchen-starter-pack.pdf",
        r2Key: "downloads/healthcare-kitchen-starter-pack/healthcare-kitchen-starter-pack.pdf",
        contentType: PDF,
      },
      {
        id: "starter-pack-docx",
        label: "Starter Pack — editable Word (checklists & signs)",
        fileName: "healthcare-kitchen-starter-pack.docx",
        r2Key: "downloads/healthcare-kitchen-starter-pack/healthcare-kitchen-starter-pack.docx",
        contentType: DOCX,
      },
      {
        id: "starter-pack-logs",
        label: "Starter Pack — Excel logs & emergency worksheet",
        fileName: "healthcare-kitchen-starter-pack-logs.xlsx",
        r2Key: "downloads/healthcare-kitchen-starter-pack/healthcare-kitchen-starter-pack-logs.xlsx",
        contentType: XLSX,
      },
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
      "60-ingredient USDA database built to grow with your own recipes",
    ],
    priceCents: 9900,
    currency: "USD",
    stripeDescription: "Recipe Calculator Excel workbook: scale one base recipe by diet and texture counts, USDA-backed per-diet nutrition flags, and the census-based emergency-supplies engine. Single-facility license.",
    files: [
      {
        id: "recipe-calculator-xlsx",
        label: "Recipe Calculator workbook (Excel, 7 sheets)",
        fileName: "recipe-calculator.xlsx",
        r2Key: "downloads/recipe-calculator/recipe-calculator.xlsx",
        contentType: XLSX,
      },
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
    priceCents: 3900,
    currency: "USD",
    stripeDescription: "Foodservice Schedule Pack Excel workbook: FOH weekly grids by meal period, BOH grid, daily assignment sheets, automatic hours, overtime flags, and coverage counts. Single-facility license.",
    files: [
      {
        id: "schedule-pack-xlsx",
        label: "Foodservice Schedule Pack workbook (Excel, 9 sheets)",
        fileName: "foodservice-schedule-pack.xlsx",
        r2Key: "downloads/foodservice-schedule-pack/foodservice-schedule-pack.xlsx",
        contentType: XLSX,
      },
    ],
  },
];
