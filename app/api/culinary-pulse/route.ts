import { NextResponse } from "next/server";

type NewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt?: string;
};

type RecallItem = {
  title: string;
  reason: string;
  classification?: string;
  state?: string;
  date?: string;
  url: string;
};

const FOOD_NEWS_RSS = "https://news.google.com/rss/search?q=(food%20OR%20culinary%20OR%20restaurant)%20(trend%20OR%20menu%20OR%20ingredient)%20when:2d&hl=en-US&gl=US&ceid=US:en";
const OPERATOR_NEWS_RSS = "https://news.google.com/rss/search?q=(restaurant%20OR%20foodservice)%20(labor%20OR%20technology%20OR%20equipment%20OR%20costs)%20when:3d&hl=en-US&gl=US&ceid=US:en";
const FDA_ENDPOINT = "https://api.fda.gov/food/enforcement.json?sort=report_date:desc&limit=8";
const FAO_URL = "https://www.fao.org/worldfoodsituation/foodpricesindex/en/";

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1].trim()) : "";
}

function parseNewsRss(xml: string, limit = 6): NewsItem[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, limit);
  return items
    .map((match) => {
      const block = match[1];
      const title = tag(block, "title");
      const url = tag(block, "link");
      const publishedAt = tag(block, "pubDate");
      const sourceTag = block.match(/<source(?:\s+url="[^"]*")?>([\s\S]*?)<\/source>/i);
      const source = sourceTag?.[1] ? decodeXml(sourceTag[1].trim()) : title.split(" - ").at(-1) || "News source";
      return { title, source, url, publishedAt };
    })
    .filter((item) => item.title && item.url);
}

function compact(value?: string, max = 180) {
  const clean = (value || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function fdaDate(value?: string) {
  if (!value || !/^\d{8}$/.test(value)) return undefined;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`;
}

async function getRecalls(): Promise<RecallItem[]> {
  const response = await fetch(FDA_ENDPOINT, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`FDA ${response.status}`);
  const payload = (await response.json()) as { results?: Array<Record<string, string>> };
  return (payload.results || []).slice(0, 5).map((record) => ({
    title: compact(record.product_description, 140) || "Food recall enforcement report",
    reason: compact(record.reason_for_recall, 220) || "See the FDA enforcement record for details.",
    classification: record.classification,
    state: record.state,
    date: fdaDate(record.report_date),
    url: record.recall_number
      ? `https://api.fda.gov/food/enforcement.json?search=recall_number:%22${encodeURIComponent(record.recall_number)}%22&limit=1`
      : "https://open.fda.gov/apis/food/enforcement/",
  }));
}

function stripHtml(html: string) {
  return decodeXml(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

async function getMarkets() {
  const fallback = {
    headline: "FAO Food Price Index: 131.1",
    summary: "Latest published snapshot: July 2026 was up 0.6% from June and 1.0% from a year earlier. Cereals, sugar, and vegetable oils rose while meat and dairy declined.",
    signals: [
      { label: "Cereals", direction: "↑ pressure" },
      { label: "Sugar", direction: "↑ pressure" },
      { label: "Vegetable oils", direction: "↑ pressure" },
      { label: "Meat", direction: "↓ easing" },
      { label: "Dairy", direction: "↓ easing" },
      { label: "Overall index", direction: "+0.6% m/m" },
    ],
    sourceUrl: FAO_URL,
  };

  try {
    const response = await fetch(FAO_URL, { headers: { "User-Agent": "ChefGringo/1.0" } });
    if (!response.ok) return fallback;
    const text = stripHtml(await response.text());
    const value = text.match(/Food Price Index[^.]{0,220}?averaged\s+([\d.]+)\s+points\s+in\s+([A-Za-z]+)\s+(\d{4})/i);
    const move = text.match(/up\s+([\d.]+)\s+points\s+\(([\d.]+)\s+percent\)\s+from\s+its\s+([A-Za-z]+)\s+level/i);
    const yoy = text.match(/Compared to a year earlier[^.]{0,180}?([\d.]+)\s+points\s+\(([\d.]+)\s+percent\)\s+higher/i);
    if (!value) return fallback;
    const month = value[2];
    const year = value[3];
    const index = value[1];
    const summaryParts = [`${month} ${year} official international-food-price snapshot.`];
    if (move) summaryParts.push(`Up ${move[2]}% from ${move[3]}.`);
    if (yoy) summaryParts.push(`${yoy[2]}% above a year earlier.`);
    return {
      ...fallback,
      headline: `FAO Food Price Index: ${index}`,
      summary: summaryParts.join(" "),
    };
  } catch {
    return fallback;
  }
}

async function getNews(url: string, limit: number) {
  const response = await fetch(url, { headers: { "User-Agent": "ChefGringo/1.0" } });
  if (!response.ok) throw new Error(`News ${response.status}`);
  return parseNewsRss(await response.text(), limit);
}

export async function GET() {
  const [trendsResult, operatorResult, recallsResult, marketResult] = await Promise.allSettled([
    getNews(FOOD_NEWS_RSS, 6),
    getNews(OPERATOR_NEWS_RSS, 5),
    getRecalls(),
    getMarkets(),
  ]);

  const trends = trendsResult.status === "fulfilled" ? trendsResult.value : [];
  const operatorWatch = operatorResult.status === "fulfilled" ? operatorResult.value : [];
  const recalls = recallsResult.status === "fulfilled" ? recallsResult.value : [];
  const markets = marketResult.status === "fulfilled" ? marketResult.value : await getMarkets();
  const degraded = !trends.length || !operatorWatch.length || !recalls.length;

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      trends,
      operatorWatch,
      recalls,
      markets,
      degraded,
      provenance: {
        recalls: "FDA Recall Enterprise System via openFDA; enforcement data is updated weekly.",
        markets: "FAO Food Price Index; official monthly international food commodity price index.",
        news: "Recent Google News RSS results; headlines remain attributed to their publishers.",
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    },
  );
}
