/**
 * Deterministic concept/token-group matching derived from the research claim.
 * Quotations must remain exact substrings of retrieved source text.
 *
 * A passage can be topically related without supporting the claim. Support
 * requires covering enough of the claim's activated concept groups.
 */

export type PassageRelationship = "supports" | "relevant" | "irrelevant";

export type PassageMatchResult = {
  excerpt: { text: string; start: number; end: number; locator?: string | null } | null;
  matchCount: number;
  missReason: string | null;
  relationship: PassageRelationship;
};

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "for", "from", "with", "without",
  "that", "this", "these", "those", "should", "would", "could", "must", "may",
  "be", "is", "are", "was", "were", "been", "being", "under", "above", "not",
  "as", "by", "at", "in", "on", "it", "its", "than", "then", "also", "any",
  "all", "both", "into", "over", "after", "before", "about", "between", "through",
  "can", "will", "do", "does", "did", "have", "has", "had", "if", "when", "where",
  "which", "who", "whom", "what", "how", "why", "their", "them", "they", "our",
]);

/**
 * Reusable technical concept groups. Tokens here are generic; a claim activates
 * only the groups it actually uses. Do not special-case a product family.
 */
export const RESEARCH_CONCEPT_GROUPS: ReadonlyArray<{ id: string; tokens: readonly string[] }> = [
  { id: "running_load", tokens: ["running", "run", "continuous", "demand", "load", "loads", "loading", "wattage"] },
  { id: "starting_surge", tokens: ["starting", "startup", "start", "surge", "inrush", "locked"] },
  { id: "motor_inductive", tokens: ["motor", "motors", "compressor", "inductive", "equipment"] },
  { id: "sizing_capacity", tokens: ["sizing", "sized", "size", "capacity", "rating", "watt", "watts", "kilowatt", "kva", "kw", "amp", "amps"] },
  { id: "operating_conditions", tokens: ["operating", "headroom", "recommended", "recommendation", "conditions", "evidenced"] },
];

function claimTokens(claimOrQuestion: string) {
  return claimOrQuestion
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

export function activatedConceptGroups(claimOrQuestion: string) {
  const tokens = new Set(claimTokens(claimOrQuestion));
  return RESEARCH_CONCEPT_GROUPS.filter((group) => group.tokens.some((token) => tokens.has(token)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function haystackHasToken(haystack: string, token: string) {
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(token)}(?:$|[^a-z0-9])`, "i").test(haystack);
}

function splitPassages(text: string) {
  const parts = text.split(/(?<=[.!?])\s+|\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()].filter(Boolean);
}

export function splitResearchPassages(text: string) {
  return splitPassages(text);
}

export function supportGroupThreshold(activatedCount: number) {
  if (activatedCount <= 1) return Math.max(activatedCount, 0);
  return Math.max(2, Math.ceil((activatedCount + 1) / 2));
}

function countHits(passage: string, claimOrQuestion: string) {
  const haystack = passage.toLowerCase();
  const tokens = claimTokens(claimOrQuestion).filter((token) => token.length >= 4);
  const groups = activatedConceptGroups(claimOrQuestion);
  const matchedGroups = groups.filter((group) => group.tokens.some((token) => haystackHasToken(haystack, token)));
  const tokenHits = tokens.filter((token) => haystackHasToken(haystack, token));
  const threshold = supportGroupThreshold(groups.length);
  const supports = groups.length > 0 && matchedGroups.length >= threshold;
  const relevant = matchedGroups.length >= 1 || tokenHits.length >= 1;
  return {
    groupHits: matchedGroups.length,
    tokenHits: tokenHits.length,
    total: matchedGroups.length + tokenHits.length,
    supports,
    relevant,
    score: matchedGroups.length * 10 + tokenHits.length,
  };
}

export function classifyPassageRelationship(passage: string, claimOrQuestion: string): PassageRelationship {
  if (passage.length < 24) return "irrelevant";
  const hits = countHits(passage, claimOrQuestion);
  if (hits.supports) return "supports";
  if (hits.relevant) return "relevant";
  return "irrelevant";
}

export function matchClaimPassages(retrievedText: string, claimOrQuestion: string): PassageMatchResult {
  const text = retrievedText ?? "";
  if (!text.trim()) return { excerpt: null, matchCount: 0, missReason: "empty_text", relationship: "irrelevant" };
  const tokens = claimTokens(claimOrQuestion);
  if (!tokens.length) return { excerpt: null, matchCount: 0, missReason: "no_claim_tokens", relationship: "irrelevant" };

  const passages = splitPassages(text);
  const scored = passages
    .map((passage) => ({ passage, hits: countHits(passage, claimOrQuestion) }))
    .filter((item) => item.passage.length >= 24 && !/^\[page\s+\d+\]$/i.test(item.passage) && (item.hits.supports || item.hits.relevant));
  if (!scored.length) {
    const whole = countHits(text, claimOrQuestion);
    if (whole.total === 0) return { excerpt: null, matchCount: 0, missReason: "no_overlapping_concept", relationship: "irrelevant" };
    return { excerpt: null, matchCount: 0, missReason: "signals_not_co_located", relationship: "irrelevant" };
  }

  scored.sort((left, right) => {
    if (left.hits.supports !== right.hits.supports) return left.hits.supports ? -1 : 1;
    return right.hits.score - left.hits.score;
  });
  const supporting = scored.filter((item) => item.hits.supports);
  const chosen = (supporting[0] ?? scored[0])?.passage ?? "";
  const start = text.indexOf(chosen);
  if (start < 0 || !text.includes(chosen)) {
    return { excerpt: null, matchCount: scored.length, missReason: "excerpt_not_substring", relationship: "irrelevant" };
  }
  const before = text.slice(0, start);
  const page = before.match(/\[page\s+(\d+)\][^\[]*$/i);
  const locator = page ? `page:${page[1]}` : null;
  const relationship: PassageRelationship = supporting.length ? "supports" : "relevant";
  return {
    excerpt: { text: chosen, start, end: start + chosen.length, locator },
    matchCount: scored.length,
    missReason: relationship === "relevant" ? "relevant_not_supporting" : null,
    relationship,
  };
}
