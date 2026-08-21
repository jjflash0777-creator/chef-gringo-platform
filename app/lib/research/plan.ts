import { RESEARCH_LIMITS } from "./limits.ts";

export function buildGenericBoundedQueries(question: string) {
  const trimmed = question.replace(/\bresearch this:?\s*/i, "").trim().slice(0, 120);
  if (!trimmed) return [];
  return [
    `"${trimmed}" official source`,
    `"${trimmed}" site:.gov`,
    `"${trimmed}" manufacturer manual`,
  ].slice(0, RESEARCH_LIMITS.maximumQueries);
}
