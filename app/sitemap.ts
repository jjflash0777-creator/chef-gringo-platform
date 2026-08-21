import type { MetadataRoute } from "next";
import { marketplaceCatalog } from "./marketplace/catalog";

const routes = [
  "",
  "/start",
  "/discover",
  "/knowledge/dishes/carbonara",
  "/marketplace",
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
  "/favorite-food-makeovers",
  "/favorite-food-makeovers/big-mac-style-burger",
  "/senior-caregiver-kitchen",
  "/culinary-director-tools",
  "/tools/recipe-scaler",
  "/recipes",
  "/medical-and-nutrition-disclaimer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const staticRoutes = routes.map((route) => ({
    url: `${base}${route}`,
    changeFrequency: (route === "" || route === "/start" ? "weekly" : "monthly") as "weekly" | "monthly",
  }));
  const productRoutes = marketplaceCatalog.products.map((product) => ({
    url: `${base}/marketplace/products/${product.id}`,
    changeFrequency: "monthly" as const,
  }));
  return [...staticRoutes, ...productRoutes];
}
