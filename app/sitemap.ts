import type { MetadataRoute } from "next";
import { marketplaceCatalog } from "./marketplace/catalog";
import { editorialRoutes } from "./lib/editorial-registry";

const routes = [
  "",
  "/start",
  "/discover",
  "/knowledge/dishes/carbonara",
  "/knowledge/dishes/carbonara/why-carbonara-scrambles",
  "/marketplace",
  "/marketplace/kitchen-workhorses",
  "/marketplace/thermometer-types",
  "/marketplace?view=problems",
  "/marketplace?all=1",
  "/about",
  "/partners",
  "/vision",
  "/early-access",
  "/newsletter",
  "/privacy",
  "/terms",
  "/affiliate-disclosure",
  "/go/thermoworks",
  "/go/bluetti",
  "/go/toast",
  "/go/kitchen-os",
  "/go/crazy-good-buy",
  "/favorite-food-makeovers",
  "/favorite-food-makeovers/big-mac-style-burger",
  "/senior-caregiver-kitchen",
  "/learn",
  "/learn/techniques",
  "/learn/food-safety",
  "/learn/ingredients",
  "/learn/careers",
  "/cut-intelligence",
  "/business",
  "/business/food-cost-drift",
  "/tools",
  "/tools/recipe-scaler",
  "/recipes",
  "/services/repair-or-replace",
  "/medical-and-nutrition-disclaimer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const staticRoutes = [...new Set([...routes, ...editorialRoutes])].map((route) => ({
    url: `${base}${route}`,
    changeFrequency: (route === "" || route === "/start" ? "weekly" : "monthly") as "weekly" | "monthly",
  }));
  const productRoutes = marketplaceCatalog.products.map((product) => ({
    url: `${base}/marketplace/products/${product.id}`,
    changeFrequency: "monthly" as const,
  }));
  return [...staticRoutes, ...productRoutes];
}
