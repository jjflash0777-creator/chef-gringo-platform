/**
 * Search-result surface ranking for discovery priority only.
 * Never promotes evidence authority before retrieval and publisher verification.
 */

import { registrableDomain } from "../../lib/research/publisher-identity.ts";
import { assertNoEvidenceEconomics } from "./evidence-policy.ts";
import {
  AUTHORITY_PATHS,
  buildAuthoritativeQueryPlans,
  queryPlansAreDiverse,
  type AuthorityPath,
  type ResearchQueryPlan,
} from "./evidence-gap-research.ts";

export {
  AUTHORITY_PATHS,
  buildAuthoritativeQueryPlans,
  queryPlansAreDiverse,
};
export type { AuthorityPath, ResearchQueryPlan };

export const SEARCH_SURFACES = [
  "official_pdf_manual",
  "government_technical",
  "education_technical",
  "professional_document",
  "unknown",
  "commercial_editorial",
] as const;
export type SearchSurfaceClass = typeof SEARCH_SURFACES[number];

const COMMERCIAL_EDITORIAL = /\b(blog|calculator|affiliate|coupon|deals|buy-now|seo|sponsored|roundup|best\s+\d+)\b/i;
const MANUAL_DOCUMENT = /\b(manual|application[- ]guide|engineering[- ]guide|installation[- ]guide|technical[- ]bulletin|spec(?:ification)?s?)\b/i;
const PROFESSIONAL_DOCUMENT = /\b(standard|code|handbook|whitepaper|application note|engineering)\b/i;

export function classifySearchSurface(url: string, title: string, snippet?: string): {
  surface: SearchSurfaceClass;
  discoveryPriority: number;
} {
  let hostname = "";
  let pathname = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    pathname = parsed.pathname.toLowerCase();
  } catch {
    hostname = "";
  }
  const haystack = `${url} ${title} ${snippet ?? ""}`;
  const looksPdf = /\.pdf($|[?#])/i.test(url) || pathname.endsWith(".pdf");
  const looksManual = (looksPdf && MANUAL_DOCUMENT.test(haystack))
    || (/\/(manuals?|docs?|documentation)\//i.test(pathname) && (looksPdf || MANUAL_DOCUMENT.test(haystack)));
  const governmentHost = /\.(gov|mil)$/i.test(hostname);
  const educationHost = /\.edu$/i.test(hostname);

  if (COMMERCIAL_EDITORIAL.test(haystack) && !governmentHost && !looksManual) {
    return { surface: "commercial_editorial", discoveryPriority: 8 };
  }
  if (looksManual || (looksPdf && MANUAL_DOCUMENT.test(title))) {
    return { surface: "official_pdf_manual", discoveryPriority: governmentHost ? 92 : 80 };
  }
  if (governmentHost) {
    return { surface: "government_technical", discoveryPriority: looksPdf ? 78 : 72 };
  }
  if (educationHost) {
    const technical = looksPdf || MANUAL_DOCUMENT.test(haystack) || PROFESSIONAL_DOCUMENT.test(haystack);
    return { surface: "education_technical", discoveryPriority: technical ? 62 : 48 };
  }
  if (looksPdf || PROFESSIONAL_DOCUMENT.test(haystack)) {
    return { surface: "professional_document", discoveryPriority: 58 };
  }
  return { surface: "unknown", discoveryPriority: 30 };
}

export function searchSurfaceDiscoveryScore(input: {
  url: string;
  title: string;
  snippet?: string;
  demoteRegistrableDomains?: string[];
  economics?: Record<string, unknown>;
}) {
  if (input.economics) assertNoEvidenceEconomics(input.economics, "Search-surface ranking");
  const classified = classifySearchSurface(input.url, input.title, input.snippet);
  let hostname = "";
  try {
    hostname = new URL(input.url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    hostname = "";
  }
  const domain = registrableDomain(hostname);
  const demote = Boolean(domain && input.demoteRegistrableDomains?.includes(domain));
  if (demote && classified.surface !== "official_pdf_manual" && classified.surface !== "government_technical") {
    return { ...classified, discoveryPriority: Math.max(0, classified.discoveryPriority - 20) };
  }
  return classified;
}

export function compareSearchSurfaces(
  left: { url: string; title: string; snippet?: string },
  right: { url: string; title: string; snippet?: string },
  options: { demoteRegistrableDomains?: string[] } = {},
) {
  const leftScore = searchSurfaceDiscoveryScore({ ...left, demoteRegistrableDomains: options.demoteRegistrableDomains });
  const rightScore = searchSurfaceDiscoveryScore({ ...right, demoteRegistrableDomains: options.demoteRegistrableDomains });
  return rightScore.discoveryPriority - leftScore.discoveryPriority || left.url.localeCompare(right.url);
}
