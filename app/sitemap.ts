import type { MetadataRoute } from "next";

const routes = [
  "",
  "/discover",
  "/knowledge/dishes/carbonara",
  "/marketplace",
  "/about",
  "/vision",
  "/early-access",
  "/newsletter",
  "/privacy",
  "/terms",
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
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" ? "weekly" : "monthly" as const }));
}
