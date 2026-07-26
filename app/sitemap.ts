import type { MetadataRoute } from "next";
const routes = ["", "/about", "/vision", "/early-access", "/privacy", "/terms"];
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: route === "" ? "weekly" : "monthly" as const }));
}
