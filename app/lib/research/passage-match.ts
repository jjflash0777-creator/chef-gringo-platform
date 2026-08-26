/**
 * Deterministic concept/token-group matching derived from the research claim.
 * Quotations must remain exact substrings of retrieved source text.
 */

export type PassageMatchResult = {
  excerpt: { text: string; start: number; end: number } | null;
  matchCount: number;
  missReason: string | null;
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

function haystackHasToken(haystack: string, token: string) {
  return haystack.includes(token);
}

function splitPassages(text: string) {
  const parts = text.split(/(?<=[.!?])\s+|\n{2,}/).map((part) => part.trim()).filter(Boolean);
  return parts.length ? parts : [text.trim()].filter(Boolean);
}

function countHits(passage: string, claimOrQuestion: string) {
  const haystack = passage.toLowerCase();
  const tokens = claimTokens(claimOrQuestion).filter((token) => token.length >= 4);
  const groups = activatedConceptGroups(claimOrQuestion);
  const groupHits = groups.filter((group) => group.tokens.some((token) => haystackHasToken(haystack, token)));
  const tokenHits = tokens.filter((token) => haystackHasToken(haystack, token));
  return {
    groupHits: groupHits.length,
    tokenHits: tokenHits.length,
    total: groupHits.length + tokenHits.length,
  };
}

function passageMatches(passage: string, claimOrQuestion: string) {
  if (passage.length < 24) return false;
  const hits = countHits(passage, claimOrQuestion);
  return hits.groupHits >= 2 || hits.tokenHits >= 2;
}

export function matchClaimPassages(retrievedText: string, claimOrQuestion: string): PassageMatchResult {
  const text = retrievedText ?? "";
  if (!text.trim()) return { excerpt: null, matchCount: 0, missReason: "empty_text" };
  const tokens = claimTokens(claimOrQuestion);
  if (!tokens.length) return { excerpt: null, matchCount: 0, missReason: "no_claim_tokens" };

  const passages = splitPassages(text);
  const matched = passages.filter((passage) => passageMatches(passage, claimOrQuestion));
  if (!matched.length) {
    const whole = countHits(text, claimOrQuestion);
    if (whole.total === 0) return { excerpt: null, matchCount: 0, missReason: "no_overlapping_concept" };
    return { excerpt: null, matchCount: 0, missReason: "signals_not_co_located" };
  }

  const chosen = matched[0] ?? "";
  const start = text.indexOf(chosen);
  if (start < 0 || !text.includes(chosen)) {
    return { excerpt: null, matchCount: matched.length, missReason: "excerpt_not_substring" };
  }
  return {
    excerpt: { text: chosen, start, end: start + chosen.length },
    matchCount: matched.length,
    missReason: null,
  };
}
