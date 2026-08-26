import { RESEARCH_LIMITS } from "./limits.ts";

const QUERY_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "both", "but", "by",
  "can", "did", "do", "does", "for", "from", "had", "has", "have", "if", "in",
  "into", "is", "it", "its", "may", "more", "must", "no", "not", "of", "on", "or",
  "our", "per", "should", "such", "than", "that", "the", "their", "then", "there",
  "these", "this", "those", "to", "under", "until", "via", "was", "were", "when",
  "where", "which", "while", "with", "without", "you", "your",
]);

const TECHNICAL_SHORT_TOKENS = new Set(["kw", "kva", "hp", "vac", "vdc", "hz", "va", "ac", "dc"]);

export function compactResearchQueryTerms(text: string, maxTerms = 8): string {
  const cleaned = text
    .replace(/\bresearch this:?\s*/i, " ")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/['"`]/g, " ")
    .replace(/[^a-z0-9.:-]+/g, " ")
    .trim();
  if (!cleaned) return "";
  const terms: string[] = [];
  const seen = new Set<string>();
  for (const raw of cleaned.split(/\s+/)) {
    const token = raw.replace(/^-+|-+$/g, "");
    if (!token) continue;
    if (QUERY_STOPWORDS.has(token)) continue;
    const keepShort = TECHNICAL_SHORT_TOKENS.has(token) || /^\d/.test(token);
    if (token.length < 3 && !keepShort) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    terms.push(token);
    if (terms.length >= maxTerms) break;
  }
  return terms.join(" ");
}

export function buildGenericBoundedQueries(question: string) {
  const terms = compactResearchQueryTerms(question);
  if (!terms) return [];
  return [
    `${terms} official source`,
    `${terms} site:.gov`,
    `${terms} manufacturer manual`,
  ].slice(0, RESEARCH_LIMITS.maximumQueries);
}
