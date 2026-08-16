import type { MetadataRoute } from "next";

const routes = [
  "",
  "/start",
  "/discover",
  "/knowledge/dishes/carbonara",
  "/marketplace",
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
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" || route === "/start" ? "weekly" : "monthly" as const }));
}
