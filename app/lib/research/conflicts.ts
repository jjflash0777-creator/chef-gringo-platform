import type { CorpusHit } from "./corpus-types.ts";

export type CorpusConflict = {
  topic: string;
  left: { sourceId: string; excerpt: string; publishedDate: string | null; authorityTier: number };
  right: { sourceId: string; excerpt: string; publishedDate: string | null; authorityTier: number };
  note: string;
};

const TEMPERATURE = /(\d{2,3})\s*°?\s*F/gi;

function temperaturesIn(excerpt: string) {
  return [...excerpt.matchAll(TEMPERATURE)].map((match) => Number(match[1]));
}

export function detectCorpusConflicts(hits: CorpusHit[]): CorpusConflict[] {
  const conflicts: CorpusConflict[] = [];
  for (let i = 0; i < hits.length; i += 1) {
    for (let j = i + 1; j < hits.length; j += 1) {
      const left = hits[i];
      const right = hits[j];
      if (left.domain !== right.domain) continue;
      const leftTemps = temperaturesIn(left.excerpt);
      const rightTemps = temperaturesIn(right.excerpt);
      const disagree = leftTemps.some((temp) => rightTemps.some((other) => Math.abs(temp - other) >= 4 && /hold|internal|ground beef|danger|cool/i.test(left.excerpt + right.excerpt)));
      if (!disagree) continue;
      const newer = (left.publishedDate ?? "") >= (right.publishedDate ?? "") ? left : right;
      const older = newer === left ? right : left;
      conflicts.push({
        topic: left.domain,
        left: { sourceId: left.sourceId, excerpt: left.excerpt.slice(0, 180), publishedDate: left.publishedDate, authorityTier: left.authorityTier },
        right: { sourceId: right.sourceId, excerpt: right.excerpt.slice(0, 180), publishedDate: right.publishedDate, authorityTier: right.authorityTier },
        note: `${left.sourceId} and ${right.sourceId} disagree on a temperature. Prefer authority tier ${Math.min(left.authorityTier, right.authorityTier)} and the dated source (${newer.publishedDate ?? "date not established"} vs ${older.publishedDate ?? "date not established"}). Do not average them.`,
      });
    }
  }
  return conflicts;
}

export function conflictLimitation(conflicts: CorpusConflict[]) {
  if (!conflicts.length) return null;
  return conflicts.map((conflict) => conflict.note).join(" ");
}

export function jurisdictionLimitation(hits: CorpusHit[], question: string) {
  const florida = /\bflorida|sarasota|cottage food\b/i.test(question);
  const county = /\bsarasota\b/i.test(question);
  const notes: string[] = [];
  if (florida && hits.some((hit) => hit.jurisdiction === "Florida")) {
    notes.push("Florida agency identity is on file. County exceptions are not generalized from statewide rules.");
  }
  if (county) notes.push("Sarasota County-specific food rules are not in the accepted corpus.");
  if (hits.some((hit) => !hit.publishedDate)) notes.push("At least one supporting source has no established publication date.");
  return notes.length ? notes.join(" ") : null;
}
