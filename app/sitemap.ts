import type { MetadataRoute } from "next";
const routes = ["", "/favorite-food-makeovers", "/favorite-food-makeovers/big-mac-style-burger", "/senior-caregiver-kitchen", "/culinary-director-tools", "/tools/recipe-scaler", "/recipes", "/about", "/newsletter", "/medical-and-nutrition-disclaimer"];
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: "monthly" as const }));
}
