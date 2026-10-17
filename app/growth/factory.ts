import { getChefGringoAiConfig } from "../lib/ai/chefGringoRuntime.ts";
import { completeGrowthFactoryPrompt, GrowthFactoryProviderError } from "./factory-provider.ts";

export const FACTORY_VERSION = "1.1.0";
export const PINTEREST_COPY_MAX = 220;

export type GrowthFactoryPackage = {
  version: string;
  title: string;
  destinationPath: string;
  sourceUrl: string;
  campaignSlug: string;
  imageUrl: string;
  facebook: string;
  instagram: string;
  pinterest: string;
  reelScript: string;
  carouselSlides: string[];
  visualBrief: string;
  newsletterSubject: string;
  newsletterTeaser: string;
  generatedBy: "ai" | "fallback";
  fallbackReason: null | "ai_not_configured" | "ai_provider_error" | "invalid_ai_response";
  /** Safe for authenticated founder diagnostics: never includes credentials or raw provider messages. */
  providerStatus: number | null;
  providerErrorCode: string | null;
};

type ModelPackage = Partial<Pick<GrowthFactoryPackage,
  "campaignSlug" | "facebook" | "instagram" | "pinterest" | "reelScript" |
  "carouselSlides" | "visualBrief" | "newsletterSubject" | "newsletterTeaser"
>>;

function compact(value: unknown, max: number) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70);
  return slug || "chef-gringo-content";
}

/**
 * Next/Vinext render the public header and menus before <main id="main">.
 * Feed the AI only the article body, not navigation or hydration scripts.
 * This is editorial extraction; not a general HTML sanitizer.
 */
export function extractSourceArticleText(html: string): string {
  const mainTag = /<main\b[^>]*\bid\s*=\s*["']main["'][^>]*>/i.exec(html)
    ?? /<main\b[^>]*>/i.exec(html);
  const source = mainTag ? html.slice(mainTag.index + mainTag[0].length) : html;
  const body = source.split(/<footer\b/i)[0];
  return body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 14000);
}

function compactCopy(value: unknown, max: number) {
  const text = typeof value === "string"
    ? value.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
    : "";
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function ownedPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) throw new Error("Destination must be a Chef Gringo path.");
  return trimmed;
}

function publicImage(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !["chefgringo.com", "www.chefgringo.com"].includes(parsed.hostname.toLowerCase())) {
    throw new Error("Campaign image must be hosted on chefgringo.com.");
  }
  return parsed.toString();
}

function parseJson(raw: string): ModelPackage {
  const candidate = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw;
  const parsed = JSON.parse(candidate);
  return parsed && typeof parsed === "object" ? parsed as ModelPackage : {};
}

function fallbackPackage(input: { title: string; destinationPath: string; imageUrl: string; sourceUrl: string; sourceText: string; reason: GrowthFactoryPackage["fallbackReason"]; providerStatus?: number | null; providerErrorCode?: string | null }): GrowthFactoryPackage {
  const title = compact(input.title, 90);
  const first = compact(input.sourceText.split(/[.!?]/).find((item) => item.trim().length > 45) ?? input.sourceText, 180);
  const campaignSlug = slugify(title);
  return {
    version: FACTORY_VERSION,
    title,
    destinationPath: input.destinationPath,
    sourceUrl: input.sourceUrl,
    campaignSlug,
    imageUrl: input.imageUrl,
    facebook: compact(`${title}\n\n${first}\n\nSee the full Chef Gringo guide.`, 900),
    instagram: compact(`${title}\n\n${first}\n\nUseful first. Hype second. See the full guide on Chef Gringo.`, 900),
    pinterest: compact(`${title}. ${first}`, PINTEREST_COPY_MAX),
    reelScript: compact(`HOOK: ${title}. Show the problem immediately. Explain the single most useful takeaway from the Chef Gringo guide. Close with: See the full guide on Chef Gringo.`, 700),
    carouselSlides: [
      title,
      "Start with the problem.",
      compact(first, 100),
      "Know the limitation.",
      "See the full guide on Chef Gringo.",
    ],
    visualBrief: compact(`Create a Chef Gringo visual that makes "${title}" understandable in under five seconds. Prioritize food, technique, before/after, or the actual tool in use. Avoid generic stock imagery.`, 500),
    newsletterSubject: compact(title, 70),
    newsletterTeaser: compact(first, 240),
    generatedBy: "fallback",
    fallbackReason: input.reason,
    providerStatus: input.providerStatus ?? null,
    providerErrorCode: input.providerErrorCode ?? null,
  };
}

export async function generateGrowthFactoryPackage(input: {
  title?: string;
  destinationPath: string;
  imageUrl: string;
}): Promise<GrowthFactoryPackage> {
  const destinationPath = ownedPath(input.destinationPath);
  const imageUrl = publicImage(input.imageUrl);
  const sourceUrl = `https://chefgringo.com${destinationPath}`;
  const response = await fetch(sourceUrl, { cache: "no-store", redirect: "follow" });
  if (!response.ok) throw new Error(`Chef Gringo source page returned HTTP ${response.status}.`);
  const sourceText = extractSourceArticleText(await response.text());
  if (!sourceText) throw new Error("Chef Gringo source page did not return readable content.");
  const title = compact(input.title || sourceText.slice(0, 100), 90);

  if (!getChefGringoAiConfig()) {
    return fallbackPackage({ title, destinationPath, imageUrl, sourceUrl, sourceText, reason: "ai_not_configured" });
  }

  const prompt = `Create a complete Chef Gringo social distribution package from the SOURCE below.

Rules:
- Use ONLY facts and claims present in SOURCE. Do not invent prices, health claims, product performance, statistics, testimonials, or certifications.
- Voice: chef-led, useful, visual, direct, curious, non-corporate.
- Facebook and Instagram should be native posts, not SEO blurbs.
- Pinterest must be <= ${PINTEREST_COPY_MAX} characters BEFORE the tracked URL is appended.
- Reel script should fit roughly 25-40 seconds and open with a strong visual hook.
- Carousel must contain exactly 5 concise slide texts.
- Visual brief should describe what viewers should SEE, not just decorative styling.
- Campaign slug must be lowercase kebab-case and concise.
- Return JSON only.

JSON shape:
{
  "campaignSlug": "...",
  "facebook": "...",
  "instagram": "...",
  "pinterest": "...",
  "reelScript": "...",
  "carouselSlides": ["...", "...", "...", "...", "..."],
  "visualBrief": "...",
  "newsletterSubject": "...",
  "newsletterTeaser": "..."
}

TITLE: ${title}
DESTINATION: ${destinationPath}
SOURCE:
${sourceText}`;

  try {
    const raw = await completeGrowthFactoryPrompt(prompt);
    const model = parseJson(raw);
    const requiredCopy = [
      model.campaignSlug, model.facebook, model.instagram, model.pinterest,
      model.reelScript, model.visualBrief, model.newsletterSubject, model.newsletterTeaser,
    ];
    if (requiredCopy.some((item) => typeof item !== "string" || !item.trim())
      || !Array.isArray(model.carouselSlides) || model.carouselSlides.length !== 5
      || model.carouselSlides.some((item) => typeof item !== "string" || !item.trim())) {
      throw new SyntaxError("Growth Factory AI response did not match the required package.");
    }
    const fallback = fallbackPackage({ title, destinationPath, imageUrl, sourceUrl, sourceText, reason: "ai_provider_error" });
    const slides = Array.isArray(model.carouselSlides)
      ? model.carouselSlides.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 5).map((item) => compact(item, 120))
      : [];
    while (slides.length < 5) slides.push(fallback.carouselSlides[slides.length]);

    return {
      version: FACTORY_VERSION,
      title,
      destinationPath,
      sourceUrl,
      campaignSlug: slugify(compact(model.campaignSlug, 80) || title),
      imageUrl,
      facebook: compactCopy(model.facebook, 1200),
      instagram: compactCopy(model.instagram, 1200),
      pinterest: compactCopy(model.pinterest, PINTEREST_COPY_MAX),
      reelScript: compactCopy(model.reelScript, 900),
      carouselSlides: slides,
      visualBrief: compact(model.visualBrief, 700) || fallback.visualBrief,
      newsletterSubject: compact(model.newsletterSubject, 80) || fallback.newsletterSubject,
      newsletterTeaser: compactCopy(model.newsletterTeaser, 300),
      generatedBy: "ai",
      fallbackReason: null,
      providerStatus: null,
      providerErrorCode: null,
    };
  } catch (error) {
    const reason = error instanceof SyntaxError ? "invalid_ai_response" : "ai_provider_error";
    return fallbackPackage({
      title, destinationPath, imageUrl, sourceUrl, sourceText, reason,
      providerStatus: error instanceof GrowthFactoryProviderError ? error.status : null,
      providerErrorCode: error instanceof GrowthFactoryProviderError ? error.safeCode : null,
    });
  }
}
